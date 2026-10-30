"use strict";
/* Maisonnée · module « Présences des enfants ».
   Calendrier mensuel, corrections manuelles, bilans, gestion des enfants, synchronisation Google Agenda.
   Le calcul est fait par presences-core.js (PRC) ; les exports par presences-export.js.
   Données dans Supabase (tables children, child_periods, presence_*), réservées aux membres du foyer.
   Rien n'est mis dans le cache hors-ligne ni envoyé à un service externe. Chargé après modules.js. */

/* ---------- inscription du module (tuile, couleur, icône) ---------- */
MC.presences = "#4ADE80";
MI.presences = '<rect class="f" x="4" y="7" width="24" height="20" rx="5"/><path d="M4 13h24M10 4.5v5M22 4.5v5"/><path class="s" d="M10.5 19.5l3 3 7-7"/>';
MODS.push({ k: "presences", t: "Présences", g: "Organisation", sub() {
  if (!PR.ix) return "Présences des enfants";
  const d = today(), n = PRC.childrenFor(PR.ix, d, d).filter(c => PRC.dayStatus(PR.ix, c.id, d).st === "present").length;
  return `${plural(n, "enfant présent", "enfants présents")} aujourd'hui`;
} });
// La tuile apparaît aussi sur l'Accueil de ceux qui ont déjà personnalisé leur accueil (une seule fois).
(function () { const p = LS.get("mz_home", null); if (Array.isArray(p) && !LS.get("mz_pr_pin", false)) { if (!p.includes("presences")) LS.set("mz_home", [...p, "presences"]); LS.set("mz_pr_pin", true); } })();

/* ---------- état ---------- */
const PR_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const PR_MC = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const PR_J = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PR_ST = { present: "Présent", absent: "Absent", none: "Aucun accueil" };
const PR_KIND = { permanent: "Permanent", relais: "Relais" };
const PR = {
  y: +today().slice(0, 4), m: +today().slice(5, 7), tab: "cal", wide: "month", wk: mondayOf(today()),
  data: null, ix: null, loading: false, need: false, loadErr: "", ch: null,
  sync: { busy: false, err: "", at: 0, failAt: 0 }, synced: new Set(),
  an: { y: +today().slice(0, 4), child: "", kind: "" }
};
const prOn = () => mode === "cloud" && !!S.hh && !!S.hh.id;
const prSet = () => (S.hh && S.hh.presence_settings) || {};
const prWords = () => ({ abs: [...new Set([...(prSet().abs || PRC.DEFAULT_WORDS.abs), "abs"])], rel: prSet().rel || PRC.DEFAULT_WORDS.rel });
const prD = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "";
const prDL = s => new Date(s + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const prChild = id => (PR.data && PR.data.children.find(c => c.id === id)) || null;
const prName = c => c ? c.first_name + (c.last_name ? " " + c.last_name : "") : "?";
const prMonth = () => [PRC.mFirst(PR.y, PR.m), PRC.mLast(PR.y, PR.m)];
const prRange = () => PR.wide === "week" ? [PR.wk, PRC.dAdd(PR.wk, 6)] : prMonth();
function prKindLabel(c, from, to) {
  const ps = (PR.ix.periods.get(c.id) || []).filter(p => p.start_day <= to && (!p.end_day || p.end_day >= from));
  const k = ps.length ? ps[ps.length - 1].kind : ((PR.ix.periods.get(c.id) || []).slice(-1)[0] || {}).kind;
  return k || "";
}
function prPeriodsText(c) {
  const ps = PR.ix.periods.get(c.id) || [];
  if (!ps.length) return "Aucune période d'accueil";
  return ps.map(p => `${PR_KIND[p.kind]} ${p.end_day ? `du ${prD(p.start_day)} au ${prD(p.end_day)}` : `depuis le ${prD(p.start_day)}`}`).join(" · ");
}

/* ---------- chargement (Supabase) ---------- */
async function prLoad(force) {
  if (!prOn() || PR.loading || (PR.data && !force)) return;
  PR.loading = true;
  try {
    if (!sb) await loadSb();
    const hid = S.hh.id, q = t => sb.from(t).select("*").eq("household_id", hid);
    const r = await Promise.all(["children", "child_periods", "presence_events", "presence_overrides", "presence_rules"].map(q));
    const bad = r.find(x => x.error);
    if (bad) { const m = (bad.error.message || "") + " " + (bad.error.code || ""); PR.need = /does not exist|schema cache|42P01|PGRST20/i.test(m); PR.loadErr = PR.need ? "" : bad.error.message; }
    else {
      PR.need = false; PR.loadErr = "";
      const day = x => ({ ...x, start_day: String(x.start_day).slice(0, 10), end_day: x.end_day ? String(x.end_day).slice(0, 10) : x.end_day });
      PR.data = { children: r[0].data.sort((a, b) => a.first_name.localeCompare(b.first_name, "fr")), periods: r[1].data.map(day), events: r[2].data.map(day), overrides: r[3].data.map(o => ({ ...o, day: String(o.day).slice(0, 10) })), rules: r[4].data };
      prIx(); prListen(hid);
    }
  } catch (e) { PR.loadErr = e.message || "réseau"; }
  finally { PR.loading = false; softRender(); }
}
function prIx() { PR.ix = PRC.index(PR.data); }
// l'autre téléphone voit tout de suite une correction, un enfant ajouté, une synchro
let prReload = 0;
function prListen(hid) {
  if (PR.ch || !sb.channel) return;
  PR.ch = sb.channel("presences-" + hid);
  for (const t of ["children", "child_periods", "presence_events", "presence_overrides", "presence_rules"])
    PR.ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: "household_id=eq." + hid }, () => { clearTimeout(prReload); prReload = setTimeout(() => prLoad(true), 1200); });
  PR.ch.subscribe();
}
async function prSaveSet(patch) {
  const v = { ...prSet(), ...patch };
  S.hh.presence_settings = v; saveLocal();
  const { error } = await sb.from("households").update({ presence_settings: v }).eq("id", S.hh.id);
  if (error) toast("Réglage non enregistré : " + error.message);
}

