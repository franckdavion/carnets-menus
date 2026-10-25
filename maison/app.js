"use strict";
/* Maisonnée : tâches, agenda, repas et courses d'un foyer, partagés entre ses membres.
   Deux modes : « démo » (tout reste sur ce téléphone) et « foyer » (Supabase, mêmes comptes que le Carnet de menus). */

const SB_URL = "https://cluqleqbbidozpioekog.supabase.co";
const SB_KEY = "sb_publishable_aqFMnHwdC6XpnuR3kQJqZQ_AJfMwJyS";
const CARNET_URL = "../";

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));

const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const isoDay = s => ((parse(s).getDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche
const mondayOf = s => addDays(s, 1 - isoDay(s));
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAYS_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = s => cap(parse(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
const fmtShort = s => parse(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
function dayLabel(s) {
  const n = diffDays(today(), s);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  if (n === -1) return "Hier";
  return cap(parse(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }));
}
const hm = t => t ? String(t).slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h") : "";

const COLORS = ["#E0533D", "#2F8FA6", "#E8A33B", "#7A4E9C", "#3FA27A", "#D46A92", "#5B6B7F", "#A0662F"];
const ROOMS = ["Cuisine", "Ménage", "Linge", "Salle de bain", "Courses", "Extérieur", "Animaux", "Papiers", "Divers"];
const AISLES = ["Fruits & légumes", "Boulangerie", "Boucherie & poisson", "Crémerie", "Épicerie", "Surgelés", "Boissons", "Hygiène & maison", "Divers"];
const EFFORT = [[1, "Rapide"], [2, "Moyen"], [3, "Long"]];
const FREQS = [["once", "Une fois"], ["daily", "Chaque jour"], ["weekly", "Chaque semaine"], ["every", "Tous les … jours"], ["monthly", "Chaque mois"]];
const REPEATS = [["none", "Non"], ["weekly", "Chaque semaine"], ["monthly", "Chaque mois"], ["yearly", "Chaque année"]];
const TASK_IDEAS = [
  { title: "Sortir les poubelles", room: "Cuisine", freq: "weekly", weekdays: [1, 4], effort: 1 },
  { title: "Passer l'aspirateur", room: "Ménage", freq: "weekly", weekdays: [6], effort: 2 },
  { title: "Faire une lessive", room: "Linge", freq: "every", every_n: 3, effort: 1 },
  { title: "Changer les draps", room: "Linge", freq: "every", every_n: 14, effort: 2 },
  { title: "Nettoyer la salle de bain", room: "Salle de bain", freq: "weekly", weekdays: [6], effort: 3 },
  { title: "Vider le lave-vaisselle", room: "Cuisine", freq: "daily", effort: 1, rotate: true },
  { title: "Arroser les plantes", room: "Extérieur", freq: "every", every_n: 3, effort: 1 },
  { title: "Faire les courses", room: "Courses", freq: "weekly", weekdays: [5], effort: 2 }
];

/* ---------- state ---------- */
let mode = LS.get("mz_mode", null);          // "demo" | "cloud" | null
let sb = null, user = null, rt = null;
let screen = "loading";                       // loading | welcome | auth | setup | app
let authMode = "login", authErr = "", setupErr = "", joinPreview = null;
let view = LS.get("mz_view", "today");
let who = null;                               // member filter on Today and Tâches
let weekA = mondayOf(today()), weekR = mondayOf(today());
let repasTab = "menu";
let S = blank();
function blank() { return { hh: null, me: null, members: [], tasks: [], log: [], events: [], meals: [], shop: [], recipes: null }; }
const TABLES = { members: "household_members", tasks: "tasks", log: "task_log", events: "events", meals: "meals", shop: "shopping_items" };

const member = id => S.members.find(m => m.id === id) || null;
const members = () => [...S.members].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
const meM = () => member(S.me);
const initial = n => (String(n || "?").trim()[0] || "?");
const av = (m, cls = "") => m ? `<span class="av ${cls}" style="--c:${esc(m.color)}" aria-hidden="true">${esc(initial(m.name))}</span>` : `<span class="av any ${cls}" aria-hidden="true">?</span>`;

/* ---------- persistence ---------- */
function saveLocal() {
  if (mode === "demo") LS.set("mz_demo", S);
  else if (mode === "cloud" && S.hh) LS.set("mz_cache", { ...S, recipes: null, at: Date.now() });
}

async function add(key, row) {
  row = { id: uuid(), household_id: S.hh.id, ...row };
  S[key].push(row); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).insert(row);
    if (error) { S[key] = S[key].filter(x => x.id !== row.id); saveLocal(); render(); fail(error); return null; }
  }
  return row;
}
async function patch(key, id, p) {
  const r = S[key].find(x => x.id === id); if (!r) return;
  const before = { ...r }; Object.assign(r, p); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).update(p).eq("id", id);
    if (error) { Object.assign(r, before); saveLocal(); render(); fail(error); }
  }
}
async function remove(key, id) {
  const r = S[key].find(x => x.id === id); if (!r) return;
  S[key] = S[key].filter(x => x.id !== id); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).delete().eq("id", id);
    if (error) { S[key].push(r); saveLocal(); render(); fail(error); }
  }
}
async function removeMany(key, ids) {
  if (!ids.length) return;
  const gone = S[key].filter(x => ids.includes(x.id));
  S[key] = S[key].filter(x => !ids.includes(x.id)); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).delete().in("id", ids);
    if (error) { S[key].push(...gone); saveLocal(); render(); fail(error); }
  }
}
async function addMany(key, rows) {
  if (!rows.length) return;
  rows = rows.map(r => ({ id: uuid(), household_id: S.hh.id, ...r }));
  S[key].push(...rows); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).insert(rows);
    if (error) { const ids = rows.map(r => r.id); S[key] = S[key].filter(x => !ids.includes(x.id)); saveLocal(); render(); fail(error); }
  }
}
function fail(e) {
  console.warn(e);
  toast(navigator.onLine === false ? "Pas de connexion : la modification n'a pas été enregistrée." : "La modification n'a pas été enregistrée. Réessayez dans un instant.");
}

/* ---------- Supabase ---------- */
function loadSb() {
  if (sb) return Promise.resolve(sb);
  return new Promise((ok, ko) => {
    const go = () => { sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "cm_sb_auth" } }); ok(sb); };
    if (window.supabase) return go();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = go; s.onerror = () => ko(new Error("supabase"));
    document.head.appendChild(s);
  });
}

async function loadCloud(hid) {
  const since = addDays(today(), -60);
  const [hh, mm, tk, lg, ev, ml, sh] = await Promise.all([
    sb.from("households").select("*").eq("id", hid).single(),
    sb.from("household_members").select("*").eq("household_id", hid),
    sb.from("tasks").select("*").eq("household_id", hid).eq("archived", false),
    sb.from("task_log").select("*").eq("household_id", hid).gte("done_on", since),
    sb.from("events").select("*").eq("household_id", hid),
    sb.from("meals").select("*").eq("household_id", hid).gte("day", addDays(today(), -14)),
    sb.from("shopping_items").select("*").eq("household_id", hid)
  ]);
  const bad = [hh, mm, tk, lg, ev, ml, sh].find(r => r.error);
  if (bad) throw bad.error;
  const recipes = S.recipes;
  S = { hh: hh.data, me: (mm.data.find(m => m.user_id === user.id) || {}).id || null, members: mm.data, tasks: tk.data, log: lg.data, events: ev.data, meals: ml.data, shop: sh.data, recipes };
  saveLocal();
}

