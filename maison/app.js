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
const REPEATS = [["none", "Non"], ["weekly", "Chaque semaine"], ["monthly", "Chaque mois"], ["yearly", "Chaque année"], ["custom", "Personnaliser"]];
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


/* Notifications Maisonnée : abonnement Web Push par utilisateur (iOS PWA inclus).
   La clé VAPID publique est renseignée dans maison/push-config.js après configuration. */
const pushSupported = () => ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
function vapidBytes(base64) {
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function pushStatusText() {
  if (mode !== "cloud" || !user) return "Connectez-vous à votre foyer pour recevoir des rappels.";
  if (!pushSupported()) return "Les notifications push ne sont pas disponibles dans ce navigateur. Sur iPhone, ouvrez Maisonnée depuis l'écran d'accueil.";
  if (!window.MAISON_PUSH_VAPID_PUBLIC) return "Configuration serveur requise : renseignez la clé VAPID publique dans push-config.js.";
  return Notification.permission === "granted" ? "Notifications autorisées sur cet appareil." :
    Notification.permission === "denied" ? "Notifications refusées : autorisez Maisonnée dans les réglages de l'iPhone." :
    "Activez les notifications pour recevoir les rappels lorsque Maisonnée est fermée.";
}
async function showPushSettings() {
  const status = pushStatusText();
  let current = null;
  if (pushSupported()) {
    // never wait forever: if the app's background worker is not ready yet, open the settings anyway
    try { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, ko) => setTimeout(ko, 1500))]); current = await reg.pushManager.getSubscription(); } catch (_) {}
  }
  // what this person wants to receive (shared by all their devices, read by the server)
  let pr = { messages: true, reminders: true, digest: true, digest_at: "07:30", birthdays: true }, prOk = false;
  if (mode === "cloud" && user && sb) { try { const { data, error } = await sb.from("maison_push_prefs").select("prefs").eq("user_id", user.id).maybeSingle(); if (!error) { prOk = true; pr = { ...pr, ...((data && data.prefs) || {}) }; } } catch (_) {} }
  const sw = (k, t, d) => `<label class="switch" style="margin:0"><span><strong>${t}</strong><br><span class="muted small">${d}</span></span><input type="checkbox" data-pref="${k}" ${pr[k] ? "checked" : ""} ${prOk ? "" : "disabled"}></label>`;
  openSheet("Notifications", `<div style="display:grid;gap:14px">
    <p>${esc(status)}</p>
    <p class="muted small">Chaque téléphone doit activer les notifications séparément. Ces choix valent pour tous vos appareils.</p>
    <div class="card" style="display:grid;gap:14px">
      ${sw("messages", "Messages", "un nouveau message du foyer")}
      ${sw("reminders", "Rappels de rendez-vous", "rendez-vous Maisonnée, même répétés (ceux de Google sont rappelés par Google Agenda)")}
      ${sw("digest", "Résumé du matin", "tâches du jour, agenda, repas du soir, anniversaires, documents qui expirent")}
      <label class="field inline" style="margin:0;gap:10px;justify-content:space-between"><span class="small">Heure du résumé</span><select class="input" data-pref="digest_at" style="max-width:140px" ${prOk ? "" : "disabled"}>${["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"].map(h => `<option value="${h}" ${pr.digest_at === h ? "selected" : ""}>${h.replace(":", " h ").replace(/ h 00$/, " h")}</option>`).join("")}</select></label>
      ${sw("birthdays", "Anniversaires", "la veille à 19 h, et le jour même dans le résumé")}
      ${prOk ? "" : `<p class="muted small" style="margin:0">Pour choisir, collez d'abord le script supabase-foyer-10.sql dans Supabase.</p>`}
    </div>
    <button class="btn primary block" type="button" data-act="pushEnable" ${mode !== "cloud" || !pushSupported() || !window.MAISON_PUSH_VAPID_PUBLIC ? "disabled" : ""}>${current ? "Réactiver cet appareil" : "Activer sur cet iPhone"}</button>
    ${current ? '<button class="btn block" type="button" data-act="pushDisable">Désactiver sur cet appareil</button>' : ""}
    <p class="muted small">L'autorisation doit être demandée après un appui sur le bouton. Les notifications sont envoyées par le serveur, pas par l'application fermée.</p>
  </div>`);
}
async function enablePush() {
  try {
    if (mode !== "cloud" || !user || !sb) throw Error("Connectez-vous au foyer.");
    if (!pushSupported() || !window.MAISON_PUSH_VAPID_PUBLIC) throw Error(pushStatusText());
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw Error("Autorisation refusée sur cet appareil.");
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: vapidBytes(window.MAISON_PUSH_VAPID_PUBLIC)
    });
    const { error } = await sb.from("maison_push_subscriptions").upsert({
      user_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON(),
      updated_at: new Date().toISOString()
    }, {onConflict:"endpoint"});
    if (error) throw error;
    closeSheet(); toast("Notifications activées sur cet appareil.");
  } catch (err) { console.error("Activation push", err); alert("Notifications : " + (err.message || err)); }
}
async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (sb && user) {
        const { error } = await sb.from("maison_push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", user.id);
        if (error) throw error;
      }
      await sub.unsubscribe();
    }
    closeSheet(); toast("Notifications désactivées sur cet appareil.");
  } catch (err) { alert("Désactivation impossible : " + (err.message || err)); }
}

/* ---------- state ---------- */
let mode = LS.get("mz_mode", null);          // "demo" | "cloud" | null
let sb = null, user = null, rt = null;
let screen = "loading";                       // loading | welcome | auth | setup | app
let authMode = "login", authErr = "", setupErr = "", joinPreview = null;
let view = LS.get("mz_view", "home");
if (view === "today") view = "home";
let who = null;                               // member filter on Today and Tâches
let weekA = mondayOf(today()), weekR = mondayOf(today());
let repasTab = "menu";
let S = blank();
function blank() { return { hh: null, me: null, members: [], tasks: [], log: [], events: [], meals: [], shop: [], msgs: [], locs: [], v2: true, bdays: [], exp: [], docs: [], sched: [], v3: true, photos: [], v4: true, recipes: null }; }
const TABLES = { members: "household_members", tasks: "tasks", log: "task_log", events: "events", meals: "meals", shop: "shopping_items", msgs: "messages", locs: "member_locations" };
const V2 = ["msgs", "locs"]; // tables added by supabase-foyer-2.sql

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
async function upsert(key, row) {
  row = { household_id: S.hh.id, ...row };
  const i = S[key].findIndex(x => x.id === row.id), before = i >= 0 ? S[key][i] : null;
  if (i >= 0) S[key][i] = { ...before, ...row }; else S[key].push(row);
  saveLocal(); softRender();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).upsert(row);
    if (error) { if (before) S[key][i] = before; else S[key] = S[key].filter(x => x.id !== row.id); saveLocal(); softRender(); fail(error); return false; }
  }
  return true;
}
async function patch(key, id, p) {
  const r = S[key].find(x => x.id === id); if (!r) return false;
  const before = { ...r }; Object.assign(r, p); saveLocal(); render();
  if (mode === "cloud") {
    const { error } = await sb.from(TABLES[key]).update(p).eq("id", id);
    if (error) { Object.assign(r, before); saveLocal(); render(); fail(error); return false; }
  }
  return true;
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
  const [hh, mm, tk, lg, ev, ml, sh, ms, lc] = await Promise.all([
    sb.from("households").select("*").eq("id", hid).single(),
    sb.from("household_members").select("*").eq("household_id", hid),
    sb.from("tasks").select("*").eq("household_id", hid).eq("archived", false),
    sb.from("task_log").select("*").eq("household_id", hid).gte("done_on", since),
    sb.from("events").select("*").eq("household_id", hid),
    sb.from("meals").select("*").eq("household_id", hid).gte("day", addDays(today(), -14)),
    sb.from("shopping_items").select("*").eq("household_id", hid),
    sb.from("messages").select("*").eq("household_id", hid).order("created_at", { ascending: false }).limit(300),
    sb.from("member_locations").select("*").eq("household_id", hid)
  ]);
  // anniversaires, budget, documents, emploi du temps: third script
  const [bd, ex, dc, sc] = await Promise.all(["birthdays", "expenses", "documents", "schedule"].map(t => sb.from(t).select("*").eq("household_id", hid)));
  const v3 = ![bd, ex, dc, sc].some(r => r.error);
  const ph = await sb.from("photos").select("*").eq("household_id", hid).order("created_at", { ascending: false }).limit(2000);
  const v4 = !ph.error;
  const bad = [hh, mm, tk, lg, ev, ml, sh].find(r => r.error);
  if (bad) throw bad.error;
  // messages and positions need the second script; the rest of the app works without it
  const v2 = !ms.error && !lc.error;
  const recipes = S.recipes, favs = S.favs;
  S = { v5: "carnet_user" in hh.data, favs, hh: hh.data, me: (mm.data.find(m => m.user_id === user.id) || {}).id || null, members: mm.data, tasks: tk.data, log: lg.data, events: ev.data, meals: ml.data, shop: sh.data,
    msgs: v2 ? ms.data.reverse() : [], locs: v2 ? lc.data : [], v2,
    bdays: v3 ? bd.data : [], exp: v3 ? ex.data : [], docs: v3 ? dc.data : [], sched: v3 ? sc.data : [], v3, photos: v4 ? ph.data : [], v4, recipes };
  saveLocal();
}

function listen(hid) {
  if (rt) { sb.removeChannel(rt); rt = null; }
  rt = sb.channel("foyer-" + hid);
  for (const [key, table] of Object.entries(TABLES)) {
    if (V2.includes(key) && !S.v2) continue;
    if (V3.includes(key) && !S.v3) continue;
    if (key === "photos" && !S.v4) continue;
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
  // live views update in place so typing a message or looking at the map is not interrupted
  if (screen === "app" && view === "messages" && $("#msgList") && !$("#sheet").open) { renderMsgs(); return; }
  if (screen === "app" && view === "carte" && map && !$("#sheet").open) { drawMarkers(); refreshLocList(); return; }
  if ($("#sheet").open || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { pending = true; return; }
  render();
}

async function loadRecipes() {
  if (S.recipes) return S.recipes;
  if (mode !== "cloud") { S.recipes = DEMO_RECIPES; return S.recipes; }
  let all = [], error = null;
  for (let from = 0; ; from += 1000) {
    const r = await sb.from("recipes").select("id,legacy_id,name,cat,time,serves,ing,image,steps").order("name").range(from, from + 999);
    if (r.error) { error = r.error; break; }
    all = all.concat(r.data || []); if (!r.data || r.data.length < 1000) break;
  }
  S.recipes = error && !all.length ? [] : all;
  if (typeof loadFavs === "function") await loadFavs();
  return S.recipes;
}

/* ---------- startup ---------- */
async function init() {
  const url = new URL(location.href), code = url.searchParams.get("code");
  // opened from a notification (e.g. a new message): go straight to that page
  const goTo = url.searchParams.get("v");
  if (goTo) { view = goTo; LS.set("mz_view", goTo); url.searchParams.delete("v"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  if (code) { LS.set("mz_join", code.toUpperCase()); url.searchParams.delete("code"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  if (mode === "demo") { S = demoUpgrade(LS.get("mz_demo", null)) || demoData(); screen = "app"; render(); return geoTick(); }
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
  listen(hid); screen = "app"; render(); geoTick();
  loadRecipes().then(() => softRender());
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || mode !== "cloud" || !S.hh || !user) return;
  try { await loadCloud(S.hh.id); softRender(); } catch (e) {}
  geoTick();
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
function recurrenceInfo(repeat) {
  const m = /^custom:(\d{1,3}):(days|weeks|months|years)$/.exec(repeat || "");
  return m ? { interval: Number(m[1]), unit: m[2] } : null;
}
function recurrenceDate(start, i, unit, interval) {
  const n = i * interval;
  if (unit === "days") return addDays(start, n);
  if (unit === "weeks") return addDays(start, 7 * n);
  const d = parse(start), months = unit === "years" ? n * 12 : n;
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return ymd(new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last)));
}
function returnToTodayAgenda() {
  const d = today();
  view = "agenda"; LS.set("mz_view", "agenda");
  weekA = mondayOf(d); calSel = d; calMonth = d.slice(0, 7) + "-01";
  render(); window.scrollTo(0, 0);
}
const spanOf = e => Math.max(0, e.end_day && e.end_day > e.day ? diffDays(e.day, e.end_day) : 0);
function occurrences(from, to) {
  const out = [];
  // one entry per day covered: k = day index (0 = first day), n = number of days
  const push = (e, start) => { const n = spanOf(e) + 1; for (let k = 0; k < n; k++) { const d = addDays(start, k); if (d >= from && d <= to) out.push({ ...e, on: d, start_on: start, k, n }); } };
  for (const e of S.events) {
    const len = spanOf(e);
    if (e.repeat === "none" || !e.repeat) { if (e.day <= to && addDays(e.day, len) >= from) push(e, e.day); continue; }
    if (e.day > to) continue;
    const custom = recurrenceInfo(e.repeat);
    const unit = custom?.unit || ({weekly:"weeks",monthly:"months",yearly:"years"}[e.repeat]);
    if (!unit) continue;
    const interval = custom?.interval || 1;
    for (let i = 0; i < 800; i++) {
      const d = recurrenceDate(e.day, i, unit, interval);
      if (d > to) break;
      if (addDays(d, len) >= from) push(e, d);
    }
  }
  // on a given day: what lasts the whole day first, then by time
  const t = o => o.n > 1 && o.k > 0 && o.k < o.n - 1 ? "" : o.n > 1 && o.k === o.n - 1 ? "" : String(o.start_time || "");
  return out.sort((a, b) => a.on.localeCompare(b.on) || t(a).localeCompare(t(b)));
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
  view = "courses"; render();
  toast(`${agg.size} ingrédients ajoutés aux courses.`);
}

/* ---------- messages ---------- */
const readKey = () => "mz_read_" + (S.hh ? S.hh.id : "");
const unread = () => { const r = LS.get(readKey(), ""); return S.msgs.filter(m => m.member_id !== S.me && m.created_at > r).length; };
function updateBadge() { const b = $("#msgBadge"); if (!b) return; const n = view === "messages" ? 0 : unread(); b.hidden = !n; b.textContent = n > 9 ? "9+" : n; }
const timeHM = iso => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
function v2Notice() { return `<div class="empty"><strong>Encore une étape.</strong>Collez le script <b>supabase-foyer-2.sql</b> dans Supabase (comme le premier), puis rouvrez l'appli.</div>`; }
function msgListHtml() {
  if (!S.msgs.length) return `<div class="empty"><strong>Aucun message pour l'instant.</strong>Ce que vous écrivez ici, tout le foyer le voit.</div>`;
  let out = "", lastDay = "", lastWho = null;
  for (const m of [...S.msgs].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const day = ymd(new Date(m.created_at));
    if (day !== lastDay) { out += `<p class="msg-day">${esc(dayLabel(day))}</p>`; lastDay = day; lastWho = null; }
    const mine = m.member_id === S.me, who = member(m.member_id), first = lastWho !== m.member_id;
    out += `<div class="msg ${mine ? "mine" : ""} ${first ? "first" : ""}">
      ${mine ? "" : first ? av(who, "sm") : `<span class="av-gap"></span>`}
      <div class="bubble" ${mine ? `data-act="msgMenu" data-v="${m.id}" role="button" tabindex="0" aria-label="Message envoyé à ${esc(timeHM(m.created_at))}, toucher pour supprimer"` : who ? `style="--c:${esc(who.color)}"` : ""}>
        ${!mine && first ? `<span class="from">${esc(who ? who.name : "Ancien membre")}</span>` : ""}<span class="txt">${esc(m.body)}</span><span class="at">${esc(timeHM(m.created_at))}</span></div></div>`;
    lastWho = m.member_id;
  }
  return out;
}
function renderMsgs() {
  const el = $("#msgList"); if (!el) return;
  el.innerHTML = msgListHtml();
  requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const last = S.msgs.reduce((a, m) => m.created_at > a ? m.created_at : a, "");
  if (last && document.visibilityState === "visible") LS.set(readKey(), last);
  updateBadge();
}
async function sendMsg(body) {
  if (!S.me) { toast("Votre compte n'est relié à aucun membre de ce foyer."); return false; }
  const row = { id: uuid(), household_id: S.hh.id, member_id: S.me, body, created_at: new Date().toISOString() };
  S.msgs.push(row); saveLocal(); renderMsgs();
  if (mode === "cloud") {
    const { error } = await sb.from("messages").insert(row);
    if (error) { S.msgs = S.msgs.filter(x => x.id !== row.id); saveLocal(); renderMsgs(); fail(error); return false; }
  }
  return true;
}

/* ---------- positions ---------- */
let map = null, mapMarkers = [], mapView = null, geoLast = 0;
const geoKey = () => "mz_geo_" + (S.hh ? S.hh.id : "");
const geoOn = () => !!LS.get(geoKey(), false);
function geoTick(force) {
  if (!S.hh || !S.me || !S.v2 || !geoOn() || !navigator.geolocation) return;
  if (!force && Date.now() - geoLast < 4 * 60 * 1000) return;
  geoLast = Date.now();
  navigator.geolocation.getCurrentPosition(
    async p => {
      const lat = +p.coords.latitude.toFixed(5), lng = +p.coords.longitude.toFixed(5);
      const row = { id: S.me, lat, lng, accuracy: Math.round(p.coords.accuracy), updated_at: new Date().toISOString() };
      if (S.v5 || mode === "demo") { const a = await addressOf(lat, lng); if (a) row.address = a; }
      upsert("locs", row);
    },
    err => {
      if (err.code === 1) { LS.set(geoKey(), false); softRender(); }
      if (force || err.code === 1) toast(err.code === 1 ? "Localisation refusée. Sur iPhone : Réglages › Confidentialité › Service de localisation › Sites Safari, puis « Lorsque l'app est active »." : "Position introuvable pour l'instant. Réessayez dans un moment.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
setInterval(() => { if (document.visibilityState === "visible") geoTick(); }, 60 * 1000);
async function geoToggle(on) {
  LS.set(geoKey(), on);
  if (on) { geoLast = 0; geoTick(true); toast("Position partagée avec le foyer."); }
  else { if (S.locs.some(l => l.id === S.me)) await remove("locs", S.me); toast("Vous ne partagez plus votre position."); }
  render();
}
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 90) return "à l'instant";
  const m = Math.round(s / 60); if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? "hier" : `il y a ${d} jours`;
}
function locListHtml() {
  return members().map(m => {
    const l = S.locs.find(x => x.id === m.id);
    return `<button class="row" ${l ? `data-act="locate" data-v="${m.id}"` : "disabled"}>${av(m, "lg")}<span class="main"><span class="t">${esc(m.name)}${m.id === S.me ? " (moi)" : ""}</span><span class="m">${l ? (l.address ? `<span class="addr">${esc(l.address)}</span><br>` : "") + "Vu " + esc(ago(l.updated_at)) : m.user_id || m.id === S.me ? "Ne partage pas sa position" : "Sans compte"}</span></span></button>`;
  }).join("");
}
// street address of a position (OpenStreetMap), looked up again only after a move of ~40 m
let addrCache = LS.get("mz_addr", null);
async function addressOf(lat, lng) {
  if (addrCache && Math.abs(addrCache.lat - lat) < 0.0004 && Math.abs(addrCache.lng - lng) < 0.0005) return addrCache.a;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=fr&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return addrCache ? addrCache.a : "";
    const j = await r.json(), a = j.address || {};
    const street = [a.house_number, a.road || a.pedestrian || a.footway || a.path || a.square || a.place].filter(Boolean).join(" ");
    const town = a.city || a.town || a.village || a.municipality || a.hamlet || "";
    const label = [street || a.amenity || a.building || a.neighbourhood || a.suburb, town].filter(Boolean).join(", ") || String(j.display_name || "").split(",").slice(0, 3).join(",");
    addrCache = { lat, lng, a: label }; LS.set("mz_addr", addrCache);
    return label;
  } catch (e) { return addrCache ? addrCache.a : ""; }
}
function refreshLocList() { const el = $("#locList"); if (el) el.innerHTML = locListHtml(); }
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  return new Promise((ok, ko) => {
    const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(c);
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
  });
}
async function mountMap() {
  if (!$("#map")) return;
  try { await loadLeaflet(); } catch (e) { const el = $("#map"); if (el) el.innerHTML = `<p class="muted" style="padding:16px">La carte ne se charge pas : vérifiez la connexion.</p>`; return; }
  const el = $("#map"); if (!el || map) return;
  map = L.map(el, { zoomControl: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  drawMarkers(true);
}
function drawMarkers(fit) {
  if (!map || !window.L) return;
  mapMarkers.forEach(m => m.remove()); mapMarkers = [];
  const pts = [];
  for (const l of S.locs) {
    const m = member(l.id); if (!m) continue;
    const icon = L.divIcon({ className: "pin", html: `<span class="av lg" style="--c:${esc(m.color)}">${esc(initial(m.name))}</span>`, iconSize: [44, 44], iconAnchor: [22, 22] });
    mapMarkers.push(L.marker([l.lat, l.lng], { icon, title: m.name }).addTo(map).bindPopup(`<strong>${esc(m.name)}</strong><br>${l.address ? esc(l.address) + "<br>" : ""}${esc(ago(l.updated_at))}`));
    pts.push([l.lat, l.lng]);
  }
  if (!fit) return;
  if (mapView) map.setView(mapView.c, mapView.z);
  else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  else if (pts.length) map.setView(pts[0], 14);
  else map.setView([46.6, 2.4], 5);
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
  tick: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5.5h16v11H9.5L5 20v-3.5H4z"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M4 12 20 4l-4 16-4.5-6.5z"/><path d="m11.5 13.5 4-4"/></svg>'
};
const TABS = [["today", "Aujourd'hui", I.today], ["tasks", "Tâches", I.tasks], ["agenda", "Agenda", I.agenda], ["repas", "Repas", I.repas], ["messages", "Messages", I.chat]];

/* ---------- render ---------- */
function render() {
  pending = false;
  const app = $("#app");
  if (screen === "loading") { app.innerHTML = `<div class="welcome wrap"><p class="muted">Chargement…</p></div>`; return; }
  if (screen === "welcome") return renderWelcome(app);
  if (screen === "auth") return renderAuth(app);
  if (screen === "setup") return renderSetup(app);
  if (!VIEWS[view]) view = "home";
  const fab = { home: ["Ajouter", "quickAdd"], tasks: ["Tâche", "newTask"], agenda: ["Événement", "newEvent"], anniv: ["Anniversaire", "newBday"], budget: ["Dépense", "newExp"], docs: ["Document", "newDoc"], edt: ["Créneau", "newSlot"], galerie: ["Photos", "pickPhotos"] }[view];
  if (map) { mapView = { c: map.getCenter(), z: map.getZoom() }; map.remove(); map = null; }
  const composer = view === "messages" && S.v2 ? `<form data-form="msg" class="composer" autocomplete="off"><div class="wrap inline">
      <textarea class="input" name="body" rows="1" maxlength="2000" placeholder="Écrire au foyer…" aria-label="Message"></textarea>
      <button class="send" type="submit" aria-label="Envoyer">${I.send}</button></div></form>` : "";
  const mod = modOf(view), isHome = view === "home";
  const avatars = `<button class="stack" data-act="go" data-v="foyer" aria-label="Ma famille">${members().slice(0, 4).map(m => av(m)).join("")}</button>`;
  const head = isHome
    ? `<button class="hh-name" data-act="go" data-v="foyer">${esc(S.hh ? S.hh.name : "")}</button><span class="inline" style="gap:2px"><button class="icon-btn plain" data-act="go" data-v="carte" aria-label="Localisation">${I.pin}</button>${avatars}<button class="icon-btn plain" data-act="pushSettings" aria-label="Notifications">🔔</button></span>`
    : `<span class="inline" style="gap:6px;min-width:0"><button class="icon-btn plain back" data-act="go" data-v="${view === "explore" ? "home" : mod && homePins().includes(view) ? "home" : "explore"}" aria-label="Retour">${I.left}</button>${mod ? mi(view, "sm") : ""}<h1 class="title">${esc(mod ? mod.t : view === "explore" ? "Explorer" : "")}</h1></span>${view === "explore" ? "" : `${avatars}<button class="icon-btn plain" data-act="pushSettings" aria-label="Notifications">🔔</button>`}`;
  app.innerHTML = `
    <header class="top"><div class="wrap">${head}</div></header>
    <main class="wrap view-${view}" id="main">${VIEWS[view]()}</main>
    ${view === "agenda" ? `<button class="fab" data-act="newEvent">${I.plus}Événement</button><button class="fab" data-act="newAppointment" style="bottom:calc(var(--navspace) + env(safe-area-inset-bottom) + 66px)">${I.plus}Rendez-vous</button>` : fab ? `<button class="fab" data-act="${fab[1]}">${I.plus}${fab[0]}</button>` : ""}
    ${composer}
    <nav class="pill" aria-label="Navigation">
      <button data-act="go" data-v="home" ${isHome ? 'aria-current="page"' : ""}>${I.home}<span>Accueil</span></button>
      <button data-act="go" data-v="messages" ${view === "messages" ? 'aria-current="page"' : ""}>${I.chat}<span>Messages</span><i class="badge" id="msgBadge" hidden></i></button>
      <button data-act="go" data-v="explore" ${view === "explore" ? 'aria-current="page"' : ""}>${I.grid}<span>Explorer</span></button>
    </nav>`;
  if (view === "messages") renderMsgs();
  if (view === "carte") mountMap();
  if (typeof afterRender === "function") afterRender();
  updateBadge();
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
    if (!live().length) return `<div class="empty"><strong>Commencez par quelques classiques.</strong>Touchez une idée pour l'ajouter, ou créez la vôtre avec le bouton « Tâche ».
        <div class="chips" style="margin-top:12px">${TASK_IDEAS.map((x, i) => `<button class="chip" data-act="idea" data-v="${i}">${esc(x.title)}</button>`).join("")}</div></div>`;
    return `${whoFilter()}
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

  messages() {
    if (!S.v2) return v2Notice();
    return `<div id="msgList" class="msgs" aria-live="polite"></div>`;
  },

  carte() {
    if (!S.v2) return v2Notice();
    return `<div id="map" class="map" role="img" aria-label="Carte des positions partagées"></div>
      <div class="card" style="margin-top:12px"><label class="switch" style="margin:0"><span><strong>Partager ma position</strong><br><span class="muted small">${geoOn() ? "Mise à jour à chaque ouverture de l'appli." : "Seuls les membres du foyer la voient. Vous pouvez arrêter à tout moment."}</span></span><input type="checkbox" data-geo ${geoOn() ? "checked" : ""} ${S.me ? "" : "disabled"}></label></div>
      <div class="list" id="locList" style="margin-top:12px">${locListHtml()}</div>
      <p class="muted small" style="margin-top:10px">Sur iPhone, une appli web ne lit la position que lorsqu'elle est ouverte : la carte montre la dernière position connue.</p>`;
  },

  foyer() {
    const isDemo = mode === "demo";
    return `<div class="card inline" style="justify-content:space-between"><span><span class="muted small">Foyer</span><br><strong style="font-size:20px">${esc(S.hh.name)}</strong></span><button class="btn" data-act="renameHh">Renommer</button></div>
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
  const multi = (e.n || 1) > 1, first = !multi || e.k === 0, last = multi && e.k === e.n - 1;
  const when = multi && !first ? (last && e.end_time ? `<span class="ev-time">→ ${esc(hm(e.end_time))}</span>` : `<span class="ev-time allday">Journée</span>`)
    : e.start_time ? `<span class="ev-time">${esc(hm(e.start_time))}</span>` : `<span class="ev-time allday">Journée</span>`;
  const meta = [];
  if (withDay || withDate) meta.push(esc(withDate ? dayLabel(e.on) : (e.on === today() ? "Aujourd'hui" : "Demain")));
  if (multi && first) meta.push("jusqu'au " + esc(parse(addDays(e.on, e.n - 1)).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })) + (e.end_time ? " à " + esc(hm(e.end_time)) : ""));
  else if (multi && last) meta.push(`dernier jour · ${e.n}/${e.n}`);
  else if (multi) meta.push(`jour ${e.k + 1}/${e.n}`);
  else if (e.end_time && e.start_time) meta.push("jusqu'à " + esc(hm(e.end_time)));
  if (e.place) meta.push(esc(e.place));
  if (e.repeat && e.repeat !== "none") { const custom = recurrenceInfo(e.repeat); meta.push(esc(custom ? `tous les ${custom.interval} ${ {days:"jours",weeks:"semaines",months:"mois",years:"ans"}[custom.unit]}` : (REPEATS.find(r => r[0] === e.repeat) || [, ""])[1].toLowerCase())); }
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
  if (isLinked()) out += `<div class="card linkcard" style="margin-top:14px"><span>Menu synchronisé avec le Carnet de menus. Les ingrédients des repas validés arrivent seuls dans Courses.</span><a class="linkbtn" href="${CARNET_URL}">Ouvrir le Carnet</a></div>`;
  else out += `<div class="btns"><button class="btn primary block" data-act="toShop" ${n ? "" : "disabled"}>Ajouter les ingrédients aux courses</button></div>
    ${n ? "" : `<p class="muted small" style="margin-top:8px">Choisissez des recettes du livre pour que leurs ingrédients arrivent dans les courses.</p>`}`;
  return out;
}

function shopView() {
  const items = S.shop, todo = items.filter(x => !x.done), done = items.filter(x => x.done);
  const byAisle = AISLES.map(a => [a, todo.filter(x => x.aisle === a).sort((p, q) => p.name.localeCompare(q.name))]).filter(([, l]) => l.length);
  const item = x => `<button class="shop-item ${x.done ? "done" : ""}" data-act="shopToggle" data-v="${x.id}" aria-pressed="${!!x.done}"><span class="box">${I.tick}</span><span class="nm">${esc(x.name)}</span><span class="q">${esc(x.qty)}</span></button>`;
  const owner = isLinked() ? member((S.members.find(m => m.user_id === S.hh.carnet_user) || {}).id) : null;
  const clearable = done.filter(x => !String(x.source || "").startsWith("carnet:"));
  return `${isLinked() ? `<div class="card linkcard"><span>Synchronisée avec le Carnet de menus${owner ? " de " + esc(owner.name) : ""}.</span><a class="linkbtn" href="${CARNET_URL}">Ouvrir le Carnet</a></div>` : ""}
    <form data-form="shopAdd" class="inline" style="margin-top:14px" autocomplete="off">
      <input class="input" id="shopIn" name="name" aria-label="Article à ajouter" placeholder="Ajouter : lait, piles, pain…" enterkeyhint="done">
      <button class="btn ink" type="submit">Ajouter</button></form>
    ${!items.length ? `<div class="empty" style="margin-top:16px"><strong>La liste est vide.</strong>Ajoutez des articles ci-dessus, ou envoyez les ingrédients du menu depuis l'onglet Menu.</div>` : ""}
    ${byAisle.map(([a, l]) => `<p class="group-h">${esc(a)}</p><div class="list">${l.map(item).join("")}</div>`).join("")}
    ${!todo.length && items.length ? `<div class="empty" style="margin-top:16px"><strong>Tout est dans le panier.</strong></div>` : ""}
    ${done.length ? `<p class="group-h">Dans le panier</p><div class="list">${done.map(item).join("")}</div>
      ${clearable.length ? `<div class="btns"><button class="btn" data-act="shopClear">Retirer les ${clearable.length} articles cochés</button></div>` : ""}
      ${isLinked() && clearable.length < done.length ? `<p class="muted small" style="margin-top:8px">Les ingrédients des repas quittent la liste quand les courses sont terminées dans le Carnet.</p>` : ""}` : ""}`;
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
let sheetPageScroll = null;
function lockSheetBackground() {
  if (sheetPageScroll !== null) return;
  sheetPageScroll = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${sheetPageScroll}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.classList.add("maison-sheet-open");
}
function unlockSheetBackground() {
  if (sheetPageScroll === null) return;
  const y = sheetPageScroll;
  sheetPageScroll = null;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.classList.remove("maison-sheet-open");
  window.scrollTo(0, y);
}
function openSheet(title, body, ctx = {}) {
  sheetCtx = ctx;
  $("#sheetIn").innerHTML = `<div class="grab" aria-hidden="true"></div><div class="sheet-h"><h2 id="sheetTitle">${esc(title)}</h2><button class="btn ghost" data-act="closeSheet">Fermer</button></div>${body}`;
  const d = $("#sheet");
  if (!d.open) { lockSheetBackground(); d.showModal(); }
  d.scrollTop = 0;
  // Do not focus an input when opening: iOS must keep the keyboard closed.
  if (document.activeElement?.matches?.("input, textarea, select")) document.activeElement.blur();
}
function closeSheet() { const d = $("#sheet"); if (d.open) d.close(); }
$("#sheet").addEventListener("close", () => { unlockSheetBackground(); sheetCtx = null; if (pending) render(); });
// A tap on non-interactive space inside any sheet dismisses the iPhone keyboard.
$("#sheet").addEventListener("pointerdown", e => {
  if (!document.activeElement?.matches?.("input, textarea, select, [contenteditable=true]")) return;
  if (e.target.closest("input, textarea, select, button, label, [contenteditable=true], a, [role=button]")) return;
  document.activeElement.blur();
});
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

/* Rendez-vous : délais en minutes, enregistrés dans events.reminders (JSONB). */
const REMINDER_DEFAULT_KEY = "mz_appointment_reminder_defaults";
const reminderDefaults = () => {
  const stored = LS.get(REMINDER_DEFAULT_KEY, [1440, 30]);
  return Array.isArray(stored) ? stored.filter(n => Number.isInteger(n) && n >= 0 && n <= 525600) : [1440, 30];
};
function reminderRows(values) {
  return values.map((minutes) => {
    const unit = minutes % 1440 === 0 && minutes >= 1440 ? 1440 : minutes % 60 === 0 && minutes >= 60 ? 60 : 1;
    return `<div class="inline reminder-row" style="gap:8px;margin:8px 0;align-items:center">
      <input class="input" aria-label="Durée du rappel" type="number" min="0" max="525600" step="1" value="${minutes / unit}" style="min-width:70px;flex:1" data-reminder-value>
      <select class="input" aria-label="Unité du rappel" data-reminder-unit style="flex:1"><option value="1" ${unit === 1 ? "selected" : ""}>minutes</option><option value="60" ${unit === 60 ? "selected" : ""}>heures</option><option value="1440" ${unit === 1440 ? "selected" : ""}>jours</option></select>
      <button class="btn ghost" type="button" data-act="removeReminder" aria-label="Supprimer ce rappel">✕</button>
    </div>`;
  }).join("");
}
function appointmentReminderValues(form) {
  const rows = [...form.querySelectorAll(".reminder-row")];
  const values = rows.map(r => {
    const value = Number(r.querySelector("[data-reminder-value]").value);
    const unit = Number(r.querySelector("[data-reminder-unit]").value);
    return Number.isInteger(value) && value >= 0 && Number.isInteger(value * unit) && value * unit <= 40320 ? value * unit : NaN;
  });
  return values.every(Number.isFinite) ? [...new Set(values)] : null;
}
function reminderVisibility(form) {
  const box = form.querySelector("#appointmentReminderList");
  if (box) box.hidden = form.querySelector('[name="reminder_mode"]:checked')?.value !== "custom";
}
/* Couleurs Google par personne : la couleur d'un rendez-vous dit pour quel enfant il est */
const G_COLORS = [["1", "Lavande", "#a4bdfc"], ["2", "Sauge", "#7ae7bf"], ["3", "Raisin", "#dbadff"], ["4", "Flamant", "#ff887c"], ["5", "Banane", "#fbd75b"], ["6", "Mandarine", "#ffb878"], ["7", "Paon", "#46d6db"], ["8", "Graphite", "#e1e1e1"], ["9", "Myrtille", "#5484ed"], ["10", "Basilic", "#51b749"], ["11", "Tomate", "#dc2127"]];
// who each colour stands for, shared by the household (falls back to this phone if the column is missing)
const gColorNames = () => (S.hh && S.hh.google_colors) || LS.get("mz_gcolor_names", {});
const gColorHex = id => (typeof G !== "undefined" && G.palette && G.palette[id]) || (G_COLORS.find(c => c[0] === id) || [])[2] || "";
const gColorLabel = id => gColorNames()[id] || (G_COLORS.find(c => c[0] === id) || [, ""])[1];
function gColorChooser(current = "") {
  const names = gColorNames(), named = G_COLORS.filter(([id]) => names[id]), rest = G_COLORS.filter(([id]) => !names[id]);
  const chip = ([id, n]) => `<button type="button" class="chip" data-chip="gcolor" data-v="${id}" aria-pressed="${current === id}"><span class="cat-dot" style="--c:${esc(gColorHex(id))}"></span>${esc(names[id] || n)}</button>`;
  // every colour is shown at once (the folding « Autres couleurs » list did not open on iPhone)
  return `<div class="field" id="gColorBox" hidden><span class="label">Pour qui (couleur dans Google)</span>
    <div class="chips" role="group"><button type="button" class="chip" data-chip="gcolor" data-v="" aria-pressed="${!current}">Couleur de l'agenda</button>${named.map(chip).join("")}${rest.map(chip).join("")}</div>
    ${named.length ? "" : `<p class="muted small" style="margin:6px 0 0">Astuce : dans Ma famille › Agenda Google › « Couleurs des enfants », donnez un prénom à chaque couleur.</p>`}</div>`;
}
function syncGColorBox(form) {
  const box = form && form.querySelector("#gColorBox"), sel = form && form.querySelector('[name="google_destination"]');
  if (box && sel) box.hidden = sel.value === "local";
}
// default calendar for new appointments: the one chosen in Ma famille, otherwise the family's « Agendas »
function defaultDest() {
  const all = (typeof G !== "undefined" ? G.list : []) || [], ok = c => c && (c.accessRole === "owner" || c.accessRole === "writer");
  const chosen = LS.get("mz_default_dest", null);
  if (chosen === "local") return "local";
  if (chosen && ok(all.find(c => c.id === chosen))) return chosen;
  const fam = all.find(c => ok(c) && /^agendas?$/i.test(String(c.name).trim()));
  return fam ? fam.id : "local";
}
function googleDestinationOptions() {
  // every Google calendar is listed; the ones this account may only read are shown greyed out, with the reason
  const all = (typeof G !== "undefined" && G.connected ? G.list : []);
  const canWrite = c => c.accessRole === "owner" || c.accessRole === "writer";
  const preferred = G.connected ? defaultDest() : "local";
  const ro = all.filter(c => !canWrite(c));
  const label = preferred === "local" ? "Maisonnée (agenda familial)" : (all.find(c => c.id === preferred) || {}).name;
  return `<p class="small" id="destLine" style="margin:14px 0 0">Enregistré dans <strong>${esc(label)}</strong>${all.some(canWrite) ? ` · <button type="button" class="linkbtn small" data-act="destChange">Changer</button>` : ""}</p>
    <div id="destBox" hidden><label class="field"><span class="label">Enregistrer dans</span><select class="input" name="google_destination"><option value="local">Maisonnée (agenda familial)</option>${all.map(c => `<option value="${esc(c.id)}" ${canWrite(c) ? (preferred === c.id ? "selected" : "") : "disabled"}>${esc(c.name)}${canWrite(c) ? "" : " (lecture seule)"}</option>`).join("")}</select></label>
    ${ro.length ? `<p class="muted small" style="margin:6px 0 0">${ro.map(c => esc(c.name)).join(", ")} : ${ro.length > 1 ? "agendas partagés" : "agenda partagé"} avec vous en lecture seule. Pour y ajouter des rendez-vous, son propriétaire doit vous donner le droit « Apporter des modifications aux événements » dans Google Agenda.</p>` : ""}</div>`;
}
// Erreurs visibles dans la fenêtre modale (un toast derrière <dialog> est invisible sur iOS).
function eventFormFeedback(form, message) {
  let box = form.querySelector("[data-event-feedback]");
  if (!box) {
    box = document.createElement("div");
    box.setAttribute("data-event-feedback", "");
    box.setAttribute("role", "alert");
    box.style.cssText = "padding:12px 14px;margin:12px 0;border:1px solid #ff9999;border-radius:12px;background:#4b1c30;color:#fff;font-weight:600;line-height:1.45";
    form.querySelector(".sheet-sticky")?.before(box);
  }
  box.textContent = message;
  box.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function googleEventPayload(row) {
  const start = row.start_time ? `${row.day}T${row.start_time}:00` : null;
  // Google needs an end of the same kind as the start: without an end time, the appointment lasts one hour
  const plus1h = t => { const [h, m] = t.split(":").map(Number), x = Math.min(23 * 60 + 59, h * 60 + m + 60); return pad(Math.floor(x / 60)) + ":" + pad(x % 60); };
  const endTime = row.start_time ? (row.end_time && row.end_time > row.start_time ? row.end_time : plus1h(row.start_time)) : null;
  const lastDay = row.end_day && row.end_day > row.day ? row.end_day : row.day;
  // several days with times: the end time is on the last day (without one, the event ends at the same hour)
  const endT = row.start_time && lastDay !== row.day ? (row.end_time || row.start_time) : endTime;
  const end = endT ? `${lastDay}T${endT}:00` : null;
  const nextDay = addDays(lastDay, 1);
  const payload = { summary: row.title, location: row.place || "", description: row.notes || "", start: start ? {dateTime: start, timeZone: "Europe/Paris"} : {date: row.day}, end: end && start ? {dateTime: end, timeZone: "Europe/Paris"} : {date: nextDay} };
  if (row.repeat && row.repeat !== "none") {
    const custom = recurrenceInfo(row.repeat);
    const freq = custom ? {days:"DAILY",weeks:"WEEKLY",months:"MONTHLY",years:"YEARLY"}[custom.unit] : { weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" }[row.repeat];
    if (freq) payload.recurrence = [`RRULE:FREQ=${freq}${custom ? ";INTERVAL=" + custom.interval : ""}`];
  }
  if (row.colorId) payload.colorId = String(row.colorId);
  if (row.reminders) payload.reminders = {useDefault:false, overrides: row.reminders.filter(m => m <= 40320).slice(0,5).map(minutes => ({method:"popup",minutes}))};
  return payload;
}
async function saveGoogleEvent(calendarId, row) {
  if (typeof gEnsure !== "function" || !(await gEnsure())) throw new Error("Reconnecte ton compte Google dans Ma famille.");
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events", {
    method:"POST", headers:{Authorization:"Bearer " + G.tok.t,"Content-Type":"application/json"}, body:JSON.stringify(googleEventPayload(row))
  });
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Session Google expirée. Reconnecte Google Agenda depuis Ma famille.");
    if (response.status === 403) {
      // which rights did Google really give? (the consent screen has one checkbox per right)
      let scopes = "";
      try { const ti = await (await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(G.tok.t))).json(); scopes = ti.scope || ""; } catch (_) {}
      if (scopes && !/auth\/calendar(\.events)?(\s|$)/.test(scopes))
        throw new Error("Google n'a donné à Maisonnée que le droit de LIRE ton agenda. Dans Ma famille › Agenda Google : Déconnecter, puis Connecter, et sur l'écran Google coche bien la case « Afficher et modifier les événements de tous vos agendas ».");
      if (scopes) throw new Error("Google refuse d'écrire dans cet agenda : tu n'as peut-être que le droit de le consulter. Choisis un autre agenda (par exemple ton agenda principal).");
      throw new Error("Google refuse la création de rendez-vous (403). Reconnecte Google Agenda avec l’autorisation de modifier les événements.");
    }
    throw new Error(info.error?.message || `Erreur Google (${response.status})`);
  }
  return response.json();
}
function eventSheet(e, day, appointment = false, g = null) {
  const isNew = !e;
  const isAppointment = appointment || !!(e && e.kind === "appointment");
  e = e || { title: "", day: day || (view === "agenda" ? calSel : today()), start_time: appointment ? "09:00" : null, end_time: appointment ? "09:30" : null, repeat: "none", members: [], place: "", notes: "" };
  openSheet(isNew ? (isAppointment ? "Nouveau rendez-vous" : "Nouvel événement") : (isAppointment ? "Rendez-vous" : "Événement"), `
    <form data-form="event">
      <label class="field"><span class="label">Quoi</span><input class="input" name="title" value="${esc(e.title)}" required maxlength="80" ${isNew ? "autofocus" : ""} placeholder="${isAppointment ? "Ex. Médecin, dentiste…" : "Ex. Dentiste de Léa"}"></label>
      <div class="inline" style="gap:12px">
        <label class="field" style="flex:1"><span class="label">Du</span><input class="input" name="day" type="date" value="${esc(e.day)}" required></label>
        <label class="field" style="flex:1"><span class="label">Au</span><input class="input" name="end_day" type="date" value="${esc(e.end_day && e.end_day > e.day ? e.end_day : e.day)}" required></label>
      </div>
      <div class="chips" style="margin-top:8px"><button type="button" class="chip" data-act="spanQuick" data-v="0">1 jour</button><button type="button" class="chip" data-act="spanQuick" data-v="1">+1 jour</button><button type="button" class="chip" data-act="spanQuick" data-v="we">Week-end</button><button type="button" class="chip" data-act="spanQuick" data-v="7">1 semaine</button></div>
      <label class="switch"><strong>Toute la journée</strong><input type="checkbox" name="allday" ${e.start_time ? "" : "checked"}></label>
      <div class="inline" data-times style="gap:12px">
        <label class="field" style="flex:1"><span class="label">Début</span><input class="input" name="start" type="time" value="${esc(String(e.start_time || "").slice(0, 5))}"></label>
        <label class="field" style="flex:1"><span class="label">Fin</span><input class="input" name="end" type="time" value="${esc(String(e.end_time || "").slice(0, 5))}"></label>
      </div>
      ${g ? "" : `<div class="field"><span class="label">Qui est concerné</span>${chipsHtml("members", memberOpts(), e.members, true)}</div>`}
      ${isNew ? googleDestinationOptions() + gColorChooser() : g ? `<p class="small" style="margin:14px 0 0">Agenda Google <strong>${esc((G.list.find(c => c.id === g.cal) || {}).name || "")}</strong>${g.rec ? " · seule cette date d'un événement répété est modifiée" : ""}</p>` + gColorChooser(g.colorId || "") : ""}
      <label class="field"><span class="label">Où</span><input class="input" name="place" value="${esc(e.place)}" maxlength="120" placeholder="Facultatif"></label>
      <div class="field" ${g ? "hidden" : ""}><span class="label">Répéter</span>${chipsHtml("repeat", REPEATS, recurrenceInfo(e.repeat) ? "custom" : e.repeat || "none")}
        <div id="customRepeatOptions" ${recurrenceInfo(e.repeat) ? "" : "hidden"} style="margin-top:12px">
          <div class="inline" style="gap:10px;align-items:end">
            <label class="field" style="flex:1"><span class="label">Tous les</span><input class="input" type="number" name="repeat_interval" min="1" max="365" step="1" value="${recurrenceInfo(e.repeat)?.interval || 2}"></label>
            <label class="field" style="flex:1"><span class="label">Unité</span><select class="input" name="repeat_unit">${[["days","Jours"],["weeks","Semaines"],["months","Mois"],["years","Années"]].map(([u,l]) => `<option value="${u}" ${recurrenceInfo(e.repeat)?.unit === u ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          </div>
        </div>
      </div>
      <label class="field"><span class="label">Note</span><textarea class="input" name="notes" maxlength="500" placeholder="Facultatif">${esc(e.notes)}</textarea></label>
      ${isAppointment ? `<div class="field" style="padding:12px;border:1px solid var(--border, #d9e0e7);border-radius:12px">
        <span class="label">Rappels du rendez-vous</span>
        <label class="field" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="radio" name="reminder_mode" value="none" ${Array.isArray(e.reminders) && e.reminders.length === 0 ? "checked" : ""}> Aucun rappel</label>
        <label class="field" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="radio" name="reminder_mode" value="default" ${!Array.isArray(e.reminders) ? "checked" : ""}> Mes rappels par défaut</label>
        <label class="field" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="radio" name="reminder_mode" value="custom" ${Array.isArray(e.reminders) && e.reminders.length > 0 ? "checked" : ""}> Personnaliser les rappels</label>
        <div id="appointmentReminderList" hidden>
          <div id="appointmentReminderRows">${reminderRows(Array.isArray(e.reminders) && e.reminders.length ? e.reminders : reminderDefaults())}</div>
          <button class="btn ghost" type="button" data-act="addReminder">+ Ajouter un rappel</button>
          <label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" name="save_reminder_defaults"> Enregistrer ces délais comme rappels par défaut</label>
          <p class="muted small">Durées réglables à la minute près. Les notifications sur téléphone nécessitent une configuration push supplémentaire.</p>
        </div>
      </div>` : ""}
      <div class="sheet-sticky btns" style="margin-top:0">
        <button class="btn primary" type="submit" style="flex:1">Enregistrer</button>
        ${isNew ? "" : g ? `<button class="btn danger" type="button" data-act="gDel">Supprimer</button>` : `<button class="btn danger" type="button" data-act="delEvent" data-v="${e.id}">Supprimer</button>`}
      </div>
      ${g ? `<p class="muted small" style="margin-top:10px">Les modifications sont enregistrées directement dans Google Agenda.</p>` : ""}
    </form>`, { id: isNew ? null : e.id, g });
  syncShow();
  reminderVisibility($("#sheetIn form"));
  syncGColorBox($("#sheetIn form"));
  if (g) { const bx = $("#gColorBox"); if (bx) bx.hidden = false; }
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
// the household's meals and shopping list are synchronised with this account's Carnet de menus
const isLinked = () => !!(S.hh && S.hh.carnet_user);
const isFav = id => S.favs instanceof Set && S.favs.has(id);
function recList(q, cur) {
  const all = [...(S.recipes || [])].sort((a, b) => isFav(b.id) - isFav(a.id)), n = q.trim().toLowerCase();
  if (!all.length) return `<p class="muted small">Le livre de recettes n'est pas accessible avec ce compte. Écrivez le repas ci-dessous.</p>`;
  const l = (n ? all.filter(r => r.name.toLowerCase().includes(n)) : all).slice(0, 60);
  const curR = cur && !l.some(r => r.id === cur) ? all.find(r => r.id === cur) : null;
  return [curR, ...l].filter(Boolean).map(r => `<button type="button" class="rec" data-act="pickRecipe" data-v="${r.id}" aria-pressed="${r.id === cur}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : `<span class="ph"></span>`}<span><strong>${isFav(r.id) ? "★ " : ""}${esc(r.name)}</strong><br><span class="muted small">${esc(r.cat || "")}${r.time ? " · " + r.time + " min" : ""}</span></span></button>`).join("") || `<p class="muted small">Aucune recette ne correspond.</p>`;
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
    syncShow();
    if (b.dataset.chip === "repeat") { const box = document.querySelector("#customRepeatOptions"); if (box) box.hidden = chipVal(b.closest("form"), "repeat") !== "custom"; }
    return;
  }
  const v = b.dataset.v, act = b.dataset.act;
  switch (act) {
    case "pushSettings": await showPushSettings(); break;
    case "pushEnable": await enablePush(); break;
    case "pushDisable": await disablePush(); break;
    case "go": if (v === "recettes") { window.location.assign(CARNET_URL); break; } // the Recettes tile opens the Carnet de menus
      view = v; LS.set("mz_view", v); render(); window.scrollTo(0, 0); break;
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
    case "addReminder": {
      const target = $("#appointmentReminderRows");
      if (target) target.insertAdjacentHTML("beforeend", reminderRows([10]));
      break;
    }
    case "removeReminder": b.closest(".reminder-row")?.remove(); break;
    case "newAppointment": eventSheet(null, null, true); break;
    case "gDel": {
      const g = sheetCtx && sheetCtx.g; if (!g) break;
      if (!confirm(g.rec ? "Supprimer cette date de l'événement dans Google Agenda ?" : "Supprimer cet événement dans Google Agenda ? Il disparaîtra pour tous ceux qui partagent l'agenda.")) break;
      try {
        if (!(await gEnsure())) throw new Error("Reconnecte ton compte Google dans Ma famille.");
        const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(g.cal) + "/events/" + encodeURIComponent(g.id), { method: "DELETE", headers: { Authorization: "Bearer " + G.tok.t } });
        if (!r.ok && r.status !== 410) throw new Error("Erreur Google (" + r.status + ")");
        G.ev.items = G.ev.items.filter(x => x.id !== g.id); closeSheet(); render(); toast("Supprimé de Google Agenda."); gFetch();
      } catch (err) { toast("Suppression impossible : " + (err.message || "réseau ?")); }
      break;
    }
    case "destChange": { const bx = $("#destBox"), ln = $("#destLine"); if (bx) bx.hidden = false; if (ln) ln.hidden = true; break; }
    case "spanQuick": {
      const f = b.closest("form"), st = f.querySelector("[name=day]"), en = f.querySelector("[name=end_day]"); if (!st || !en || !st.value) break;
      if (v === "we") {
        // the coming weekend: Friday → Sunday (from a Saturday or Sunday: that weekend)
        const wd = isoDay(st.value), fri = wd <= 5 ? addDays(st.value, 5 - wd) : addDays(st.value, 5 - wd);
        st.value = fri; en.value = addDays(fri, 2);
        // a weekend away: Friday 18 h → Sunday 20 h (times can be changed afterwards)
        const ad = f.querySelector("[name=allday]"); if (ad) ad.checked = false; syncShow();
        const s1 = f.querySelector("[name=start]"), e1 = f.querySelector("[name=end]"); if (s1) s1.value = "18:00"; if (e1) e1.value = "20:00";
      } else en.value = addDays(st.value, +v);
      break;
    }
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
    case "shopClear": { const ids = S.shop.filter(x => x.done && !String(x.source || "").startsWith("carnet:")).map(x => x.id); await removeMany("shop", ids); break; }
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
    case "demo": $("#toast").hidden = true; mode = "demo"; LS.set("mz_mode", "demo"); S = demoUpgrade(LS.get("mz_demo", null)) || demoData(); saveLocal(); screen = "app"; view = "home"; render(); geoTick(); break;
    case "leaveDemo": mode = null; LS.del("mz_mode"); S = blank(); screen = "welcome"; render(); break;
    case "resetDemo": if (confirm("Effacer toutes les données de la démo ?")) { LS.del("mz_demo"); S = demoData(); saveLocal(); view = "home"; render(); toast("Démo remise à zéro."); } break;
    case "cancelJoin": LS.del("mz_join"); joinPreview = null; setupErr = ""; render(); break;
    case "closeSheet": closeSheet(); break;
    case "msgMenu": { if (!confirm("Supprimer ce message pour tout le foyer ?")) break; S.msgs = S.msgs.filter(x => x.id !== v); saveLocal(); renderMsgs();
      if (mode === "cloud") { const { error } = await sb.from("messages").delete().eq("id", v); if (error) fail(error); } break; }
    case "locate": { const l = S.locs.find(x => x.id === v); if (l && map) { map.setView([l.lat, l.lng], 15); window.scrollTo({ top: 0, behavior: "smooth" }); mapMarkers.forEach(mk => { const p = mk.getLatLng(); if (p.lat === l.lat && p.lng === l.lng) mk.openPopup(); }); } break; }
  }
});

document.addEventListener("change", e => { if (e.target.name === "google_destination") syncGColorBox(e.target.form); if (e.target.name === "allday") syncShow(); if (e.target.matches("[data-geo]")) geoToggle(e.target.checked); });
// message box grows with its text; Entrée envoie sur un clavier physique
document.addEventListener("input", e => { if (e.target.name === "body" && e.target.closest(".composer")) { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; } });
document.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && e.target.closest && e.target.closest(".composer") && matchMedia("(hover: hover)").matches) { e.preventDefault(); e.target.form.requestSubmit(); } });
document.addEventListener("input", e => { if (e.target.id === "recSearch") $("#recList").innerHTML = recList(e.target.value, sheetCtx && sheetCtx.recipe); });