/* ---------- synchronisation Google Agenda ---------- */
async function prApi(path) {
  try { return await gApi(path); }
  catch (e) { if (e.message === "expired" && await gEnsure()) return gApi(path); throw e; }
}
// Lit les agendas choisis sur [from, to] puis remplace les événements reconnus de cette fenêtre.
// Si une seule lecture échoue, RIEN n'est modifié : les données précédentes restent affichées.
async function prSync(from, to, manual) {
  if (!prOn() || !PR.data || PR.sync.busy) return;
  const cals = prSet().cals || [];
  if (!cals.length) { if (manual) prCalsSheet(); return; }
  PR.sync.busy = true; softRender();
  try {
    if (!(await gEnsure())) throw new Error(G.connected ? "Google Agenda ne répond pas" : "Google Agenda n'est pas connecté sur ce téléphone");
    const tMin = PRC.dAdd(from, -1) + "T21:00:00Z", tMax = PRC.dAdd(to, 1) + "T02:00:00Z", words = prWords(), rows = new Map();
    for (const cal of cals) {
      let page = "";
      do {
        const j = await prApi(`calendars/${encodeURIComponent(cal)}/events?singleEvents=true&maxResults=2500&timeZone=Europe%2FParis&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}&fields=${encodeURIComponent("items(id,status,summary,start,end,recurringEventId),nextPageToken")}${page ? "&pageToken=" + encodeURIComponent(page) : ""}`);
        for (const r of PRC.rowsFromGoogle(j.items, cal, PR.data.children, words)) rows.set(r.child_id + "|" + r.gid, r);
        page = j.nextPageToken || "";
      } while (page);
    }
    const hid = S.hh.id, at = new Date().toISOString(), key = r => r.child_id + "|" + r.gid;
    const { upserts, deletes } = PRC.reconcile(PR.data.events, [...rows.values()], from, to);
    if (upserts.length) { const { error } = await sb.from("presence_events").upsert(upserts.map(r => ({ ...r, household_id: hid, seen_at: at })), { onConflict: "household_id,child_id,gid" }); if (error) throw new Error(error.message); }
    const byKid = new Map(); for (const r of deletes) byKid.set(r.child_id, [...(byKid.get(r.child_id) || []), r.gid]);
    for (const [cid, gids] of byKid) { const { error } = await sb.from("presence_events").delete().eq("household_id", hid).eq("child_id", cid).in("gid", gids); if (error) throw new Error(error.message); }
    const del = new Set(deletes.map(key)), up = new Map(upserts.map(r => [key(r), { ...r, household_id: hid, seen_at: at }]));
    PR.data.events = PR.data.events.filter(r => !del.has(key(r)) && !up.has(key(r))).concat([...up.values()]);
    prIx();
    PR.sync.err = ""; PR.sync.at = Date.now(); PR.synced.add(from + "|" + to);
    await prSaveSet({ last: { at, by: (meM() || {}).name || "", from, to } });
    if (manual) toast("Présences à jour.");
  } catch (e) {
    PR.sync.err = e.message === "expired" ? "connexion Google expirée" : (e.message || "erreur inconnue").replace(/^google /, "Google : erreur ");
    PR.sync.failAt = Date.now();
  } finally { PR.sync.busy = false; softRender(); }
}
// fenêtre synchronisée automatiquement : le mois affiché, le précédent et le suivant
const prWin = () => [PRC.mFirst(PR.m === 1 ? PR.y - 1 : PR.y, PR.m === 1 ? 12 : PR.m - 1), PRC.mLast(PR.m === 12 ? PR.y + 1 : PR.y, PR.m === 12 ? 1 : PR.m + 1)];
let prKickT = 0;
function prKick() {
  clearTimeout(prKickT);
  prKickT = setTimeout(() => {
    if (view !== "presences" || !PR.data || PR.sync.busy || !(prSet().cals || []).length) return;
    const [a, b] = prWin(), fresh = Date.now() - PR.sync.at < 10 * 60e3;
    if (!PR.synced.has(a + "|" + b) || !fresh) { if (PR.sync.failAt && Date.now() - PR.sync.failAt < 60e3) return; prSync(a, b); }
  }, 500);
}
setInterval(() => { if (view === "presences" && document.visibilityState === "visible" && Date.now() - PR.sync.at > 10 * 60e3) { PR.synced.clear(); prKick(); } }, 60e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && view === "presences" && PR.data) prLoad(true).then(prKick); });

/* ---------- vue ---------- */
const PR_TABS = [["cal", "Calendrier", '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M16 14h.5M8 17h2"/>'],
  ["stats", "Statistiques", '<path d="M5 20V13M10 20V9M15 20v-6M20 20V5"/>'],
  ["export", "Relevés", '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9 13h6M9 16.5h6"/>'],
  ["kids", "Enfants", '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.6 2.8-5.4 5.5-5.4s4.9 1.8 5.5 5.4"/><circle cx="17" cy="9.5" r="2.5"/><path d="M15.5 14.3c2.6-.4 4.6 1 5 4.7"/>']];
const prIco = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

VIEWS.presences = function () {
  if (!prOn()) return `<div class="empty"><strong>Réservé au foyer connecté.</strong>Les présences des enfants sont enregistrées dans votre foyer Maisonnée (pas en mode démo).</div>`;
  if (!PR.data && !PR.need && !PR.loadErr) { prLoad(); return `<p class="muted" style="margin-top:20px">Chargement des présences…</p>`; }
  if (PR.need) return `<div class="empty"><strong>Encore une étape.</strong>Collez le script <b>supabase/migrations/0015_presences.sql</b> dans Supabase › SQL Editor (comme les précédents), puis rouvrez cette page.</div>`;
  if (!PR.data) return `<div class="empty"><strong>Présences indisponibles pour l'instant.</strong>${esc(PR.loadErr)}<br><button class="btn" data-act="prReload">Réessayer</button></div>`;
  prKick();
  const tab = PR_TABS.map(([k, t, ic]) => `<button data-act="prTab" data-v="${k}" aria-pressed="${PR.tab === k}">${prIco(ic)}<span>${t}</span></button>`).join("");
  const body = PR.tab === "stats" ? prStatsTab() : PR.tab === "export" ? prExportTab() : PR.tab === "kids" ? prKidsTab() : prCalTab();
  return `<div class="pr"><nav class="pr-side"><div class="pr-brand">${prIco(PR_TABS[0][2])}<b>Présences<br>des enfants</b></div><div class="pr-tabs" role="group" aria-label="Rubriques">${tab}</div></nav>
    <div class="pr-main">${prSyncBar()}${prAmbBar()}${body}</div></div>`;
};

function prSyncBar() {
  const cals = prSet().cals || [], last = prSet().last;
  if (!cals.length) return `<div class="pr-note warn">Choisissez les agendas Google à analyser pour calculer les présences. <button class="linkbtn" data-act="prCals">Choisir les agendas</button></div>`;
  const when = last && last.at ? `Synchronisé ${esc(ago(last.at))}${last.by ? " par " + esc(last.by) : ""}` : "Jamais synchronisé";
  const fail = PR.sync.err && PR.sync.failAt > PR.sync.at;
  return `<div class="pr-sync ${fail ? "ko" : ""}">
    <span class="pr-dot ${PR.sync.busy ? "busy" : fail ? "ko" : "ok"}" aria-hidden="true"></span>
    <span class="pr-sync-t">${PR.sync.busy ? "Lecture de Google Agenda…" : fail ? `<b>Données non à jour</b> : ${esc(PR.sync.err)}. ${last && last.at ? "Dernières données du " + esc(new Date(last.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })) + "." : ""}` : when}</span>
    <button class="pr-refresh" data-act="prRefresh" ${PR.sync.busy ? "disabled" : ""} aria-label="Actualiser les présences">↻ <span>Actualiser les présences</span></button>
  </div>${fail && !G.connected ? `<div class="pr-note warn">Google Agenda doit être connecté sur ce téléphone. <button class="linkbtn" data-act="prGConnect">Connecter Google Agenda</button></div>` : ""}`;
}
function prAmbBar() {
  const n = PRC.ambiguous(PR.ix, "0000-01-01", "9999-12-31").length;
  return n ? `<button class="pr-amb" data-act="prAmb"><b>?</b><span><strong>${plural(n, "événement à vérifier", "événements à vérifier")}</strong>Rien n'est compté tant que vous n'avez pas répondu.</span><i aria-hidden="true">›</i></button>` : "";
}

