/**
 * Harnais tests déplacement repas — données fictives, logique courses alignée sur carnet-base.
 * Node uniquement ; n'accède pas à Supabase ni au localStorage réel.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../carnet-calc.js");

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = [["midi", "Midi"], ["soir", "Soir"]];
const slotKey = (d, m) => d + "|" + m;
const norm = s => String(s || "").trim().toLowerCase();
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = t => {
  const [a, b, c] = String(t).split("-").map(Number);
  return new Date(a, b - 1, c);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const mondayOf = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const slotUsed = s => C.slotUsedPlanning(s, null) || (s && (s.id || s.label || s.left || s.note));
const todayYmd = () => ymd(new Date());

export function deepCloneMenu(menu) {
  return JSON.parse(JSON.stringify(menu));
}

/** Agrégat courses : tous les repas verrouillés dans menu.weeks (hors done retiré du besoin). */
export function shoppingState(menu, recipes) {
  const acc = {};
  const doneQty = {};
  const add = (rid, n, sl, done) => {
    const r = recipes[rid];
    if (!r) return;
    for (const ing of r.ing || []) {
      if (!ing.n) continue;
      const [q, u] = C.recipeIngredientBase(r, ing, n, "main");
      const key = norm(ing.n) + "|" + u;
      if (!acc[key]) acc[key] = { key, q: 0 };
      acc[key].q += q;
      if (done) doneQty[key] = (doneQty[key] || 0) + q;
    }
  };
  for (const [, wk] of Object.entries(menu.weeks || {})) {
    for (const [, sl] of Object.entries(wk || {})) {
      if (!sl || !sl.lock || !sl.id) continue;
      const done = sl.mealState === "Courses faites" || !!sl.shopBought;
      add(sl.id, sl.n || menu.people || 4, sl, done);
    }
  }
  const today = todayYmd();
  const bt = menu.bought || {};
  const need = {};
  for (const [key, i] of Object.entries(acc)) {
    let q = i.q - (doneQty[key] || 0);
    const b = bt[key];
    if (b && b.until >= today) q = Math.max(0, q - (Number(b.q) || 0));
    if (q > 1e-6) need[key] = q;
  }
  const bought = {};
  for (const [k, v] of Object.entries(bt)) {
    if (v && v.until >= today) bought[k] = Number(v.q) || 0;
  }
  return { need, bought, checked: { ...(menu.checked || {}) } };
}

export function shoppingSig(menu, recipes) {
  const s = shoppingState(menu, recipes);
  const need = Object.entries(s.need).sort((a, b) => a[0].localeCompare(b[0]));
  const bought = Object.entries(s.bought).sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify({ need, bought, checked: s.checked });
}

export function detachRemovedMealPurchases(menu, recipes, w, k) {
  const slot = ((menu.weeks || {})[w] || {})[k];
  if (!slot || !slot.id || !slot.lock) return;
  const oldBought = { ...(menu.bought || {}) };
  const oldChecked = { ...(menu.checked || {}) };
  const oldQty = { ...(menu.checkedQty || {}) };
  const measure = () => {
    const save = menu.bought;
    menu.bought = {};
    const m = shoppingState(menu, recipes).need;
    menu.bought = save;
    return m;
  };
  const credits = { ...(menu.bought || {}) };
  const oldLock = slot.lock;
  const oldState = slot.mealState;
  const full = measure();
  delete slot.lock;
  delete slot.mealState;
  const rest = measure();
  slot.lock = oldLock;
  slot.mealState = oldState;
  menu.bought = credits;
  menu.checked = oldChecked;
  menu.checkedQty = oldQty;
  const today = todayYmd();
  for (const [key, total] of Object.entries(full)) {
    const contribution = Math.max(0, total - (rest[key] || 0));
    if (contribution <= 1e-6) continue;
    if ((rest[key] || 0) > 1e-6) continue;
    delete menu.checked[key];
    if (menu.checkedQty) delete menu.checkedQty[key];
  }
}

export function applyMealRelocationHarness(menu, recipes, opts) {
  const snap = deepCloneMenu(menu);
  const mode = opts.mode || "move";
  const vict = ((menu.weeks || {})[opts.toW] || {})[opts.toK];
  if (mode === "replace" && vict && C.slotUsedPlanning(vict, recipes)) {
    detachRemovedMealPurchases(menu, recipes, opts.toW, opts.toK);
  }
  const core = C.relocateMealSlots(menu, recipes, opts);
  if (!core.ok) {
    Object.assign(menu, snap);
    menu.weeks = snap.weeks;
    menu.bought = snap.bought;
    menu.checked = snap.checked;
    menu.checkedQty = snap.checkedQty;
    return core;
  }
  const afterFp = fingerprintFromUndo(menu, recipes, core.undo);
  return Object.assign({ ok: true, undo: core.undo, afterFp }, core);
}

