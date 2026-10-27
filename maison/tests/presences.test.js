/* Les 12 tests obligatoires du cahier des charges « Présences des enfants », plus quelques cas de dates.
   Dans Node :  node maison/tests/presences.test.js
   Dans un navigateur : ouvrir maison/tests/presences.test.html */
(function () {
  const P = typeof module !== "undefined" && module.exports !== undefined && typeof require === "function" ? require("../presences-core.js") : window.PRC;
  const out = [], ok = (name, cond, info) => out.push({ name, ok: !!cond, info: cond ? "" : info || "" });
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Novembre 2026 : ven 6, sam 7, dim 8 ; mercredi 11
  const C = [
    { id: "matheo", first_name: "Mathéo", aliases: ["Matheo", "Mat"] },
    { id: "kais", first_name: "Kaïs", aliases: [] },
    { id: "loic", first_name: "Loïc", aliases: [] },
    { id: "lucas", first_name: "Lucas", aliases: [] },
    { id: "emma", first_name: "Emma", aliases: [] }
  ];
  const PER = [
    { child_id: "matheo", kind: "permanent", start_day: "2024-01-01", end_day: null },
    { child_id: "kais", kind: "permanent", start_day: "2024-01-01", end_day: null },
    { child_id: "loic", kind: "permanent", start_day: "2024-01-01", end_day: null },
    { child_id: "lucas", kind: "relais", start_day: "2026-01-01", end_day: "2026-02-28" },
    { child_id: "lucas", kind: "permanent", start_day: "2026-03-01", end_day: null },
    { child_id: "emma", kind: "relais", start_day: "2025-01-01", end_day: null }
  ];
  const allDay = (id, title, a, bEx, extra) => ({ id, summary: title, start: { date: a }, end: { date: bEx }, ...extra });
  const build = (items, more = {}) => P.index({ children: C, periods: PER, events: P.rowsFromGoogle(items, "cal", C), overrides: [], rules: [], ...more });
  const days = (ix, id, a, b) => [...P.eachDay(a, b)].map(d => P.dayStatus(ix, id, d).st);

  // Test 1 — permanent absent du vendredi au dimanche (fin exclusive Google = lundi)
  let ix = build([allDay("e1", "Mathéo absent", "2026-11-06", "2026-11-09")]);
  ok("Test 1 · permanent absent 3 jours → 0 présent", eq(days(ix, "matheo", "2026-11-06", "2026-11-08"), ["absent", "absent", "absent"]) && P.dayStatus(ix, "matheo", "2026-11-09").st === "present", days(ix, "matheo", "2026-11-05", "2026-11-09"));

  // Test 2 — relais de trois jours (Emma est en relais)
  ix = build([allDay("e2", "Emma", "2026-11-06", "2026-11-09")]);
  ok("Test 2 · relais ven→dim → 3 présents", P.stats(ix, "emma", "2026-11-01", "2026-11-30").present === 3, JSON.stringify(P.stats(ix, "emma", "2026-11-01", "2026-11-30")));

  // Test 3 — relais d'une journée, avec horaires (quelques heures suffisent)
  ix = build([{ id: "e3", summary: "Emma relais", start: { dateTime: "2026-11-11T14:00:00+01:00" }, end: { dateTime: "2026-11-11T18:00:00+01:00" } }]);
  ok("Test 3 · relais le mercredi → 1 présent", P.stats(ix, "emma", "2026-11-01", "2026-11-30").present === 1 && P.dayStatus(ix, "emma", "2026-11-11").st === "present");

  // Test 4 — permanent sans événement : tout le mois présent
  ix = build([]);
  const s4 = P.stats(ix, "kais", "2026-11-01", "2026-11-30");
  ok("Test 4 · permanent sans événement → 30/30", s4.present === 30 && s4.absent === 0, JSON.stringify(s4));

  // Test 5 — suppression d'une absence (la correction manuelle reste)
  const before = P.rowsFromGoogle([allDay("e5", "Mathéo absent", "2026-11-06", "2026-11-09")], "cal", C);
  const ov5 = [{ child_id: "matheo", day: "2026-11-07", status: "absent" }];
  const r5 = P.reconcile(before, [], "2026-11-01", "2026-11-30");
  const kept5 = before.filter(r => !r5.deletes.includes(r));
  ix = P.index({ children: C, periods: PER, events: kept5, overrides: ov5, rules: [] });
  ok("Test 5 · absence supprimée → présent, sauf correction", r5.deletes.length === 1 && eq(days(ix, "matheo", "2026-11-06", "2026-11-08"), ["present", "absent", "present"]));

  // Test 6 — relais prolongé de deux jours
  const v1 = P.rowsFromGoogle([allDay("e6", "Emma", "2026-11-06", "2026-11-09")], "cal", C);
  const v2 = P.rowsFromGoogle([allDay("e6", "Emma", "2026-11-06", "2026-11-11")], "cal", C);
  const a6 = P.stats(P.index({ children: C, periods: PER, events: v1 }), "emma", "2026-11-01", "2026-11-30").present;
  const b6 = P.stats(P.index({ children: C, periods: PER, events: v2 }), "emma", "2026-11-01", "2026-11-30").present;
  ok("Test 6 · relais prolongé de 2 jours → +2", b6 - a6 === 2, a6 + " → " + b6);

  // Test 7 — correction manuelle conservée après synchro
  const ov7 = [{ child_id: "kais", day: "2026-11-03", status: "absent" }];
  const sync7 = P.rowsFromGoogle([allDay("x", "Kaïs médecin", "2026-11-03", "2026-11-04")], "cal", C);
  ix = P.index({ children: C, periods: PER, events: sync7, overrides: ov7 });
  const d7 = P.dayStatus(ix, "kais", "2026-11-03");
  ok("Test 7 · correction gardée après synchro", d7.st === "absent" && d7.manual && d7.auto === "present");

  // Test 8 — enfant archivé : historique consultable
  const C8 = C.map(c => c.id === "loic" ? { ...c, archived: true } : c);
  const PER8 = PER.map(p => p.child_id === "loic" ? { ...p, end_day: "2026-06-30" } : p);
  ix = P.index({ children: C8, periods: PER8, events: [] });
  ok("Test 8 · archivé : visible sur ses mois d'accueil, pas après", P.childrenFor(ix, "2026-05-01", "2026-05-31").some(c => c.id === "loic") && !P.childrenFor(ix, "2026-11-01", "2026-11-30").some(c => c.id === "loic") && P.stats(ix, "loic", "2026-05-01", "2026-05-31").present === 31);

  // Test 9 — relais puis permanent : chaque jour suit la règle de SA période
  ix = build([allDay("e9", "Lucas", "2026-02-10", "2026-02-13")]);
  const feb = P.stats(ix, "lucas", "2026-02-01", "2026-02-28"), mar = P.stats(ix, "lucas", "2026-03-01", "2026-03-31");
  ok("Test 9 · relais en février (3 j), permanent en mars (31 j)", feb.present === 3 && feb.absent === 0 && mar.present === 31, JSON.stringify([feb, mar]));

  // Test 10 — fin exclusive : pas de jour en plus (journée entière et plusieurs jours)
  const e10 = P.eventDays(allDay("a", "x", "2026-11-06", "2026-11-09"));
  const e10b = P.eventDays(allDay("b", "x", "2026-11-11", "2026-11-12"));
  const e10c = P.eventDays({ start: { dateTime: "2026-11-06T18:00:00+01:00" }, end: { dateTime: "2026-11-09T00:00:00+01:00" } });
  ok("Test 10 · fin exclusive Google respectée", eq(e10, { start: "2026-11-06", end: "2026-11-08" }) && eq(e10b, { start: "2026-11-11", end: "2026-11-11" }) && eq(e10c, { start: "2026-11-06", end: "2026-11-08" }), JSON.stringify([e10, e10b, e10c]));

  // Test 11 — événement ambigu : signalé, pas appliqué ; la réponse est mémorisée
  ix = build([allDay("e11", "Mathéo", "2026-11-12", "2026-11-13")]);
  const d11 = P.dayStatus(ix, "matheo", "2026-11-12"), amb = P.ambiguous(ix, "2026-11-01", "2026-11-30");
  const ev11 = P.rowsFromGoogle([allDay("e11", "Mathéo", "2026-11-12", "2026-11-13")], "cal", C);
  const ix11 = P.index({ children: C, periods: PER, events: ev11, rules: [{ key: "s:e11", child_id: "matheo", decision: "absence" }] });
  ok("Test 11 · ambigu → « à vérifier », puis réponse mémorisée", d11.st === "present" && d11.unsure && amb.length === 1 && P.dayStatus(ix11, "matheo", "2026-11-12").st === "absent" && !P.ambiguous(ix11, "2026-11-01", "2026-11-30").length);

  // Test 12 — Google inaccessible : rien n'est remplacé (la synchro n'appelle reconcile qu'après une lecture complète)
  const prev = P.rowsFromGoogle([allDay("e12", "Mathéo absent", "2026-11-06", "2026-11-09")], "cal", C);
  let store = prev.slice(), err = null;
  async function sync(fetcher) { const got = await fetcher(); const r = P.reconcile(store, got, "2026-11-01", "2026-11-30"); store = store.filter(x => !r.deletes.includes(x)).concat(r.upserts.filter(u => !store.some(s => s.gid === u.gid && s.child_id === u.child_id))); }
  const t12 = sync(() => Promise.reject(new Error("Google indisponible"))).catch(e => { err = e; }).then(() => {
    ok("Test 12 · Google inaccessible → données précédentes gardées", err && store.length === 1 && store[0].gid === "e12");
  });

  // Cas supplémentaires
  const S = t => P.analyse(t, C).map(a => a.child_id + ":" + a.sig).join(",");
  ok("Lecture · « Mathéo médecin » ignoré", S("Mathéo médecin") === "matheo:other" && P.interpret({ sig: "other" }, "permanent") === "ignore");
  ok("Lecture · « Lucas du 12 au 15 » confirmé par les dates", P.rowsFromGoogle([allDay("d", "Emma du 12 au 15", "2026-11-12", "2026-11-16")], "c", C)[0].sig === "only" && P.rowsFromGoogle([allDay("d", "Emma du 12 au 15", "2026-11-12", "2026-11-14")], "c", C)[0].sig === "datesko");
  ok("Lecture · plusieurs enfants, accents et pluriels", S("Mathéo et Kais absents") === "matheo:abs,kais:abs" && S("MATHEO WE papa") === "matheo:abs" && S("Loic absente") === "loic:abs");
  ok("Lecture · un prénom non enregistré n'est pas un enfant", S("Paul absent") === "" && S("Mathilde absente") === "");
  ok("Dates · changement d'heure (29 mars 2026, 25 oct. 2026)", eq(P.eventDays({ start: { dateTime: "2026-03-28T22:30:00+01:00" }, end: { dateTime: "2026-03-29T23:30:00+02:00" } }), { start: "2026-03-28", end: "2026-03-29" }) && eq(P.eventDays({ start: { dateTime: "2026-10-24T23:30:00Z" }, end: { dateTime: "2026-10-25T23:00:00Z" } }), { start: "2026-10-25", end: "2026-10-25" }));
  const rec = [1, 2, 3].map(k => allDay("r_" + k, "Emma", `2026-11-0${k * 2}`, `2026-11-0${k * 2 + 1}`, { recurringEventId: "r" }));
  ix = build(rec.concat([allDay("dup", "Emma relais", "2026-11-02", "2026-11-03")]));
  ok("Récurrence · 3 occurrences ; un jour compté une seule fois", P.stats(ix, "emma", "2026-11-01", "2026-11-30").present === 3);

  return t12.then(() => {
    const fails = out.filter(x => !x.ok);
    if (typeof document !== "undefined") {
      document.body.innerHTML = `<h1>${fails.length ? "❌" : "✅"} ${out.length - fails.length}/${out.length} tests réussis</h1><ul>${out.map(x => `<li style="color:${x.ok ? "#1a7f37" : "#c62828"}">${x.ok ? "✓" : "✕"} ${x.name} ${x.info ? "<code>" + x.info + "</code>" : ""}</li>`).join("")}</ul>`;
      window.__results = out;
    } else {
      for (const x of out) console.log((x.ok ? "✓ " : "✕ ") + x.name + (x.info ? "   → " + (typeof x.info === "string" ? x.info : JSON.stringify(x.info)) : ""));
      console.log(`\n${out.length - fails.length}/${out.length} réussis`);
      if (fails.length) process.exitCode = 1;
    }
  });
})();
