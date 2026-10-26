"use strict";
/* Maisonnée : les tâches dans Google Agenda.
   Quand c'est activé (Ma famille), ce téléphone recopie les tâches dans l'agenda choisi (« Agendas » par défaut) :
   - chaque tâche prévue, de aujourd'hui à 2 semaines, en événement « toute la journée » (« 🧹 Sortir les poubelles · Franck ») ;
   - chaque tâche faite des 7 derniers jours, ce jour-là, avec « ✓ » devant.
   Chaque événement porte une étiquette invisible (foyer + tâche + jour) : la copie se met à jour, sans doublon,
   même si un autre téléphone du foyer le fait aussi. Une tâche supprimée ou déplacée disparaît de l'agenda. */

const GT = { busy: false, sig: "", at: 0, err: "", n: 0 };
// the choice is kept with the household (the server copies the tasks even when the app is closed, script 11);
// without that column yet, only on this phone
const gtConf = () => (S.hh && S.hh.google_tasks) || LS.get("mz_gtasks", { on: false, cal: "" });
let gtNoServer = false;
async function gtSave(c) {
  LS.set("mz_gtasks", c);
  if (mode !== "cloud" || !S.hh) return;
  const v = { on: !!c.on, cal: c.cal || "", user_id: user ? user.id : null };
  if (S.hh.google_tasks) S.hh.google_tasks = v;
  const { error } = await sb.from("households").update({ google_tasks: v }).eq("id", S.hh.id);
  if (error) { gtNoServer = true; return; }
  gtNoServer = false; S.hh.google_tasks = v; saveLocal();
}
const gtWritable = () => ((typeof G !== "undefined" && G.list) || []).filter(c => c.accessRole === "owner" || c.accessRole === "writer");
const gtCal = () => { const c = gtConf().cal; return gtWritable().some(x => x.id === c) ? c : (defaultDest() !== "local" ? defaultDest() : ""); };