/* ----- calendrier ----- */
function prSym(st) { return st === "present" ? "✓" : st === "absent" ? "✕" : "–"; }
function prCalTab() {
  const [from, to] = prRange(), ix = PR.ix, td = today();
  const kids = PRC.childrenFor(ix, from, to);
  const title = PR.wide === "week" ? `Sem. du ${+from.slice(8)} ${PR_MC[+from.slice(5, 7) - 1]}` : `${cap(PR_MOIS[PR.m - 1])} ${PR.y}`;
  const days = [...PRC.eachDay(from, to)];
  let table;
  if (!PR.data.children.length) table = `<div class="pr-empty"><b>Aucun enfant enregistré.</b><span>Ajoutez les enfants accueillis : leurs présences seront calculées depuis Google Agenda.</span><button class="pr-act orange sm" data-act="prKidNew">+ Ajouter un enfant</button></div>`;
  else if (!kids.length) table = `<div class="pr-empty"><b>Aucun accueil sur cette période.</b></div>`;
  else {
    const head = `<tr><th class="pr-name" scope="col">Enfant</th>${days.map(d => { const w = PRC.dow(d); return `<th scope="col" class="${w >= 5 ? "we" : ""}${d === td ? " td" : ""}"><span>${PR_J[w]}</span><b>${+d.slice(8)}</b></th>`; }).join("")}<th class="pr-tot" scope="col">Total</th></tr>`;
    const rows = kids.map(c => {
      const k = prKindLabel(c, from, to);
      let pres = 0, placed = 0;
      const cells = days.map(d => {
        const s = PRC.dayStatus(ix, c.id, d);
        if (s.st === "present") pres++; if (s.st !== "none") placed++;
        return `<td><button class="pr-c ${s.st}${d > td ? " fut" : ""}${s.manual ? " man" : ""}${s.unsure ? " uns" : ""}${s.kind === "relais" && s.st === "present" ? " rel" : ""}" data-act="prDay" data-c="${c.id}" data-d="${d}" aria-label="${esc(c.first_name)}, ${esc(prDL(d))} : ${PR_ST[s.st]}${s.manual ? ", corrigé" : ""}${s.unsure ? ", à vérifier" : ""}">${prSym(s.st)}</button></td>`;
      }).join("");
      return `<tr><th class="pr-name" scope="row"><button class="pr-kid" data-act="prKid" data-v="${c.id}"><span class="pr-av ${k}">${esc(initial(c.first_name))}</span><span class="pr-kn"><b>${esc(c.first_name)}</b>${k ? `<i class="pr-badge ${k}">${PR_KIND[k]}</i>` : ""}${c.archived ? `<i class="pr-badge arch">Archivé</i>` : ""}</span></button></th>${cells}<td class="pr-tot"><b>${pres}</b>/${placed}</td></tr>`;
    }).join("");
    table = `<div class="pr-scroll" id="prScroll"><table class="pr-grid ${PR.wide}"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
      <div class="pr-legend"><span><i class="pr-c present">✓</i>Présent</span><span><i class="pr-c absent">✕</i>Absent</span><span><i class="pr-c none">–</i>Pas d'accueil</span><span><i class="pr-dotk permanent"></i>Accueil permanent</span><span><i class="pr-dotk relais"></i>Accueil relais</span><span><i class="pr-c present man sm"></i>Corrigé à la main</span><span><i class="pr-c present uns sm"></i>À vérifier</span>${to > td ? `<span><i class="pr-c present fut sm"></i>À venir (prévision)</span>` : ""}</div>`;
  }
  return `<section class="pr-panel">
      <div class="pr-head"><button class="pr-arrow" data-act="prNav" data-v="-1" aria-label="${PR.wide === "week" ? "Semaine" : "Mois"} précédent">‹</button>
        <button class="pr-title" data-act="prPick">${prIco(PR_TABS[0][2])}<span><span class="pr-pre">Présences – </span>${esc(title)}</span></button>
        <button class="pr-arrow" data-act="prNav" data-v="1" aria-label="${PR.wide === "week" ? "Semaine" : "Mois"} suivant">›</button></div>
      <div class="pr-sub"><div class="pr-seg" role="group" aria-label="Affichage"><button data-act="prWide" data-v="month" aria-pressed="${PR.wide === "month"}">Mois</button><button data-act="prWide" data-v="week" aria-pressed="${PR.wide === "week"}">Semaine</button></div>
        ${(PR.wide === "month" ? !td.startsWith(`${PR.y}-${pad(PR.m)}`) : PR.wk !== mondayOf(td)) ? `<button class="linkbtn" data-act="prNow">Revenir à aujourd'hui</button>` : ""}</div>
      ${table}
    </section>
    ${PR.data.children.length ? prMonthBilan() : ""}
    <div class="pr-actions">
      <button class="pr-act violet" data-act="prExport" data-v="pdf">${prIco(PR_TABS[2][2])}<span>Générer le relevé<small>(PDF)</small></span></button>
      <button class="pr-act blue" data-act="prExport" data-v="xlsx">${prIco('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M9 11l5 6M14 11l-5 6"/>')}<span>Exporter<small>(Excel)</small></span></button>
      <button class="pr-act orange" data-act="prTab" data-v="stats">${prIco(PR_TABS[0][2])}<span>Bilan annuel</span></button>
    </div>`;
}
function prMonthBilan() {
  const [from, end] = prMonth(), td = today(), fut = from > td, to = fut || end <= td ? end : td, kids = PRC.childrenFor(PR.ix, from, end);
  let P = 0, D = 0, A = 0;
  const rows = kids.map(c => {
    const s = PRC.stats(PR.ix, c.id, from, to), k = prKindLabel(c, from, to);
    P += s.present; A += s.absent; D += s.placed;
    return `<tr><th scope="row">${esc(c.first_name)}${k ? ` <i class="pr-dotk ${k}" aria-label="${PR_KIND[k]}"></i>` : ""}</th><td class="g">${s.present}</td><td class="r">${s.perm.absent || s.absent ? s.absent : k === "relais" ? "—" : 0}</td><td class="n">${s.none || "—"}</td>${s.unsure ? `<td class="u" title="À vérifier">${s.unsure}?</td>` : "<td></td>"}</tr>`;
  }).join("");
  const pct = D ? Math.round(P / D * 100) : 0, C = 2 * Math.PI * 52;
  return `<section class="pr-panel violet">
    <h2 class="pr-h">${prIco(PR_TABS[1][2])}Bilan du mois <span>${esc(PR_MOIS[PR.m - 1])} ${PR.y}${fut ? " · prévision" : to < end ? " · au " + +td.slice(8) + " " + PR_MC[+td.slice(5, 7) - 1] : ""}</span></h2>
    <div class="pr-bilan">
      <table class="pr-tbl"><thead><tr><th>Enfant</th><th>Présents</th><th>Absents</th><th>Sans accueil</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <figure class="pr-ring" aria-label="${pct} % des journées d'accueil en présence">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}"/></svg>
        <b>${pct} %</b><figcaption><em>${P}</em> jours présents<br>sur ${D} jours d'accueil</figcaption>
      </figure>
    </div>
    <p class="pr-total">Total du mois, tous les enfants : <b>${plural(P, "journée de présence", "journées de présence")}</b>${A ? ` · ${plural(A, "journée d'absence", "journées d'absence")}` : ""}</p>
  </section>`;
}

/* ----- bilan annuel ----- */
function prStatsTab() {
  const a = PR.an, ix = PR.ix, from = `${a.y}-01-01`, to = `${a.y}-12-31`;
  const kids = PRC.childrenFor(ix, from, to).filter(c => !a.child || c.id === a.child);
  const cnt = (c, m) => { let p = 0, ab = 0, k = 0; for (const d of PRC.eachDay(PRC.mFirst(a.y, m), PRC.mLast(a.y, m))) { if (d > today()) break; const s = PRC.dayStatus(ix, c.id, d); if (a.kind && s.kind !== a.kind) continue; if (s.kind || s.manual) k++; if (s.st === "present") p++; else if (s.st === "absent") ab++; } return [p, ab, k]; };
  const M = kids.map(c => ({ c, m: Array.from({ length: 12 }, (_, i) => cnt(c, i + 1)) })).filter(r => !a.kind || r.m.some(x => x[0] || x[1]));
  const tot = r => r.m.reduce((s, x) => [s[0] + x[0], s[1] + x[1]], [0, 0]);
  const colT = i => M.reduce((s, r) => [s[0] + r.m[i][0], s[1] + r.m[i][1]], [0, 0]);
  const grand = M.reduce((s, r) => { const t = tot(r); return [s[0] + t[0], s[1] + t[1]]; }, [0, 0]);
  const cell = x => x[2] === 0 ? `<td class="n">—</td>` : `<td><b>${x[0]}</b>${x[1] ? `<small>${x[1]} abs.</small>` : ""}</td>`;
  const allKids = PRC.childrenFor(ix, from, to);
  return `<section class="pr-panel violet">
    <div class="pr-head"><button class="pr-arrow" data-act="prYear" data-v="-1" aria-label="Année précédente">‹</button><h2 class="pr-title static">${prIco(PR_TABS[1][2])}<span>Bilan annuel ${a.y}</span></h2><button class="pr-arrow" data-act="prYear" data-v="1" aria-label="Année suivante">›</button></div>
    <div class="pr-filters"><div class="chips">${[["", "Tous les enfants"], ...allKids.map(c => [c.id, c.first_name])].map(([v, t]) => `<button class="chip" data-act="prAnChild" data-v="${v}" aria-pressed="${a.child === v}">${esc(t)}</button>`).join("")}</div>
      <div class="chips">${[["", "Tous les accueils"], ["permanent", "Permanent"], ["relais", "Relais"]].map(([v, t]) => `<button class="chip" data-act="prAnKind" data-v="${v}" aria-pressed="${a.kind === v}">${v ? `<i class="pr-dotk ${v}"></i>` : ""}${t}</button>`).join("")}</div></div>
    ${M.length ? `<div class="pr-scroll"><table class="pr-tbl pr-year"><thead><tr><th class="pr-name">Enfant</th>${PR_MC.map(m => `<th>${m}</th>`).join("")}<th class="pr-tot">Total</th></tr></thead>
      <tbody>${M.map(r => `<tr><th class="pr-name" scope="row">${esc(r.c.first_name)}${r.c.archived ? ' <i class="pr-badge arch">Archivé</i>' : ""}</th>${r.m.map(cell).join("")}<td class="pr-tot">${cell(tot(r)).slice(4, -5)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th class="pr-name" scope="row">Total du mois</th>${PR_MC.map((_, i) => cell(colT(i))).join("")}<td class="pr-tot">${cell(grand).slice(4, -5)}</td></tr></tfoot></table></div>
      <p class="pr-total">Chiffres = journées de présence ; « abs. » = journées d'absence. Les jours sans accueil et les jours à venir ne sont pas comptés.</p>` : `<div class="pr-empty"><b>Aucun accueil enregistré en ${a.y}.</b></div>`}
    <div class="btns"><button class="btn" data-act="prSyncYear" ${PR.sync.busy || !(prSet().cals || []).length ? "disabled" : ""}>↻ Relire l'agenda de ${a.y}</button></div>
  </section>
  <div class="pr-actions two">
    <button class="pr-act violet" data-act="prExport" data-v="pdf" data-y="${a.y}">${prIco(PR_TABS[2][2])}<span>Relevé ${a.y}<small>(PDF)</small></span></button>
    <button class="pr-act blue" data-act="prExport" data-v="xlsx" data-y="${a.y}">${prIco(PR_TABS[2][2])}<span>Exporter ${a.y}<small>(Excel)</small></span></button>
  </div>`;
}

/* ----- relevés ----- */
function prExportTab() {
  return `<section class="pr-panel">
    <h2 class="pr-h">${prIco(PR_TABS[2][2])}Relevés et exports</h2>
    <p class="muted small">Choisissez les enfants et la période : le relevé PDF (A4, prêt à imprimer) ou le fichier Excel est fabriqué <b>sur ce téléphone</b>. Ces fichiers contiennent des données personnelles d'enfants confiés : ne les partagez qu'avec les personnes autorisées.</p>
  </section>
  <div class="pr-actions two">
    <button class="pr-act violet" data-act="prExport" data-v="pdf">${prIco(PR_TABS[2][2])}<span>Générer un relevé PDF</span></button>
    <button class="pr-act blue" data-act="prExport" data-v="xlsx">${prIco(PR_TABS[2][2])}<span>Exporter vers Excel</span></button>
  </div>`;
}

/* ----- enfants et réglages ----- */
function prKidsTab() {
  const all = PR.data.children, act = all.filter(c => !c.archived), arc = all.filter(c => c.archived), td = today();
  const row = c => { const k = PRC.kindOn(PR.ix, c.id, td) || prKindLabel(c, "0000-01-01", "9999-12-31"); return `<button class="pr-krow" data-act="prKid" data-v="${c.id}"><span class="pr-av ${k}">${esc(initial(c.first_name))}</span><span class="pr-kn"><b>${esc(prName(c))}</b><small>${esc(prPeriodsText(c))}${c.aliases && c.aliases.length ? " · aussi « " + esc(c.aliases.join(" », « ")) + " »" : ""}</small></span>${k ? `<i class="pr-badge ${k}">${PR_KIND[k]}</i>` : ""}</button>`; };
  const cals = prSet().cals || [], W = prWords(), names = id => (G.list.find(c => c.id === id) || {}).name || id;
  const wl = (k, list) => `<div class="pr-words">${list.map((w, i) => `<span class="pr-word">${esc(w)}<button data-act="prWordDel" data-k="${k}" data-i="${i}" aria-label="Retirer ${esc(w)}">✕</button></span>`).join("")}</div>
    <form data-form="prWord" data-k="${k}" class="inline" autocomplete="off"><input class="input" name="w" maxlength="40" placeholder="${k === "abs" ? "ex. WE papa, chez mamie" : "ex. accueil, arrivée"}" aria-label="Nouveau mot"><button class="btn" type="submit">Ajouter</button></form>`;
  return `<section class="pr-panel">
      <h2 class="pr-h">${prIco(PR_TABS[3][2])}Gestion des enfants</h2>
      <div class="pr-klist">${act.map(row).join("") || `<p class="muted small">Aucun enfant enregistré.</p>`}</div>
      <button class="pr-act orange sm" data-act="prKidNew">+ Ajouter un enfant</button>
      ${arc.length ? `<details class="pr-arch"><summary>Enfants archivés (${arc.length})</summary><div class="pr-klist">${arc.map(row).join("")}</div><p class="muted small">Leur historique reste dans les calendriers, bilans et relevés.</p></details>` : ""}
    </section>
    <section class="pr-panel">
      <h2 class="pr-h">Agendas Google analysés</h2>
      <p class="small">${cals.length ? cals.map(c => `<span class="pr-word">${esc(names(c))}</span>`).join(" ") : "Aucun agenda choisi."}</p>
      <button class="btn" data-act="prCals">Choisir les agendas</button>
      <p class="muted small">Seuls les événements qui contiennent le prénom (ou une variante) d'un enfant enregistré sont lus. Les autres ne sont ni gardés ni envoyés.</p>
    </section>
    <section class="pr-panel">
      <h2 class="pr-h">Mots reconnus dans l'agenda</h2>
      <p class="small"><b>Absence</b> (enfant permanent) : « Mathéo <i>absent</i> », « Kaïs <i>WE papa</i> »…</p>${wl("abs", W.abs)}
      <p class="small" style="margin-top:16px"><b>Relais</b> : le prénom seul suffit (« Lucas ») ; ces mots le confirment aussi.</p>${wl("rel", W.rel)}
      <p class="muted small">Un événement avec le prénom d'un enfant permanent et un autre mot (« Mathéo médecin ») ne change rien. Un cas douteux est mis « à vérifier ». Après une modification, les 12 derniers mois sont relus.</p>
      ${prSet().abs || prSet().rel ? `<button class="linkbtn" data-act="prWordsReset">Rétablir les listes par défaut</button>` : ""}
    </section>`;
}

// Chaque render() recrée le tableau. On repositionne donc le NOUVEL élément,
// sans indicateur global périmé. Une navigation volontaire garde sa position.
let prScrollState = null;
function prPositionCalendar() {
  if (view !== "presences" || PR.tab !== "cal") return;
  const sc = $("#prScroll"); if (!sc) return;
  const key = `${PR.wide}:${PR.y}:${PR.m}:${PR.wk}`;
  const todayCell = sc.querySelector("thead th.td");
  const nameCell = sc.querySelector("thead th.pr-name");
  const initial = todayCell ? Math.max(0, todayCell.offsetLeft - (nameCell?.offsetWidth || 0) - 35) : 0;
  const target = prScrollState?.key === key ? prScrollState.left : initial;
  sc.style.scrollBehavior = "auto";
  sc.scrollLeft = target;
  // Safari peut finaliser le layout après render : réappliquer une seule fois.
  requestAnimationFrame(() => {
    if (!sc.isConnected || $("#prScroll") !== sc) return;
    sc.scrollLeft = target;
  });
  sc.addEventListener("scroll", () => { if (sc.isConnected) prScrollState = { key, left: sc.scrollLeft }; }, { passive: true });
  if (!prScrollState || prScrollState.key !== key) prScrollState = { key, left: target };
}
afterRender = (orig => function () { orig(); prPositionCalendar(); })(afterRender);

/* ---------- feuilles ---------- */
function prDaySheet(cid, d) {
  const c = prChild(cid); if (!c) return;
  const s = PRC.dayStatus(PR.ix, cid, d), who = s.override && member(s.override.member_id);
  const lab = { absence: "lu comme une absence", presence: "lu comme une présence en relais", ignore: "ne change rien", ambig: "à vérifier" };
  const evs = s.evs.map(x => { const rule = PRC.ruleKeys(x.ev).some(k => PR.ix.rules.has(k + "|" + cid)); return `<div class="pr-ev"><b>« ${esc(x.ev.title)} »</b><span>${x.ev.start_day === x.ev.end_day ? prD(x.ev.start_day) : `du ${prD(x.ev.start_day)} au ${prD(x.ev.end_day)}`} · ${lab[x.it]}${rule ? " (votre réponse)" : ""}</span>
      ${x.it === "ambig" ? prAnswerBtns(cid, x.ev, s.kind) : rule ? `<button class="linkbtn small" data-act="prRuleDel" data-c="${cid}" data-g="${esc(x.ev.gid)}">Annuler ma réponse</button>` : ""}</div>`; }).join("");
  const opt = (st, t) => `<button class="pr-opt ${st}" data-act="prSetDay" data-v="${st}" ${s.manual && s.st === st ? 'aria-pressed="true"' : ""}><i class="pr-c ${st}">${prSym(st)}</i>${t}</button>`;
  openSheet(`${c.first_name} · ${cap(prDL(d))}`, `
    <div class="pr-dstat"><i class="pr-c ${s.st} big">${prSym(s.st)}</i><div><b>${PR_ST[s.st]}</b>
      <span>${s.manual ? `Corrigé à la main${who ? " par " + esc(who.name) : ""}${s.override.at ? " le " + esc(new Date(s.override.at).toLocaleDateString("fr-FR")) : ""} · calcul automatique : ${PR_ST[s.auto].toLowerCase()}` : "Calcul automatique"}${s.kind ? ` · accueil ${PR_KIND[s.kind].toLowerCase()}` : " · hors période d'accueil"}</span></div></div>
    <p class="group-h">Google Agenda ce jour-là</p>
    ${evs || `<p class="muted small">Aucun événement concernant ${esc(c.first_name)}. ${s.kind === "permanent" ? "Enfant permanent : présent par défaut." : s.kind === "relais" ? "Enfant en relais : pas d'accueil sans événement." : ""}</p>`}
    <p class="group-h">Corriger cette journée</p>
    <div class="pr-opts">${opt("present", "Présent")}${opt("absent", "Absent")}${opt("none", "Aucun accueil")}</div>
    ${s.manual ? `<button class="btn block" data-act="prSetDay" data-v="">↺ Revenir au calcul automatique</button>` : ""}
    <p class="muted small">Une correction est prioritaire, reste après chaque synchronisation et ne modifie jamais Google Agenda.</p>`, { prC: cid, prD: d });
}
function prAnswerBtns(cid, ev, kind) {
  const k = kind || "permanent", g = esc(ev.gid);
  return `<div class="pr-ans">${k === "relais" ? `<button class="btn small primary" data-act="prRule" data-c="${cid}" data-g="${g}" data-v="presence">Présent ces jours-là</button><button class="btn small" data-act="prRule" data-c="${cid}" data-g="${g}" data-v="ignore">Ne compte pas</button>`
    : `<button class="btn small primary" data-act="prRule" data-c="${cid}" data-g="${g}" data-v="absence">Absent ces jours-là</button><button class="btn small" data-act="prRule" data-c="${cid}" data-g="${g}" data-v="ignore">Ne change rien</button>`}
    <label class="pr-all"><input type="checkbox" data-all="${cid}|${g}"> Même réponse pour tous les « ${esc(ev.title)} »</label></div>`;
}
const PR_WHY = { only: "Le prénom seul ne dit pas si l'enfant est absent.", other: "Ce titre ne dit pas s'il y a un accueil.", both: "Le titre parle à la fois d'absence et de relais.", datesko: "Les dates écrites dans le titre ne correspondent pas aux dates de l'événement.", abs: "Absence d'un enfant en relais ?", rel: "Mot de relais pour un enfant permanent." };
function prAmbSheet() {
  const list = PRC.ambiguous(PR.ix, "0000-01-01", "9999-12-31").sort((a, b) => a.ev.start_day.localeCompare(b.ev.start_day));
  if (!list.length) { closeSheet(); toast("Plus rien à vérifier."); return; }
  openSheet("À vérifier", `<p class="muted small" style="margin-top:4px">Ces événements nomment un enfant mais leur sens n'est pas certain. Rien n'est compté tant que vous n'avez pas répondu ; votre réponse est mémorisée.</p>
    ${list.map(x => { const k = PRC.kindOn(PR.ix, x.child.id, x.days[0]); return `<div class="pr-ev card"><b>${esc(x.child.first_name)} <i class="pr-badge ${k}">${PR_KIND[k]}</i></b><b>« ${esc(x.ev.title)} »</b>
      <span>${x.ev.start_day === x.ev.end_day ? cap(prDL(x.ev.start_day)) : `du ${prD(x.ev.start_day)} au ${prD(x.ev.end_day)}`}</span><span class="muted">${PR_WHY[x.ev.sig] || ""}</span>${prAnswerBtns(x.child.id, x.ev, k)}</div>`; }).join("")}`, { prAmb: true });
}
function prPickSheet() {
  const y = (sheetCtx && sheetCtx.prY) || PR.y;
  openSheet("Choisir le mois", `<div class="pr-head"><button class="pr-arrow" data-act="prPickY" data-v="${y - 1}" aria-label="Année précédente">‹</button><b class="pr-title static">${y}</b><button class="pr-arrow" data-act="prPickY" data-v="${y + 1}" aria-label="Année suivante">›</button></div>
    <div class="pr-months">${PR_MOIS.map((m, i) => `<button class="chip" data-act="prPickM" data-y="${y}" data-v="${i + 1}" aria-pressed="${y === PR.y && i + 1 === PR.m}">${cap(m)}</button>`).join("")}</div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="prNow">Mois actuel</button></div>`, { prY: y });
}
function prCalsSheet() {
  if (!G.list.length) { openSheet("Agendas à analyser", `<p class="small">Connectez d'abord Google Agenda sur ce téléphone, puis revenez ici.</p><div class="btns"><button class="btn primary" data-act="prGConnect">Connecter Google Agenda</button></div>`); if (G.connected) gFetch().then(() => { if (G.list.length && $("#sheet").open) prCalsSheet(); }); return; }
  const cur = new Set(prSet().cals || []);
  openSheet("Agendas à analyser", `<p class="muted small" style="margin:6px 0 10px">Choisissez les agendas où vous notez les absences et les relais. Le choix vaut pour tout le foyer.</p>
    <form data-form="prCals"><div class="chips">${G.list.map(c => `<button type="button" class="chip" data-chip="prCal" data-multi data-v="${esc(c.id)}" aria-pressed="${cur.has(c.id)}"><span class="cat-dot" style="--c:${esc(c.color)}"></span>${esc(c.name)}</button>`).join("")}</div>
    <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer et lire l'agenda</button></div></form>`);
}

/* ----- fiche enfant (ajout / modification, périodes d'accueil) ----- */
function prKidSheet(id, draft) {
  const c = id ? prChild(id) : null;
  const d = draft || { first_name: c ? c.first_name : "", last_name: c ? c.last_name : "", aliases: c ? (c.aliases || []).join(", ") : "",
    periods: c ? (PR.ix.periods.get(c.id) || []).map(p => ({ kind: p.kind, start_day: p.start_day, end_day: p.end_day || "" })) : [{ kind: "permanent", start_day: today(), end_day: "" }] };
  const per = d.periods.map((p, i) => `<div class="pr-per">
      <div class="seg" role="group" aria-label="Type d'accueil">${["permanent", "relais"].map(k => `<button type="button" data-chip="kind${i}" data-v="${k}" aria-pressed="${p.kind === k}">${k === "permanent" ? "Permanent" : "Relais"}</button>`).join("")}</div>
      <div class="inline"><label class="field"><span class="label">Du</span><input class="input" type="date" name="start${i}" value="${esc(p.start_day)}" required></label><label class="field"><span class="label">Au (facultatif)</span><input class="input" type="date" name="end${i}" value="${esc(p.end_day || "")}"></label></div>
      ${d.periods.length > 1 ? `<button type="button" class="linkbtn small danger" data-act="prPerDel" data-i="${i}">Retirer cette période</button>` : ""}</div>`).join("");
  openSheet(c ? prName(c) : "Ajouter un enfant", `<form data-form="prKid" autocomplete="off">
    <div class="inline"><label class="field"><span class="label">Prénom</span><input class="input" name="first_name" maxlength="40" required value="${esc(d.first_name)}"></label>
      <label class="field"><span class="label">Nom (facultatif)</span><input class="input" name="last_name" maxlength="60" value="${esc(d.last_name)}"></label></div>
    <label class="field"><span class="label">Autres écritures dans l'agenda (facultatif)</span><input class="input" name="aliases" maxlength="200" placeholder="ex. Matheo, Mat" value="${esc(d.aliases)}"></label>
    <p class="group-h">Périodes d'accueil</p>
    <p class="muted small" style="margin-top:-4px">Un enfant qui passe de relais à permanent a deux périodes : les anciennes gardent leur règle de calcul.</p>
    ${per}
    <div class="btns"><button type="button" class="btn small" data-act="prPerAdd">+ Changement de type d'accueil</button></div>
    <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer</button></div>
    ${c ? `<div class="btns">${c.archived ? `<button type="button" class="btn" data-act="prArchive" data-v="0">Réactiver ${esc(c.first_name)}</button>` : `<button type="button" class="btn" data-act="prArchive" data-v="1">Archiver (départ définitif)</button>`}</div>
      <p class="muted small">Archiver garde tout l'historique : calendriers, bilans et relevés des années passées restent consultables.</p>` : ""}
  </form>`, { prKid: id || null });
}
function prKidDraft() {
  const f = $("#sheetIn form[data-form=prKid]"); if (!f) return null;
  const fd = new FormData(f), n = f.querySelectorAll(".pr-per").length, periods = [];
  for (let i = 0; i < n; i++) periods.push({ kind: chipVal(f, "kind" + i) || "permanent", start_day: fd.get("start" + i) || "", end_day: fd.get("end" + i) || "" });
  return { first_name: (fd.get("first_name") || "").trim(), last_name: (fd.get("last_name") || "").trim(), aliases: fd.get("aliases") || "", periods };
}

/* ---------- actions ---------- */
async function prSetDay(cid, d, st) {
  const hid = S.hh.id, k = cid + "|" + d;
  const res = st ? await sb.from("presence_overrides").upsert({ household_id: hid, child_id: cid, day: d, status: st, member_id: S.me, at: new Date().toISOString() }, { onConflict: "household_id,child_id,day" })
    : await sb.from("presence_overrides").delete().eq("household_id", hid).eq("child_id", cid).eq("day", d);
  if (res.error) { toast("Correction non enregistrée : " + res.error.message); return; }
  PR.data.overrides = PR.data.overrides.filter(o => o.child_id + "|" + o.day !== k);
  if (st) PR.data.overrides.push({ household_id: hid, child_id: cid, day: d, status: st, member_id: S.me, at: new Date().toISOString() });
  prIx(); toast(st ? "Journée corrigée." : "Calcul automatique rétabli.");
}
async function prRule(cid, gid, dec, all) {
  const ev = PR.data.events.find(e => e.child_id === cid && e.gid === gid); if (!ev) return;
  const key = all ? "t:" + PRC.norm(ev.title) : "s:" + (ev.series || ev.gid);
  const row = { household_id: S.hh.id, key, child_id: cid, decision: dec, member_id: S.me, at: new Date().toISOString() };
  const { error } = await sb.from("presence_rules").upsert(row, { onConflict: "household_id,key,child_id" });
  if (error) { toast("Réponse non enregistrée : " + error.message); return; }
  PR.data.rules = PR.data.rules.filter(r => !(r.key === key && r.child_id === cid)).concat([row]); prIx();
  toast("Réponse mémorisée.");
}
async function prRuleDel(cid, gid) {
  const ev = PR.data.events.find(e => e.child_id === cid && e.gid === gid); if (!ev) return;
  for (const key of PRC.ruleKeys(ev)) { const { error } = await sb.from("presence_rules").delete().eq("household_id", S.hh.id).eq("key", key).eq("child_id", cid); if (error) { toast(error.message); return; } }
  const ks = new Set(PRC.ruleKeys(ev)); PR.data.rules = PR.data.rules.filter(r => !(r.child_id === cid && ks.has(r.key))); prIx();
}
// relire une longue période après un changement de prénoms ou de mots
const prResync = () => prSync(PRC.dAdd(today(), -366), PRC.dAdd(today(), 120), false);
async function prSaveKid(id, d) {
  if (!d.first_name) { toast("Indiquez le prénom."); return false; }
  const ps = d.periods.filter(p => p.start_day).sort((a, b) => a.start_day.localeCompare(b.start_day));
  if (!ps.length) { toast("Indiquez la date de début d'accueil."); return false; }
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].end_day && ps[i].end_day < ps[i].start_day) { toast("Une date de fin est avant la date de début."); return false; }
    const nx = ps[i + 1]; if (nx && (!ps[i].end_day || ps[i].end_day >= nx.start_day)) ps[i].end_day = PRC.dAdd(nx.start_day, -1); // la période suivante commence le lendemain
  }
  const hid = S.hh.id, cid = id || uuid();
  const aliases = [...new Set(String(d.aliases).split(/[,;]/).map(s => s.trim()).filter(Boolean))].slice(0, 12);
  const child = { id: cid, household_id: hid, first_name: d.first_name.slice(0, 40), last_name: d.last_name.slice(0, 60), aliases };
  const old = prChild(cid), namesChanged = !old || PRC.norm(old.first_name) !== PRC.norm(child.first_name) || (old.aliases || []).join("|") !== aliases.join("|");
  let r = id ? await sb.from("children").update({ first_name: child.first_name, last_name: child.last_name, aliases }).eq("id", cid).eq("household_id", hid) : await sb.from("children").insert(child);
  if (r.error) { toast("Enregistrement impossible : " + r.error.message); return false; }
  if (id) { r = await sb.from("child_periods").delete().eq("household_id", hid).eq("child_id", cid); if (r.error) { toast(r.error.message); return false; } }
  const rows = ps.map(p => ({ id: uuid(), household_id: hid, child_id: cid, kind: p.kind, start_day: p.start_day, end_day: p.end_day || null }));
  r = await sb.from("child_periods").insert(rows); if (r.error) { toast("Périodes non enregistrées : " + r.error.message); return false; }
  PR.data.children = PR.data.children.filter(c => c.id !== cid).concat([{ ...(old || { archived: false, notes: "" }), ...child }]).sort((a, b) => a.first_name.localeCompare(b.first_name, "fr"));
  PR.data.periods = PR.data.periods.filter(p => p.child_id !== cid).concat(rows);
  prIx();
  toast(id ? "Fiche enregistrée." : `${child.first_name} ajouté.`);
  if (namesChanged) prResync();
  return true;
}
async function prArchive(cid, on) {
  const { error } = await sb.from("children").update({ archived: on }).eq("id", cid).eq("household_id", S.hh.id);
  if (error) { toast(error.message); return; }
  const c = prChild(cid); c.archived = on;
  // un départ ferme la période en cours (si elle n'a pas de fin)
  if (on) { const open = PR.data.periods.filter(p => p.child_id === cid && !p.end_day); for (const p of open) { const end = today() < p.start_day ? p.start_day : today(); await sb.from("child_periods").update({ end_day: end }).eq("id", p.id).eq("household_id", S.hh.id); p.end_day = end; } }
  prIx(); closeSheet(); render();
  toast(on ? `${c.first_name} archivé : son historique est conservé.` : `${c.first_name} est de nouveau actif.`);
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act],[data-chip]"); if (!b) return;
  const act = b.dataset.act, v = b.dataset.v;
  if (!act || !act.startsWith("pr")) return;
  switch (act) {
    case "prTab": PR.tab = v; render(); window.scrollTo(0, 0); break;
    case "prReload": PR.loadErr = ""; prLoad(true); render(); break;
    case "prNav": {
      const n = +v;
      if (PR.wide === "week") { PR.wk = PRC.dAdd(PR.wk, 7 * n); PR.y = +PR.wk.slice(0, 4); PR.m = +PR.wk.slice(5, 7); }
      else { PR.m += n; if (PR.m < 1) { PR.m = 12; PR.y--; } if (PR.m > 12) { PR.m = 1; PR.y++; } }
      render(); break;
    }
    case "prWide": PR.wide = v; if (v === "week") { const td = today(); PR.wk = td.startsWith(`${PR.y}-${pad(PR.m)}`) ? mondayOf(td) : mondayOf(PRC.mFirst(PR.y, PR.m)); } render(); break;
    case "prNow": { const td = today(); PR.y = +td.slice(0, 4); PR.m = +td.slice(5, 7); PR.wk = mondayOf(td); closeSheet(); render(); break; }
    case "prPick": prPickSheet(); break;
    case "prPickY": sheetCtx = { prY: +v }; prPickSheet(); break;
    case "prPickM": PR.y = +b.dataset.y; PR.m = +v; PR.wide = "month"; closeSheet(); render(); break;
    case "prYear": PR.an.y += +v; render(); break;
    case "prAnChild": PR.an.child = v; render(); break;
    case "prAnKind": PR.an.kind = v; render(); break;
    case "prSyncYear": prSync(`${PR.an.y}-01-01`, `${PR.an.y}-12-31`, true); break;
    case "prRefresh": PR.synced.clear(); { const [a, z] = prWin(); prSync(a, z, true); } break;
    case "prCals": prCalsSheet(); break;
    case "prGConnect": gConnect(false, "presences"); break;
    case "prDay": prDaySheet(b.dataset.c, b.dataset.d); break;
    case "prSetDay": { const c = sheetCtx && sheetCtx.prC, d = sheetCtx && sheetCtx.prD; if (!c) break; await prSetDay(c, d, v || null); prDaySheet(c, d); pending = true; break; }
    case "prAmb": prAmbSheet(); break;
    case "prRule": case "prRuleDel": {
      const cb = b.closest(".pr-ans") && b.closest(".pr-ans").querySelector("input[data-all]");
      if (act === "prRule") await prRule(b.dataset.c, b.dataset.g, v, !!(cb && cb.checked)); else await prRuleDel(b.dataset.c, b.dataset.g);
      if (sheetCtx && sheetCtx.prAmb) prAmbSheet(); else if (sheetCtx && sheetCtx.prC) prDaySheet(sheetCtx.prC, sheetCtx.prD);
      pending = true; break;
    }
    case "prKid": prKidSheet(v); break;
    case "prKidNew": prKidSheet(null); break;
    case "prPerAdd": { const d = prKidDraft(), last = d.periods[d.periods.length - 1]; d.periods.push({ kind: last && last.kind === "relais" ? "permanent" : "relais", start_day: today(), end_day: "" }); prKidSheet(sheetCtx.prKid, d); break; }
    case "prPerDel": { const d = prKidDraft(); d.periods.splice(+b.dataset.i, 1); prKidSheet(sheetCtx.prKid, d); break; }
    case "prArchive": { const id = sheetCtx && sheetCtx.prKid; if (id) await prArchive(id, v === "1"); break; }
    case "prWordDel": { const W = prWords(), k = b.dataset.k, list = W[k].slice(); list.splice(+b.dataset.i, 1); await prSaveSet({ [k]: list }); render(); prResync(); break; }
    case "prWordsReset": { const s = { ...prSet() }; delete s.abs; delete s.rel; S.hh.presence_settings = s; await prSaveSet({}); render(); prResync(); break; }
    case "prExport": prExportSheet(v, b.dataset.y ? +b.dataset.y : null); break;
    case "prSave": if (window.__prFile) prDeliver(window.__prFile.blob, window.__prFile.name); break;
  }
});
// période du relevé : afficher les bons champs
document.addEventListener("click", e => {
  const b = e.target.closest("[data-chip=prPer]"); if (!b) return;
  const f = b.closest("form"); f.querySelectorAll("[data-per]").forEach(x => { x.hidden = x.dataset.per !== b.dataset.v; });
});
document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form^=pr]"); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, btn = f.querySelector("[type=submit]");
  if (kind === "prKid") { if (btn) btn.disabled = true; const ok = await prSaveKid(sheetCtx && sheetCtx.prKid, prKidDraft()); if (btn) btn.disabled = false; if (ok) { closeSheet(); render(); } return; }
  if (kind === "prCals") { const cals = chipVals(f, "prCal"); await prSaveSet({ cals }); closeSheet(); render(); if (cals.length) prResync(); return; }
  if (kind === "prWord") {
    const w = String(new FormData(f).get("w") || "").trim().slice(0, 40), k = f.dataset.k; if (!w) return;
    const W = prWords(); if (W[k].some(x => PRC.norm(x) === PRC.norm(w))) { toast("Ce mot est déjà dans la liste."); return; }
    await prSaveSet({ [k]: [...W[k], w] }); render(); prResync(); return;
  }
  if (kind === "prExport") {
    const fd = Object.fromEntries(new FormData(f).entries()), per = chipVal(f, "prPer"), kids = chipVals(f, "prKid");
    let from, to;
    if (per === "month") { const [y, m] = String(fd.month || "").split("-").map(Number); if (!y) return toast("Choisissez le mois."); from = PRC.mFirst(y, m); to = PRC.mLast(y, m); }
    else if (per === "year") { from = `${fd.year}-01-01`; to = `${fd.year}-12-31`; }
    else { from = fd.from; to = fd.to; if (!from || !to || to < from) return toast("Vérifiez les dates de la période."); if (PRC.dDiff(from, to) > 3 * 366) return toast("Période trop longue (3 ans au plus)."); }
    if (!kids.length) return toast("Choisissez au moins un enfant.");
    if (from > today()) return toast("Cette période n'a pas encore commencé : rien à relever.");
    if (btn) { btn.disabled = true; btn.textContent = "Préparation…"; }
    try {
      const file = await (sheetCtx.prFmt === "pdf" ? prPdf : prXlsx)({ kids: kids.map(prChild).filter(Boolean), from, to, per });
      window.__prFile = file;
      openSheet("Fichier prêt", `<p class="small"><b>${esc(file.name)}</b></p><p class="muted small">Il contient des données personnelles d'enfants confiés : ne le partagez qu'avec les personnes autorisées.</p>
        <div class="sheet-sticky btns"><button class="btn primary block" data-act="prSave">${navigator.share ? "Enregistrer ou partager" : "Télécharger"}</button></div>`);
    } catch (err) { toast("Export impossible : " + (err.message || err)); if (btn) { btn.disabled = false; btn.textContent = "Créer le fichier"; } }
  }
});
function prExportSheet(fmt, year) {
  const td = today(), y = year || PR.y, [from, to] = prMonth();
  const kids = PR.data.children.filter(c => !c.archived || PRC.childrenFor(PR.ix, `${y}-01-01`, `${y}-12-31`).includes(c));
  const years = []; for (let k = +td.slice(0, 4) + 1; k >= 2015; k--) years.push(k);
  const per = year ? "year" : "month";
  openSheet(fmt === "pdf" ? "Générer un relevé PDF" : "Exporter vers Excel", `<form data-form="prExport">
    <p class="group-h">Enfants</p>
    <div class="chips">${kids.map(c => `<button type="button" class="chip" data-chip="prKid" data-multi data-v="${c.id}" aria-pressed="${!PR.an.child || PR.an.child === c.id}">${esc(c.first_name)}${c.archived ? " (archivé)" : ""}</button>`).join("")}</div>
    <p class="group-h">Période</p>
    <div class="seg" role="group">${[["month", "Un mois"], ["year", "Une année"], ["custom", "Personnalisée"]].map(([v, t]) => `<button type="button" data-chip="prPer" data-v="${v}" aria-pressed="${per === v}">${t}</button>`).join("")}</div>
    <div data-per="month" ${per === "month" ? "" : "hidden"}><label class="field"><span class="label">Mois</span><input class="input" type="month" name="month" value="${from.slice(0, 7)}"></label></div>
    <div data-per="year" ${per === "year" ? "" : "hidden"}><label class="field"><span class="label">Année</span><select class="input" name="year">${years.map(k => `<option ${k === y ? "selected" : ""}>${k}</option>`).join("")}</select></label></div>
    <div data-per="custom" hidden><div class="inline"><label class="field"><span class="label">Du</span><input class="input" type="date" name="from" value="${from}"></label><label class="field"><span class="label">Au</span><input class="input" type="date" name="to" value="${to}"></label></div></div>
    <p class="muted small">${fmt === "pdf" ? "Format A4, une page par enfant. Les journées corrigées à la main et celles à vérifier y sont signalées." : "Feuilles : journées, grille par mois, totaux mensuels et annuels."} Le fichier est fabriqué sur ce téléphone.</p>
    <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Créer le fichier</button></div></form>`, { prFmt: fmt });
}