async function setHh(p) {
  const before = { ...S.hh }; Object.assign(S.hh, p); saveLocal(); render();
  if (mode === "cloud") { const { error } = await sb.from("households").update(p).eq("id", S.hh.id); if (error) { S.hh = before; saveLocal(); render(); fail(error); } }
}

document.addEventListener("change", e => {
  if (e.target.matches('[name="reminder_mode"]')) reminderVisibility(e.target.closest("form"));
});
document.addEventListener("change", async e => {
  if (!e.target.matches("[data-pref]") || mode !== "cloud" || !user) return;
  const box = e.target.closest(".card"), pr = {};
  box.querySelectorAll("[data-pref]").forEach(el => { pr[el.dataset.pref] = el.type === "checkbox" ? el.checked : el.value; });
  const { error } = await sb.from("maison_push_prefs").upsert({ user_id: user.id, prefs: pr, updated_at: new Date().toISOString() });
  toast(error ? "Réglage non enregistré (réseau ?)." : "Réglage enregistré.");
});

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
      if (fd.end_day && fd.end_day < fd.day) { eventFormFeedback(f, "La date de fin doit être le même jour ou après la date de début."); return; }
      const row = { title: fd.title.trim(), day: fd.day, end_day: fd.end_day && fd.end_day > fd.day ? fd.end_day : null, start_time: allday || !fd.start ? null : fd.start, end_time: allday || !fd.end ? null : fd.end, members: chipVals(f, "members"), place: fd.place.trim(), notes: fd.notes.trim(), repeat: chipVal(f, "repeat") || "none" };
      if (row.repeat === "custom") {
        const n = Number(fd.repeat_interval);
        if (!Number.isInteger(n) || n < 1 || n > 365) { eventFormFeedback(f, "Choisis un intervalle entre 1 et 365."); return; }
        if (!["days","weeks","months","years"].includes(fd.repeat_unit)) { eventFormFeedback(f, "Choisis une unité de répétition."); return; }
        row.repeat = `custom:${n}:${fd.repeat_unit}`;
      }
      if (f.querySelector('[name="reminder_mode"]')) {
        const choice = f.querySelector('[name="reminder_mode"]:checked')?.value || "default";
        const reminders = choice === "none" ? [] : choice === "default" ? reminderDefaults() : appointmentReminderValues(f);
        if (!reminders || (choice === "custom" && !reminders.length)) {
          eventFormFeedback(f, "Ajoute un rappel valide (4 semaines au plus) ou choisis « Aucun rappel ».");
          return;
        }
        row.kind = "appointment";
        row.reminders = reminders;
        if (choice === "custom" && fd.save_reminder_defaults) LS.set(REMINDER_DEFAULT_KEY, reminders);
      }
      if (!row.title || !row.day) { eventFormFeedback(f, "Indique le titre et la date du rendez-vous."); return; }
      if (sheetCtx?.g) {
        const g = sheetCtx.g, payload = googleEventPayload(row);
        delete payload.recurrence; delete payload.reminders;
        payload.colorId = chipVal(f, "gcolor") || null;
        btn.disabled = true;
        try {
          if (typeof gEnsure !== "function" || !(await gEnsure())) throw new Error("Reconnecte ton compte Google dans Ma famille.");
          const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(g.cal) + "/events/" + encodeURIComponent(g.id), { method: "PATCH", headers: { Authorization: "Bearer " + G.tok.t, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!r.ok) throw new Error(r.status === 403 ? "Google refuse la modification : cet agenda est peut-être en lecture seule pour toi." : "Erreur Google (" + r.status + ")");
          closeSheet(); toast("Modifié dans Google Agenda."); if (typeof gFetch === "function") gFetch();
        } catch (err) { eventFormFeedback(f, "Modification impossible : " + (err.message || "réseau ?")); }
        finally { btn.disabled = false; }
        break;
      }
      const destination = fd.google_destination || "local";
      if (destination !== "local" && !sheetCtx?.id) {
        btn.disabled = true;
        try {
          await saveGoogleEvent(destination, { ...row, colorId: chipVal(f, "gcolor") || null });
          closeSheet(); returnToTodayAgenda();
          if (typeof gFetch === "function") gFetch();
          toast("Rendez-vous enregistré dans Google Agenda.");
        } catch (err) { console.error("Enregistrement Google Agenda", err); eventFormFeedback(f, "Enregistrement Google impossible : " + (err?.message || "Erreur inconnue")); }
        finally { btn.disabled = false; }
        break;
      }
      const id = sheetCtx && sheetCtx.id;
      btn.disabled = true;
      try {
        const ok = id ? await patch("events", id, row) : !!(await add("events", { ...row, created_by: user ? user.id : null, created_at: new Date().toISOString() }));
        if (!ok) { eventFormFeedback(f, row.kind ? "Le rendez-vous n'a pas été enregistré. Si le message persiste, collez le script supabase-foyer-6.sql dans Supabase (colonnes des rappels)." : "L'événement n'a pas été enregistré. Vérifiez la connexion et réessayez."); return; }
        closeSheet(); returnToTodayAgenda(); toast(id ? "Événement modifié." : "Événement ajouté.");
      } catch (err) { console.error("Enregistrement rendez-vous", err); eventFormFeedback(f, "Échec de l’enregistrement : " + (err?.message || "vérifie la connexion")); }
      finally { btn.disabled = false; }
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
    case "msg": {
      const body = (fd.body || "").trim(); if (!body) break;
      const ta = f.querySelector("textarea"); ta.value = ""; ta.style.height = "auto"; ta.focus();
      if (!(await sendMsg(body))) { ta.value = body; }
      break;
    }
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
  return demoUpgrade({ hh: { id: hid, name: "Chez nous", invite_code: "DEMO00", people: 3 }, me: "m1", members: M, tasks, log, events, meals, shop, recipes: null });
}