function listen(hid) {
  if (rt) { sb.removeChannel(rt); rt = null; }
  rt = sb.channel("foyer-" + hid);
  for (const [key, table] of Object.entries(TABLES)) {
    rt.on("postgres_changes", { event: "*", schema: "public", table }, p => {
      if (p.eventType === "DELETE") { S[key] = S[key].filter(x => x.id !== p.old.id); }
      else {
        const row = p.new; if (row.household_id !== hid) return;
        { const i = S[key].findIndex(x => x.id === row.id); if (i >= 0) S[key][i] = row; else S[key].push(row); }
      }
      saveLocal(); softRender();
    });
  }
  rt.on("postgres_changes", { event: "UPDATE", schema: "public", table: "households", filter: "id=eq." + hid }, p => { S.hh = p.new; saveLocal(); softRender(); });
  rt.subscribe();
}
// re-render without disturbing an open sheet or a field being typed in
let pending = false;
function softRender() {
  if ($("#sheet").open || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { pending = true; return; }
  render();
}

async function loadRecipes() {
  if (S.recipes) return S.recipes;
  if (mode !== "cloud") { S.recipes = DEMO_RECIPES; return S.recipes; }
  const { data, error } = await sb.from("recipes").select("id,name,cat,time,serves,ing,image").order("name");
  S.recipes = error ? [] : data;
  return S.recipes;
}

/* ---------- startup ---------- */
async function init() {
  const url = new URL(location.href), code = url.searchParams.get("code");
  if (code) { LS.set("mz_join", code.toUpperCase()); url.searchParams.delete("code"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  if (mode === "demo") { S = LS.get("mz_demo", null) || demoData(); screen = "app"; return render(); }
  // show the last known state straight away, then refresh from the cloud
  const cache = LS.get("mz_cache", null);
  if (mode === "cloud" && cache && cache.hh) { S = { ...blank(), ...cache, recipes: null }; screen = "app"; render(); }
  else { screen = "loading"; render(); }
  try {
    await loadSb();
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
  } catch (e) {
    if (screen !== "app") { screen = "welcome"; render(); toast("Pas de connexion pour l'instant."); }
    return;
  }
  if (!user) { mode = null; LS.del("mz_mode"); screen = "welcome"; return render(); }
  await enterCloud();
}

async function enterCloud() {
  const { data: mine, error } = await sb.from("household_members").select("household_id").eq("user_id", user.id);
  if (error) { screen = "setup"; setupErr = /relation|does not exist|schema cache/i.test(error.message) ? "Le foyer n'est pas encore installé dans Supabase : collez d'abord le script supabase-foyer.sql (voir maison/LISEZMOI.md)." : ""; return render(); }
  const ids = mine.map(r => r.household_id);
  const join = LS.get("mz_join", null);
  if (!ids.length || join) { screen = "setup"; if (join) await previewJoin(join); return render(); }
  const hid = ids.includes(LS.get("mz_hh", "")) ? LS.get("mz_hh") : ids[0];
  LS.set("mz_hh", hid); mode = "cloud"; LS.set("mz_mode", "cloud");
  try { await loadCloud(hid); } catch (e) { console.warn(e); toast("Synchro en attente (réseau ?)"); }
  listen(hid); screen = "app"; render();
  loadRecipes().then(() => softRender());
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || mode !== "cloud" || !S.hh || !user) return;
  try { await loadCloud(S.hh.id); softRender(); } catch (e) {}
});

/* ---------- task logic ---------- */
function nextDue(t, from) {
  const base = from;
  switch (t.freq) {
    case "daily": return addDays(base, 1);
    case "every": return addDays(base, Math.max(1, t.every_n || 1));
    case "weekly": {
      const days = (t.weekdays && t.weekdays.length) ? t.weekdays : [isoDay(t.next_due)];
      for (let i = 1; i <= 7; i++) { const d = addDays(base, i); if (days.includes(isoDay(d))) return d; }
      return addDays(base, 7);
    }
    case "monthly": {
      const want = parse(t.next_due).getDate(), b = parse(base);
      let y = b.getFullYear(), m = b.getMonth() + 1;
      if (m > 11) { m = 0; y++; }
      const last = new Date(y, m + 1, 0).getDate();
      return ymd(new Date(y, m, Math.min(want, last)));
    }
    default: return null;
  }
}
function nextInTurn(id) {
  const list = members(); if (!list.length || !id) return id;
  const i = list.findIndex(m => m.id === id);
  return list[(i + 1) % list.length].id;
}
function freqLabel(t) {
  switch (t.freq) {
    case "daily": return "Chaque jour";
    case "every": return t.every_n === 7 ? "Chaque semaine" : t.every_n === 14 ? "Toutes les 2 semaines" : `Tous les ${t.every_n} jours`;
    case "weekly": {
      const d = (t.weekdays || []).slice().sort();
      if (!d.length || d.length === 7) return d.length === 7 ? "Chaque jour" : "Chaque semaine";
      const names = d.map(x => DAYS[x - 1]);
      return "Le " + (names.length > 1 ? names.slice(0, -1).join(", ") + " et " + names.at(-1) : names[0]);
    }
    case "monthly": return "Chaque mois";
    default: return "Une fois";
  }
}
async function doneTask(id, by = S.me) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  const d = today();
  const log = { task_id: t.id, member_id: by || null, title: t.title, effort: t.effort || 1, done_on: d, prev_due: t.next_due, prev_assignee: t.assignee || null, at: new Date().toISOString() };
  const nd = nextDue(t, d);
  const p = nd ? { next_due: nd } : { archived: true };
  if (nd && t.rotate && t.assignee) p.assignee = nextInTurn(t.assignee);
  const row = await add("log", log);
  if (!row) return;
  await patch("tasks", id, p);
  const nm = member(p.assignee);
  const msg = nd ? `C'est fait. Prochaine fois : ${dayLabel(nd).toLowerCase().replace(/\.$/, "")}${p.assignee && p.assignee !== t.assignee && nm ? ", au tour de " + nm.name : ""}.` : "C'est fait.";
  toast(msg, "Annuler", () => undoLog(row.id, t));
}
async function undoLog(logId, snapshot) {
  const l = S.log.find(x => x.id === logId); if (!l) return;
  let t = S.tasks.find(x => x.id === l.task_id);
  if (!t && snapshot) { t = { ...snapshot }; S.tasks.push(t); }
  await remove("log", logId);
  if (t) await patch("tasks", t.id, { next_due: l.prev_due || t.next_due, assignee: l.prev_assignee, archived: false });
  else if (l.task_id && mode === "cloud") {
    const { data, error } = await sb.from("tasks").update({ archived: false, next_due: l.prev_due, assignee: l.prev_assignee }).eq("id", l.task_id).select().single();
    if (error) fail(error); else { S.tasks.push(data); saveLocal(); render(); }
  }
}
const live = () => S.tasks.filter(t => !t.archived);
const visibleFor = (t, m) => !m || t.assignee === m || !t.assignee;

/* ---------- events ---------- */
function occurrences(from, to) {
  const out = [];
  for (const e of S.events) {
    if (e.repeat === "none" || !e.repeat) { if (e.day >= from && e.day <= to) out.push({ ...e, on: e.day }); continue; }
    if (e.day > to) continue;
    const start = parse(e.day);
    for (let i = 0; i < 800; i++) {
      let d;
      if (e.repeat === "weekly") d = addDays(e.day, 7 * i);
      else if (e.repeat === "monthly") { const x = new Date(start.getFullYear(), start.getMonth() + i, 1); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); d = ymd(new Date(x.getFullYear(), x.getMonth(), Math.min(start.getDate(), last))); }
      else d = ymd(new Date(start.getFullYear() + i, start.getMonth(), start.getDate()));
      if (d > to) break;
      if (d >= from) out.push({ ...e, on: d });
    }
  }
  return out.sort((a, b) => a.on.localeCompare(b.on) || String(a.start_time || "").localeCompare(String(b.start_time || "")));
}

/* ---------- meals and shopping ---------- */
const recipeOf = id => (S.recipes || DEMO_RECIPES).find(r => r.id === id) || null;
const mealAt = (day, slot) => S.meals.find(m => m.day === day && m.slot === slot) || null;
function mealName(m) { if (!m) return ""; if (m.recipe_id) { const r = recipeOf(m.recipe_id); if (r) return r.name; } return m.label || (m.recipe_id ? "Recette" : ""); }
function fmtQty(q, u) {
  if (!q) return u && u !== "pièce" ? u : "";
  let n = q;
  if (u === "g" && q >= 1000) return (Math.round(q / 100) / 10).toString().replace(".", ",") + " kg";
  if (u === "cl" && q >= 100) return (Math.round(q / 10) / 10).toString().replace(".", ",") + " l";
  n = !u || u === "pièce" ? Math.max(1, Math.round(q * 2) / 2) : q >= 10 ? Math.round(q) : Math.round(q * 4) / 4;
  const s = String(n).replace(".", ",");
  return !u || u === "pièce" ? s : s + " " + u;
}
function guessAisle(name) {
  const n = name.toLowerCase();
  const map = [
    ["Fruits & légumes", /pomme|poire|banane|citron|orange|salade|tomate|carotte|oignon|ail|courgette|poireau|légume|fruit|champignon|avocat|patate|pomme de terre|herbe|persil|fraise|raisin|épinard|chou|concombre|poivron|aubergine/],
    ["Boulangerie", /pain|baguette|brioche|croissant|viennois/],
    ["Boucherie & poisson", /poulet|bœuf|boeuf|veau|porc|jambon|lardon|saucisse|viande|poisson|saumon|thon|cabillaud|crevette|dinde|steak/],
    ["Crémerie", /lait|beurre|crème|creme|yaourt|fromage|œuf|oeuf|emmental|parmesan|mozzarella|comté/],
    ["Surgelés", /surgel|glace|congel/],
    ["Boissons", /eau|jus|vin|bière|biere|soda|café|cafe|thé\b|the\b|sirop/],
    ["Hygiène & maison", /savon|shampo|dentifrice|papier|lessive|éponge|eponge|liquide vaisselle|sac poubelle|couche|mouchoir|gel douche|déo/],
    ["Épicerie", /pâte|pates|riz|farine|sucre|sel|poivre|huile|vinaigre|conserve|céréale|cereale|biscuit|chocolat|confiture|moutarde|sauce|épice|lentille|semoule/]
  ];
  for (const [a, re] of map) if (re.test(n)) return a;
  return "Divers";
}
async function menuToShopping(wk) {
  await loadRecipes();
  const people = S.hh.people || 4, src = "menu:" + wk, agg = new Map();
  for (let i = 0; i < 7; i++) {
    const d = addDays(wk, i);
    for (const slot of ["midi", "soir"]) {
      const m = mealAt(d, slot); const r = m && m.recipe_id ? recipeOf(m.recipe_id) : null;
      if (!r || !Array.isArray(r.ing)) continue;
      const k = people / (r.serves || 4);
      for (const g of r.ing) {
        if (!g || !g.n) continue;
        const key = g.n.toLowerCase().trim() + "|" + (g.u || "");
        const cur = agg.get(key) || { name: g.n.trim(), u: g.u || "", q: 0, aisle: g.r || guessAisle(g.n) };
        cur.q += (Number(g.q) || 0) * k; agg.set(key, cur);
      }
    }
  }
  if (!agg.size) { toast("Aucune recette dans le menu de cette semaine."); return; }
  const old = S.shop.filter(x => x.source === src && !x.done).map(x => x.id);
  await removeMany("shop", old);
  await addMany("shop", [...agg.values()].map(x => ({ name: x.name, qty: fmtQty(x.q, x.u), aisle: AISLES.includes(x.aisle) ? x.aisle : "Divers", done: false, source: src, added_by: S.me, created_at: new Date().toISOString() })));
  repasTab = "shop"; render();
  toast(`${agg.size} ingrédients ajoutés aux courses.`);
}

