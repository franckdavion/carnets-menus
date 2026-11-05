"use strict";
/* Maisonnée · Trajets : reconnaissance déterministe, distincte des présences.
   Aucun accès réseau, aucune modification Google et aucun kilomètre inventé. */
(function(root) {
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const school = /\b(ecole|ecoles|scolaire|scolaires|college|lycee|garderie|cantine|ramassage|bus scolaire)\b/;
  const pingpong = /\b(pp|ping pong|tennis de table)\b/;
  const health = /\b(orthophoniste|ortho|orthophonie|medecin|medecine|dentiste|hopital|kine|kinesitherapeute|psychologue|psy|ophtalmo|pediatre|specialiste|consultation|rdv medical)\b/;
  function matches(title, children, PRC) {
    if (school.test(norm(title))) return [];
    const found = PRC.analyse(title, children).map(x => x.child_id);
    return [...new Set(found)];
  }
  function make(items, calendar, children, PRC) {
    const seen = new Set(), rows = [];
    for (const e of items || []) {
      if (!e || e.status === "cancelled" || !e.id || !e.summary || !e.start) continue;
      const ids = matches(e.summary, children, PRC);
      // Eviter une attribution incorrecte lorsque plusieurs enfants sont mentionnés.
      if (ids.length !== 1) continue;
      const span = PRC.eventDays(e);
      if (!span || span.end !== span.start) continue;
      const key = calendar + "|" + e.id + "|" + ids[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const n = norm(e.summary);
      const kind = pingpong.test(n) ? "pp" : health.test(n) ? "medical" : "activite";
      const local_time=e.start.dateTime?PRC.paris(e.start.dateTime).hm:"jour";
      const row={
        key, calendar, event_id: e.id, child_id: ids[0],
        day: span.start, local_time, title: e.summary.slice(0, 200),
        location: String(e.location || "").trim().slice(0, 400),
        kind, mode: kind === "pp" ? "four" : "round"
      };
      row.fingerprint=fingerprint(row,children.find(c=>c.id===ids[0]));
      rows.push(row);
    }
    return rows;
  }
  const aliases = p => String(p && p.keywords || "").split(/[,;]/).map(norm).filter(Boolean);
  function matchingPlaces(title, places) {
    const text=" "+norm(title)+" ";
    return (places || []).filter(p=>!p.is_home&&aliases(p).some(k=>text.includes(" "+k+" ")));
  }
  // Une ambiguïté de lieux ne doit jamais choisir arbitrairement une adresse.
  function placeFor(ev, places) {
    const matches=matchingPlaces(ev.title,places);
    return matches.length===1?matches[0]:null;
  }
  function duplicatePlace(draft, places, ownId) {
    const title=norm(draft.label), addr=norm(draft.address);
    const words=aliases(draft);
    for(const p of places||[]) {
      if(p.id===ownId)continue;
      if(title&&norm(p.label)===title) return {place:p,reason:"nom"};
      if(addr&&norm(p.address)===addr) return {place:p,reason:"adresse"};
      if(words.some(w=>aliases(p).includes(w))) return {place:p,reason:"abréviation"};
    }
    return null;
  }
  function resolvedLocation(ev,places){
    const viaAlias=placeFor(ev,places);
    if(viaAlias)return {place:viaAlias,origin:"favori"};
    const google=norm(ev.location);
    if(google){
      const candidates=(places||[]).filter(p=>!p.is_home &&
        (norm(p.address)===google || norm(p.label)===google || norm(p.label+" "+p.address)===google));
      if(candidates.length===1)return {place:candidates[0],origin:"google-favori"};
      return {place:null,origin:"google",address:ev.location};
    }
    return {place:null,origin:"missing"};
  }
  const activityKey = (title,child,kind) => {
    const n=norm(title);
    if(kind==="pp")return "pp";
    if(/\b(ortho|orthophoniste|orthophonie)\b/.test(n))return "orthophonie";
    if(/\b(dentiste|dentaire)\b/.test(n))return "dentiste";
    if(/\b(kine|kinesitherapeute)\b/.test(n))return "kine";
    const stop=new Set();
    for(const name of [child && child.first_name,...(child && child.aliases || [])]) {
      for(const token of norm(name).split(" "))if(token)stop.add(token);
    }
    if(child&&child.first_name)stop.add(norm(child.first_name)[0]);
    return n.split(" ").filter(t=>t&&!stop.has(t)).join(" ") || n;
  };
  // Motif stable entre enfants et variantes courantes d'un même rendez-vous.
  // Utilisé seulement pour les exclusions volontaires (jamais pour les présences).
  function motifKey(row, children) {
    const child=(children||[]).find(c=>c.id===row.child_id);
    const key=norm(activityKey(row.title,child,row.kind||"activite"));
    return key.slice(0,120);
  }
  function fingerprint(row,child) {
    const start=row.local_time || "jour";
    return [row.day,start,row.kind||"activite",activityKey(row.title,child,row.kind||"activite")].join("|");
  }
  function dedupe(rows, confirmed=[]) {
    const seen=new Set();
    for(const r of confirmed){
      if(r.event_fingerprint)seen.add(r.child_id+"|"+r.event_fingerprint);
      seen.add(r.child_id+"|"+r.calendar_id+"|"+r.event_id);
    }
    const ordered=[...(rows||[])].sort((a,b)=>
      Number(!!b.location)-Number(!!a.location)||a.day.localeCompare(b.day)||a.title.localeCompare(b.title,"fr"));
    const found=[];
    for(const r of ordered) {
      const key=r.child_id+"|"+r.fingerprint;
      const exact=r.child_id+"|"+r.calendar+"|"+r.event_id;
      if(seen.has(key)||seen.has(exact))continue;
      seen.add(key);seen.add(exact);
      found.push(r);
    }
    return found.sort((a,b)=>a.day.localeCompare(b.day)||a.title.localeCompare(b.title,"fr"));
  }
  // Rendez-vous successifs pour une même activité : regroupement proposé mais
  // toujours confirmé par l'utilisateur. Jamais de groupement entre lieux différents.
  function groupCandidates(anchor, rows, children, places=[]) {
    const childOf=id=>(children||[]).find(c=>c.id===id);
    const activity=activityKey(anchor.title,childOf(anchor.child_id),anchor.kind);
    const geo = r => {
      const found=resolvedLocation(r,places);
      return found.place ? norm(found.place.address) : norm(found.address||"");
    };
    const origin=geo(anchor);
    return [anchor,...(rows||[]).filter(r=>{
      if(r.key===anchor.key || r.day!==anchor.day || r.child_id===anchor.child_id || r.kind!==anchor.kind)
        return false;
      if(activityKey(r.title,childOf(r.child_id),r.kind)!==activity)return false;
      const other=geo(r);
      return !origin || !other || origin===other;
    })].sort((a,b)=>(a.local_time||"").localeCompare(b.local_time||"")||a.title.localeCompare(b.title,"fr"));
  }
  function legs(mode, home, destination, returnPlace) {
    if (mode === "one") return [[home, destination]];
    if (mode === "round") return [[home, destination],[destination, home]];
    if (mode === "four") return [[home, destination],[destination, home],[home, destination],[destination, home]];
    if (mode === "custom") return [[home, destination],[destination, returnPlace || home]];
    throw new Error("Type de trajet inconnu.");
  }
  const total = lengths => Math.round(lengths.reduce((s,x)=>s+Number(x||0),0)*10)/10;
  const API = {norm, matches, make, placeFor, matchingPlaces, duplicatePlace, resolvedLocation, fingerprint, motifKey, dedupe, groupCandidates, legs, total};
  if (typeof module !== "undefined" && module.exports) module.exports=API;
  else root.PRTR=API;
})(typeof window !== "undefined" ? window : globalThis);
