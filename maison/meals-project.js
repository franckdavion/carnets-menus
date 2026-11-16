"use strict";
/* Projection du carnet commun (menu.weeks) → table Supabase meals.
   Une seule direction pour la famille : le carnet décide, meals sert l'accueil et le temps réel. */
(() => {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const MEALS = ["midi", "soir"];
  const sk = (dn, slot) => dn + "|" + slot;
  const pad2 = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function slotSig(sl, recipes, norm) {
    if (!sl) return "";
    if (sl.id && recipes && recipes[sl.id]) return "R:" + sl.id;
    if (sl.note) return "N:" + String(sl.note).trim();
    if (sl.left) return "L:" + String(sl.left).trim();
    return "";
  }

  function rowFromSig(sig, hid, day, slot, keyToUuid, recipes, now) {
    if (!sig) return null;
    const base = { household_id: hid, day, slot, updated_at: now };
    if (sig.startsWith("R:")) {
      const key = sig.slice(2), ru = keyToUuid(key);
      return Object.assign(base, { recipe_id: ru || null, label: ru ? "" : String((recipes[key] && recipes[key].name) || "").slice(0, 80) });
    }
    if (sig.startsWith("N:")) return Object.assign(base, { recipe_id: null, label: sig.slice(2).slice(0, 80) });
    if (sig.startsWith("L:")) return Object.assign(base, { recipe_id: null, label: ("Restes · " + sig.slice(2)).slice(0, 80) });
    return null;
  }

  async function loadRecipeMap(sb) {
    const k2u = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("recipes").select("id,legacy_id").range(from, from + 999);
      if (error || !data) break;
      for (const r of data) k2u[r.legacy_id || "c-" + r.id] = r.id;
      if (data.length < 1000) break;
    }
    return k => k2u[k] || (String(k).startsWith("c-") ? k.slice(2) : null);
  }

  async function projectMeals(sb, hid, menu, recipes, opts) {
    if (!sb || !hid || !menu) return { ok: false, reason: "missing" };
    const norm = opts && opts.norm ? opts.norm : s => String(s || "").trim().toLowerCase();
    const from = (opts && opts.from) || ymd(addDays(new Date(), -7));
    const to = (opts && opts.to) || ymd(addDays(new Date(), 27));
    const keyToUuid = await loadRecipeMap(sb);
    const now = new Date().toISOString();
    const { data: cur, error: le } = await sb.from("meals").select("id,day,slot,recipe_id,label").eq("household_id", hid).gte("day", from).lte("day", to);
    if (le) throw le;
    const byKey = {};
    for (const m of cur || []) byKey[m.day + "|" + m.slot] = m;
    const weeks = menu.weeks || {};
    const ops = [];
    for (let d = new Date(from + "T12:00:00"); ymd(d) <= to; d = addDays(d, 1)) {
      const day = ymd(d), wk = ymd(mondayOf(d)), dn = DAYS[(d.getDay() + 6) % 7];
      for (const slot of MEALS) {
        const sl = (weeks[wk] || {})[sk(dn, slot)];
        const sig = slotSig(sl, recipes, norm);
        const k = day + "|" + slot;
        const want = rowFromSig(sig, hid, day, slot, keyToUuid, recipes || {}, now);
        const have = byKey[k];
        if (!want) {
          if (have) ops.push(sb.from("meals").delete().eq("id", have.id));
          continue;
        }
        const ru = want.recipe_id;
        const hRu = have && have.recipe_id;
        const same = have && (hRu === ru || (!hRu && !ru && String(have.label || "") === String(want.label || "")));
        if (same) continue;
        ops.push(sb.from("meals").upsert(want, { onConflict: "household_id,day,slot" }));
      }
    }
    if (!ops.length) return { ok: true, n: 0 };
    const res = await Promise.all(ops);
    const bad = res.find(r => r && r.error);
    if (bad) throw bad.error;
    return { ok: true, n: ops.length };
  }

  window.MzMeals = { slotSig, rowFromSig, projectMeals, ymd, addDays, mondayOf };
})();