export function fingerprintFromUndo(menu, recipes, undo) {
  return undo
    .map(s => {
      const cur = ((menu.weeks || {})[s.w] || {})[s.k] || null;
      return `${s.w}|${s.k}|${JSON.stringify(cur)}`;
    })
    .join(";");
}

export function undoMoveHarness(menu, recipes, snap) {
  if (!snap.afterFp) return { ok: false, code: "no_fp" };
  const cur = snap.undo
    .map(s => {
      const c = ((menu.weeks || {})[s.w] || {})[s.k] || null;
      return `${s.w}|${s.k}|${JSON.stringify(c)}`;
    })
    .join(";");
  if (cur !== snap.afterFp) return { ok: false, code: "conflict" };
  for (const x of snap.undo) {
    menu.weeks[x.w] = menu.weeks[x.w] || {};
    if (x.slot) menu.weeks[x.w][x.k] = JSON.parse(JSON.stringify(x.slot));
    else delete menu.weeks[x.w][x.k];
    if (!Object.keys(menu.weeks[x.w]).length) delete menu.weeks[x.w];
  }
  if (snap.boughtSnap) menu.bought = JSON.parse(JSON.stringify(snap.boughtSnap));
  if (snap.checkedSnap) menu.checked = JSON.parse(JSON.stringify(snap.checkedSnap));
  if (snap.checkedQtySnap) menu.checkedQty = JSON.parse(JSON.stringify(snap.checkedQtySnap));
  return { ok: true, shopSame: snap.shopBefore ? shoppingSig(menu, recipes) === snap.shopBefore : true };
}

/** Somme des crédits menu.bought (détection double comptage grossier). */
export function totalBoughtCredits(menu) {
  let t = 0;
  const today = todayYmd();
  for (const v of Object.values(menu.bought || {})) {
    if (v && v.until >= today) t += Number(v.q) || 0;
  }
  return t;
}

const RECIPES_STORE = { weak: null };
export function recipesRef(menu) {
  return RECIPES_STORE.weak || {};
}
export function setRecipes(r) {
  RECIPES_STORE.weak = r;
}

export function persistRoundtrip(menu) {
  const raw = JSON.stringify(menu);
  return JSON.parse(raw);
}

export const recipesFixtures = {
  lasagnes: {
    name: "Lasagnes",
    serves: 4,
    ing: [
      { n: "pâtes", q: 500, u: "g", r: "Épicerie" },
      { n: "bœuf", q: 400, u: "g", r: "Boucherie & poisson" }
    ]
  },
  poulet: {
    name: "Poulet rôti",
    serves: 4,
    ing: [
      { n: "poulet", q: 1, u: "pièce", r: "Boucherie & poisson" },
      { n: "pommes de terre", q: 800, u: "g", r: "Fruits & légumes" }
    ]
  },
  riz: {
    name: "Riz sauté",
    serves: 4,
    ing: [
      { n: "riz", q: 300, u: "g", r: "Épicerie" },
      { n: "oignon", q: 1, u: "pièce", r: "Fruits & légumes" }
    ]
  },
  sharedA: {
    name: "Pâtes A",
    serves: 4,
    ing: [{ n: "pâtes", q: 400, u: "g", r: "Épicerie" }]
  },
  sharedB: {
    name: "Pâtes B",
    serves: 4,
    ing: [{ n: "pâtes", q: 200, u: "g", r: "Épicerie" }]
  }
};

export function makeMenu(overrides = {}) {
  const until = ymd(addDays(new Date(), 30));
  return deepCloneMenu(Object.assign({
    people: 4,
    weeks: {},
    checked: {},
    checkedQty: {},
    bought: {},
    extras: []
  }, overrides));
}

export function slot(w, k, id, o = {}) {
  const recipes = recipesRef({});
  return Object.assign({ id, n: 4, label: recipes[id]?.name || id }, o);
}

/** Enregistre les recettes pour le harnais courant. */
export function useRecipes(r) {
  setRecipes(r);
}