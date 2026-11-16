import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../../carnet-calc.js");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };

const recipes = {
  a: { name: "Lasagnes", serves: 4, ing: [{ n: "pâtes", q: 500, u: "g", r: "Épicerie" }] },
  b: { name: "Poulet", serves: 4, ing: [{ n: "poulet", q: 1, u: "pièce", r: "Boucherie & poisson" }] }
};
const baseMenu = () => ({
  people: 4,
  weeks: {
    "2026-11-17": { "Mercredi|midi": { id: "a", n: 4, lock: true, label: "Lasagnes" } },
    "2026-11-24": { "Samedi|soir": { id: "b", n: 4, lock: true, label: "Poulet" } }
  },
  checked: {},
  bought: { "pates|g": { q: 500, until: "2026-11-30" } }
});

const used = s => C.slotUsedPlanning(s, recipes);
const get = (m, w, k) => ((m.weeks || {})[w] || {})[k] || null;

// 1. move to free slot
{
  const m = baseMenu();
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Mercredi|midi", toW: "2026-11-17", toK: "Vendredi|soir", mode: "move" });
  ok("déplacement créneau libre", r.ok && get(m, "2026-11-17", "Vendredi|soir")?.id === "a" && !get(m, "2026-11-17", "Mercredi|midi"));
  ok("état lock conservé", get(m, "2026-11-17", "Vendredi|soir")?.lock === true);
}

// 2. swap two meals
{
  const m = baseMenu();
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Mercredi|midi", toW: "2026-11-24", toK: "Samedi|soir", mode: "swap" });
  ok("échange", r.ok && get(m, "2026-11-17", "Mercredi|midi")?.id === "b" && get(m, "2026-11-24", "Samedi|soir")?.id === "a");
}

// 3. replace removes victim slot
{
  const m = baseMenu();
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Mercredi|midi", toW: "2026-11-24", toK: "Samedi|soir", mode: "replace" });
  ok("remplacement", r.ok && get(m, "2026-11-24", "Samedi|soir")?.id === "a" && !get(m, "2026-11-17", "Mercredi|midi"));
  ok("poulet retiré", !get(m, "2026-11-24", "Samedi|soir") || get(m, "2026-11-24", "Samedi|soir").id !== "b");
}

// 4. need choice when busy
{
  const m = baseMenu();
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Mercredi|midi", toW: "2026-11-24", toK: "Samedi|soir", mode: "move" });
  ok("conflit demandé", !r.ok && r.needChoice);
}

// 5. cross-week move months ahead
{
  const m = { people: 4, weeks: { "2026-11-17": { "Lundi|midi": { id: "a", n: 4, shopBought: true, lock: true } } } };
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Lundi|midi", toW: "2026-02-09", toK: "Mardi|soir", mode: "move" });
  ok("déplacement lointain", r.ok && get(m, "2026-02-09", "Mardi|soir")?.shopBought === true);
}

// 6. undo snapshot shape
{
  const m = baseMenu();
  const r = C.relocateMealSlots(m, recipes, { fromW: "2026-11-17", fromK: "Mercredi|midi", toW: "2026-11-17", toK: "Jeudi|midi", mode: "move" });
  ok("undo slots", r.undo?.length === 2);
}

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("carnet-move ok");