/* ---------- toast ---------- */
let toastT = null;
function toast(msg, label, fn) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${label ? `<button type="button">${esc(label)}</button>` : ""}`;
  el.hidden = false;
  if (label) el.querySelector("button").onclick = () => { el.hidden = true; fn(); };
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, label ? 6000 : 3500);
}

/* ---------- icons ---------- */
const I = {
  today: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>',
  tasks: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="2.2"/><path d="M11 7h9"/><circle cx="6" cy="17" r="2.2"/><path d="M11 17h9"/></svg>',
  agenda: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  repas: '<svg viewBox="0 0 24 24"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v4H17"/></svg>',
  foyer: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.6c2.4.2 4 1.9 4.5 4.9"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};
const TABS = [["today", "Aujourd'hui", I.today], ["tasks", "Tâches", I.tasks], ["agenda", "Agenda", I.agenda], ["repas", "Repas", I.repas], ["foyer", "Foyer", I.foyer]];

/* ---------- render ---------- */
function render() {
  pending = false;
  const app = $("#app");
  if (screen === "loading") { app.innerHTML = `<div class="welcome wrap"><p class="muted">Chargement…</p></div>`; return; }
  if (screen === "welcome") return renderWelcome(app);
  if (screen === "auth") return renderAuth(app);
  if (screen === "setup") return renderSetup(app);
  const fab = { today: ["Tâche", "newTask"], tasks: ["Tâche", "newTask"], agenda: ["Événement", "newEvent"] }[view];
  app.innerHTML = `
    <header class="top"><div class="wrap">
      <button class="hh-name" data-act="go" data-v="foyer">${esc(S.hh ? S.hh.name : "")}</button>
      <button class="stack" data-act="go" data-v="foyer" aria-label="Membres du foyer">${members().slice(0, 5).map(m => av(m)).join("")}</button>
    </div></header>
    <main class="wrap" id="main">${VIEWS[view] ? VIEWS[view]() : ""}</main>
    ${fab ? `<button class="fab" data-act="${fab[1]}">${I.plus}${fab[0]}</button>` : ""}
    <nav class="tabs" aria-label="Sections"><div class="wrap">${TABS.map(([k, l, ic]) => `<button data-act="go" data-v="${k}" ${view === k ? 'aria-current="page"' : ""}>${ic}<span>${l}</span></button>`).join("")}</div></nav>`;
}

function whoFilter() {
  if (S.members.length < 2) return "";
  return `<div class="who" role="group" aria-label="Afficher pour">
    <button class="plain" data-act="who" data-v="" aria-pressed="${!who}">Tout le monde</button>
    ${members().map(m => `<button data-act="who" data-v="${m.id}" aria-pressed="${who === m.id}">${av(m, "sm")}${esc(m.name)}${m.id === S.me ? " (moi)" : ""}</button>`).join("")}
  </div>`;
}

function taskRow(t, opts = {}) {
  const m = member(t.assignee), late = t.next_due < today();
  const bits = [];
  if (opts.when) bits.push(late ? `<span class="late">${esc(dayLabel(t.next_due))}</span>` : esc(dayLabel(t.next_due)));
  else if (late) bits.push(`<span class="late">En retard depuis ${esc(dayLabel(t.next_due).toLowerCase())}</span>`);
  bits.push(esc(t.room));
  bits.push(esc(freqLabel(t)) + (t.rotate ? " · chacun son tour" : ""));
  return `<div class="row">
    <button class="check ${m ? "" : "any"}" style="${m ? `--c:${esc(m.color)}` : ""}" data-act="done" data-v="${t.id}" aria-label="Marquer « ${esc(t.title)} » comme fait">${I.tick}</button>
    <button class="open" data-act="editTask" data-v="${t.id}"><span class="t">${esc(t.title)}</span><span class="m">${bits.join(" · ")}</span></button>
    ${m ? av(m, "sm") : ""}
  </div>`;
}

const VIEWS = {
  today() {
    const d = today();
    const due = live().filter(t => t.next_due <= d && visibleFor(t, who)).sort((a, b) => a.next_due.localeCompare(b.next_due) || a.title.localeCompare(b.title));
    const done = S.log.filter(l => l.done_on === d && (!who || l.member_id === who)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const total = due.length + done.length;
    const ribbon = total ? `<div class="ribbon" aria-hidden="true">${done.map(l => { const m = member(l.member_id); return `<i class="done" style="background:${m ? esc(m.color) : "var(--muted)"}"></i>`; }).join("")}${due.map(() => "<i></i>").join("")}</div>
      <p class="ribbon-cap">${done.length} sur ${total} ${total > 1 ? "tâches faites" : "tâche faite"}${done.length === total ? ". Tout est fait !" : ""}</p>` : `<p class="ribbon-cap">Aucune tâche prévue aujourd'hui.</p>`;
    const evs = occurrences(d, addDays(d, 1)).filter(e => !who || !e.members.length || e.members.includes(who));
    return `
      <h1 class="day">${esc(fmtLong(d))}</h1>
      ${ribbon}
      ${whoFilter()}
      <h2>À faire</h2>
      ${due.length ? `<div class="list">${due.map(t => taskRow(t)).join("")}</div>` :
        live().length ? `<div class="empty"><strong>Rien d'autre pour aujourd'hui.</strong>Les prochaines tâches sont dans l'onglet Tâches.</div>` :
        `<div class="empty"><strong>Pas encore de tâches.</strong>Ajoutez les tâches de la maison une fois : elles reviendront toutes seules au bon jour.<br><button class="btn primary" data-act="go" data-v="tasks">Ajouter des tâches</button></div>`}
      ${done.length ? `<h2>Fait aujourd'hui</h2><div class="list">${done.map(l => { const m = member(l.member_id); return `<div class="row is-done">
          <span class="check on" style="--c:${m ? esc(m.color) : "var(--muted)"}">${I.tick}</span>
          <span class="main"><span class="t">${esc(l.title)}</span><span class="m">par ${esc(m ? m.name : "quelqu'un")}</span></span>
          <button class="btn ghost small" data-act="undo" data-v="${l.id}">Annuler</button></div>`; }).join("")}</div>` : ""}
      <h2>Au menu</h2>
      <div class="list">${["midi", "soir"].map(s => { const m = mealAt(d, s), c = m && member(m.cook); return `<button class="slot" data-act="meal" data-day="${d}" data-slot="${s}"><b>${s === "midi" ? "Midi" : "Soir"}</b><span class="what ${m ? "" : "none"}">${m ? esc(mealName(m)) : "Rien de prévu"}</span>${c ? av(c, "sm") : ""}</button>`; }).join("")}</div>
      <h2>Agenda</h2>
      ${evs.length ? `<div class="list">${evs.map(e => eventRow(e, true)).join("")}</div>` : `<div class="empty"><strong>Rien aujourd'hui ni demain.</strong><button class="btn" data-act="newEvent">Ajouter un événement</button></div>`}`;
  },

  tasks() {
    const d = today(), list = live().filter(t => visibleFor(t, who)).sort((a, b) => a.next_due.localeCompare(b.next_due) || a.title.localeCompare(b.title));
    const wkEnd = addDays(mondayOf(d), 6);
    const groups = [
      ["En retard", t => t.next_due < d, "late"],
      ["Aujourd'hui", t => t.next_due === d],
      ["Demain", t => t.next_due === addDays(d, 1)],
      ["Cette semaine", t => t.next_due > addDays(d, 1) && t.next_due <= wkEnd],
      ["Plus tard", t => t.next_due > wkEnd && t.next_due > addDays(d, 1)]
    ];
    const since = addDays(d, -6), counts = new Map();
    for (const l of S.log) if (l.done_on >= since && l.member_id) { const c = counts.get(l.member_id) || { n: 0, e: 0 }; c.n++; c.e += l.effort || 1; counts.set(l.member_id, c); }
    const max = Math.max(1, ...[...counts.values()].map(c => c.e));
    const bal = S.members.length > 1 ? `<h2>Qui a fait quoi, ces 7 jours</h2>
      <div class="list"><div class="bal">${members().map(m => { const c = counts.get(m.id) || { n: 0, e: 0 }; return `${av(m, "sm")}<span class="bar" title="${esc(m.name)}"><i style="width:${Math.round(c.e / max * 100)}%;background:${esc(m.color)}"></i></span><span class="n">${c.n} ${c.n > 1 ? "tâches" : "tâche"}</span>`; }).join("")}</div></div>
      <p class="muted small" style="margin-top:8px">Les barres tiennent compte de la durée de chaque tâche (rapide, moyenne, longue).</p>` : "";
    if (!live().length) return `<h1 class="day">Tâches</h1>
      <div class="empty"><strong>Commencez par quelques classiques.</strong>Touchez une idée pour l'ajouter, ou créez la vôtre avec le bouton « Tâche ».
        <div class="chips" style="margin-top:12px">${TASK_IDEAS.map((x, i) => `<button class="chip" data-act="idea" data-v="${i}">${esc(x.title)}</button>`).join("")}</div></div>`;
    return `<h1 class="day">Tâches</h1>${whoFilter()}
      ${groups.map(([title, f, cls]) => { const g = list.filter(f); return g.length ? `<p class="group-h ${cls || ""}">${title}</p><div class="list">${g.map(t => taskRow(t, { when: title === "Cette semaine" || title === "Plus tard" })).join("")}</div>` : ""; }).join("")}
      ${!list.length ? `<div class="empty" style="margin-top:16px"><strong>Rien pour cette personne.</strong>Choisissez « Tout le monde » pour voir toutes les tâches.</div>` : ""}
      ${bal}`;
  },

  agenda() {
    const from = weekA, to = addDays(weekA, 6), occ = occurrences(from, to), d = today();
    const head = `<div class="weeknav"><button class="icon-btn" data-act="weekA" data-v="-7" aria-label="Semaine précédente">${I.left}</button>
      <strong>${from === mondayOf(d) ? "Cette semaine" : "Semaine du " + fmtShort(from)}</strong>
      <button class="icon-btn" data-act="weekA" data-v="7" aria-label="Semaine suivante">${I.right}</button></div>`;
    let body = "";
    for (let i = 0; i < 7; i++) {
      const day = addDays(from, i), evs = occ.filter(e => e.on === day);
      if (!evs.length && day !== d) continue;
      body += `<p class="group-h">${esc(dayLabel(day))}${day === d || diffDays(d, day) === 1 || diffDays(d, day) === -1 ? ` <span style="font-weight:400">· ${esc(fmtShort(day))}</span>` : ""}</p>
        ${evs.length ? `<div class="list">${evs.map(e => eventRow(e)).join("")}</div>` : `<p class="muted small" style="margin:0 4px">Rien de prévu.</p>`}`;
    }
    const later = occurrences(addDays(to, 1), addDays(to, 60)).slice(0, 5);
    return `<h1 class="day">Agenda</h1>${head}
      ${body || `<div class="empty" style="margin-top:14px"><strong>Semaine libre.</strong>Ajoutez rendez-vous, anniversaires, activités des enfants… tout le foyer les verra.</div>`}
      ${later.length ? `<h2>Ensuite</h2><div class="list">${later.map(e => eventRow(e, false, true)).join("")}</div>` : ""}`;
  },

  repas() {
    const tabs = `<div class="seg" role="group" aria-label="Repas"><button data-act="repasTab" data-v="menu" aria-pressed="${repasTab === "menu"}">Menu</button><button data-act="repasTab" data-v="shop" aria-pressed="${repasTab === "shop"}">Courses${S.shop.filter(x => !x.done).length ? ` (${S.shop.filter(x => !x.done).length})` : ""}</button></div>`;
    return `<h1 class="day">Repas</h1>${tabs}${repasTab === "menu" ? menuView() : shopView()}
      <p class="muted small" style="margin-top:26px">Import de recettes, cave à vins, photos : <a href="${CARNET_URL}" style="color:var(--accent);font-weight:700">ouvrir le Carnet de menus</a>.</p>`;
  },

  foyer() {
    const isDemo = mode === "demo";
    return `<h1 class="day">${esc(S.hh.name)}</h1>
      <div class="btns" style="margin-top:4px"><button class="btn" data-act="renameHh">Renommer le foyer</button></div>
      <h2>Membres</h2>
      <div class="list">${members().map(m => `<button class="row" data-act="editMember" data-v="${m.id}">${av(m, "lg")}<span class="main"><span class="t">${esc(m.name)}${m.id === S.me ? " (moi)" : ""}</span><span class="m">${m.user_id || (isDemo && m.id === S.me) ? "A un compte" : "Sans compte"}</span></span></button>`).join("")}</div>
      <div class="btns"><button class="btn" data-act="newMember">Ajouter un membre sans compte</button></div>
      <p class="muted small" style="margin-top:8px">Pour les enfants ou toute personne sans téléphone : on peut leur attribuer des tâches et cocher pour eux.</p>
      <h2>Inviter quelqu'un</h2>
      <div class="card">
        ${isDemo ? `<p>En mode démo, tout reste sur ce téléphone. Pour partager avec votre famille, connectez-vous avec votre compte du Carnet de menus.</p><button class="btn primary" data-act="leaveDemo">Passer au vrai foyer</button>` :
        `<p class="muted small" style="margin:0">Code d'invitation</p><p class="code">${esc(S.hh.invite_code)}</p>
        <p class="small">La personne crée un compte (ou utilise celui du Carnet de menus), puis saisit ce code. Elle verra tout le foyer.</p>
        <div class="btns"><button class="btn primary" data-act="invite">Envoyer une invitation</button><button class="btn ghost" data-act="resetCode">Changer le code</button></div>`}
      </div>
      <h2>Repas</h2>
      <div class="card"><div class="inline" style="justify-content:space-between"><span><strong>Couverts par repas</strong><br><span class="muted small">pour calculer les quantités des courses</span></span>
        <span class="inline"><button class="icon-btn" data-act="people" data-v="-1" aria-label="Un couvert de moins">−</button><strong style="min-width:2ch;text-align:center;font:700 20px var(--display)">${S.hh.people || 4}</strong><button class="icon-btn" data-act="people" data-v="1" aria-label="Un couvert de plus">+</button></span></div></div>
      <h2>Compte</h2>
      <div class="card">
        ${isDemo ? `<p>Vous êtes en mode démo.</p><div class="btns"><button class="btn danger" data-act="resetDemo">Effacer la démo</button></div>` :
        `<p class="small" style="margin:0">Connecté avec <strong>${esc(user ? user.email : "")}</strong></p>
        <div class="btns"><button class="btn" data-act="logout">Se déconnecter</button><button class="btn ghost danger" data-act="leaveHh">Quitter le foyer</button></div>`}
      </div>`;
  }
};

function eventRow(e, withDay, withDate) {
  const ms = (e.members || []).map(member).filter(Boolean);
  const when = e.start_time ? `<span class="ev-time">${esc(hm(e.start_time))}</span>` : `<span class="ev-time allday">Journée</span>`;
  const meta = [];
  if (withDay || withDate) meta.push(esc(withDate ? dayLabel(e.on) : (e.on === today() ? "Aujourd'hui" : "Demain")));
  if (e.end_time && e.start_time) meta.push("jusqu'à " + esc(hm(e.end_time)));
  if (e.place) meta.push(esc(e.place));
  if (e.repeat && e.repeat !== "none") meta.push(esc((REPEATS.find(r => r[0] === e.repeat) || [, ""])[1].toLowerCase()));
  return `<button class="row" data-act="editEvent" data-v="${e.id}">${when}<span class="main"><span class="t">${esc(e.title)}</span>${meta.length ? `<span class="m">${meta.join(" · ")}</span>` : ""}</span><span class="stack" style="padding:0">${ms.slice(0, 3).map(m => av(m, "sm")).join("")}</span></button>`;
}

function menuView() {
  const d = today();
  let out = `<div class="weeknav"><button class="icon-btn" data-act="weekR" data-v="-7" aria-label="Semaine précédente">${I.left}</button>
    <strong>${weekR === mondayOf(d) ? "Cette semaine" : "Semaine du " + fmtShort(weekR)}</strong>
    <button class="icon-btn" data-act="weekR" data-v="7" aria-label="Semaine suivante">${I.right}</button></div>`;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekR, i);
    out += `<section class="day-card ${day === d ? "today" : ""}"><header><h3>${cap(DAYS[i])}<span>${esc(fmtShort(day))}</span></h3></header>
      ${["midi", "soir"].map(s => { const m = mealAt(day, s), c = m && member(m.cook); return `<button class="slot" data-act="meal" data-day="${day}" data-slot="${s}"><b>${s === "midi" ? "Midi" : "Soir"}</b><span class="what ${m ? "" : "none"}">${m ? esc(mealName(m)) : "Choisir"}</span>${c ? av(c, "sm") : ""}</button>`; }).join("")}
    </section>`;
  }
  const n = S.meals.filter(m => m.day >= weekR && m.day <= addDays(weekR, 6) && m.recipe_id).length;
  out += `<div class="btns"><button class="btn primary block" data-act="toShop" ${n ? "" : "disabled"}>Ajouter les ingrédients aux courses</button></div>
    ${n ? "" : `<p class="muted small" style="margin-top:8px">Choisissez des recettes du livre pour que leurs ingrédients arrivent dans les courses.</p>`}`;
  return out;
}

function shopView() {
  const items = S.shop, todo = items.filter(x => !x.done), done = items.filter(x => x.done);
  const byAisle = AISLES.map(a => [a, todo.filter(x => x.aisle === a).sort((p, q) => p.name.localeCompare(q.name))]).filter(([, l]) => l.length);
  const item = x => `<button class="shop-item ${x.done ? "done" : ""}" data-act="shopToggle" data-v="${x.id}" aria-pressed="${!!x.done}"><span class="box">${I.tick}</span><span class="nm">${esc(x.name)}</span><span class="q">${esc(x.qty)}</span></button>`;
  return `<form data-form="shopAdd" class="inline" style="margin-top:14px" autocomplete="off">
      <input class="input" id="shopIn" name="name" aria-label="Article à ajouter" placeholder="Ajouter : lait, piles, pain…" enterkeyhint="done">
      <button class="btn ink" type="submit">Ajouter</button></form>
    ${!items.length ? `<div class="empty" style="margin-top:16px"><strong>La liste est vide.</strong>Ajoutez des articles ci-dessus, ou envoyez les ingrédients du menu depuis l'onglet Menu.</div>` : ""}
    ${byAisle.map(([a, l]) => `<p class="group-h">${esc(a)}</p><div class="list">${l.map(item).join("")}</div>`).join("")}
    ${!todo.length && items.length ? `<div class="empty" style="margin-top:16px"><strong>Tout est dans le panier.</strong></div>` : ""}
    ${done.length ? `<p class="group-h">Dans le panier</p><div class="list">${done.map(item).join("")}</div>
      <div class="btns"><button class="btn" data-act="shopClear">Retirer les ${done.length} articles cochés</button></div>` : ""}`;
}

/* ---------- welcome, auth, setup ---------- */
function renderWelcome(app) {
  const join = LS.get("mz_join", null);
  app.innerHTML = `<div class="welcome wrap">
    <div class="dots" aria-hidden="true">${COLORS.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join("")}</div>
    <h1>Maisonnée</h1>
    <p class="lead">${join ? `Vous êtes invité·e à rejoindre un foyer (code <strong>${esc(join)}</strong>). Connectez-vous ou créez un compte pour entrer.` : "Les tâches, l'agenda et les repas de la maison, partagés entre vous."}</p>
    <div class="btns" style="flex-direction:column">
      <button class="btn primary block" data-act="auth" data-v="login">Se connecter</button>
      <button class="btn block" data-act="auth" data-v="signup">Créer un compte</button>
      ${join ? "" : `<button class="btn ghost block" data-act="demo">Essayer sans compte</button>`}
    </div>
    <p class="muted small" style="margin-top:16px">Même compte que le Carnet de menus.</p>
  </div>`;
}
function renderAuth(app) {
  const up = authMode === "signup";
  app.innerHTML = `<div class="welcome wrap" style="justify-content:flex-start">
    <button class="linkbtn" data-act="back">Retour</button>
    <h1 style="font-size:42px;margin-top:22px">${up ? "Créer un compte" : "Se connecter"}</h1>
    <form data-form="auth" autocomplete="on">
      ${up ? `<label class="field"><span class="label">Votre prénom</span><input class="input" name="pseudo" required minlength="2" maxlength="40" autocomplete="given-name"></label>` : ""}
      <label class="field"><span class="label">E-mail</span><input class="input" name="email" type="email" required autocomplete="email"></label>
      <label class="field"><span class="label">Mot de passe</span><input class="input" name="password" type="password" required minlength="6" autocomplete="${up ? "new-password" : "current-password"}"></label>
      ${authErr ? `<p class="err" role="alert">${esc(authErr)}</p>` : ""}
      <div class="btns"><button class="btn primary block" type="submit">${up ? "Créer le compte" : "Se connecter"}</button></div>
    </form>
    <p class="small" style="margin-top:14px">${up ? `Déjà un compte ? <button class="linkbtn" data-act="auth" data-v="login">Se connecter</button>` : `Pas encore de compte ? <button class="linkbtn" data-act="auth" data-v="signup">En créer un</button>`}</p>
  </div>`;
}
async function previewJoin(code) {
  joinPreview = null;
  const { data, error } = await sb.rpc("household_preview", { p_code: code });
  if (!error && data && data.length) joinPreview = { code, name: data[0].household_name, free: data.filter(r => r.member_id && !r.has_account) };
  else setupErr = error ? "" : "Ce code ne correspond à aucun foyer.";
}
function renderSetup(app) {
  const join = LS.get("mz_join", "") || "";
  const name = (user && user.user_metadata && user.user_metadata.pseudo) || "";
  app.innerHTML = `<div class="welcome wrap" style="justify-content:flex-start">
    <h1 style="font-size:42px">Votre foyer</h1>
    ${setupErr ? `<p class="err" role="alert">${esc(setupErr)}</p>` : ""}
    ${joinPreview ? `<div class="card" style="margin-top:12px">
      <h3>Rejoindre « ${esc(joinPreview.name)} »</h3>
      <form data-form="join">
        <input type="hidden" name="code" value="${esc(joinPreview.code)}">
        ${joinPreview.free.length ? `<div class="field"><span class="label">Vous êtes déjà dans la liste ?</span><div class="chips">${joinPreview.free.map(m => `<label class="chip"><input type="radio" name="member" value="${m.member_id}"> ${esc(m.member_name)}</label>`).join("")}<label class="chip"><input type="radio" name="member" value="" checked> Non, je suis nouveau</label></div></div>` : ""}
        <label class="field"><span class="label">Votre prénom</span><input class="input" name="display" value="${esc(name)}" required maxlength="40"></label>
        <div class="btns"><button class="btn primary block" type="submit">Rejoindre le foyer</button><button class="btn ghost block" type="button" data-act="cancelJoin">Ce n'est pas le bon foyer</button></div>
      </form></div>` : `
    <div class="card" style="margin-top:12px"><h3>Créer un foyer</h3>
      <form data-form="create">
        <label class="field"><span class="label">Nom du foyer</span><input class="input" name="name" placeholder="Ex. Chez nous, Famille Martin" required maxlength="60"></label>
        <label class="field"><span class="label">Votre prénom</span><input class="input" name="display" value="${esc(name)}" required maxlength="40"></label>
        <div class="btns"><button class="btn primary block" type="submit">Créer le foyer</button></div>
      </form></div>
    <div class="card" style="margin-top:14px"><h3>Rejoindre un foyer</h3>
      <form data-form="lookup" class="inline" style="margin-top:12px">
        <input class="input" name="code" value="${esc(join)}" placeholder="Code à 6 caractères" required maxlength="6" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.12em">
        <button class="btn ink" type="submit">Continuer</button></form></div>`}
    <p class="small" style="margin-top:18px"><button class="linkbtn" data-act="logout">Se déconnecter</button></p>
  </div>`;
}

/* ---------- sheets ---------- */
let sheetCtx = null;
function openSheet(title, body, ctx = {}) {
  sheetCtx = ctx;
  $("#sheetIn").innerHTML = `<div class="grab" aria-hidden="true"></div><div class="sheet-h"><h2 id="sheetTitle">${esc(title)}</h2><button class="btn ghost" data-act="closeSheet">Fermer</button></div>${body}`;
  const d = $("#sheet"); if (!d.open) d.showModal();
  const first = d.querySelector("[autofocus]"); if (first) setTimeout(() => first.focus(), 60);
}
function closeSheet() { const d = $("#sheet"); if (d.open) d.close(); }
$("#sheet").addEventListener("close", () => { sheetCtx = null; if (pending) render(); });
$("#sheet").addEventListener("click", e => { if (e.target === $("#sheet")) closeSheet(); });

const chipsHtml = (name, opts, cur, multi) => `<div class="chips" role="group">${opts.map(([v, l, pre]) => `<button type="button" class="chip" data-chip="${name}" data-v="${esc(v)}" ${multi ? "data-multi" : ""} aria-pressed="${multi ? (cur || []).map(String).includes(String(v)) : String(cur) === String(v)}">${pre || ""}${esc(l)}</button>`).join("")}</div>`;
const chipVal = (form, name) => { const b = form.querySelector(`[data-chip="${name}"][aria-pressed="true"]`); return b ? b.dataset.v : null; };
const chipVals = (form, name) => [...form.querySelectorAll(`[data-chip="${name}"][aria-pressed="true"]`)].map(b => b.dataset.v);
const memberOpts = () => members().map(m => [m.id, m.name, av(m, "sm")]);

function taskSheet(t) {
  const isNew = !t;
  t = t || { title: "", room: "Divers", assignee: "", rotate: false, freq: "weekly", every_n: 7, weekdays: [isoDay(today())], next_due: today(), effort: 1, notes: "" };
  openSheet(isNew ? "Nouvelle tâche" : "Tâche", `
    <form data-form="task">
      <label class="field"><span class="label">Quoi</span><input class="input" name="title" value="${esc(t.title)}" required maxlength="80" ${isNew ? "autofocus" : ""} placeholder="Ex. Sortir les poubelles"></label>
      <div class="field"><span class="label">Qui</span>${chipsHtml("assignee", [["", "N'importe qui", av(null, "sm")], ...memberOpts()], t.assignee || "")}</div>
      <label class="switch"><span><strong>Chacun son tour</strong><br><span class="muted small">la tâche passe au membre suivant à chaque fois</span></span><input type="checkbox" name="rotate" ${t.rotate ? "checked" : ""}></label>
      <div class="field"><span class="label">Quand</span>${chipsHtml("freq", FREQS, t.freq)}</div>
      <div class="field" data-show="weekly"><span class="label">Quels jours</span>${chipsHtml("weekdays", DAYS_SHORT.map((d, i) => [i + 1, d]), t.weekdays, true)}</div>
      <label class="field" data-show="every"><span class="label">Tous les combien de jours</span><input class="input" name="every_n" type="number" inputmode="numeric" min="1" max="365" value="${t.every_n || 7}"></label>
      <label class="field"><span class="label">${isNew ? "À partir du" : "Prochaine fois"}</span><input class="input" name="next_due" type="date" value="${esc(t.next_due)}" required></label>
      <div class="field"><span class="label">Pièce</span>${chipsHtml("room", ROOMS.map(r => [r, r]), t.room)}</div>
      <div class="field"><span class="label">Durée</span>${chipsHtml("effort", EFFORT, t.effort)}</div>
      <label class="field"><span class="label">Note</span><textarea class="input" name="notes" maxlength="500" placeholder="Facultatif">${esc(t.notes)}</textarea></label>
      ${isNew ? "" : `<div class="field"><span class="label">C'est fait par…</span><div class="chips">${members().map(m => `<button type="button" class="chip" data-act="doneBy" data-v="${t.id}" data-m="${m.id}">${av(m, "sm")}${esc(m.name)}</button>`).join("")}</div></div>`}
      <div class="sheet-sticky btns" style="margin-top:0">
        <button class="btn primary" type="submit" style="flex:1">Enregistrer</button>
        ${isNew ? "" : `<button class="btn danger" type="button" data-act="delTask" data-v="${t.id}">Supprimer</button>`}
      </div>
    </form>`, { id: isNew ? null : t.id });
  syncShow();
}
function syncShow() {
  const f = $("#sheetIn form"); if (!f) return;
  const freq = chipVal(f, "freq");
  f.querySelectorAll("[data-show]").forEach(el => { el.hidden = el.dataset.show !== freq; });
  const allDay = f.querySelector("[name=allday]");
  if (allDay) f.querySelectorAll("[data-times]").forEach(el => { el.hidden = allDay.checked; });
}

function eventSheet(e, day) {
  const isNew = !e;
  e = e || { title: "", day: day || (weekA > today() ? weekA : today()), start_time: null, end_time: null, repeat: "none", members: [], place: "", notes: "" };
  openSheet(isNew ? "Nouvel événement" : "Événement", `
    <form data-form="event">
      <label class="field"><span class="label">Quoi</span><input class="input" name="title" value="${esc(e.title)}" required maxlength="80" ${isNew ? "autofocus" : ""} placeholder="Ex. Dentiste de Léa"></label>
      <label class="field"><span class="label">Date</span><input class="input" name="day" type="date" value="${esc(e.day)}" required></label>
      <label class="switch"><strong>Toute la journée</strong><input type="checkbox" name="allday" ${e.start_time ? "" : "checked"}></label>
      <div class="inline" data-times style="gap:12px">
        <label class="field" style="flex:1"><span class="label">Début</span><input class="input" name="start" type="time" value="${esc(String(e.start_time || "").slice(0, 5))}"></label>
        <label class="field" style="flex:1"><span class="label">Fin</span><input class="input" name="end" type="time" value="${esc(String(e.end_time || "").slice(0, 5))}"></label>
      </div>
      <div class="field"><span class="label">Qui est concerné</span>${chipsHtml("members", memberOpts(), e.members, true)}</div>
      <label class="field"><span class="label">Où</span><input class="input" name="place" value="${esc(e.place)}" maxlength="120" placeholder="Facultatif"></label>
      <div class="field"><span class="label">Répéter</span>${chipsHtml("repeat", REPEATS, e.repeat || "none")}</div>
      <label class="field"><span class="label">Note</span><textarea class="input" name="notes" maxlength="500" placeholder="Facultatif">${esc(e.notes)}</textarea></label>
      <div class="sheet-sticky btns" style="margin-top:0">
        <button class="btn primary" type="submit" style="flex:1">Enregistrer</button>
        ${isNew ? "" : `<button class="btn danger" type="button" data-act="delEvent" data-v="${e.id}">Supprimer</button>`}
      </div>
    </form>`, { id: isNew ? null : e.id });
  syncShow();
}

async function mealSheet(day, slot) {
  const m = mealAt(day, slot);
  openSheet(`${dayLabel(day)}, ${slot}`, `<p class="muted">Chargement des recettes…</p>`, { day, slot });
  await loadRecipes();
  if (!sheetCtx || sheetCtx.day !== day || sheetCtx.slot !== slot) return;
  sheetCtx.recipe = m ? m.recipe_id : null;
  $("#sheetIn").innerHTML = $("#sheetIn").innerHTML.replace(/<p class="muted">Chargement des recettes…<\/p>/, "") + `
    <form data-form="meal">
      <label class="field"><span class="label">Dans le livre de recettes</span><input class="input" id="recSearch" type="search" placeholder="Chercher une recette" autocomplete="off"></label>
      <div class="rec-list" id="recList">${recList("", sheetCtx.recipe)}</div>
      <label class="field"><span class="label">Ou autre chose</span><input class="input" name="label" value="${esc(m && !m.recipe_id ? m.label : "")}" maxlength="80" placeholder="Ex. Restes, pizza, chez mamie"></label>
      ${S.members.length ? `<div class="field"><span class="label">Qui cuisine</span>${chipsHtml("cook", [["", "Personne en particulier"], ...memberOpts()], m && m.cook || "")}</div>` : ""}
      <div class="sheet-sticky btns" style="margin-top:0">
        <button class="btn primary" type="submit" style="flex:1">Enregistrer</button>
        ${m ? `<button class="btn danger" type="button" data-act="delMeal" data-v="${m.id}">Vider</button>` : ""}
      </div>
    </form>`;
}
function recList(q, cur) {
  const all = S.recipes || [], n = q.trim().toLowerCase();
  if (!all.length) return `<p class="muted small">Le livre de recettes n'est pas accessible avec ce compte. Écrivez le repas ci-dessous.</p>`;
  const l = (n ? all.filter(r => r.name.toLowerCase().includes(n)) : all).slice(0, 60);
  const curR = cur && !l.some(r => r.id === cur) ? all.find(r => r.id === cur) : null;
  return [curR, ...l].filter(Boolean).map(r => `<button type="button" class="rec" data-act="pickRecipe" data-v="${r.id}" aria-pressed="${r.id === cur}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : `<span class="ph"></span>`}<span><strong>${esc(r.name)}</strong><br><span class="muted small">${esc(r.cat || "")}${r.time ? " · " + r.time + " min" : ""}</span></span></button>`).join("") || `<p class="muted small">Aucune recette ne correspond.</p>`;
}