// what the calendar should show, keyed by an invisible label
function gtWanted() {
  const out = {}, d0 = today(), from = addDays(d0, -7), to = addDays(d0, 14);
  const who = id => { const m = member(id); return m ? " · " + m.name : ""; };
  for (const t of live()) {
    let d = t.next_due, a = t.assignee, guard = 0;
    while (d && d <= to && guard++ < 60) {
      const day = d < d0 ? d0 : d; // late: shown today
      const k = `${t.id}|${day}`;
      if (!out[k]) out[k] = { day, title: `🧹 ${t.title}${who(a)}`, room: t.room || "" };
      d = nextDue(t, d);
      if (t.rotate && a) a = nextInTurn(a);
    }
  }
  for (const l of S.log || []) {
    if (!l.done_on || l.done_on < from || l.done_on > d0) continue;
    out[`log|${l.id}`] = { day: l.done_on, title: `✓ ${l.title}${who(l.member_id)}`, room: "" };
    delete out[`${l.task_id}|${l.done_on}`]; // done today: the planned one is replaced by the done one
  }
  return { out, from, to };
}
async function gReq(method, path, body) {
  const r = await fetch("https://www.googleapis.com/calendar/v3/" + path, { method, headers: { Authorization: "Bearer " + G.tok.t, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { G.tok = null; throw new Error("expired"); }
  if (!r.ok && !(method === "DELETE" && (r.status === 404 || r.status === 410))) throw new Error("Google " + r.status);
  return method === "DELETE" ? null : r.json();
}
async function gtSync(force) {
  const c = gtConf(); if (!c.on || mode !== "cloud" || !S.hh || GT.busy) return;
  const { out, from, to } = gtWanted();
  const sig = JSON.stringify(out) + "|" + gtCal();
  if (!force && sig === GT.sig && Date.now() - GT.at < 30 * 60e3) return;
  GT.busy = true;
  try {
    if (!(await gEnsure())) throw new Error("Google Agenda n'est pas connecté sur ce téléphone.");
    const cal = gtCal(); if (!cal) throw new Error("Aucun agenda Google où écrire.");
    const base = "calendars/" + encodeURIComponent(cal) + "/events";
    const have = {};
    let page = "";
    do {
      const q = new URLSearchParams({ sharedExtendedProperty: "mzhh=" + S.hh.id, timeMin: from + "T00:00:00Z", timeMax: addDays(to, 2) + "T00:00:00Z", singleEvents: "true", maxResults: "2500" });
      if (page) q.set("pageToken", page);
      const r = await gReq("GET", base + "?" + q);
      for (const e of r.items || []) {
        const k = e.extendedProperties && e.extendedProperties.shared && e.extendedProperties.shared.mzk;
        if (!k) continue;
        if (have[k]) await gReq("DELETE", base + "/" + encodeURIComponent(e.id)); // duplicate made by two phones at once
        else have[k] = e;
      }
      page = r.nextPageToken || "";
    } while (page);
    let n = 0;
    for (const [k, w] of Object.entries(out)) {
      const body = { summary: w.title, description: "Tâche Maisonnée" + (w.room ? " · " + w.room : ""), start: { date: w.day }, end: { date: addDays(w.day, 1) }, transparency: "transparent",
        extendedProperties: { shared: { mzhh: S.hh.id, mzk: k } } };
      const e = have[k];
      if (!e) { await gReq("POST", base, body); n++; }
      else if (e.summary !== w.title || (e.start && e.start.date) !== w.day) { await gReq("PATCH", base + "/" + encodeURIComponent(e.id), body); n++; }
      delete have[k];
    }
    // tasks deleted or moved, planned days that passed without being done: only what was really done stays
    for (const e of Object.values(have)) { await gReq("DELETE", base + "/" + encodeURIComponent(e.id)); n++; }
    GT.sig = sig; GT.at = Date.now(); GT.err = ""; GT.n = n;
  } catch (e) { GT.err = e.message || "Erreur Google Agenda"; console.warn("Tâches → Google", e); }
  finally { GT.busy = false; if (view === "foyer") softRender(); }
}
// after each change of the tasks (here or on another phone), and every half hour
setInterval(() => { if (screen === "app" && document.visibilityState === "visible") gtSync(false); }, 20e3);
setTimeout(() => {
  // turned on here before the server could do it: hand the choice to the household
  const loc = LS.get("mz_gtasks", null);
  if (mode === "cloud" && S.hh && "google_tasks" in S.hh && !S.hh.google_tasks && loc && loc.on) gtSave(loc);
  gtSync(false);
}, 6000);

// switched off, or another calendar chosen: the tasks still to come leave the old calendar
async function gtClear(cal) {
  if (!cal || !S.hh || !(await gEnsure())) return;
  const base = "calendars/" + encodeURIComponent(cal) + "/events";
  try {
    const q = new URLSearchParams({ sharedExtendedProperty: "mzhh=" + S.hh.id, timeMin: today() + "T00:00:00Z", singleEvents: "true", maxResults: "2500" });
    const r = await gReq("GET", base + "?" + q);
    for (const e of r.items || []) if (e.extendedProperties && e.extendedProperties.shared && e.extendedProperties.shared.mzk) await gReq("DELETE", base + "/" + encodeURIComponent(e.id));
  } catch (e) { console.warn("Tâches → Google", e); }
}
const foyerViewGT = VIEWS.foyer;
VIEWS.foyer = function () {
  const base = foyerViewGT();
  if (mode !== "cloud" || !(typeof G !== "undefined" && G.connected)) return base;
  const c = gtConf(), cals = gtWritable(), cur = gtCal();
  if (!cals.length) return base;
  return base + `<h2>Tâches dans Google Agenda</h2><div class="card">
    <label class="switch" style="margin:0"><span><strong>Mettre les tâches dans Google Agenda</strong><br><span class="muted small">Toute la journée, des 2 prochaines semaines ; les tâches faites passent en « ✓ ».</span></span><input type="checkbox" data-gtasks ${c.on ? "checked" : ""}></label>
    ${c.on ? `<label class="field"><span class="label">Agenda</span><select class="input" data-gtcal>${cals.map(x => `<option value="${esc(x.id)}" ${x.id === cur ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <p class="muted small" style="margin:6px 0 0">${GT.busy ? "Mise à jour de l'agenda…" : GT.err ? "⚠️ " + esc(GT.err) : GT.at ? "À jour · " + new Date(GT.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Première mise à jour dans quelques secondes."} Il suffit de l'activer sur un seul téléphone.</p>
      ${(() => { const sv = S.hh && S.hh.google_tasks;
        if (gtNoServer || !sv) return `<p class="muted small" style="margin:6px 0 0">Appli fermée : pas encore de mise à jour par le serveur (script supabase-foyer-11.sql à coller, puis fonction maison-push-dispatch à redéployer).</p>`;
        return `<p class="muted small" style="margin:6px 0 0">Appli fermée : le serveur met l'agenda à jour toutes les 5 minutes${sv.at ? ` · dernier passage ${esc(new Date(sv.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }))}${sv.err ? " · ⚠️ " + esc(sv.err) : ""}` : " (pas encore passé)"}.</p>`; })()}
      <div class="btns"><button class="btn" data-act="gtNow">Mettre à jour maintenant</button></div>` : ""}</div>`;
};
document.addEventListener("change", e => {
  if (e.target.matches("[data-gtasks]")) {
    const c = { ...gtConf() }, old = gtCal(); c.on = e.target.checked; if (!c.cal) c.cal = old; GT.sig = ""; gtSave(c).then(render); render();
    if (c.on) { toast("Les tâches vont apparaître dans Google Agenda."); gtSync(true); } else { toast("Les tâches à venir sont retirées de Google Agenda."); gtClear(old); }
  }
  if (e.target.matches("[data-gtcal]")) { const c = { ...gtConf() }, old = gtCal(); c.cal = e.target.value; GT.sig = ""; gtSave(c).then(() => gtClear(old)).then(() => gtSync(true)); }
});
document.addEventListener("click", e => { if (e.target.closest("[data-act=gtNow]")) { gtSync(true); render(); } });
