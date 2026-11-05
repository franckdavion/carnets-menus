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
      rows.push({
        key, calendar, event_id: e.id, child_id: ids[0],
        day: span.start, title: e.summary.slice(0, 200),
        location: String(e.location || "").trim().slice(0, 400),
        kind, mode: kind === "pp" ? "four" : "round"
      });
    }
    return rows;
  }
  function placeFor(ev, places) {
    const text = norm(ev.title);
    const choices = (places || []).filter(p => !p.is_home && String(p.keywords || "").trim());
    return choices.find(p => String(p.keywords).split(/[,;]/).some(k => {
      const needle = norm(k);
      return needle && (" " + text + " ").includes(" " + needle + " ");
    })) || null;
  }
  function legs(mode, home, destination, returnPlace) {
    if (mode === "one") return [[home, destination]];
    if (mode === "round") return [[home, destination],[destination, home]];
    if (mode === "four") return [[home, destination],[destination, home],[home, destination],[destination, home]];
    if (mode === "custom") return [[home, destination],[destination, returnPlace || home]];
    throw new Error("Type de trajet inconnu.");
  }
  const total = lengths => Math.round(lengths.reduce((s,x)=>s+Number(x||0),0)*10)/10;
  const API = {norm, matches, make, placeFor, legs, total};
  if (typeof module !== "undefined" && module.exports) module.exports=API;
  else root.PRTR=API;
})(typeof window !== "undefined" ? window : globalThis);