// demo data saved before messages and positions existed gets them added
function demoUpgrade(d) {
  if (!d) return null;
  d.v2 = true;
  if (!d.msgs) {
    const at = (h, m) => { const x = new Date(); x.setHours(h, m, 0, 0); return x.toISOString(); };
    const y = (h, m) => { const x = new Date(Date.now() - 864e5); x.setHours(h, m, 0, 0); return x.toISOString(); };
    d.msgs = [
      { id: uuid(), household_id: "demo", member_id: "m2", body: "Quelqu'un peut récupérer Léa au judo mercredi ?", created_at: y(18, 12) },
      { id: uuid(), household_id: "demo", member_id: "m1", body: "Oui, je finis tôt ce jour-là.", created_at: y(18, 20) },
      { id: uuid(), household_id: "demo", member_id: "m3", body: "Merci papa !", created_at: y(18, 21) },
      { id: uuid(), household_id: "demo", member_id: "m2", body: "Je passe à la boulangerie en rentrant, il faut autre chose ?", created_at: at(9, 5) }
    ];
  }
  if (!d.locs) d.locs = [
    { id: "m2", household_id: "demo", lat: 48.8738, lng: 2.2950, accuracy: 30, updated_at: new Date(Date.now() - 25 * 6e4).toISOString() },
    { id: "m3", household_id: "demo", lat: 48.8462, lng: 2.3371, accuracy: 30, updated_at: new Date(Date.now() - 3 * 36e5).toISOString() }
  ];
  return demoUpgrade3(d);
}

/* ---------- go ---------- */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
// init() is called at the end of modules.js, once every module is registered

// La hauteur de la fenêtre suit visualViewport (index.html).
// Ne pas imposer de scrollTop au focus : sur iOS cela entre en conflit
// avec le déplacement natif du clavier et rend le défilement instable.

// Afficher les erreurs de validation au lieu de laisser « Enregistrer » sans réaction.
document.addEventListener("invalid", event => {
  if (!event.target.closest('form[data-form="event"]')) return;
  const field = event.target;
  setTimeout(() => {
    const sheet = document.getElementById("sheet");
    if (!sheet?.open) return;
    const rect = field.getBoundingClientRect(), bounds = sheet.getBoundingClientRect();
    sheet.scrollTop += rect.top - bounds.top - 100;
    eventFormFeedback(field.form, "Complète le champ obligatoire : " + (field.closest("label")?.querySelector(".label")?.textContent || "titre ou date") + ".");
  }, 30);
}, true);