function memberSheet(m) {
  const isNew = !m;
  m = m || { name: "", color: COLORS[S.members.length % COLORS.length] };
  openSheet(isNew ? "Nouveau membre" : m.name, `
    <form data-form="member">
      <label class="field"><span class="label">Prénom</span><input class="input" name="name" value="${esc(m.name)}" required maxlength="40" ${isNew ? "autofocus" : ""}></label>
      <div class="field"><span class="label">Couleur</span><div class="chips" role="group">${COLORS.map(c => `<button type="button" class="chip" data-chip="color" data-v="${c}" aria-pressed="${c === m.color}" aria-label="Couleur ${c}"><span class="av sm" style="--c:${c};margin:0"></span></button>`).join("")}</div></div>
      <div class="sheet-sticky btns" style="margin-top:0">
        <button class="btn primary" type="submit" style="flex:1">Enregistrer</button>
        ${!isNew && !m.user_id && m.id !== S.me ? `<button class="btn danger" type="button" data-act="delMember" data-v="${m.id}">Retirer du foyer</button>` : ""}
      </div>
    </form>`, { id: isNew ? null : m.id });
}

/* ---------- interactions ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act],[data-chip]"); if (!b) return;
  if (b.dataset.chip) {
    if (b.hasAttribute("data-multi")) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
    else b.parentElement.querySelectorAll(`[data-chip="${b.dataset.chip}"]`).forEach(x => x.setAttribute("aria-pressed", x === b));
    syncShow(); return;
  }
  const v = b.dataset.v, act = b.dataset.act;
  switch (act) {
    case "go": view = v; LS.set("mz_view", v); render(); window.scrollTo(0, 0); break;
    case "who": who = v || null; render(); break;
    case "done": {
      b.classList.add("on"); b.disabled = true;
      setTimeout(() => doneTask(v), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
      break;
    }
    case "doneBy": closeSheet(); doneTask(v, b.dataset.m); break;
    case "undo": undoLog(v); break;
    case "newTask": taskSheet(null); break;
    case "editTask": taskSheet(S.tasks.find(t => t.id === v)); break;
    case "delTask": closeSheet(); { const t = S.tasks.find(x => x.id === v); await remove("tasks", v); if (t) toast("Tâche supprimée.", "Annuler", () => add("tasks", t)); } break;
    case "idea": { const x = TASK_IDEAS[+v]; await add("tasks", { title: x.title, room: x.room, assignee: null, rotate: !!x.rotate, freq: x.freq, every_n: x.every_n || 1, weekdays: x.weekdays || [], next_due: today(), effort: x.effort, notes: "", archived: false, created_by: user ? user.id : null }); toast(`« ${x.title} » ajoutée.`); break; }
    case "newEvent": eventSheet(null); break;
    case "editEvent": eventSheet(S.events.find(x => x.id === v)); break;
    case "delEvent": closeSheet(); { const ev = S.events.find(x => x.id === v); await remove("events", v); if (ev) toast("Événement supprimé.", "Annuler", () => add("events", ev)); } break;
    case "weekA": weekA = addDays(weekA, +v); render(); break;
    case "weekR": weekR = addDays(weekR, +v); render(); break;
    case "repasTab": repasTab = v; render(); break;
    case "meal": mealSheet(b.dataset.day, b.dataset.slot); break;
    case "pickRecipe": {
      sheetCtx.recipe = sheetCtx.recipe === v ? null : v;
      $("#recList").querySelectorAll(".rec").forEach(x => x.setAttribute("aria-pressed", x.dataset.v === sheetCtx.recipe));
      if (sheetCtx.recipe) { const l = $("#sheetIn [name=label]"); if (l) l.value = ""; }
      break;
    }
    case "delMeal": closeSheet(); await remove("meals", v); break;
    case "toShop": menuToShopping(weekR); break;
    case "shopToggle": { const x = S.shop.find(i => i.id === v); if (x) patch("shop", v, { done: !x.done }); break; }
    case "shopClear": { const ids = S.shop.filter(x => x.done).map(x => x.id); await removeMany("shop", ids); break; }
    case "newMember": memberSheet(null); break;
    case "editMember": memberSheet(member(v)); break;
    case "delMember": closeSheet(); await remove("members", v); break;
    case "renameHh": openSheet("Nom du foyer", `<form data-form="hhName"><label class="field"><span class="label">Nom</span><input class="input" name="name" value="${esc(S.hh.name)}" required maxlength="60" autofocus></label><div class="btns"><button class="btn primary block" type="submit">Enregistrer</button></div></form>`); break;
    case "people": await setHh({ people: Math.min(20, Math.max(1, (S.hh.people || 4) + +v)) }); break;
    case "invite": {
      const link = location.origin + location.pathname + "?code=" + S.hh.invite_code;
      const text = `Rejoins notre foyer « ${S.hh.name} » sur Maisonnée : ${link}\n(code ${S.hh.invite_code})`;
      if (navigator.share) { try { await navigator.share({ title: "Maisonnée", text }); } catch (er) {} }
      else { try { await navigator.clipboard.writeText(text); toast("Invitation copiée : collez-la dans un message."); } catch (er) { toast("Code : " + S.hh.invite_code); } }
      break;
    }
    case "resetCode": {
      if (!confirm("L'ancien code ne marchera plus. Continuer ?")) break;
      const { data, error } = await sb.rpc("reset_invite_code", { hid: S.hh.id });
      if (error) fail(error); else { S.hh.invite_code = data; saveLocal(); render(); toast("Nouveau code : " + data); }
      break;
    }
    case "leaveHh": {
      if (!confirm(`Quitter « ${S.hh.name} » ? Vous n'y aurez plus accès, sauf avec une nouvelle invitation.`)) break;
      const { error } = await sb.rpc("leave_household", { hid: S.hh.id });
      if (error) { fail(error); break; }
      LS.del("mz_cache"); LS.del("mz_hh"); S = blank(); screen = "setup"; render(); break;
    }
    case "logout": if (sb) await sb.auth.signOut(); user = null; mode = null; LS.del("mz_mode"); LS.del("mz_cache"); LS.del("mz_hh"); S = blank(); screen = "welcome"; render(); break;
    case "auth": authMode = v; authErr = ""; screen = "auth"; render(); break;
    case "back": screen = "welcome"; render(); break;
    case "demo": $("#toast").hidden = true; mode = "demo"; LS.set("mz_mode", "demo"); S = LS.get("mz_demo", null) || demoData(); saveLocal(); screen = "app"; view = "today"; render(); break;
    case "leaveDemo": mode = null; LS.del("mz_mode"); S = blank(); screen = "welcome"; render(); break;
    case "resetDemo": if (confirm("Effacer toutes les données de la démo ?")) { LS.del("mz_demo"); S = demoData(); saveLocal(); view = "today"; render(); toast("Démo remise à zéro."); } break;
    case "cancelJoin": LS.del("mz_join"); joinPreview = null; setupErr = ""; render(); break;
    case "closeSheet": closeSheet(); break;
  }
});

document.addEventListener("change", e => { if (e.target.name === "allday") syncShow(); });
document.addEventListener("input", e => { if (e.target.id === "recSearch") $("#recList").innerHTML = recList(e.target.value, sheetCtx && sheetCtx.recipe); });

async function setHh(p) {
  const before = { ...S.hh }; Object.assign(S.hh, p); saveLocal(); render();
  if (mode === "cloud") { const { error } = await sb.from("households").update(p).eq("id", S.hh.id); if (error) { S.hh = before; saveLocal(); render(); fail(error); } }
}

document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form]"); if (!f) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries()), kind = f.dataset.form;
  const btn = f.querySelector("[type=submit]");
  switch (kind) {
    case "task": {
      const freq = chipVal(f, "freq") || "once";
      const row = {
        title: fd.title.trim(), assignee: chipVal(f, "assignee") || null, rotate: !!fd.rotate, freq,
        every_n: Math.min(365, Math.max(1, parseInt(fd.every_n, 10) || 1)),
        weekdays: chipVals(f, "weekdays").map(Number).sort(), next_due: fd.next_due || today(),
        room: chipVal(f, "room") || "Divers", effort: +(chipVal(f, "effort") || 1), notes: fd.notes.trim()
      };
      if (freq === "weekly" && !row.weekdays.length) row.weekdays = [isoDay(row.next_due)];
      if (freq !== "weekly") row.weekdays = [];
      if (freq !== "every") row.every_n = 1;
      const id = sheetCtx && sheetCtx.id; closeSheet();
      if (id) await patch("tasks", id, row);
      else { await add("tasks", { ...row, archived: false, created_by: user ? user.id : null, created_at: new Date().toISOString() }); toast("Tâche ajoutée."); }
      break;
    }
    case "event": {
      const allday = !!fd.allday;
      const row = { title: fd.title.trim(), day: fd.day, start_time: allday || !fd.start ? null : fd.start, end_time: allday || !fd.end ? null : fd.end, members: chipVals(f, "members"), place: fd.place.trim(), notes: fd.notes.trim(), repeat: chipVal(f, "repeat") || "none" };
      const id = sheetCtx && sheetCtx.id; closeSheet();
      if (id) await patch("events", id, row);
      else { await add("events", { ...row, created_by: user ? user.id : null, created_at: new Date().toISOString() }); weekA = mondayOf(row.day); render(); toast("Événement ajouté."); }
      break;
    }
    case "meal": {
      const { day, slot, recipe } = sheetCtx, label = (fd.label || "").trim(), cook = chipVal(f, "cook") || null;
      const m = mealAt(day, slot); closeSheet();
      const row = { recipe_id: label ? null : recipe || null, label: label, cook, updated_at: new Date().toISOString() };
      if (!row.recipe_id && !row.label) { if (m) await remove("meals", m.id); break; }
      if (m) await patch("meals", m.id, row); else await add("meals", { day, slot, ...row });
      break;
    }
    case "shopAdd": {
      const name = (fd.name || "").trim(); if (!name) break;
      f.reset(); f.querySelector("input").focus();
      await add("shop", { name, qty: "", aisle: guessAisle(name), done: false, source: "", added_by: S.me, created_at: new Date().toISOString() });
      break;
    }
    case "member": {
      const row = { name: fd.name.trim(), color: chipVal(f, "color") || COLORS[0] };
      const id = sheetCtx && sheetCtx.id; closeSheet();
      if (id) await patch("members", id, row);
      else await add("members", { ...row, user_id: null, role: "member", position: S.members.length ? Math.max(...S.members.map(m => m.position)) + 1 : 0 });
      break;
    }
    case "hhName": closeSheet(); await setHh({ name: fd.name.trim() }); break;
    case "auth": {
      btn.disabled = true; authErr = "";
      try {
        await loadSb();
        let r;
        if (authMode === "signup") r = await sb.auth.signUp({ email: fd.email.trim(), password: fd.password, options: { data: { pseudo: fd.pseudo.trim() }, emailRedirectTo: location.origin + location.pathname } });
        else r = await sb.auth.signInWithPassword({ email: fd.email.trim(), password: fd.password });
        if (r.error) throw r.error;
        if (!r.data.session) { authErr = "Compte créé. Ouvrez l'e-mail de confirmation, puis revenez vous connecter."; authMode = "login"; render(); break; }
        user = r.data.session.user; await enterCloud();
      } catch (er) {
        authErr = /invalid login/i.test(er.message || "") ? "E-mail ou mot de passe incorrect." : /already registered/i.test(er.message || "") ? "Un compte existe déjà avec cet e-mail : connectez-vous." : "Connexion impossible pour l'instant. Vérifiez le réseau et réessayez.";
        render();
      }
      break;
    }
    case "create": {
      btn.disabled = true; setupErr = "";
      const { data, error } = await sb.rpc("create_household", { p_name: fd.name.trim(), p_display: fd.display.trim(), p_color: COLORS[0] });
      if (error) { setupErr = /function|does not exist|schema cache/i.test(error.message) ? "Le foyer n'est pas encore installé dans Supabase : collez d'abord le script supabase-foyer.sql." : "Création impossible pour l'instant. Réessayez."; render(); break; }
      LS.set("mz_hh", data); LS.del("mz_join"); await enterCloud();
      break;
    }
    case "lookup": btn.disabled = true; setupErr = ""; await previewJoin(fd.code.trim().toUpperCase()); render(); break;
    case "join": {
      btn.disabled = true; setupErr = "";
      const { data, error } = await sb.rpc("join_household", { p_code: fd.code, p_display: fd.display.trim(), p_member: fd.member || null });
      if (error) { setupErr = /code inconnu/.test(error.message) ? "Ce code ne correspond à aucun foyer." : "Impossible de rejoindre pour l'instant. Réessayez."; joinPreview = null; render(); break; }
      LS.set("mz_hh", data); LS.del("mz_join"); joinPreview = null; await enterCloud();
      break;
    }
  }
});

/* ---------- demo data ---------- */
const DEMO_RECIPES = [
  { id: "d-r1", name: "Blanquette de veau", cat: "Plat", time: 120, serves: 4, ing: [{ n: "veau à blanquette", q: 800, u: "g", r: "Boucherie & poisson" }, { n: "carottes", q: 3, u: "pièce", r: "Fruits & légumes" }, { n: "champignons", q: 250, u: "g", r: "Fruits & légumes" }, { n: "crème fraîche", q: 20, u: "cl", r: "Crémerie" }, { n: "riz", q: 300, u: "g", r: "Épicerie" }] },
  { id: "d-r2", name: "Gratin dauphinois", cat: "Plat", time: 75, serves: 4, ing: [{ n: "pommes de terre", q: 1, u: "kg", r: "Fruits & légumes" }, { n: "crème fraîche", q: 40, u: "cl", r: "Crémerie" }, { n: "lait", q: 25, u: "cl", r: "Crémerie" }, { n: "ail", q: 1, u: "pièce", r: "Fruits & légumes" }] },
  { id: "d-r3", name: "Soupe de potiron", cat: "Entrée", time: 40, serves: 4, ing: [{ n: "potiron", q: 1, u: "kg", r: "Fruits & légumes" }, { n: "oignons", q: 1, u: "pièce", r: "Fruits & légumes" }, { n: "crème fraîche", q: 10, u: "cl", r: "Crémerie" }] },
  { id: "d-r4", name: "Quiche lorraine", cat: "Plat", time: 50, serves: 4, ing: [{ n: "pâte brisée", q: 1, u: "pièce", r: "Crémerie" }, { n: "lardons", q: 200, u: "g", r: "Boucherie & poisson" }, { n: "œufs", q: 3, u: "pièce", r: "Crémerie" }, { n: "crème fraîche", q: 20, u: "cl", r: "Crémerie" }] },
  { id: "d-r5", name: "Saumon, riz et brocolis", cat: "Plat", time: 30, serves: 4, ing: [{ n: "pavés de saumon", q: 4, u: "pièce", r: "Boucherie & poisson" }, { n: "brocolis", q: 1, u: "pièce", r: "Fruits & légumes" }, { n: "riz", q: 300, u: "g", r: "Épicerie" }, { n: "citron", q: 1, u: "pièce", r: "Fruits & légumes" }] },
  { id: "d-r6", name: "Crêpes", cat: "Dessert", time: 30, serves: 4, ing: [{ n: "farine", q: 250, u: "g", r: "Épicerie" }, { n: "œufs", q: 4, u: "pièce", r: "Crémerie" }, { n: "lait", q: 50, u: "cl", r: "Crémerie" }] }
];
function demoData() {
  const hid = "demo", d = today(), t = (title, o) => ({ id: uuid(), household_id: hid, title, room: "Divers", assignee: null, rotate: false, freq: "once", every_n: 1, weekdays: [], next_due: d, effort: 1, notes: "", archived: false, ...o });
  const M = [
    { id: "m1", household_id: hid, user_id: "demo", name: "Franck", color: COLORS[0], role: "owner", position: 0 },
    { id: "m2", household_id: hid, user_id: null, name: "Marie", color: COLORS[1], role: "member", position: 1 },
    { id: "m3", household_id: hid, user_id: null, name: "Léa", color: COLORS[2], role: "member", position: 2 }
  ];
  const tasks = [
    t("Sortir les poubelles", { room: "Cuisine", assignee: "m1", freq: "weekly", weekdays: [1, 4], next_due: d }),
    t("Vider le lave-vaisselle", { room: "Cuisine", assignee: "m3", rotate: true, freq: "daily", next_due: d }),
    t("Passer l'aspirateur", { room: "Ménage", assignee: "m2", freq: "weekly", weekdays: [6], effort: 2, next_due: addDays(d, -1) }),
    t("Faire une lessive", { room: "Linge", freq: "every", every_n: 3, next_due: d }),
    t("Changer les draps", { room: "Linge", assignee: "m2", freq: "every", every_n: 14, effort: 2, next_due: addDays(d, 3) }),
    t("Nettoyer la salle de bain", { room: "Salle de bain", assignee: "m1", freq: "weekly", weekdays: [6], effort: 3, next_due: addDays(d, 5) }),
    t("Arroser les plantes", { room: "Extérieur", assignee: "m3", freq: "every", every_n: 3, next_due: addDays(d, 1) })
  ];
  const lg = (title, m, ago, effort = 1) => ({ id: uuid(), household_id: hid, task_id: null, member_id: m, title, effort, done_on: addDays(d, -ago), at: new Date(Date.now() - ago * 864e5).toISOString() });
  const log = [lg("Faire les courses", "m1", 0, 2), lg("Vider le lave-vaisselle", "m2", 1), lg("Sortir les poubelles", "m1", 3), lg("Passer l'aspirateur", "m2", 6, 2), lg("Nettoyer la salle de bain", "m2", 5, 3), lg("Mettre la table", "m3", 1), lg("Mettre la table", "m3", 2)];
  const ev = (title, o) => ({ id: uuid(), household_id: hid, title, day: d, start_time: null, end_time: null, repeat: "none", members: [], place: "", notes: "", ...o });
  const wk = mondayOf(d);
  const events = [
    ev("Dentiste de Léa", { day: addDays(d, 1), start_time: "17:30", members: ["m3", "m2"], place: "Cabinet Dr Martin" }),
    ev("Judo", { day: addDays(wk, 2), start_time: "14:00", end_time: "15:30", repeat: "weekly", members: ["m3"] }),
    ev("Dîner chez Paul et Sophie", { day: addDays(d, 4), start_time: "20:00", members: ["m1", "m2"] }),
    ev("Anniversaire de Marie", { day: addDays(d, 12), repeat: "yearly", members: ["m2"] })
  ];
  const meal = (day, slot, o) => ({ id: uuid(), household_id: hid, day, slot, recipe_id: null, label: "", cook: null, ...o });
  const meals = [meal(d, "soir", { recipe_id: "d-r3", cook: "m1" }), meal(addDays(d, 1), "soir", { recipe_id: "d-r5", cook: "m2" }), meal(addDays(d, 2), "midi", { label: "Restes" }), meal(addDays(d, 2), "soir", { recipe_id: "d-r6", cook: "m3" })];
  const shop = [["Pain", "Boulangerie"], ["Bananes", "Fruits & légumes"], ["Liquide vaisselle", "Hygiène & maison"], ["Yaourts nature", "Crémerie"]].map(([name, aisle]) => ({ id: uuid(), household_id: hid, name, qty: "", aisle, done: false, source: "", added_by: "m1" }));
  return { hh: { id: hid, name: "Chez nous", invite_code: "DEMO00", people: 3 }, me: "m1", members: M, tasks, log, events, meals, shop, recipes: null };
}

/* ---------- go ---------- */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
init();
