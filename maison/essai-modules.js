"use strict";
/* Maisonnée : accueil en modules, Explorer, calendrier du mois, et les modules
   Anniversaires, Budget, Documents, Emploi du temps, Recettes, Courses. Chargé après app.js. */
window.MAISONNEE_DOM_BUILD = "20261103-dreame-auto-wash-v10-6";

Object.assign(TABLES, { bdays: "birthdays", exp: "expenses", docs: "documents", sched: "schedule", shelly: "shelly_devices" });
const V3 = ["bdays", "exp", "docs", "sched"]; // tables added by supabase/migrations/0003_anniversaires_budget_documents.sql

/* ---------- module registry: colour, icon, home summary ---------- */
const MC = { domotique: "#65BDF2", tasks: "#F5C451", agenda: "#A07CF5", repas: "#5B8DEF", courses: "#F2A93B", recettes: "#F39A4A", messages: "#35C9B0", carte: "#6CC4F2", foyer: "#8AD6A6", anniv: "#F2917B", budget: "#3DB972", docs: "#6A86F0", edt: "#E46CA6" };
const MI = {
  domotique: '<path class="f" d="M4 15 16 5l12 10v12H4z"/><path d="M12 27v-9h8v9"/>',
  tasks: '<rect class="f" x="5" y="5" width="22" height="22" rx="6"/><circle class="s" cx="11" cy="11.5" r="1.4"/><circle class="s" cx="11" cy="16" r="1.4"/><circle class="s" cx="11" cy="20.5" r="1.4"/><path d="M15 11.5h7M15 16h7M15 20.5h7"/>',
  agenda: '<rect class="f" x="5" y="7" width="22" height="20" rx="5"/><path d="M5 13h22M11 4.5v5M21 4.5v5"/><circle class="s" cx="11" cy="18" r="1.3"/><circle class="s" cx="16" cy="18" r="1.3"/><circle class="s" cx="21" cy="18" r="1.3"/><circle class="s" cx="11" cy="22.5" r="1.3"/><circle class="s" cx="16" cy="22.5" r="1.3"/>',
  repas: '<path d="M8.5 4v8.5a3.5 3.5 0 0 0 7 0V4M12 4v24"/><path class="f" d="M24 28V4c-3.2 1.6-5 5.2-5 10v4h5"/>',
  courses: '<path class="f" d="M5 13h22l-2.5 13h-17z"/><path d="M10.5 13l4-8M21.5 13l-4-8M12 18v4M16 18v4M20 18v4"/>',
  recettes: '<path class="f" d="M6 13h20v9a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/><path d="M3.5 13h25M12 9h8M16 5.5V9"/>',
  messages: '<path class="f" d="M5 7h22v15H13l-6 5v-5H5z"/><path d="M10 12h12M10 16.5h8"/>',
  carte: '<path class="f" d="M16 29s-9-8.4-9-15a9 9 0 0 1 18 0c0 6.6-9 15-9 15z"/><circle cx="16" cy="13.5" r="3.2"/>',
  foyer: '<circle class="f" cx="12" cy="11" r="4.5"/><path class="f" d="M4 26c.8-5 4-7.5 8-7.5s7.2 2.5 8 7.5z"/><circle cx="22.5" cy="12.5" r="3.5"/><path d="M21.5 19c3.8 0 6.2 2.3 6.8 7H23"/>',
  anniv: '<path class="f" d="M6 17h20v10H6z"/><path d="M6 21.5c2.5 2 4.5 2 7 0s4.5-2 7 0 4 2 6 0M11 12.5V17M16 12.5V17M21 12.5V17"/><path class="s" d="M11 10c-1.2 0-1.6-1.4 0-4 1.6 2.6 1.2 4 0 4zM16 10c-1.2 0-1.6-1.4 0-4 1.6 2.6 1.2 4 0 4zM21 10c-1.2 0-1.6-1.4 0-4 1.6 2.6 1.2 4 0 4z"/>',
  budget: '<rect class="f" x="4" y="9" width="24" height="18" rx="4"/><path d="M28 15h-6a2.5 2.5 0 0 0 0 5h6M7 9l12-4.5L21 9"/>',
  docs: '<path class="f" d="M4 9a3 3 0 0 1 3-3h6l3 3h9a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M10 20h7"/>',
  edt: '<rect class="f" x="4" y="6" width="20" height="18" rx="4"/><path d="M4 12h20M11 12v12M17 12v8"/><circle cx="24" cy="23" r="5.5" style="fill:var(--surface)"/><path d="M24 20.5V23l1.8 1.3"/>'
};
MC.galerie = "#F4729C";
MI.galerie = '<rect class="f" x="4" y="9" width="24" height="17" rx="5"/><path d="M11 9l2-3.5h6L21 9"/><circle cx="16" cy="17.5" r="4.3"/><circle class="s" cx="23.5" cy="13" r="1.2"/>';
const mi = (k, cls = "") => `<span class="mi ${cls}" style="--mc:${MC[k]}" aria-hidden="true"><svg viewBox="0 0 32 32">${MI[k]}</svg></span>`;
I.grid = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
I.home = '<svg viewBox="0 0 24 24"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><circle cx="12" cy="14.5" r="2"/></svg>';

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const eur = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const monthName = s => parse(s).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

const MODS = [
  { k: "tasks", t: "Tâches", g: "Essentiels", sub() { const n = live().filter(t => t.next_due <= today()).length; return live().length ? (n ? `${plural(n, "tâche", "tâches")} aujourd'hui` : "Tout est fait") : "Ajoutez vos tâches"; } },
  { k: "agenda", t: "Calendrier", g: "Essentiels", sub() { const n = occurrences(today(), addDays(today(), 6)).length; return n ? `${plural(n, "événement", "événements")} cette semaine` : "Semaine libre"; } },
  { k: "courses", t: "Courses", g: "Essentiels", sub() { const n = S.shop.filter(x => !x.done).length; return n ? plural(n, "article", "articles") : "Liste vide"; } },
  { k: "messages", t: "Messages", g: "Essentiels", sub() { const n = unread(); if (n) return plural(n, "nouveau message", "nouveaux messages"); const l = S.msgs.at(-1); return l ? `${(member(l.member_id) || {}).name || "?"} : ${l.body}` : "Écrivez au foyer"; } },
  { k: "repas", t: "Repas", g: "Essentiels", sub() { const m = mealAt(today(), "soir"); return m ? `Ce soir : ${mealName(m)}` : "Rien de prévu ce soir"; } },
  { k: "recettes", t: "Recettes", g: "Essentiels", sub() { return (S.recipes && S.recipes.length ? plural(S.recipes.length, "recette", "recettes") + " · " : "") + "ouvrir le Carnet"; } },
  { k: "galerie", t: "Galerie", g: "Essentiels", sub() { const n = S.photos.length; return n ? plural(n, "photo", "photos") : "Vos photos de famille"; } },
  { k: "foyer", t: "Ma famille", g: "Essentiels", sub() { return plural(S.members.length, "membre", "membres"); } },
  { k: "domotique", t: "Domotique", g: "Organisation", sub() { return "Extérieur · RDC · Étage"; } },
  { k: "anniv", t: "Anniversaires", g: "Organisation", sub() { const b = nextBdays()[0]; return b ? `${b.name} ${b.days === 0 ? "aujourd'hui !" : b.days === 1 ? "demain" : "dans " + b.days + " j"}` : "Vos dates importantes"; } },
  { k: "budget", t: "Budget", g: "Organisation", sub() { const m = today().slice(0, 7); const t = S.exp.filter(e => e.kind !== "in" && String(e.day).startsWith(m)).reduce((a, e) => a + Number(e.amount), 0); return t ? `${eur(t)} ce mois-ci` : "Suivez vos dépenses"; } },
  { k: "docs", t: "Documents", g: "Organisation", sub() { const soon = S.docs.filter(d => d.expires_on && diffDays(today(), d.expires_on) <= 30).length; return soon ? `${plural(soon, "document expire", "documents expirent")} bientôt` : S.docs.length ? plural(S.docs.length, "document", "documents") : "Papiers importants"; } },
  { k: "edt", t: "Emploi du temps", g: "Organisation", sub() { const now = nowSlots(); return now.length ? `${(member(now[0].member_id) || {}).name || ""} : ${now[0].title}` : S.sched.length ? "La semaine de chacun" : "Plannings de chacun"; } },
  { k: "carte", t: "Localisation", g: "Organisation", sub() { const n = S.locs.length; return n ? plural(n, "position partagée", "positions partagées") : "Où sont-ils ?"; } }
];
const modOf = k => MODS.find(m => m.k === k);
const homePins = () => {
  if (typeof window.maisonHomeStore !== "undefined" && window.maisonHomeStore.read) {
    const h = window.maisonHomeStore.read();
    const hidden = Array.isArray(h.hidden) ? h.hidden : [];
    return MODS.map(m => m.k).filter(k => !hidden.includes(k));
  }
  try {
    const grid = JSON.parse(localStorage.getItem("maisonnee_ultimate_v3_grid_v1"));
    if (grid && Array.isArray(grid.hidden)) return MODS.map(m => m.k).filter(k => !grid.hidden.includes(k));
  } catch (_) {}
  const p = LS.get("mz_home", null);
  return Array.isArray(p) ? p.filter(modOf) : MODS.map(m => m.k);
};
let exploreEdit = false;
function v3Notice() { return `<div class="empty"><strong>Encore une étape.</strong>Collez le script <b>supabase/migrations/0003_anniversaires_budget_documents.sql</b> dans Supabase (comme les deux premiers), puis rouvrez l'appli.</div>`; }

/* Domotique : commandes via Edge Function, clé Shelly uniquement côté serveur. */
// MAISONNEE_DOM_BUILD=20261031d9
const DOM_ZONES = { exterieur: "Extérieur", rdc: "Maison RDC", etage: "Maison étage" };
const DOM_KEY = "maisonnee_domotique_zones_v1";
const DOM_ROOMS_LS = "maisonnee_dom_rooms_v1";
const DOM_ROOMS_DEFAULT = [
  { id: "exterieur", t: "Extérieur", ico: "🌳", sub: "Portail, éclairages" },
  { id: "salon", t: "Salon", ico: "🛋️", sub: "Volets, TV" },
  { id: "cuisine", t: "Cuisine", ico: "🍳", sub: "Volets, éclairages" },
  { id: "chambres", t: "Chambres", ico: "🛏️", sub: "Volets, chauffage" }
];
function domHomeRead() {
  const fromHh = typeof S !== "undefined" && S.hh && S.hh.home && S.hh.home.dom;
  let local = null;
  try { local = JSON.parse(localStorage.getItem(DOM_ROOMS_LS)); } catch (_) {}
  const dom = fromHh || local || {};
  const rooms = Array.isArray(dom.rooms) && dom.rooms.length ? dom.rooms.map(r => ({
    id: String(r.id || "").slice(0, 40) || "room_" + Math.random().toString(36).slice(2, 8),
    t: String(r.t || "Pièce").slice(0, 40),
    ico: String(r.ico || "🏠").slice(0, 8),
    sub: String(r.sub || "").slice(0, 80)
  })) : DOM_ROOMS_DEFAULT.slice();
  const assign = dom.assign && typeof dom.assign === "object" ? { ...dom.assign } : {};
  return { rooms, assign };
}
async function domHomeWrite(next) {
  const cur = domHomeRead();
  const dom = {
    rooms: next.rooms || cur.rooms,
    assign: next.assign !== undefined ? next.assign : cur.assign
  };
  try { localStorage.setItem(DOM_ROOMS_LS, JSON.stringify(dom)); } catch (_) {}
  if (typeof S !== "undefined" && S.hh) {
    const home = { ...(S.hh.home || {}), dom };
    S.hh.home = home;
    if (typeof saveLocal === "function") saveLocal();
    if (typeof mode !== "undefined" && mode === "cloud" && typeof sb !== "undefined" && sb) {
      const { error } = await sb.from("households").update({ home }).eq("id", S.hh.id);
      if (error) throw error;
    }
  }
  return dom;
}
function domRoomGuess(x) {
  const n = String(x.name || "").toLowerCase();
  if (x.zone === "exterieur") return "exterieur";
  if (/cuisine|kitchen/i.test(n)) return "cuisine";
  if (/chambre|étage|etage/i.test(n) || x.zone === "etage") return "chambres";
  if (/salon|séjour|sejour|rdc/i.test(n) || x.zone === "rdc") return "salon";
  return x.zone === "etage" ? "chambres" : "salon";
}
function domRoomIdOf(x) {
  const { assign, rooms } = domHomeRead();
  const id = assign[x.id];
  if (id && rooms.some(r => r.id === id)) return id;
  const guess = domRoomGuess(x);
  if (rooms.some(r => r.id === guess)) return guess;
  return rooms[0] ? rooms[0].id : "salon";
}
const DOM_DEFAULT = [
  { name: "Portail piéton", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Portail voiture", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Atelier", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Éclairages extérieurs", zone: "exterieur", type: "lumiere", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Volets RDC", zone: "rdc", type: "volet", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Volets étage", zone: "etage", type: "volet", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" }
];
const SHELLY_ENDPOINT = SB_URL + "/functions/v1/shelly-cloud";
const MELCLOUD_ENDPOINT = SB_URL + "/functions/v1/melcloud";
const DREAME_ENDPOINT = SB_URL + "/functions/v1/dreame";
const SMARTTHINGS_ENDPOINT = SB_URL + "/functions/v1/smartthings";
let domZone = "", domTab = "board", domEdit = "", domCloud = [], domBusy = "", domState = {}, domStateAt = 0, domStateLoading = false, domStateInflight = null, domFormLoading = false;
let domMelStatus = { connected: false, device_id: null, device_name: null };
let domMelState = null, domMelStateAt = 0, domMelStateInflight = null, domMelDevices = [], domMelBusy = "";
let domMelChain = Promise.resolve();
let domMelLastCmdAt = 0, domMelStatusAt = 0;
let domDreameStatus = { connected: false, device_id: null, device_name: null };
let domDreameState = null, domDreameStateAt = 0, domDreameStateInflight = null, domDreameDevices = [], domDreameBusy = "";
// Le D20 Ultra expose batterie/état via la liste cloud, mais les propriétés
// détaillées ne répondent pas de façon fiable. Lecture rapide par défaut.
// La lecture diagnostique détaillée reste accessible via son bouton dédié.
let domDreameQuickStateOnly = true, domDreameQuickStateDid = null;
let domDreamePrefAt = 0;
// Les choix successifs sont regroupés avant le moindre appel Dreame.
// Pendant un envoi, le dernier changement par paramètre remplace les précédents.
let domDreamePrefDraft = {};
let domDreamePrefTimer = null;
let domDreamePrefInflight = null;
const DOM_DREAME_PREF_BATCH_MS = 250; // Regrouper les clics proches sans retarder les changements isolés.
let domDreameWanted = { cleaning_mode: null, suction: null, water: null };
// Unconfirmed choices are local UI preferences, not verified robot state.
const DOM_DREAME_PENDING_PREFIX = "maisonnee_dreame_pending_v1_";
function domDreamePendingId() {
  return String(domDreameStatus.device_id || (S.hh && S.hh.dreame_device_id) || "");
}
function domDreameLoadPending() {
  const id = domDreamePendingId();
  domDreameWanted = { cleaning_mode: null, suction: null, water: null };
  if (!id) return;
  try {
    const saved = JSON.parse(localStorage.getItem(DOM_DREAME_PENDING_PREFIX + id) || "{}");
    for (const key of Object.keys(domDreameWanted)) {
      if (saved[key] != null && Number.isFinite(Number(saved[key]))) domDreameWanted[key] = Number(saved[key]);
    }
  } catch (_) {}
}
function domDreameSavePending() {
  const id = domDreamePendingId();
  if (!id) return;
  try {
    const key = DOM_DREAME_PENDING_PREFIX + id;
    if (Object.values(domDreameWanted).every(v => v == null)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(domDreameWanted));
  } catch (_) {}
}

let domDreameTask = "";
let domDreameRooms = [], domDreameRoomsAt = 0, domDreameRoomsHint = "", domDreameRoomsInflight = null;
let domDreamePrograms = [];
let domDreameProgEdit = "";
let domDreameProgDraft = null;
let domDreameSelectedProgramId = null;
let domDreamePickRooms = [];
let domDreameActiveTab = "cleaning";
// Les commandes restent sérialisées pour éviter les collisions de réglages.
// Statut, batterie et carte : lectures indépendantes et parallèles.
let domDreameCmdChain = Promise.resolve();
let domDreameLastCmdAt = 0, domDreameStatusAt = 0;
let domStStatus = { connected: false, device_id: null, device_name: null };
let domStState = null, domStStateAt = 0, domStStateInflight = null, domStDevices = [], domStBusy = "";
let domStChain = Promise.resolve();
let domStLastCmdAt = 0, domStStatusAt = 0;
const DOM_ST_STATE_MIN_MS = 30000;
const DOM_ST_CMD_DEBOUNCE_MS = 1500;
const DOM_MEL_STATE_MIN_MS = 90000;
const DOM_MEL_CMD_DEBOUNCE_MS = 2500;
const DOM_DREAME_STATE_MIN_MS = 45000;
const DOM_DREAME_CMD_DEBOUNCE_MS = 2500;
let domHeroLive = null;
let domSoftTimer = 0;
function domSoftRender() {
  if (view !== "domotique") return;
  if (domSoftTimer) return;
  domSoftTimer = setTimeout(() => {
    domSoftTimer = 0;
    if (view === "domotique") softRender();
  }, 60);
}
document.addEventListener("click", e => {
  if (e.target.closest('[data-act="go"][data-v="domotique"]')) {
    domZone = ""; domTab = "board";
    setTimeout(domPollOnView, 0);
    setTimeout(domMelPollOnView, 0);
    setTimeout(domDreamePollOnView, 0);
    setTimeout(domStPollOnView, 0);
  }
}, true);
function domConnected() { return !!(S.hh && S.hh.shelly_host); }
function domMelLinked() {
  return !!domMelStatus.connected;
}
function domMelFmtTemp(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return String(Number(v).toFixed(1)).replace(".", ",") + " °C";
}
function domMelTempsLine() {
  if (!domMelLinked()) return "Non connecté";
  if (!domMelStatus.device_id && !(S.hh && S.hh.melcloud_device_id)) return "Choisissez un appareil";
  const st = domMelState;
  if (domMelStateInflight) return "Lecture des températures…";
  if (!st || (st.room == null && st.set == null)) return "Températures en attente…";
  const bits = [];
  if (st.room != null) bits.push("Ambiante " + domMelFmtTemp(st.room));
  if (st.set != null) bits.push("Consigne " + domMelFmtTemp(st.set));
  return bits.length ? bits.join(" · ") : (st.label || domMelStatus.device_name || "MELCloud");
}
function domMelSummary() {
  return domMelTempsLine();
}
async function melcloudServer(action, body) {
  const run = async () => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 28000) : null;
    try {
      if (!sb) await loadSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Connexion Maisonnée requise");
      const res = await fetch(MELCLOUD_ENDPOINT + "/" + action, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(out.error || "Erreur MELCloud"));
      return out;
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Délai dépassé en contactant MELCloud. Réessayez.");
      if (e instanceof TypeError && /fetch/i.test(String(e.message))) {
        throw new Error("Impossible de joindre le serveur MELCloud (fonction Supabase « melcloud »). Vérifiez votre connexion ou réessayez dans un instant.");
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const p = domMelChain.then(run, run);
  domMelChain = p.catch(() => {});
  return p;
}
async function domMelRefreshStatus() {
  if (mode !== "cloud" || !S.hh) return;
  const now = Date.now();
  if (now - domMelStatusAt < 60000 && domMelStatus.connected) return;
  try {
    const r = await melcloudServer("status");
    domMelStatus = { connected: !!r.connected, device_id: r.device_id ?? null, device_name: r.device_name || null };
    if (S.hh && r.device_id != null) S.hh.melcloud_device_id = r.device_id;
    domMelStatusAt = Date.now();
  } catch (_) {}
}
async function domMelRefreshState(force) {
  if (!domMelLinked() || mode !== "cloud") return false;
  const now = Date.now();
  if (!force && now - domMelStateAt < DOM_MEL_STATE_MIN_MS) return false;
  if (domMelStateInflight) return domMelStateInflight;
  domMelStateInflight = melcloudServer("state").then(r => {
    domMelState = r;
    domMelStateAt = Date.now();
    if (r.device_name) domMelStatus.device_name = r.device_name;
    return true;
  }).catch(() => false).finally(() => { domMelStateInflight = null; });
  return domMelStateInflight;
}
function domMelPollOnView() {
  if (view !== "domotique") return;
  const force = domMelLinked() && !domMelStateAt;
    domMelRefreshStatus().then(() => domMelRefreshState(force)).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
}
function domStLinked() { return !!domStStatus.connected; }
function domStSummary() {
  if (!domStLinked()) return "Non connecté";
  if (!domStStatus.device_id && !(S.hh && S.hh.smartthings_device_id)) return "Choisissez un appareil";
  if (!domStState) return "Chargement…";
  return domStState.label || "En ligne";
}
async function smartthingsServer(action, body) {
  const run = async () => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 28000) : null;
    try {
      if (!sb) await loadSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Connexion Maisonnée requise");
      const res = await fetch(SMARTTHINGS_ENDPOINT + "/" + action, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(out.error || "Erreur SmartThings"));
      return out;
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Délai dépassé en contactant SmartThings. Réessayez.");
      if (e instanceof TypeError && /fetch/i.test(String(e.message))) {
        throw new Error("Impossible de joindre le serveur SmartThings (fonction Supabase « smartthings »). Vérifiez votre connexion ou réessayez dans un instant.");
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const p = domStChain.then(run, run);
  domStChain = p.catch(() => {});
  return p;
}
async function domStRefreshStatus() {
  if (mode !== "cloud" || !S.hh) return;
  const now = Date.now();
  if (now - domStStatusAt < 60000 && domStStatus.connected) return;
  try {
    const r = await smartthingsServer("status");
    domStStatus = { connected: !!r.connected, device_id: r.device_id ?? null, device_name: r.device_name || null };
    if (S.hh && r.device_id != null) S.hh.smartthings_device_id = r.device_id;
    domStStatusAt = Date.now();
  } catch (_) {}
}
async function domStRefreshState(force) {
  if (!domStLinked() || mode !== "cloud") return false;
  const now = Date.now();
  if (!force && now - domStStateAt < DOM_ST_STATE_MIN_MS) return false;
  if (domStStateInflight) return domStStateInflight;
  domStStateInflight = smartthingsServer("state").then(r => {
    domStState = r;
    domStStateAt = Date.now();
    if (r.device_name) domStStatus.device_name = r.device_name;
    return true;
  }).catch(() => {
    // Une lecture SmartThings refusée ne doit pas laisser la carte en « Chargement… ».
    // Ne pas déduire que la TV est éteinte : son état reste inconnu.
    domStState = { label: "État indisponible", power: null };
    domStStateAt = Date.now();
    return true;
  }).finally(() => { domStStateInflight = null; });
  return domStStateInflight;
}
function domStPollOnView() {
  if (view !== "domotique") return;
  const force = domStLinked() && !domStStateAt;
  domStRefreshStatus().then(() => domStRefreshState(force)).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
}
async function domRunStCommand(fn) {
  const now = Date.now();
  if (now - domStLastCmdAt < DOM_ST_CMD_DEBOUNCE_MS) { toast("Patientez avant de renvoyer une commande."); return null; }
  domStLastCmdAt = now;
  return fn();
}
function domDreameLinked() {
  return !!domDreameStatus.connected;
}
function domDreameSummary() {
  if (!domDreameLinked()) return "Non connecté";
  if (!domDreameStatus.device_id && !(S.hh && S.hh.dreame_device_id)) return "Choisissez un aspirateur";
  const st = domDreameState;
  if (st && st.label) return st.label;
  return domDreameStatus.device_name || "Dreame";
}
function domDreameCommandable() {
  return !!(domDreameLinked() && (domDreameStatus.device_id || (S.hh && S.hh.dreame_device_id)));
}
function domDreameWantedNum(key) {
  const raw = domDreameWanted[key];
  if (raw == null || raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}
function domDreamePrefNum(key, fallback) {
  const wanted = domDreameWantedNum(key);
  if (wanted != null) return wanted;
  const st = domDreameState || {};
  if (st[key] == null || st[key] === "") return fallback;
  const v = Number(st[key]);
  return Number.isFinite(v) ? v : fallback;
}
function domDreameApplyWanted(out) {
  const mode = domDreameWantedNum("cleaning_mode");
  if (mode != null) {
    out.cleaning_mode = mode;
    const lab = (domDreameModeOpts().find(o => o.v === mode) || {}).t;
    if (lab) out.cleaning_mode_label = lab;
  }
  const suction = domDreameWantedNum("suction");
  if (suction != null) {
    out.suction = suction;
    const lab = (domDreameSuctionOpts().find(o => o.v === suction) || {}).t;
    if (lab) out.suction_label = lab;
  }
  const water = domDreameWantedNum("water");
  if (water != null) {
    out.water = water;
    const lab = (domDreameWaterOpts().find(o => o.v === water) || {}).t;
    if (lab) out.water_label = lab;
  }
  return out;
}
function domDreameMergeState(next) {
  if (!next || typeof next !== "object") return domDreameState;
  const prev = domDreameState || {};
  const out = { ...prev, ...next };
  const keys = ["cleaning_mode", "suction", "water", "cleaning_mode_label", "suction_label", "water_label"];
  for (const k of keys) {
    if (!(k in next) && prev[k] != null) out[k] = prev[k];
  }
  // Keep device-reported state separate from pending UI choices.
  domDreameState = out;
  return out;
}
// Choix immédiat sur l'écran, puis un seul lot réseau pour les clics rapprochés.
// Le démarrage appelle domDreameFlushSettings() pour attendre le dernier lot.
function domDreameQueueSetting(key, value) {
  if (!domDreameCommandable()) { toast("Connectez d’abord le Dreame."); return; }
  if (key === "cleaning_mode") {
    domDreameWanted.cleaning_mode = value;
    domDreameSavePending();
    domDreamePrefDraft.cleaning_mode = value;
    // 4/23 remet le lavage sur « Par pièce » : restaurer « Par zone » ensuite.
    domDreamePrefDraft.wash_method = "area";
    // Si le mode autorise cet itinéraire, le renvoyer dans le même lot.
    const route = domDreameAdvancedDraft().route;
    const routes = { standard: 1, intensive: 2, deep: 3, fast: 4 };
    if (domDreameRouteAllowed(value, route)) domDreamePrefDraft.cleaning_route = routes[route];
    else delete domDreamePrefDraft.cleaning_route;
  } else if (key === "suction" || key === "water") {
    domDreameWanted[key] = value;
    domDreameSavePending();
    domDreamePrefDraft[key] = value;
  } else if (key === "cleaning_route") {
    domDreamePrefDraft.cleaning_route = value;
  } else if (key === "wash_method" && value === "area") {
    domDreamePrefDraft.wash_method = "area";
  } else return;
  domDreameFillHosts();
  domDreameScheduleSettings();
}
function domDreameScheduleSettings() {
  if (domDreamePrefTimer != null) clearTimeout(domDreamePrefTimer);
  domDreamePrefTimer = setTimeout(() => {
    domDreamePrefTimer = null;
    domDreameFlushSettings().catch(() => {}); // erreur déjà affichée par la file
  }, DOM_DREAME_PREF_BATCH_MS);
}
async function domDreameFlushSettings() {
  if (domDreamePrefTimer != null) {
    clearTimeout(domDreamePrefTimer);
    domDreamePrefTimer = null;
  }
  if (domDreamePrefInflight) {
    // Ne jamais envoyer un vieux choix en parallèle de celui déjà parti.
    await domDreamePrefInflight;
    return domDreameFlushSettings();
  }
  if (!Object.keys(domDreamePrefDraft).length) return;
  const batch = domDreamePrefDraft;
  domDreamePrefDraft = {};
  const sentAt = Date.now();
  const task = dreameServer("command", { action: "set_prefs", ...batch }).then(r => {
    // Diagnostic non bloquant : mesure réseau Maisonnée↔Supabase et durée
    // côté Dreame si la fonction les fournit, sans relire le robot.
    console.info("[Maisonnée Dreame] réglages", {
      total_ms: Date.now() - sentAt,
      cloud_ms: r?.timings_ms?.dreame_cloud ?? null,
      batch: Object.keys(batch),
      fallback: r?.fast_batch === false
    });
    if (!r || r.ok !== true) throw new Error("L'envoi des réglages Dreame n'a pas été accepté.");
    // Réponse cloud ≠ lecture réelle ; les choix restent signalés comme non confirmés.
    if (r.wash_restore_error) toast("Mode transmis, mais Par zone non rétabli : vérifiez Dreame Home.");
    else if (r.send_warning) toast("Réglage transmis ; réponse Dreame partielle, état réel non confirmé.");
    // Ne considérer Par zone comme tenté que lorsque l'étape de restauration
    // a été envoyée sans erreur. Cela n'affirme pas son état réel sur le robot.
    if (r.wash_reapply_sent === true && !r.wash_restore_error) {
      domDreameZoneInitDevice = String(domDreamePendingId() || "default");
    }
    domDreameStateAt = 0;
    return r;
  }).catch(err => {
    // Ne pas effacer le choix local : le robot a pu recevoir l'écriture malgré l'erreur.
    toast("Réglage Dreame non confirmé : " + err.message);
    throw err;
  }).finally(() => {
    domDreamePrefInflight = null;
    domDreameFillHosts();
    if (Object.keys(domDreamePrefDraft).length && domDreamePrefTimer == null) domDreameScheduleSettings();
  });
  domDreamePrefInflight = task;
  domDreameFillHosts();
  return task;
}
async function dreameServer(action, body) {
  const run = async () => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 28000) : null;
    try {
      if (!sb) await loadSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Connexion Maisonnée requise");
      const res = await fetch(DREAME_ENDPOINT + "/" + action, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fn = out.fn ? ` · serveur ${out.fn}` : "";
        throw new Error(String(out.error || "Erreur Dreame") + fn);
      }
      return out;
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Délai dépassé en contactant Dreame. Réessayez.");
      if (e instanceof TypeError && /fetch/i.test(String(e.message))) {
        throw new Error("Impossible de joindre le serveur Dreame (fonction Supabase « dreame »). Vérifiez votre connexion ou réessayez.");
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  // Ne jamais bloquer une lecture de batterie derrière la lecture des pièces.
  // Garder l'ordre strict pour les commandes envoyées au robot.
  if (action !== "command") return run();
  const p = domDreameCmdChain.then(run, run);
  domDreameCmdChain = p.catch(() => {});
  return p;
}
async function domDreameRefreshStatus() {
  if (mode !== "cloud" || !S.hh) return;
  const now = Date.now();
  if (now - domDreameStatusAt < 60000) return;
  try {
    const r = await dreameServer("status");
    domDreameStatus = { connected: !!r.connected, device_id: r.device_id ?? null, device_name: r.device_name || null };
    if (r.auto_wash) domDreameAutoWash = r.auto_wash;
    if (S.hh && r.device_id != null) S.hh.dreame_device_id = r.device_id;
    if (r.device_id != null) domDreameLoadPending();
    if (Array.isArray(r.rooms) && r.rooms.length) {
      domDreameRooms = r.rooms;
      domDreameRoomsHint = r.hint || "";
      domDreameRoomsAt = Date.now();
    }
    if (Array.isArray(r.programs)) domDreamePrograms = r.programs;
    domDreameStatusAt = Date.now();
  } catch (_) {
    domDreameStatusAt = Date.now();
  }
}
async function domDreameRefreshState(force) {
  if (!domDreameLinked() || mode !== "cloud") return false;
  const now = Date.now();
  if (!force && now - domDreameStateAt < DOM_DREAME_STATE_MIN_MS) return false;
  if (domDreameStateInflight) return domDreameStateInflight;
  const deviceId = domDreamePendingId();
  if (domDreameQuickStateDid !== deviceId) {
    domDreameQuickStateDid = deviceId;
    domDreameQuickStateOnly = true;
  }
  const quick = domDreameQuickStateOnly;
  domDreameStateInflight = dreameServer(quick ? "state?quick=1" : "state").then(r => {
    if (!quick) domDreameQuickStateOnly = r.settings_readable !== true;
    domDreameMergeState(r);
    domDreameWashLive = ["area", "time", "room", "intelligent"].includes(r.wash_method) ? r.wash_method : null;
    // Only a readable, matching device value can confirm a pending choice.
    if (r.live_ok === true) {
      for (const key of Object.keys(domDreameWanted)) {
        if (domDreameWanted[key] != null && r[key] != null && Number(r[key]) === Number(domDreameWanted[key])) {
          domDreameWanted[key] = null;
        }
      }
      domDreameSavePending();
    }
    domDreameStateAt = Date.now();
    if (r.device_name) domDreameStatus.device_name = r.device_name;
    return true;
  }).catch(() => false).finally(() => { domDreameStateInflight = null; });
  return domDreameStateInflight;
}
function domDreamePollOnView() {
  if (view !== "domotique") return;
  const force = domDreameLinked() && !domDreameStateAt;
  const loadState = () => domDreameRefreshState(force)
    .then(changed => { if (changed) domSoftRender(); }).catch(() => {});
  if (domDreameLinked()) {
    // Batterie/état et identification de l'appareil ne dépendent pas l'un de l'autre.
    domDreameRefreshStatus().catch(() => {});
    loadState();
  } else {
    domDreameRefreshStatus().then(loadState).catch(() => {});
  }
}
async function domDreameEnsureRooms(force) {
  if (!domDreameLinked() || mode !== "cloud") return [];
  if (domDreameState && domDreameCommandable() === false && !domDreameRooms.length) {
    await domDreameRefreshStatus();
    if (domDreameRooms.length) return domDreameRooms;
  }
  const now = Date.now();
  if (!force && now - domDreameRoomsAt < 120000 && (domDreameRooms.length || domDreameRoomsHint)) return domDreameRooms;
  if (domDreameRoomsInflight) return domDreameRoomsInflight;
  async function fetchRooms() {
    try {
      return await dreameServer("rooms");
    } catch (e1) {
      const msg = e1 && e1.message ? e1.message : "";
      if (!/not found/i.test(msg)) throw e1;
      return dreameServer("command", { action: "rooms" });
    }
  }
  domDreameRoomsInflight = fetchRooms().then(r => {
    domDreameRooms = r.rooms || [];
    domDreameRoomsHint = r.hint || "";
    if (r.live_ok === false && !domDreameRoomsHint && !domDreameRooms.length) {
      domDreameRoomsHint = "Carte en attente : sélectionnez une pièce avant de lancer le nettoyage.";
    }
    if (r.fn && /^20261031a$/.test(r.fn)) {
      domDreameRoomsHint = "Serveur Dreame obsolète (" + r.fn + "). Rechargez l'app.";
    }
    if (r.live_ok === false && domDreameState) {
      domDreameState = { ...domDreameState, live_ok: domDreameState.live_ok };
    }
    domDreameRoomsAt = Date.now();
    return domDreameRooms;
  }).catch(err => {
    const msg = err && err.message ? err.message : "Impossible de lire la carte Dreame.";
    domDreameRoomsHint = msg.replace(/\s·\s*serveur\s+\S+$/i, "");
    if (domDreameState && /ne répond pas|hors ligne|injoignable/i.test(msg) && !domDreameRooms.length) {
      /* garder les commandes cliquables : le cloud Dreame accuse souvent trop tard */
    }
    return domDreameRooms;
  }).finally(() => { domDreameRoomsInflight = null; });
  return domDreameRoomsInflight;
}
function domDreameModeOpts() {
  return [
    { v: 0, t: "Aspiration" },
    { v: 2, t: "Aspiration + serpillière" },
    { v: 1, t: "Serpillière" },
    { v: 3, t: "Serpillière après aspiration" }
  ];
}
function domDreameSuctionOpts() {
  return [
    { v: 0, t: "Silencieux" },
    { v: 1, t: "Standard" },
    { v: 2, t: "Fort" },
    { v: 3, t: "Turbo" }
  ];
}
function domDreameWaterOpts() {
  return [
    { v: 1, t: "Faible" },
    { v: 2, t: "Moyen" },
    { v: 3, t: "Fort" }
  ];
}
function domDreameModeLabel(m) {
  return (domDreameModeOpts().find(o => o.v === m) || {}).t || "Mode";
}
// Pictogrammes Dreame : SVG légers, sans bibliothèque ni modification des commandes.
const DOM_DREAME_ICONS = {
  fan: '<path d="M12 12c-4-8-9-4-6 0 2 2 4 1 6 0Zm0 0c8-4 4-9 0-6-2 2-1 4 0 6Zm0 0c4 8 9 4 6 0-2-2-4-1-6 0Zm0 0c-8 4-4 9 0 6 2-2 1-4 0-6Z"/><circle cx="12" cy="12" r="1.5"/>',
  drop: '<path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/>',
  leaf: '<path d="M20 4C10 4 5 9 5 15a5 5 0 0 0 5 5c6 0 11-5 10-16ZM4 21c4-6 8-9 13-12"/>',
  swirl: '<path d="M12 3a9 9 0 1 1-9 9M12 3l-3 3m3-3 3 3M8 13c2-5 7-5 8-2 1 2-2 4-4 2-2-2 1-4 3-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>'
};
function domDreameIcon(key) {
  const paths = DOM_DREAME_ICONS[key] || DOM_DREAME_ICONS.fan;
  return `<svg class="dom-dreame-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
function domDreameChoiceIcon(prefKey, value) {
  const v = Number(value);
  if (prefKey === "cleaning_mode") {
    if (v === 2) return domDreameIcon("fan") + domDreameIcon("drop");
    return domDreameIcon(v === 1 ? "drop" : v === 3 ? "swirl" : "fan");
  }
  if (prefKey === "suction") return domDreameIcon(v === 0 ? "leaf" : v === 3 ? "swirl" : "fan");
  if (prefKey === "water") return Array.from({ length: v }, () => domDreameIcon("drop")).join("");
  return "";
}
function domDreameChipGroup(label, prefKey, options, current, form) {
  const attr = form ? "data-dom-dreame-form-chip" : "data-dom-dreame-pref";
  const chips = options.map(o => {
    const on = current != null && Number(current) === o.v;
    return `<button type="button" class="btn dom-dreame-choice${on ? " primary" : ""}" ${attr}="${esc(prefKey)}" data-value="${o.v}" aria-pressed="${on ? "true" : "false"}"><span class="dom-dreame-symbols" aria-hidden="true">${domDreameChoiceIcon(prefKey, o.v)}</span><span>${esc(o.t)}</span></button>`;
  }).join("");
  return `<section class="dom-dreame-setting"><h4>${esc(label)}</h4><div class="dom-dreame-choices" role="group" aria-label="${esc(label)}">${chips}</div></section>`;
}
function domDreameNamedRooms() {
  return (domDreameRooms || []).filter(r => r && r.id != null && r.name).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
}
function domDreamePickedNames() {
  const byId = new Map(domDreameNamedRooms().map(r => [Number(r.id), r.name]));
  return (domDreamePickRooms || []).map(Number).map(id => byId.get(id)).filter(Boolean);
}
function domDreamePickSummary() {
  const names = domDreamePickedNames();
  if (!names.length) return "Aucune pièce sélectionnée : choisissez une ou plusieurs pièces, ou Toutes, avant Lecture.";
  return "Sélection : " + names.join(", ") + ". Lecture n’ira que dans ces pièces, avec le mode choisi.";
}
function domDreameRoomsBlock(rooms, hint) {
  const list = (rooms && rooms.length ? rooms : []).filter(r => r && r.id != null);
  if (!list.length) {
    return `<hr class="dom-settings-split"><h4 class="dom-settings-sub">Pièces à nettoyer</h4><p class="muted small">${esc(hint || "Chargement des pièces nommées…")}</p>`;
  }
  const picked = new Set((domDreamePickRooms || []).map(Number));
  const rows = list.map(r => {
    const on = picked.has(Number(r.id));
    return `<button type="button" class="btn dom-dreame-choice${on ? " primary" : ""}" data-dom-dreame-pick-room="${esc(String(r.id))}" aria-pressed="${on ? "true" : "false"}">${esc(r.name)}</button>`;
  }).join("");
  return `<hr class="dom-settings-split"><h4 class="dom-settings-sub">Pièces à nettoyer</h4>
    <p class="muted small" data-dom-dreame-pick-sum>${esc(domDreamePickSummary())}</p>
    <div class="btns" style="margin:0 0 8px"><button type="button" class="btn ghost" data-dom-dreame-pick-all>Toutes</button><button type="button" class="btn ghost" data-dom-dreame-pick-none>Aucune</button></div>
    <div class="dom-dreame-choices dom-dreame-room-grid">${rows}</div>`;
}
// Toujours accessible depuis la fiche : l'état cloud est parfois « Nettoyage »
// pendant le lavage, ou en retard. Le bouton n'envoie rien sans clic explicite.
function domDreameWashNowHtml() {
  return `<button type="button" class="btn ghost" data-dom-dreame-cmd="wash_now" ${domDreameBusy || !domDreameCommandable() ? "disabled" : ""} title="À utiliser pendant un lavage du sol">💧 Laver les serpillières maintenant</button>`;
}
function domDreameTransportBtns() {
  const t = domDreameTask;
  const lit = name => `btn dom-dreame-choice${t === name ? " primary" : ""}`;
  return `<div class="dom-actions dom-dreame-actions">
      <button type="button" class="${lit("start")}" data-dom-dreame-cmd="start">▶ Lecture</button>
      <button type="button" class="${lit("pause")}" data-dom-dreame-cmd="pause">⏸ Pause</button>
      <button type="button" class="${lit("stop")}" data-dom-dreame-cmd="stop">⏹ Stop</button>
      <button type="button" class="${lit("dock")}" data-dom-dreame-cmd="dock">🏠 Retour base</button>
    </div>`;
}
function domDreameStatusHtml() {
  const st = domDreameState || {};
  const line = st.label || (st.online === false ? "Hors ligne" : "État en attente…");
  const mode = domDreamePrefNum("cleaning_mode", 2);
  return `<strong>${esc(line)}</strong>${st.battery != null && st.live_ok === false ? `<br><span class="muted small">Batterie ${esc(String(st.battery))} % (cloud)</span>` : ""}${st.cleaning_mode_label ? `<br><span class="muted small">${esc(st.cleaning_mode_label)}${st.suction_label && mode !== 1 ? " · " + esc(st.suction_label) : ""}</span>` : ""}`;
}
function domDreamePrefsHtml() {
  const mode = domDreamePrefNum("cleaning_mode", 2);
  const suction = domDreamePrefNum("suction", null);
  const water = domDreamePrefNum("water", null);
  const pending = Object.keys(domDreameWanted).filter(k => domDreameWantedNum(k) != null);
  const note = pending.length ? '<p class="muted small">Réglage affiché selon votre dernier choix · confirmation du robot en attente.</p>' :
    (suction == null ? '<p class="muted small">Certains réglages ne sont pas disponibles depuis Dreame : aucune valeur sélectionnée par défaut.</p>' : '');
  const sending = !!domDreamePrefInflight;
  const queued = Object.keys(domDreamePrefDraft).length > 0;
  return (sending || queued ? '<p class="muted small">Choix pris en compte · ' + (sending ? 'transmission au cloud en cours' : 'envoi groupé imminent') + '…</p>' : "") + note + domDreameChipGroup("Mode de nettoyage", "cleaning_mode", domDreameModeOpts(), mode)
    + (mode !== 1 ? domDreameChipGroup("Aspiration", "suction", domDreameSuctionOpts(), suction) : "")
    ;
}
// Réglages avancés : parcours interactif local tant que le protocole du D20 Ultra n'est pas confirmé.
const DOM_DREAME_ADV_KEY = "maisonnee_dreame_advanced_draft_v1";
let domDreameWashLive = null; // null = non lu, « room » = par pièce.
let domDreameWashDiagnostic = null; // Lecture facultative, jamais exécutée à l'ouverture.
let domDreameAutoWash = { enabled: false, interval_minutes: 5, last_tick_at: null, last_sent_at: null, last_error: null, count: 0 };
let domDreameAutoSaving = false;
// Dernière application demandée de « Par zone » (ack cloud, non confirmée sur le robot).
// Une simple ouverture de la fiche ne doit plus occuper le cloud par une écriture.
let domDreameZoneInitDevice = null;
function domDreameAdvancedDraft() {
  // Préférence permanente de Maisonnée : Par zone. Ne prétend pas lire l'état du robot.
  try {
    const v = JSON.parse(localStorage.getItem(DOM_DREAME_ADV_KEY) || "{}");
    return { wash: "area", area: Math.max(5, Math.min(15, Number(v.area) || 10)), time: 15,
      route: ["fast", "standard", "intensive", "deep"].includes(v.route) ? v.route : "standard" };
  } catch (_) { return { wash: "area", area: 10, time: 15, route: "standard" }; }
}
// Filtrage visuel uniquement : ne change aucun paramètre sur le robot.
function domDreameRouteAllowed(mode, route) {
  return Number(mode) === 1 || Number(mode) === 3 ||
    route === "fast" || route === "standard";
}
function domDreameAutoWashHtml() {
  const a = domDreameAutoWash || {};
  const enabled = a.enabled === true;
  const interval = Number(a.interval_minutes) || 5;
  const lastTick = a.last_tick_at ? Date.parse(a.last_tick_at) : NaN;
  const live = Number.isFinite(lastTick) && Date.now() - lastTick < 3 * 60000;
  const status = enabled ? (live ? "Planification Supabase active" : "Activation enregistrée — planification Supabase à vérifier") : "Désactivé";
  const items = [4, 5, 6, 8, 10, 12, 15].map(n =>
    `<option value="${n}" ${n === interval ? "selected" : ""}>${n} minutes</option>`
  ).join("");
  return `<section class="dom-dreame-setting"><h4>Rinçage supplémentaire automatique</h4>
    <p class="muted small">Pendant le lavage du sol uniquement, par durée (pas par m²). Conserve le rinçage natif du Dreame.</p>
    <p class="muted small">${esc(status)}${enabled ? " · demandes cette tâche : " + (Number(a.count) || 0) : ""}</p>
    <label class="field"><span class="label">Délai entre deux rinçages supplémentaires</span><select class="input" data-dom-dreame-auto-minutes ${domDreameAutoSaving ? "disabled" : ""}>${items}</select></label>
    <button type="button" class="btn${enabled ? " ghost" : " primary"}" data-dom-dreame-auto-toggle="${enabled ? "off" : "on"}" ${domDreameAutoSaving ? "disabled" : ""}>${enabled ? "Désactiver le rinçage automatique" : "Activer le rinçage automatique"}</button>
    <p class="muted small">Fonctionne avec Maisonnée fermée après installation de la tâche planifiée Supabase. Évite les doubles rinçages rapprochés ; aucune mesure de surface n'est supposée.</p>
    ${a.last_error ? `<p class="muted small">Dernier contrôle : ${esc(String(a.last_error).slice(0, 120))}</p>` : ""}
  </section>`;
}
function domDreameSaveAutoWash(enabled, minutes) {
  if (domDreameAutoSaving || !domDreameCommandable()) return;
  if (enabled && !domDreameAutoWash.enabled && !confirm("Activer des rinçages supplémentaires toutes les " + minutes + " minutes de lavage ? La planification Supabase doit être installée.")) return;
  domDreameAutoSaving = true;
  domDreameFillHosts();
  dreameServer("auto_wash_config", { enabled, interval_minutes: minutes }).then(r => {
    if (r?.auto_wash) domDreameAutoWash = r.auto_wash;
    toast(enabled ? "Rinçage supplémentaire configuré ; vérifiez la planification Supabase." : "Rinçage automatique désactivé.");
  }).catch(err => toast("Rinçage automatique non configuré : " + err.message))
    .finally(() => { domDreameAutoSaving = false; domDreameFillHosts(); });
}
function domDreameAdvancedPreviewHtml() {
  const d = domDreameAdvancedDraft();
  // Toujours présenter Par zone, sans afficher un éventuel état cloud incomplet comme confirmé.
  const chip = (key, val, title, active) => `<button type="button" class="btn dom-dreame-choice${active ? " primary" : ""}" data-dom-dreame-advanced="${key}" data-value="${val}" aria-pressed="${active}">${esc(title)}</button>`;
  const mode = domDreamePrefNum("cleaning_mode", 2);
  const routes = [["fast", "Rapide"], ["standard", "Standard"], ["intensive", "Lavage du sol intensif"], ["deep", "En profondeur"]]
    .filter(([route]) => domDreameRouteAllowed(mode, route));
  return `<div class="dom-dreame-advanced-preview">
    ${mode === 0 ? "" : `<section class="dom-dreame-setting"><h4>Lavage des serpillières · Par zone</h4>
      <div class="dom-dreame-choices">${chip("wash", "area", "Renvoyer Par zone", true)}</div>
      <label class="muted small">Surface souhaitée : ${d.area} m²
        <input type="range" data-dom-dreame-advanced-range="area" min="5" max="15" step="1" value="${d.area}"></label>
      <p class="muted small">Mode Par zone envoyé automatiquement après chaque changement de nettoyage. La valeur en m² reste à confirmer dans Dreame Home.</p>
      <details ${domDreameWashDiagnostic ? "open" : ""}><summary>Diagnostic du rinçage automatique</summary>
        <button type="button" class="btn ghost" data-dom-dreame-wash-probe>Vérifier la surface réelle (lecture seule)</button>
        ${domDreameWashDiagnostic ? `<p class="muted small">${esc(domDreameWashDiagnostic)}</p>` : ""}
      </details>
    </section>`}
    ${domDreameAutoWashHtml()}
    <section class="dom-dreame-setting"><h4>Itinéraire</h4><div class="dom-dreame-choices" role="group" aria-label="Itinéraire">
      ${routes.map(([v, t]) => chip("route", v, t, d.route === v)).join("")}</div></section>
    <p class="muted small">La sélection du mode et de l’itinéraire est envoyée au robot ; l’état réel peut rester indisponible.</p>
  </div>`;
}
document.addEventListener("change", e => {
  const autoMinutes = e.target.closest("[data-dom-dreame-auto-minutes]");
  if (autoMinutes) { domDreameSaveAutoWash(!!domDreameAutoWash.enabled, Number(autoMinutes.value)); return; }
  const slider = e.target.closest("[data-dom-dreame-advanced-range]");
  if (!slider) return;
  const method = slider.dataset.domDreameAdvancedRange;
  const value = Number(slider.value);
  const before = domDreameAdvancedDraft()[method];
  if (!(["area", "time"].includes(method)) || !Number.isInteger(value) || value === before) return;
  if (!domDreameCommandable() || domDreameBusy) {
    domDreameAdvancedUpdate(method, before);
    toast("Dreame indisponible ou commande en cours : valeur non modifiée.");
    return;
  }
  domDreameBusy = "advanced_interval";
  dreameServer("command", { action: "set_wash_interval", method, value })
    .then(() => {
      domDreameAdvancedUpdate(method, value);
      toast("Valeur envoyée au cloud ; vérifiez-la dans Dreame Home.");
    })
    .catch(err => {
      domDreameAdvancedUpdate(method, before);
      toast("Valeur non appliquée : " + err.message);
    })
    .finally(() => { domDreameBusy = ""; });
});
function domDreameAdvancedUpdate(key, value) {
  const d = domDreameAdvancedDraft();
  if (key === "wash" && value === "area") {
    d.wash = "area";
    d.washSource = "user";
  }
  else if (key === "route" && ["fast", "standard", "intensive", "deep"].includes(value)) d.route = value;
  else if (key === "area" || key === "time") d[key] = Math.max(key === "area" ? 5 : 10, Math.min(key === "area" ? 15 : 25, Number(value) || d[key]));
  localStorage.setItem(DOM_DREAME_ADV_KEY, JSON.stringify(d));
  const host = document.querySelector(".dom-dreame-advanced-preview");
  if (host) host.outerHTML = domDreameAdvancedPreviewHtml();
}

function domDreameFillHosts() {
  const panel = document.querySelector(".dom-dreame-panel");
  if (!panel) return;
  const status = panel.querySelector("[data-dom-dreame-status]");
  if (status) status.innerHTML = domDreameStatusHtml();
  const washAction = panel.querySelector("[data-dom-dreame-wash-action]");
  if (washAction) washAction.innerHTML = domDreameWashNowHtml();
  const prefs = panel.querySelector("[data-dom-dreame-prefs]");
  if (prefs) prefs.innerHTML = domDreamePrefsHtml();
  const advanced = panel.querySelector(".dom-dreame-advanced-preview");
  if (advanced) advanced.outerHTML = domDreameAdvancedPreviewHtml();
  const rooms = panel.querySelector("[data-dom-dreame-rooms-host]");
  if (rooms) rooms.innerHTML = domDreameRoomsBlock(domDreameRooms, domDreameRoomsHint || (domDreameRoomsInflight ? "Lecture de la carte…" : ""));
  panel.querySelectorAll("[data-dom-dreame-trans]").forEach(trans => {
    trans.innerHTML = domDreameTransportBtns();
  });
  const progs = panel.querySelector("[data-dom-dreame-progs-host]");
  if (progs) progs.innerHTML = domDreameProgramsBlock(domDreameCommandable());
}
function domDreameStartPayload() {
  // Envoyer aussi l'itinéraire choisi : auparavant, « Lecture » ne le transmettait pas.
  const cleaningMode = domDreamePrefNum("cleaning_mode", 2);
  const route = domDreameAdvancedDraft().route;
  const routes = { standard: 1, intensive: 2, deep: 3, fast: 4 };
  return {
    action: "start",
    cleaning_mode: cleaningMode,
    suction: domDreamePrefNum("suction", 1),
    water: domDreamePrefNum("water", 2),
    ...(domDreameRouteAllowed(cleaningMode, route) ? { cleaning_route: routes[route] } : {}),
    segment_ids: (domDreamePickRooms || []).map(Number).filter(n => n > 0)
  };
}
function domDreameRouteOptions(mode) {
  const routes = [
    { v: 4, t: "Rapide" },
    { v: 1, t: "Standard" },
    { v: 2, t: "Lavage du sol intensif" },
    { v: 3, t: "En profondeur" }
  ];
  return routes.filter(r => domDreameRouteAllowed(mode, ({ 1: "standard", 2: "intensive", 3: "deep", 4: "fast" })[r.v]));
}
function domDreameRouteLabel(route) {
  return ({ 1: "Standard", 2: "Lavage intensif", 3: "En profondeur", 4: "Rapide" })[Number(route)] || "Standard";
}
function domDreameProgramsBlock(canCmd) {
  const programs = domDreamePrograms || [];
  if (!programs.some(p => p.id === domDreameSelectedProgramId)) domDreameSelectedProgramId = null;
  const rows = programs.map(p => {
    const rooms = (p.room_ids || []).map(id => {
      const r = (domDreameRooms || []).find(x => Number(x.id) === Number(id));
      return r ? r.name : "Pièce " + id;
    }).join(", ");
    const selected = p.id === domDreameSelectedProgramId;
    const route = p.cleaning_route != null ? " · " + domDreameRouteLabel(p.cleaning_route) : "";
    return `<div class="dom-dreame-prog-row">
      <button type="button" class="btn dom-dreame-choice${selected ? " primary" : ""}" data-dom-dreame-prog-select="${esc(p.id)}" aria-pressed="${selected}" ${canCmd ? "" : "disabled"}>${esc(p.name)}</button>
      <p class="muted small">${esc(domDreameModeLabel(p.cleaning_mode))} · ${esc(rooms || "Pièces non renseignées")}${esc(route)}</p>
    </div>`;
  }).join("");
  return `<hr class="dom-settings-split"><h4 class="dom-settings-sub">Programmes</h4>
    ${rows || '<p class="muted small">Aucun programme enregistré.</p>'}
    ${rows ? '<p class="muted small">Sélectionnez un programme puis appuyez sur Lecture.</p>' : ""}
    <div class="btns"><button type="button" class="btn" data-dom-dreame-prog-add>＋ Nouveau programme</button>
    ${rows ? '<button type="button" class="btn ghost" data-dom-dreame-prog-manage>Modifier / Supprimer</button>' : ""}</div>`;
}
function domDreameProgramManageSheet() {
  const rows = (domDreamePrograms || []).map(p => `<div class="dom-dreame-prog-row">
    <strong>${esc(p.name)}</strong>
    <div class="btns"><button type="button" class="btn ghost" data-dom-dreame-prog-edit="${esc(p.id)}">Modifier</button>
    <button type="button" class="btn ghost danger" data-dom-dreame-prog-del="${esc(p.id)}">Supprimer</button></div>
  </div>`).join("");
  openSheet("Gérer les programmes", `<div class="dom-settings dom-dreame-prog-manager">
    ${rows || '<p class="muted">Aucun programme enregistré.</p>'}
    <button type="button" class="btn" data-dom-dreame-prog-back>← Retour au Dreame</button>
  </div>`);
}
function domDreameReturnToPrograms() {
  domDreameActiveTab = "programs";
  // Rouvrir la fiche, pas la page Domotique, sans relancer les lectures cloud.
  domDreameSheet(true);
}
function domDreameLaunchProgram(programId) {
  const prog = (domDreamePrograms || []).find(p => p.id === programId);
  if (!prog || !domDreameCommandable()) {
    toast("Sélectionnez un programme disponible avant Lecture.");
    return;
  }
  if (domDreameBusy === "prog_" + programId || domDreameBusy === "start") return;
  domDreameSelectedProgramId = programId;
  domDreameBusy = "prog_" + programId;
  domDreameTask = "start";
  domDreameFillHosts();
  // Le programme enregistré contient déjà ses pièces et paramètres : aucune
  // sélection manuelle ni lecture lente supplémentaire n'est nécessaire.
  domRunDreameCommand(() => dreameServer("command", { action: "run_program", program_id: programId }))
    .then(r => {
      if (!r) return;
      domDreameMergeState(r);
      domDreameStateAt = 0;
      toast(r.settings_restore_error
        ? "Programme lancé ; itinéraire ou Par zone non confirmé : vérifiez Dreame Home."
        : "Programme lancé · " + prog.name, null, null, null, "domotique");
      domDreameFillHosts();
      setTimeout(() => { domDreameRefreshState(true).then(() => domDreameFillHosts()).catch(() => {}); }, 2500);
    })
    .catch(err => { if (err) toast(err.message); })
    .finally(() => { domDreameBusy = ""; domDreameFillHosts(); });
}
function domDreameRenameRoomsSheet() {
  const rooms = domDreameRooms || [];
  if (!rooms.length) {
    openSheet("Pièces Dreame", `<div class="dom-settings"><p class="muted">Aucune pièce enregistrée pour l'instant. Ouvrez la fiche de l'aspirateur une fois, ou ajoutez-les ici.</p><button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
    return;
  }
  const fields = rooms.map(r => `<label>Pièce ${esc(String(r.id))}<input name="room_${esc(String(r.id))}" required maxlength="40" value="${esc(r.name)}"></label>`).join("");
  openSheet("Pièces de l'aspirateur", `<form id="dom-dreame-rooms" class="dom-form"><p class="muted">Ces noms s'affichent dans Maisonnée. Ils ne remplacent pas la carte dans l'app Dreame Home.</p>${fields}<button class="btn primary" type="submit">Enregistrer les noms</button></form>`);
}
function domDreameProgramSheet(progId) {
  const rooms = domDreameRooms || [];
  const existing = progId ? (domDreamePrograms || []).find(p => p.id === progId) : null;
  const draft = (domDreameProgDraft && (!progId || progId === domDreameProgDraft.id)) ? domDreameProgDraft : null;
  const cur = { cleaning_mode: 2, suction: 1, water: 2, cleaning_route: 1,
    wash_method: "area", name: "", room_ids: [], ...(existing || {}), ...(draft || {}) };
  domDreameProgEdit = existing ? existing.id : (progId || "");
  const mode = Number(cur.cleaning_mode);
  const suction = Number(cur.suction);
  const water = Number(cur.water);
  const routeOptions = domDreameRouteOptions(mode);
  const route = routeOptions.some(o => o.v === Number(cur.cleaning_route)) ? Number(cur.cleaning_route) : 1;
  const selected = new Set((cur.room_ids || []).map(Number));
  const roomBoxes = rooms.length
    ? rooms.map(r => `<label class="dom-dreame-check"><input type="checkbox" name="room" value="${esc(String(r.id))}" ${selected.has(Number(r.id)) ? "checked" : ""}><span>${esc(r.name)}</span></label>`).join("")
    : `<p class="muted">Enregistrez d'abord les pièces de l'aspirateur.</p>`;
  const routeBtns = routeOptions.map(o => `<button type="button" class="btn dom-dreame-choice${route === o.v ? " primary" : ""}" data-dom-dreame-form-route="${o.v}" aria-pressed="${route === o.v}">${esc(o.t)}</button>`).join("");
  openSheet(existing ? "Modifier le programme" : "Nouveau programme", `<form id="dom-dreame-program" class="dom-form">
    <label>Nom<input name="name" required maxlength="40" value="${esc(cur.name || "")}" placeholder="Ex. RDC le soir"></label>
    <input type="hidden" name="cleaning_mode" value="${mode}">
    <input type="hidden" name="suction" value="${suction}">
    <input type="hidden" name="water" value="${water}">
    <input type="hidden" name="cleaning_route" value="${route}">
    <input type="hidden" name="wash_method" value="area">
    ${domDreameChipGroup("Mode de nettoyage", "cleaning_mode", domDreameModeOpts(), mode, true)}
    ${mode !== 1 ? domDreameChipGroup("Aspiration", "suction", domDreameSuctionOpts(), suction, true) : ""}
    <section class="dom-dreame-setting"><h4>Itinéraire</h4><div class="dom-dreame-choices" role="group" aria-label="Itinéraire">${routeBtns}</div></section>
    ${mode === 0 ? "" : '<section class="dom-dreame-setting"><h4>Fréquence de lavage des serpillières</h4><div class="dom-dreame-choices"><button type="button" class="btn dom-dreame-choice primary" aria-pressed="true" disabled>✓ Par zone</button></div></section>'}
    <p class="muted small">Pièces à nettoyer</p>
    <div class="dom-dreame-rooms-pick">${roomBoxes}</div>
    <div class="btns"><button class="btn primary" type="submit">Enregistrer</button><button type="button" class="btn ghost" data-dom-dreame-prog-back>Annuler</button></div>
  </form>`);
}
async function domRunDreameCommand(fn) {
  const now = Date.now();
  if (now - domDreameLastCmdAt < DOM_DREAME_CMD_DEBOUNCE_MS) return null;
  domDreameLastCmdAt = now;
  return fn();
}
async function domRunMelCommand(fn) {
  const now = Date.now();
  if (now - domMelLastCmdAt < DOM_MEL_CMD_DEBOUNCE_MS) return null;
  domMelLastCmdAt = now;
  return fn();
}
function domRead() {
  if (S.vShelly && Array.isArray(S.shelly) && S.shelly.length) return S.shelly.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  try { const v = JSON.parse(localStorage.getItem(DOM_KEY)); if (Array.isArray(v) && v.length) return v; } catch (_) {}
  return DOM_DEFAULT.map((x, i) => ({ ...x, id: "dom_" + i, position: i }));
}
function domWriteLocal(v) { localStorage.setItem(DOM_KEY, JSON.stringify(v)); }
function domIcon(t) { return t === "volet" ? "▤" : t === "lumiere" ? "💡" : t === "prise" ? "🔌" : "🚪"; }
function domActions(x) {
  if (x.type === "portail") return ["Ouvrir"];
  if (x.type === "volet") return ["Monter", "Stop", "Descendre"];
  return ["Allumer", "Éteindre"];
}
function domGatePair() {
  const rows = domRead().filter(x => x.type === "portail");
  const pieton = rows.find(x => /pi[eé]ton/i.test(x.name));
  const voiture = rows.find(x => /voiture/i.test(x.name));
  if (pieton || voiture) return { pieton, voiture };
  if (rows.length >= 2) return { pieton: rows[0], voiture: rows[1] };
  return { pieton: rows[0] || null, voiture: rows[0] || null };
}
function windowDomHomeGates() {
  const { pieton, voiture } = domGatePair();
  const ready = x => !!(domConnected() && x && x.shelly_id);
  const tempOf = x => {
    const st = x && domState[x.id];
    return st && typeof st.temp === "number" ? st.temp : null;
  };
  return {
    pieton: pieton && { id: pieton.id, name: pieton.name, ready: ready(pieton), temp: tempOf(pieton) },
    voiture: voiture && { id: voiture.id, name: voiture.name, ready: ready(voiture), temp: tempOf(voiture) }
  };
}
window.domHomeGates = windowDomHomeGates;
function domVoletLine() {
  const volets = domRead().filter(x => x.type === "volet");
  if (!volets.length) return "";
  const bits = volets.map(x => {
    const st = domState[x.id];
    return x.name.replace(/^Volets?\s+/i, "") + (st && st.label ? " " + st.label.toLowerCase() : "");
  });
  return bits.join(" · ");
}
window.domVoletLine = domVoletLine;
const DOM_STATE_MIN_MS = 20000;
const DOM_STATE_FORCE_MIN_MS = 12000;
const DOM_CMD_DEBOUNCE_MS = 1100;
let domStateForceAt = 0;
let domLastCmdAt = 0;
let domCmdStateTimer = null;
let domViewStateAt = 0;
let domShellyChain = Promise.resolve();
let domCmdLock = false;
async function domRefreshState(force) {
  if (!domConnected() || mode !== "cloud") return false;
  if (domCmdLock) return false;
  const now = Date.now();
  if (force) {
    if (now - domStateForceAt < DOM_STATE_FORCE_MIN_MS) return false;
  } else if (now - domStateAt < DOM_STATE_MIN_MS) return false;
  if (domStateInflight) return domStateInflight;
  domStateLoading = true;
  domStateInflight = shellyServer("state").then(r => {
    domState = r.states || {};
    domStateAt = Date.now();
    if (force) domStateForceAt = domStateAt;
    return true;
  }).catch(() => false).finally(() => {
    domStateLoading = false;
    domStateInflight = null;
  });
  return domStateInflight;
}
function domScheduleStateAfterCmd() {
  if (domCmdStateTimer) clearTimeout(domCmdStateTimer);
  domCmdStateTimer = setTimeout(() => {
    domCmdStateTimer = null;
    domRefreshState(true).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
  }, 12000);
}
function domScheduleState(force, after) {
  domRefreshState(force).then(changed => {
    if (typeof after === "function") after(!!changed);
    else if (changed && view === "domotique") domSoftRender();
  }).catch(() => {});
}
function domPollOnView() {
  if (view !== "domotique") return;
  const now = Date.now();
  if (now - domViewStateAt < DOM_STATE_MIN_MS) return;
  domViewStateAt = now;
  domScheduleState(false);
}
window.domRefreshState = domRefreshState;
window.domScheduleState = domScheduleState;
async function shellyServer(action, body) {
  const run = async () => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 22000) : null;
    try {
      if (!sb) await loadSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Connexion Maisonnée requise");
      const res = await fetch(SHELLY_ENDPOINT + "/" + action, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(out.error || "Erreur Shelly Cloud");
        throw new Error(/too many requests/i.test(msg) ? "Shelly Cloud : trop de requêtes. Attendez une vingtaine de secondes, puis réessayez une seule commande." : msg);
      }
      return out;
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Délai dépassé en contactant Shelly Cloud. Réessayez.");
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const p = domShellyChain.then(run, run);
  domShellyChain = p.catch(() => {});
  return p;
}
async function domRunCommand(fn) {
  const now = Date.now();
  if (domCmdLock) {
    toast("Une commande Shelly est déjà en cours…");
    return null;
  }
  if (now - domLastCmdAt < DOM_CMD_DEBOUNCE_MS) return null;
  if (domCmdStateTimer) { clearTimeout(domCmdStateTimer); domCmdStateTimer = null; }
  domCmdLock = true;
  domLastCmdAt = now;
  try {
    return await fn();
  } finally {
    domCmdLock = false;
  }
}
async function domEnsureDefaults() {
  if (mode !== "cloud" || !S.vShelly || !S.hh || (S.shelly && S.shelly.length)) return;
  const local = (() => { try { return JSON.parse(localStorage.getItem(DOM_KEY)); } catch (_) { return null; } })();
  const seed = Array.isArray(local) && local.length ? local.map((x, i) => ({
    name: x.name, zone: x.zone, type: x.type, shelly_id: x.shelly_id || "", channel: x.channel || 0, channel_b: x.channel_b ?? null, pulse_sec: x.pulse_sec || 1, position: i
  })) : DOM_DEFAULT;
  await addMany("shelly", seed);
}
function domLinkLine(x) {
  if (!domConnected()) return "Shelly Cloud n'est pas encore relié";
  if (!x.shelly_id) return "Identifiant Shelly à associer dans les réglages";
  const st = domState[x.id];
  if (domStateLoading && !st) return "Lecture de l'état…";
  const bits = [];
  if (st && st.label) bits.push(st.label);
  if (st && typeof st.temp === "number") bits.push(st.temp.toFixed(1).replace(".", ",") + " °C");
  if (bits.length) return bits.join(" · ");
  return "Prêt";
}
function domZoneVolets(zone) {
  return domRead().filter(x => x.zone === zone && x.type === "volet" && x.shelly_id);
}
function domZoneBatchCard(zone) {
  if (zone !== "rdc" && zone !== "etage") return "";
  const n = domZoneVolets(zone).length;
  if (!n || !domConnected()) return "";
  const busyKey = z => a => domBusy === "zone-" + z + "-" + a;
  const btn = (lab, act, cls) => {
    const b = busyKey(zone)(act);
    return `<button type="button" class="btn${cls ? " " + cls : ""}" data-dom-zone-batch="${esc(zone)}" data-dom-action="${esc(act)}" ${domBusy && !b ? "disabled" : ""} ${b ? "aria-busy=true" : ""}>${lab}</button>`;
  };
  return `<article class="dom-device dom-zone-batch"><div class="dom-device-head"><strong>▤ Tous les volets</strong><span class="muted">${n} volet(s)</span></div><div class="dom-actions">${btn("↑ Tout ouvrir", "Monter")}${btn("■ Stop", "Stop")}${btn("↓ Tout fermer", "Descendre")}</div></article>`;
}
function domSettings(zone) {
  const rows = domRead().filter(x => !zone || x.zone === zone);
  const heading = zone ? DOM_ZONES[zone] : "Domotique";
  const cloud = mode === "cloud" && S.hh;
  const connect = !zone && cloud ? (domConnected()
    ? `<p class="muted">Compte Shelly relié (${esc((S.hh.shelly_host || "").replace(/^https:\/\//, ""))}). La clé reste sur le serveur.</p><div class="btns"><button class="btn" data-dom-cloud-list>Choisir un appareil du compte</button><button class="btn ghost danger" data-dom-disconnect>Délier Shelly Cloud</button></div>`
    : `<p class="muted">Dans l'app Shelly : Utilisateur → Clé d'autorisation cloud. Copiez l'adresse du serveur et la clé.</p><button class="btn primary" data-dom-connect>Relier Shelly Cloud</button>`)
    : (!cloud ? '<p class="muted">Ouvrez Maisonnée avec le compte du foyer pour relier Shelly Cloud.</p>' : "");
  const mel = !zone && cloud ? (domMelLinked()
    ? `<hr class="dom-settings-split"><h4 class="dom-settings-sub">MELCloud · Mitsubishi</h4><p class="muted">Compte relié${domMelStatus.device_name ? " · " + esc(domMelStatus.device_name) : ""}. Mot de passe côté serveur uniquement.</p><div class="btns"><button class="btn" data-dom-mel-devices>Choisir un appareil</button><button class="btn ghost danger" data-dom-mel-disconnect>Délier MELCloud</button></div>`
    : `<hr class="dom-settings-split"><h4 class="dom-settings-sub">MELCloud · Mitsubishi</h4><p class="muted">Reliez le compte de l'application MELCloud pour le chauffage.</p><button class="btn primary" data-dom-mel-connect>Relier MELCloud</button>`)
    : "";
  const dre = !zone && cloud ? (domDreameLinked()
    ? `<hr class="dom-settings-split"><h4 class="dom-settings-sub">Dreame Home</h4><p class="muted">Compte relié${domDreameStatus.device_name ? " · " + esc(domDreameStatus.device_name) : ""}. Mot de passe côté serveur uniquement.</p><div class="btns"><button class="btn" data-dom-dreame-rooms>Pièces de l'aspirateur ›</button><button class="btn" data-dom-dreame-progs>Programmes de nettoyage ›</button><button class="btn" data-dom-dreame-devices>Choisir un aspirateur</button><button class="btn ghost danger" data-dom-dreame-disconnect>Délier Dreame</button></div>`
    : `<hr class="dom-settings-split"><h4 class="dom-settings-sub">Dreame Home</h4><p class="muted">Reliez le compte Dreame Home (e-mail + mot de passe de l'app, région EU).</p><button class="btn primary" data-dom-dreame-connect>Relier Dreame Home</button>`)
    : "";
  const stv = !zone && cloud ? (domStLinked()
    ? `<hr class="dom-settings-split"><h4 class="dom-settings-sub">SmartThings · Samsung TV</h4><p class="muted">Compte relié${domStStatus.device_name ? " · " + esc(domStStatus.device_name) : ""}. Token côté serveur uniquement.</p><div class="btns"><button class="btn" data-dom-st-devices>Choisir un appareil</button><button class="btn ghost danger" data-dom-st-disconnect>Délier SmartThings</button></div>`
    : `<hr class="dom-settings-split"><h4 class="dom-settings-sub">SmartThings · Samsung TV</h4><p class="muted">Reliez un token SmartThings (PAT) pour piloter votre TV Samsung.</p><button class="btn primary" data-dom-st-connect>Relier SmartThings</button>`)
    : "";
  openSheet("Réglages · " + heading, `<div class="dom-settings">${connect}${mel}${dre}${stv}<p class="muted small">Version domotique · build 20261101e02</p><p class="muted">Gérez les équipements de ${zone ? "cette zone" : "vos trois zones Shelly"}.</p>${!zone ? '<button type="button" class="btn" data-dom-rooms-manage>Gérer les pièces ›</button>' : ""}<div class="dom-settings-list">${rows.map(x => `<button type="button" class="btn dom-settings-row" data-dom-edit="${esc(x.id)}"><span>${esc(x.name)} <small class="muted">· ${DOM_ZONES[x.zone]}</small></span><span>Modifier ›</span></button>`).join("") || '<p class="muted">Aucun équipement configuré.</p>'}</div><button class="btn primary" data-dom-add="${zone || "exterieur"}">＋ Ajouter un appareil</button></div>`);
  if (!zone && cloud) {
    domMelRefreshStatus().catch(() => {});
    domDreameRefreshStatus().catch(() => {});
    domStRefreshStatus().catch(() => {});
  }
}
function domRoomsManageSheet() {
  const { rooms } = domHomeRead();
  openSheet("Pièces de la maison", `<div class="dom-settings"><p class="muted">Les pièces servent à la vue Domotique. Chaque équipement Shelly est rattaché à une pièce dans le formulaire d'ajout ou de modification.</p>
    <div class="dom-settings-list">${rooms.map(r => `<div class="dom-room-row"><button type="button" class="btn dom-settings-row" data-dom-room-edit="${esc(r.id)}"><span><span class="dom-eq-ico">${esc(r.ico)}</span> ${esc(r.t)} <small class="muted">${esc(r.sub || "")}</small></span><span>Modifier ›</span></button></div>`).join("")}</div>
    <button type="button" class="btn primary" data-dom-room-add>＋ Ajouter une pièce</button>
    <button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
}
let domEditRoom = "";
function domRoomFormSheet(roomId) {
  domEditRoom = roomId || "";
  const { rooms } = domHomeRead();
  const item = roomId ? rooms.find(r => r.id === roomId) : { id: "", t: "", ico: "🏠", sub: "" };
  openSheet(roomId ? "Modifier la pièce" : "Nouvelle pièce", `<form id="dom-room-form" class="dom-form">
    <label>Nom<input name="t" required maxlength="40" value="${esc(item.t)}" placeholder="Ex. Garage"></label>
    <label>Icône (emoji)<input name="ico" maxlength="8" value="${esc(item.ico || "🏠")}" placeholder="🏠"></label>
    <label>Sous-titre (optionnel)<input name="sub" maxlength="80" value="${esc(item.sub || "")}" placeholder="Ex. Portail, éclairages"></label>
    <button class="btn primary" type="submit">Enregistrer</button>
    ${roomId ? `<button class="btn danger" type="button" data-dom-room-del="${esc(roomId)}">Supprimer cette pièce</button>` : ""}
  </form>`);
}
function domPos(x) {
  const st = x && domState[x.id];
  if (!x || x.type !== "volet" || !st || typeof st.pos !== "number") return null;
  return Math.round(Math.max(0, Math.min(100, st.pos)));
}
function domIsOpen(x) {
  const pos = domPos(x);
  if (pos == null) return null;
  return pos > 2;
}
function domRoomOf(x) { return domRoomIdOf(x); }
// Intégrations (TV, chauffage, aspirateur) rattachées aux pièces via assign
const DOM_INTEGRATIONS = [
  { key: "_st", t: "TV Samsung", ico: "📺", defaultRoom: "salon",
    linked: () => domStLinked(), summary: domStSummary, open: "data-dom-st-open", card: () => domStEqCard() },
  { key: "_mel", t: "Chauffage", ico: "♨️", defaultRoom: null,
    linked: () => domMelLinked(), summary: domMelSummary, open: "data-dom-mel-open", card: () => domMelEqCard() },
  { key: "_dreame", t: "Aspirateur", ico: "🤖", defaultRoom: null,
    linked: () => domDreameLinked(), summary: domDreameSummary, open: "data-dom-dreame-open", card: () => domDreameEqCard() }
];
function domIntegrationRoom(integ) {
  const { assign } = domHomeRead();
  if (assign[integ.key] !== undefined) return assign[integ.key];
  return integ.defaultRoom;
}
function domIntegrationsForRoom(roomId) {
  return DOM_INTEGRATIONS.filter(i => domIntegrationRoom(i) === roomId);
}
function domIntegRoomPicker(integKey) {
  const { rooms, assign } = domHomeRead();
  const cur = assign[integKey] !== undefined ? assign[integKey] : (DOM_INTEGRATIONS.find(i => i.key === integKey) || {}).defaultRoom;
  const opts = [{ id: null, t: "Toute la maison" }, ...rooms];
  return `<div class="dom-integ-room"><span class="muted small">Pièce :</span> ${opts.map(o =>
    `<button type="button" class="btn small${(cur === o.id) ? " primary" : " ghost"}" data-dom-integ-room="${integKey}" data-dom-integ-room-val="${o.id === null ? "_none" : esc(o.id)}">${esc(o.t)}</button>`
  ).join(" ")}</div>`;
}
function domRooms() {
  const { rooms, assign } = domHomeRead();
  const items = domRead();
  const map = {};
  for (const r of rooms) map[r.id] = { ...r, items: [] };
  for (const x of items) {
    const rid = domRoomIdOf(x);
    if (!map[rid]) map[rid] = { id: rid, t: rid, ico: "🏠", sub: "", items: [] };
    map[rid].items.push(x);
  }
  return map;
}
function domRoomList() { return domHomeRead().rooms.map(r => ({ ...r, items: (domRooms()[r.id] || {}).items || [] })); }
function domCmdBtns(x, compact) {
  const ready = !!(domConnected() && x.shelly_id);
  return `<div class="dom-actions${compact ? " dom-actions-compact" : ""}">${domActions(x).map(t => {
    const lab = x.type === "volet" ? (t === "Monter" ? "↑" : t === "Descendre" ? "↓" : "■") : t;
    return `<button type="button" class="btn" data-dom-cmd="${esc(x.id)}" data-dom-action="${esc(t)}" ${ready ? "" : "disabled"} ${domBusy === x.id + t ? "aria-busy=true" : ""}>${lab}</button>`;
  }).join("")}</div>`;
}
function domMeter(x) {
  const pos = domPos(x);
  if (pos == null) return "";
  return `<div class="dom-pos" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pos}" aria-label="Position ${pos} %"><span style="width:${pos}%"></span></div>`;
}
function domSlider(x) {
  const pos = domPos(x);
  if (pos == null) return "";
  return `<label class="dom-slider"><span class="dom-slider-label">Ouvert à ${pos} %</span><input type="range" min="0" max="100" value="${pos}" disabled aria-label="Position actuelle ${pos} %, réglage non disponible"></label>`;
}
function domShutterSvg(x) {
  const pos = domPos(x);
  const pct = pos != null ? pos : 0;
  const st = x && domState[x.id];
  const isMoving = st && st.label && /mouvement|course|calibrat/i.test(st.label);
  // blindH: hauteur du volet (0% ouvert = volet couvre tout = blindH max, 100% ouvert = blindH min)
  const blindH = Math.round(44 * (1 - pct / 100));
  const slats = [];
  for (let y = 4; y < 4 + blindH; y += 5) {
    slats.push(`<line class="dom-sh-slat" x1="8" y1="${y}" x2="48" y2="${y}"/>`);
  }
  return `<svg class="dom-shutter-svg${isMoving ? " is-moving" : ""}" viewBox="0 0 56 52" aria-hidden="true">
    <rect class="dom-sh-glass" x="6" y="2" width="44" height="48" rx="3"/>
    <rect class="dom-sh-frame" x="6" y="2" width="44" height="48" rx="3"/>
    <line class="dom-sh-frame" x1="28" y1="2" x2="28" y2="50"/>
    <line class="dom-sh-frame" x1="6" y1="26" x2="50" y2="26"/>
    ${blindH > 0 ? `<rect class="dom-sh-blind" x="7" y="2.5" width="42" height="${blindH}" rx="1.5"/>` : ""}
    ${slats.join("")}
  </svg>`;
}
function domVoletBadge(x) {
  const pos = domPos(x);
  const st = x && domState[x.id];
  const isMoving = st && st.label && /mouvement|course|calibrat/i.test(st.label);
  if (isMoving) return `<span class="dom-volet-badge is-moving">En mouvement</span>`;
  if (pos == null) return `<span class="dom-volet-badge is-unknown">—</span>`;
  if (pos <= 2) return `<span class="dom-volet-badge is-closed">Fermé · ${pos} %</span>`;
  if (pos >= 98) return `<span class="dom-volet-badge is-open">Ouvert · ${pos} %</span>`;
  return `<span class="dom-volet-badge is-open">Ouvert · ${pos} %</span>`;
}
function domDeviceArticle(x) {
  const ready = !!(domConnected() && x.shelly_id);
  if (x.type === "volet") {
    return `<article class="dom-device"><div class="dom-volet-card">${domShutterSvg(x)}<div class="dom-volet-info"><strong>${esc(x.name)}</strong>${domVoletBadge(x)}</div></div>${domSlider(x)}${domCmdBtns(x, false)}</article>`;
  }
  return `<article class="dom-device"><div class="dom-device-head"><strong>${domIcon(x.type)} ${esc(x.name)}</strong></div>${domMeter(x)}${domSlider(x)}<p class="muted">${esc(domLinkLine(x))}</p>${domCmdBtns(x, false)}</article>`;
}
function domRoomSummary(room) {
  const bits = room.items.slice(0, 3).map(x => {
    const st = domState[x.id];
    const pos = domPos(x);
    if (pos != null) return x.name + " · " + pos + " %";
    if (st && st.label) return x.name + " · " + st.label;
    return x.name;
  });
  // Ajouter les intégrations rattachées à cette pièce
  const integs = domIntegrationsForRoom(room.id);
  for (const i of integs) {
    if (i.linked() && bits.length < 4) bits.push(i.t + " · " + i.summary());
  }
  if (!bits.length) return "Aucun équipement associé";
  if (bits.length > 3) bits.splice(3, bits.length - 3, "+" + (bits.length - 3));
  return bits.join(" · ");
}
function domDashStats() {
  const items = domRead();
  const volets = items.filter(x => x.type === "volet");
  const known = volets.filter(x => domPos(x) != null);
  const open = known.filter(domIsOpen);
  const gates = windowDomHomeGates();
  const gateRow = items.find(x => x.type === "portail");
  const gateSt = gateRow && domState[gateRow.id];
  let gateTxt = "Non disponible";
  if (gateSt && (gateSt.on === true || gateSt.on === false)) gateTxt = gateSt.on ? "Impulsion / relais actif" : "Relais au repos";
  else if (gateSt && gateSt.label && gateSt.label !== "Prêt") gateTxt = gateSt.label;
  else if (gates.pieton || gates.voiture) gateTxt = "Commande Shelly";
  const indoor = items.filter(x => x.zone !== "exterieur").map(x => {
    const st = domState[x.id];
    return st && typeof st.temp === "number" ? st.temp : null;
  }).find(t => t != null);
  const melRoom = domMelLinked() && domMelState && domMelState.room != null ? Number(domMelState.room) : null;
  const melSet = domMelLinked() && domMelState && domMelState.set != null ? Number(domMelState.set) : null;
  const melTemps = melRoom != null && melSet != null
    ? `${domMelFmtTemp(melRoom)} · consigne ${domMelFmtTemp(melSet)}`
    : (melRoom != null ? domMelFmtTemp(melRoom) : (melSet != null ? "Consigne " + domMelFmtTemp(melSet) : null));
  return {
    connected: domConnected(),
    mel: domMelLinked(),
    volets: known.length ? `${open.length} / ${known.length} volets ouverts` : (volets.length ? "Position non disponible" : "Aucun volet"),
    gate: gateTxt,
    indoor: indoor != null ? indoor.toFixed(1).replace(".", ",") + " °C" : (melRoom != null ? domMelFmtTemp(melRoom) : null),
    melTemps: melTemps || (domMelLinked() ? domMelTempsLine() : null)
  };
}
function domEqCardTop(ico, title) {
  return `<span class="dom-eq-top"><span class="dom-eq-ico" aria-hidden="true">${ico}</span><strong>${title}</strong></span>`;
}
function domMelEqCard() {
  if (!domMelLinked()) {
    return `<article class="dom-eq-card dom-eq-mel is-pending"><button type="button" class="dom-eq-open" data-dom-mel-open>${domEqCardTop("♨️", "Chauffage Mitsubishi")}<small>Non connecté</small></button></article>`;
  }
  const st = domMelState || {};
  const roomL = st.room != null ? domMelFmtTemp(st.room) : "—";
  const setL = st.set != null ? domMelFmtTemp(st.set) : "—";
  const hasDev = !!(domMelStatus.device_id || (S.hh && S.hh.melcloud_device_id));
  const status = domMelStateInflight
    ? `<small>Lecture des températures…</small>`
    : `<small>Ambiante ${esc(roomL)}</small><small class="dom-mel-card-set">Consigne ${esc(setL)}</small>`;
  const busyUp = domMelBusy === "temp_up";
  const busyDn = domMelBusy === "temp_down";
  const step = hasDev
    ? `<div class="dom-mel-card-stepper" role="group" aria-label="Régler la consigne"><button type="button" class="btn dom-mel-card-step" data-dom-mel-cmd="temp_down" aria-label="Baisser la consigne" ${busyDn ? "aria-busy=true" : ""}>−</button><button type="button" class="btn dom-mel-card-step" data-dom-mel-cmd="temp_up" aria-label="Augmenter la consigne" ${busyUp ? "aria-busy=true" : ""}>+</button></div>`
    : "";
  return `<article class="dom-eq-card dom-eq-mel"><button type="button" class="dom-eq-open" data-dom-mel-open>${domEqCardTop("♨️", "Chauffage Mitsubishi")}${status}</button>${step}</article>`;
}
function domMitsuSheet(fromRefresh) {
  if (!domMelLinked()) {
    openSheet("Chauffage Mitsubishi", `<div class="dom-pending"><p class="muted">MELCloud non relié</p><p>Reliez votre compte MELCloud pour afficher la température et régler la consigne depuis Maisonnée.</p><button type="button" class="btn primary" data-dom-mel-connect>Relier MELCloud</button><button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
    return;
  }
  const st = domMelState || {};
  const setT = st.set != null ? domMelFmtTemp(st.set) : "—";
  const roomT = st.room != null ? domMelFmtTemp(st.room) : "—";
  const title = st.device_name || domMelStatus.device_name || "Chauffage";
  const powerOn = st.power !== false;
  const busyUp = domMelBusy === "temp_up";
  const busyDn = domMelBusy === "temp_down";
  const busyPw = domMelBusy === "power_toggle";
  openSheet(title, `<article class="dom-device dom-mel-panel">
    <div class="dom-mel-temps dom-mel-temps-sheet">
      <div class="dom-mel-room"><span class="muted">Température ambiante</span><strong>${esc(roomT)}</strong></div>
      <div class="dom-mel-set">
        <span class="muted">Consigne</span>
        <p class="dom-mel-set-val" aria-live="polite">${esc(setT)}</p>
        <div class="dom-mel-stepper-btns" role="group" aria-label="Régler la consigne">
          <button type="button" class="btn dom-mel-step" data-dom-mel-cmd="temp_down" aria-label="Baisser la consigne" ${busyDn ? "aria-busy=true" : ""}><span aria-hidden="true">−</span></button>
          <button type="button" class="btn dom-mel-step" data-dom-mel-cmd="temp_up" aria-label="Augmenter la consigne" ${busyUp ? "aria-busy=true" : ""}><span aria-hidden="true">+</span></button>
        </div>
      </div>
    </div>
    <div class="dom-actions dom-mel-power">
      <button type="button" class="btn${powerOn ? " primary" : ""}" data-dom-mel-cmd="power_toggle" ${busyPw ? "aria-busy=true" : ""}>${powerOn ? "Marche" : "Arrêt"}</button>
    </div>
    ${domIntegRoomPicker("_mel")}
    <p class="muted small">Commande via MELCloud (serveur Maisonnée).</p>
    <button type="button" class="btn ghost" data-act="closeSheet">Fermer</button>
  </article>`);
  if (!fromRefresh) domMelRefreshState(true).then(changed => { if (changed) domMitsuSheet(true); }).catch(() => {});
}
function domMelConnectSheet() {
  openSheet("Relier MELCloud", `<form id="dom-mel-connect" class="dom-form">
    <p class="muted">Identifiants du compte MELCloud (application Mitsubishi). Ils sont enregistrés pour le foyer, uniquement sur le serveur.</p>
    <label>Adresse e-mail<input name="email" type="email" required maxlength="120" autocomplete="username"></label>
    <label>Mot de passe<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label>
    <button class="btn primary" type="submit">Tester et enregistrer</button>
  </form>`);
}
function domMelDevicePickerSheet() {
  openSheet("Appareil MELCloud", `<p class="muted">Chargement…</p>`);
  melcloudServer("devices").then(r => {
    domMelDevices = r.devices || [];
    if (!domMelDevices.length) {
      openSheet("Appareil MELCloud", `<p class="muted">Aucun appareil trouvé sur ce compte.</p><button type="button" class="btn" data-act="closeSheet">Fermer</button>`);
      return;
    }
    const cur = domMelStatus.device_id || (S.hh && S.hh.melcloud_device_id);
    openSheet("Appareil MELCloud", `<div class="dom-settings"><p class="muted">Choisissez l'unité intérieure à piloter depuis Maisonnée.</p><div class="dom-settings-list">${domMelDevices.map(d => `<button type="button" class="btn dom-settings-row" data-dom-mel-pick="${esc(String(d.id))}"><span>${esc(d.name)}${d.building ? ` <small class="muted">· ${esc(d.building)}</small>` : ""}</span><span>${cur === d.id ? "✓" : "Choisir ›"}</span></button>`).join("")}</div></div>`);
  }).catch(err => toast(err.message));
}
function domDreameEqCard() {
  if (!domDreameLinked()) {
    return `<article class="dom-eq-card dom-eq-dreame is-pending"><button type="button" class="dom-eq-open" data-dom-dreame-open>${domEqCardTop("🤖", "Dreame D20 Ultra")}<small>Non connecté</small></button></article>`;
  }
  const st = domDreameState || {};
  // Afficher le dernier état connu pendant les actualisations en arrière-plan.
  const line = st.label || "État en attente…";
  const hasDev = !!(domDreameStatus.device_id || (S.hh && S.hh.dreame_device_id));
  const busyStart = domDreameBusy === "start";
  const busyDock = domDreameBusy === "dock";
  const canCmd = domDreameCommandable();
  const actions = hasDev
    ? `<div class="dom-dreame-card-actions" role="group" aria-label="Commandes rapides"><button type="button" class="btn dom-dreame-card-btn" data-dom-dreame-cmd="start" ${busyStart ? "aria-busy=true" : ""}>▶</button><button type="button" class="btn dom-dreame-card-btn" data-dom-dreame-cmd="pause" ${domDreameBusy === "pause" ? "aria-busy=true" : ""}>⏸</button><button type="button" class="btn dom-dreame-card-btn" data-dom-dreame-cmd="stop" ${domDreameBusy === "stop" ? "aria-busy=true" : ""}>⏹</button><button type="button" class="btn dom-dreame-card-btn" data-dom-dreame-cmd="dock" ${busyDock ? "aria-busy=true" : ""}>🏠</button></div>`
    : "";
  return `<article class="dom-eq-card dom-eq-dreame"><button type="button" class="dom-eq-open" data-dom-dreame-open>${domEqCardTop("🤖", esc(st.device_name || domDreameStatus.device_name || "Dreame"))}<small>${esc(line)}</small></button>${actions}</article>`;
}
function domDreameSheet(fromRefresh) {
  if (!domDreameLinked()) {
    openSheet("Dreame D20 Ultra", `<div class="dom-pending"><p class="muted">Dreame Home non relié</p><p>Reliez votre compte Dreame Home pour voir l'état et envoyer des commandes depuis Maisonnée.</p><button type="button" class="btn primary" data-dom-dreame-connect>Relier Dreame Home</button><button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
    return;
  }
  if (fromRefresh && document.querySelector(".dom-dreame-panel")) {
    domDreameFillHosts();
    return;
  }
  const st = domDreameState || {};
  const title = st.device_name || domDreameStatus.device_name || "Dreame";
  openSheet(title, `<article class="dom-device dom-dreame-panel">
    <div class="dom-dreame-hero"><img src="assets/dreame-d20-ultra.png" alt="Dreame D20 Ultra et sa station" loading="lazy"><p class="dom-dreame-status" data-dom-dreame-status aria-live="polite">${domDreameStatusHtml()}</p></div>
    <div class="btns" data-dom-dreame-wash-action>${domDreameWashNowHtml()}</div>
    <div class="dom-dreame-tabs" role="tablist" aria-label="Rubriques Dreame">
      <button type="button" role="tab" data-dom-dreame-tab="cleaning" aria-selected="${domDreameActiveTab === "cleaning"}" class="btn${domDreameActiveTab === "cleaning" ? " primary" : ""}">Nettoyage</button>
      <button type="button" role="tab" data-dom-dreame-tab="programs" aria-selected="${domDreameActiveTab === "programs"}" class="btn${domDreameActiveTab === "programs" ? " primary" : ""}">Programmes</button>
    </div>
    <section data-dom-dreame-tab-panel="cleaning" role="tabpanel" ${domDreameActiveTab === "cleaning" ? "" : "hidden"}>
      <div data-dom-dreame-prefs>${domDreamePrefsHtml()}</div>
      ${domDreameAdvancedPreviewHtml()}
      <div data-dom-dreame-rooms-host>${domDreameRoomsBlock(domDreameRooms, domDreameRoomsHint || (domDreameRoomsInflight ? "Lecture de la carte…" : ""))}</div>
      <div data-dom-dreame-trans>${domDreameTransportBtns()}</div>
    </section>
    <section data-dom-dreame-tab-panel="programs" role="tabpanel" ${domDreameActiveTab === "programs" ? "" : "hidden"}>
      <div data-dom-dreame-progs-host>${domDreameProgramsBlock(domDreameCommandable())}</div>
      <div data-dom-dreame-trans>${domDreameTransportBtns()}</div>
      <details class="dom-dreame-placement"><summary>Emplacement du robot dans Maisonnée</summary>${domIntegRoomPicker("_dreame")}</details>
    </section>
    <p class="muted small">Commandes via Dreame Home (serveur Maisonnée).</p>
    <button type="button" class="btn ghost" data-act="closeSheet">Fermer</button>
  </article>`);
  if (!fromRefresh) {
    // Par zone reste la préférence fixe de Maisonnée. Pas d'écriture au seul
    // affichage : cela retardait la première commande explicite de l'utilisateur.
    // La commande Par zone est jointe aux changements de mode et contrôlée avant Lecture.
    domDreameRefreshState(true).then(() => domDreameFillHosts()).catch(() => {});
    // La carte peut exiger un appel robot supplémentaire. Lui donner une priorité
    // inférieure aux commandes de réglage, sans supprimer les pièces existantes.
    domDreameScheduleRoomsWhenIdle();
  }
}
// Lecture de la carte en priorité basse : évite de saturer le cloud au moment
// où l'utilisateur commence à sélectionner les paramètres.
let domDreameRoomsIdleTimer = null;
function domDreameScheduleRoomsWhenIdle(attempt = 0) {
  if (domDreameRoomsIdleTimer != null) clearTimeout(domDreameRoomsIdleTimer);
  domDreameRoomsIdleTimer = setTimeout(() => {
    domDreameRoomsIdleTimer = null;
    if (!document.querySelector(".dom-dreame-panel")) return;
    const hasPending = !!domDreamePrefInflight || !!domDreamePrefTimer ||
      Object.keys(domDreamePrefDraft).length > 0 || !!domDreameBusy;
    if (hasPending) {
      if (attempt < 20) domDreameScheduleRoomsWhenIdle(attempt + 1);
      return;
    }
    domDreameEnsureRooms(false).then(() => domDreameFillHosts()).catch(() => {});
  }, attempt ? 1500 : 2500);
}
function domDreameConnectSheet() {
  openSheet("Relier Dreame Home", `<form id="dom-dreame-connect" class="dom-form">
    <p class="muted">Compte Dreame Home (e-mail + mot de passe de l'application, pas Google/Apple seul). Enregistré pour le foyer, uniquement sur le serveur.</p>
    <label>Adresse e-mail<input name="email" type="email" required maxlength="120" autocomplete="username"></label>
    <label>Mot de passe<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label>
    <label>Région<select name="region"><option value="eu" selected>Europe (EU)</option><option value="de">Allemagne (DE)</option><option value="us">États-Unis</option><option value="cn">Chine</option></select></label>
    <label>Pays (ISO)<input name="country" maxlength="2" value="FR" placeholder="FR" autocapitalize="characters" pattern="[A-Za-z]{2}" title="Code pays à 2 lettres, ex. FR"></label>
    <button class="btn primary" type="submit">Tester et enregistrer</button>
  </form>`);
}
function domDreameDevicePickerSheet() {
  openSheet("Aspirateur Dreame", `<p class="muted">Chargement…</p>`);
  dreameServer("devices").then(r => {
    domDreameDevices = r.devices || [];
    if (!domDreameDevices.length) {
      openSheet("Aspirateur Dreame", `<p class="muted">Aucun appareil trouvé sur ce compte.</p><button type="button" class="btn" data-act="closeSheet">Fermer</button>`);
      return;
    }
    const cur = domDreameStatus.device_id || (S.hh && S.hh.dreame_device_id);
    const rows = domDreameDevices.map(d => {
      const extra = (d.model ? " · " + d.model : "") + (d.online ? "" : " · hors ligne");
      const mark = cur === d.id ? "✓" : "Choisir ›";
      return "<button type=\"button\" class=\"btn dom-settings-row\" data-dom-dreame-pick=\"" + esc(String(d.id)) + "\"><span>" + esc(d.name) + (extra ? " <small class=\"muted\">" + esc(extra) + "</small>" : "") + "</span><span>" + mark + "</span></button>";
    }).join("");
    openSheet("Aspirateur Dreame", "<div class=\"dom-settings\"><p class=\"muted\">Choisissez l'aspirateur à piloter depuis Maisonnée.</p><div class=\"dom-settings-list\">" + rows + "</div></div>");
  }).catch(err => toast(err.message));
}
function domStEqCard() {
  if (!domStLinked()) {
    return `<article class="dom-eq-card dom-eq-tv is-pending"><button type="button" class="dom-eq-open" data-dom-st-open>${domEqCardTop("📺", "Samsung TV")}<small>Non connecté</small></button></article>`;
  }
  const st = domStState || {};
  const hasDev = !!(domStStatus.device_id || (S.hh && S.hh.smartthings_device_id));
  const powerOn = st.power === true;
  const line = st.label || "Chargement…";
  const busyPw = domStBusy === "power_toggle";
  const actions = hasDev
    ? `<div class="dom-tv-card-actions" role="group" aria-label="Commandes rapides"><button type="button" class="btn dom-tv-card-btn${powerOn ? " is-on" : ""}" data-dom-st-cmd="power_toggle" ${busyPw ? "aria-busy=true" : ""}>${powerOn ? "⏻" : "⏻"}</button></div>`
    : "";
  return `<article class="dom-eq-card dom-eq-tv"><button type="button" class="dom-eq-open" data-dom-st-open>${domEqCardTop("📺", esc(st.device_name || domStStatus.device_name || "Samsung TV"))}<small>${esc(line)}</small></button>${actions}</article>`;
}
// Navigation de la télécommande Samsung — initialisation indispensable à l’ouverture.
let domTvTab = "remote";
function domTvPanelHtml() {
  const st = domStState || {};
  const on = st.power === true, off = st.power === false;
  const tabs = [
    ["remote","⌘","Télécommande"],["apps","▦","Applications"],
    ["sources","▣","Sources"],["settings","⚙","Réglages"]
  ];
  const btn = (action, label, cls = "") =>
    `<button type="button" class="mz-tv-key ${cls}" data-dom-st-cmd="${action}" ${domStBusy===action?'aria-busy="true"':''}>${label}</button>`;
  const preview = (label, cls = "") =>
    `<button type="button" class="mz-tv-key ${cls}" disabled title="Commande non encore disponible avec la connexion SmartThings actuelle">${label}</button>`;
  const info = (value, fallback) => value == null || value === "" ? fallback : esc(String(value));
  const rawName = String(st.channelName || "");
  const friendlyChannel = rawName && !/^(com\.|org\.|[a-z0-9]{7,}\.|[0-9]{9,}$)/i.test(rawName) ? rawName : "";
  const channel = friendlyChannel || st.channel || "";
  const appNames = ["Netflix","YouTube","Prime Video","Disney+","CANAL+","Apple TV","Plex","Spotify"];
  const appMarkup = appNames.map((app,i) =>
    `<button type="button" class="mz-tv-app" disabled title="Activation directe des applications à venir"><span class="mz-tv-app-mark mz-tv-app-${i}">${esc(app==="Netflix"?"N":app==="YouTube"?"▶":app==="Prime Video"?"prime":app==="Disney+"?"D+":app==="CANAL+"?"C+":app==="Apple TV"?"tv":app==="Spotify"?"♫":"P")}</span><span>${esc(app)}</span></button>`
  ).join("");
  const input = st.input || "";
  const sources = [["TV","digitalTv"],["HDMI 1","HDMI1"],["HDMI 2","HDMI2"],["HDMI 3","HDMI3"],["HDMI 4","HDMI4"]];
  const sourcesMarkup = sources.map(([label,value]) =>
    `<button type="button" class="mz-tv-key mz-tv-source${String(input).replace(/\s/g,"").toLowerCase()===value.toLowerCase()?" is-active":""}" data-dom-tv-source="${value}" ${domStBusy==="set_input"?'disabled':''}>${esc(label)}</button>`
  ).join("");
  let page = "";
  if (domTvTab === "remote") {
    page = `<div class="mz-tv-mini"><span><small>Source active</small><strong>${info(st.input,"Non communiquée")}</strong></span><span><small>Chaîne</small><strong>${info(channel,"Non communiquée")}</strong></span></div>
    <div class="mz-tv-info mz-tv-now"><strong>En cours sur la TV</strong><span>${info(st.programTitle,"Programme non communiqué")}</span><small>Chaîne : ${info(channel,"non communiquée")} · Titre détaillé possible après connexion d'un guide TV.</small></div>
    <div class="mz-tv-topkeys">${preview("⌂ Accueil")}${btn("power_toggle","⏻","mz-tv-power-key")}${preview("↶ Retour")}</div>
    <div class="mz-tv-remote">
      <div class="mz-tv-side"><strong>Volume</strong>${btn("volume_up","+","mz-tv-lg")}${btn("volume_down","−","mz-tv-lg")}${btn("mute_toggle","🔇")}</div>
      <div class="mz-tv-dpad">${preview("▲","mz-tv-up")}${preview("◀","mz-tv-left")}${preview("OK","mz-tv-ok")}${preview("▶","mz-tv-right")}${preview("▼","mz-tv-down")}</div>
      <div class="mz-tv-side"><strong>Chaîne</strong>${btn("channel_up","+","mz-tv-lg")}${btn("channel_down","−","mz-tv-lg")}${preview("Guide")}</div>
    </div>
    <div class="mz-tv-bottomkeys">${preview("⏮")}${preview("▶❚❚")}${preview("⏭")}</div>
    <p class="mz-tv-note">Les commandes lumineuses Volume, Chaîne et Marche/arrêt utilisent SmartThings. Le pavé, la lecture et Accueil seront activés après validation de leur connexion.</p>
    <div class="mz-tv-section-head"><strong>Applications favorites</strong><button type="button" data-dom-tv-tab="apps">Tout voir ›</button></div>
    <div class="mz-tv-apps mz-tv-favorites">${appNames.slice(0,5).map((app,i)=>`<button type="button" class="mz-tv-app" disabled title="Raccourci à activer"><span class="mz-tv-app-mark mz-tv-app-${i}">${esc(app==="Netflix"?"N":app==="YouTube"?"▶":app==="Prime Video"?"prime":app==="Disney+"?"D+":"C+")}</span><span>${esc(app)}</span></button>`).join("")}</div>`;
  } else if (domTvTab === "apps") {
    page = `<div class="mz-tv-section-head"><strong>Applications</strong><span>Prévisualisation</span></div>
      <p class="mz-tv-note">Les raccourcis sont présentés pour valider la disposition. Ils seront activés après ajout d'un contrôle compatible avec la TV, sans modifier les autres équipements.</p>
      <div class="mz-tv-apps">${appMarkup}</div>
      <div class="mz-tv-section-head"><strong>Application active</strong></div>
      <div class="mz-tv-info">${info(st.activeApp || st.appName,"Non communiquée par SmartThings")}</div>`;
  } else if (domTvTab === "sources") {
    page = `<div class="mz-tv-section-head"><strong>Choisir une source</strong></div>
      <p class="mz-tv-note">Les sources disponibles dépendent des capacités déclarées par ton téléviseur. Si une commande n'est pas acceptée, l'application affichera l'erreur Samsung.</p>
      <div class="mz-tv-sources">${sourcesMarkup}</div>
      <div class="mz-tv-info">Source actuelle : <strong>${info(st.input,"Non communiquée")}</strong></div>`;
  } else {
    page = `<div class="mz-tv-section-head"><strong>État du téléviseur</strong></div>
      <div class="mz-tv-mini"><span><small>Alimentation</small><strong>${on?"Allumée":off?"Éteinte":"Indisponible"}</strong></span><span><small>Volume</small><strong>${info(st.volume,"—")}</strong></span></div>
      <div class="mz-tv-section-head"><strong>Programme en cours</strong></div>
      <div class="mz-tv-info"><strong>${info(st.programTitle,"Titre non disponible")}</strong><small>Chaîne : ${info(channel,"non communiquée")}</small><small>SmartThings ne fournit pas systématiquement le nom de l'émission. Un guide TV externe sera nécessaire pour le programme précis.</small></div>
      <div class="mz-tv-section-head"><strong>Emplacement</strong></div>${domIntegRoomPicker("_st")}
      <p class="mz-tv-note">Menus Image, Son et Mode jeu : raccourcis à connecter après validation technique.</p>`;
  }
  return `<div class="mz-tv-hero"><div class="mz-tv-screen">▣</div><div class="mz-tv-hero-text"><strong>${info(st.device_name || domStStatus.device_name,"65\" OLED")}</strong><span><i class="mz-tv-dot${on?" is-on":""}"></i>${on?"TV allumée":off?"TV éteinte":"État en cours de lecture"} · Salon</span></div>${btn("power_toggle","⏻","mz-tv-hero-power")}</div>
    <nav class="mz-tv-tabs" aria-label="Fonctions téléviseur">${tabs.map(([id,ico,label])=>`<button type="button" data-dom-tv-tab="${id}" class="${domTvTab===id?"is-active":""}" aria-current="${domTvTab===id?"page":"false"}"><b aria-hidden="true">${ico}</b><span>${label}</span></button>`).join("")}</nav>
    <p class="dom-tv-status mz-tv-status" data-dom-tv-status aria-live="polite">${domTvStatusHtml()}</p>
    ${st.label === "État indisponible" ? '<div class="mz-tv-info"><span>SmartThings ne répond pas pour le moment. La TV peut néanmoins être commandée si Samsung accepte les ordres.</span><button type="button" class="btn ghost" data-dom-st-retry>↻ Réessayer de lire l’état</button></div>' : ""}
    <div class="dom-tv-controls mz-tv-content" data-dom-tv-controls>${page}</div>
    <button type="button" class="btn ghost mz-tv-close" data-act="closeSheet">Fermer</button>`;
}

function domTvSheet(fromRefresh) {
  if (!domStLinked()) {
    openSheet("Samsung TV", `<div class="dom-pending"><p class="muted">SmartThings non relié</p><p>Reliez votre compte SmartThings pour piloter votre TV Samsung depuis Maisonnée.</p><button type="button" class="btn primary" data-dom-st-connect>Relier SmartThings</button><button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
    return;
  }
  if (fromRefresh && document.querySelector(".dom-tv-panel")) { domTvFillPanel(); return; }
  const st = domStState || {};
  openSheet(st.device_name || domStStatus.device_name || "Samsung TV",
    `<article class="dom-device dom-tv-panel mz-tv">${domTvPanelHtml()}</article>`);
  if (!fromRefresh) domStRefreshState(true).then(changed => { if (changed) domTvSheet(true); }).catch(() => {});
}

function domTvStatusHtml() {
  const st = domStState || {};
  if (st.power === false) return `<span class="dom-tv-power">Éteinte</span>`;
  if (st.power !== true) return `<span class="dom-tv-power">Chargement…</span>`;
  return `<span class="dom-tv-power is-on">Allumée</span>${st.volume!=null?`<span>Volume ${esc(String(st.volume))}${st.mute?" · Muet":""}</span>`:""}${st.input?`<span>${esc(st.input)}</span>`:""}`;
}

function domTvControlsHtml() { return domTvPanelHtml(); }

function domTvFillPanel() {
  const panel = document.querySelector(".dom-tv-panel.mz-tv");
  if (panel) panel.innerHTML = domTvPanelHtml();
}

function installMzTvTestHandlers() {
  document.addEventListener("click", function(e) {
    const t = e.target.closest("[data-dom-tv-tab]");
    if (t && document.querySelector(".dom-tv-panel.mz-tv")) {
      e.preventDefault();
      domTvTab = t.dataset.domTvTab;
      domTvFillPanel();
      return;
    }
    const s = e.target.closest("[data-dom-tv-source]");
    if (!s || !document.querySelector(".dom-tv-panel.mz-tv") || s.disabled) return;
    e.preventDefault();
    const value = s.dataset.domTvSource;
    domRunStCommand(() => smartthingsServer("command",{action:"set_input",value}))
      .then(r => { if (!r) return; domStState=r; domStStateAt=Date.now(); domTvFillPanel(); toast("Source demandée : "+value); })
      .catch(err=>toast(err.message));
  });
}
installMzTvTestHandlers();
function domStConnectSheet() {
  openSheet("Relier SmartThings", `<form id="dom-st-connect" class="dom-form">
    <p class="muted">Token personnel SmartThings (PAT). Créez-en un sur <a href="https://account.smartthings.com/tokens" target="_blank" rel="noopener">account.smartthings.com/tokens</a> avec les droits sur vos appareils. Il est enregistré pour le foyer, uniquement sur le serveur.</p>
    <label>Token (PAT)<input name="pat" type="password" required minlength="20" maxlength="400" autocomplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label>
    <button class="btn primary" type="submit">Tester et enregistrer</button>
  </form>`);
}
function domStDevicePickerSheet() {
  openSheet("TV Samsung", `<p class="muted">Chargement…</p>`);
  smartthingsServer("devices").then(r => {
    domStDevices = r.devices || [];
    if (!domStDevices.length) {
      openSheet("TV Samsung", `<p class="muted">Aucun appareil trouvé sur ce compte.</p><button type="button" class="btn" data-act="closeSheet">Fermer</button>`);
      return;
    }
    const cur = domStStatus.device_id || (S.hh && S.hh.smartthings_device_id);
    const rows = domStDevices.map(d => {
      const mark = cur === d.id ? "✓" : "Choisir ›";
      return `<button type="button" class="btn dom-settings-row" data-dom-st-pick="${esc(d.id)}"><span>${esc(d.label || d.name)}${d.type ? ` <small class="muted">· ${esc(d.type)}</small>` : ""}</span><span>${mark}</span></button>`;
    }).join("");
    openSheet("TV Samsung", `<div class="dom-settings"><p class="muted">Choisissez l'appareil à piloter depuis Maisonnée.</p><div class="dom-settings-list">${rows}</div></div>`);
  }).catch(err => toast(err.message));
}
function domPlaceholderCard(kind, title, ico, sub) {
  return `<article class="dom-eq-card is-pending"><button type="button" class="dom-eq-open" data-dom-placeholder="${kind}">${domEqCardTop(ico, esc(title))}<small>${esc(sub)}</small></button></article>`;
}
function domBoard() {
  const rooms = domRoomList();
  const st = domDashStats();
  const eq = rooms.map(r => `<article class="dom-eq-card"><button type="button" class="dom-eq-open" data-dom-room="${esc(r.id)}">${domEqCardTop(esc(r.ico), esc(r.t))}<small>${esc(domRoomSummary(r))}</small></button></article>`);
  const pending = mode === "demo" ? "Mode démo — ouvrez le vrai foyer" : "Non connecté";
  eq.push(domMelLinked() ? domMelEqCard() : domPlaceholderCard("mitsu", "Chauffage Mitsubishi", "♨️", pending));
  eq.push(domDreameLinked() ? domDreameEqCard() : domPlaceholderCard("dreame", "Dreame D20 Ultra", "🤖", pending));
  eq.push(domStLinked() ? domStEqCard() : domPlaceholderCard("tv", "Samsung TV", "📺", pending));
  return `<article class="dom-hero">
    <button type="button" class="dom-hero-media" data-dom-tab="house" aria-label="Ouvrir la vue maison">
      <span class="dom-hero-photo" aria-hidden="true"></span>
      <span class="dom-hero-shade"></span>
      <span class="dom-hero-copy"><strong>Ma maison</strong><span class="dom-hero-status ${st.connected ? "is-on" : ""}">${st.connected ? "Maison connectée" : "Shelly non relié"}</span></span>
    </button>
    <div class="dom-hero-stats">
      <span><i aria-hidden="true">▤</i>${esc(st.volets)}</span>
      <span><i aria-hidden="true">🚪</i>${esc(st.gate)}</span>
      <span><i aria-hidden="true">🌡</i>${st.indoor ? esc(st.indoor) + " intérieur" : "Intérieur non disponible"}</span>
      <span><i aria-hidden="true">♨️</i>${st.mel && st.melTemps ? esc(st.melTemps) : (st.mel ? esc(domMelSummary()) : "Chauffage non relié")}</span>
    </div>
  </article>
  <div class="dom-scenes" role="group" aria-label="Scénarios">
    <button type="button" data-dom-scenario="nuit">🌙 Bonne nuit<span>À configurer</span></button>
    <button type="button" data-dom-scenario="depart">🚗 Départ<span>À configurer</span></button>
    <button type="button" data-dom-scenario="retour">🏠 Retour<span>À configurer</span></button>
  </div>
  <div class="dom-eq-head"><h3>Mes équipements</h3><button type="button" class="btn ghost small" data-dom-tab="house">Voir par pièces ›</button></div>
  <div class="dom-eq-grid">${eq.join("")}</div>`;
}
function domHouseView() {
  const rooms = domRoomList();
  const roomRows = rooms.map(r => {
    const integs = domIntegrationsForRoom(r.id);
    const integCount = integs.filter(i => i.linked()).length;
    const total = r.items.length + integCount;
    const sub = total ? total + " équipement(s)" + (r.sub ? " · " + r.sub : "") : "Aucun équipement associé";
    return `<button type="button" class="dom-house-row" data-dom-room="${esc(r.id)}"><span class="dom-eq-ico">${esc(r.ico)}</span><span><strong>${esc(r.t)}</strong><small>${esc(sub)}</small></span><span aria-hidden="true">›</span></button>`;
  }).join("");
  // Intégrations sans pièce assignée (globales)
  const unassigned = DOM_INTEGRATIONS.filter(i => domIntegrationRoom(i) === null);
  const extraRows = unassigned.map(i => {
    const linked = i.linked();
    const line = i.summary();
    return `<button type="button" class="dom-house-row${linked ? "" : " is-pending"}" ${i.open}><span class="dom-eq-ico">${i.ico}</span><span><strong>${esc(i.t)}</strong><small>${esc(line)}</small></span><span aria-hidden="true">›</span></button>`;
  }).join("");
  return `<article class="dom-house-art">
    <span class="dom-hero-photo" role="img" aria-label="Illustration d'une maison"></span>
  </article>
  <div class="dom-house-list">${roomRows}${extraRows}
  <button type="button" class="btn ghost" data-dom-rooms-manage>Gérer les pièces</button></div>`;
}
function domRoomSheet(id) {
  const room = domRooms()[id] || domRoomList().find(r => r.id === id);
  if (!room) return;
  const zoneHint = id === "exterieur" ? "exterieur" : id === "chambres" ? "etage" : id === "salon" || id === "cuisine" ? "rdc" : "";
  const batch = zoneHint && (id === "salon" || id === "chambres") ? domZoneBatchCard(zoneHint) : "";
  const integs = domIntegrationsForRoom(id);
  const integCards = integs.map(i => i.linked() ? i.card() : "").join("");
  const shellyCards = room.items.map(domDeviceArticle).join("");
  const empty = !shellyCards && !integCards;
  openSheet(room.t, `${batch}${integCards}${shellyCards}${empty ? '<p class="muted">Aucun équipement dans cette pièce.</p>' : ""}`);
}
function domDeviceSheet(id) {
  const x = domRead().find(d => d.id === id);
  if (!x) return;
  openSheet(x.name, `${domDeviceArticle(x)}`);
}
function domPlaceholderSheet(kind) {
  const copy = {
    mitsu: ["Chauffage Mitsubishi", "<p>MELCloud n'est pas connecté à Maisonnée.</p><button type=\"button\" class=\"btn primary\" data-dom-mel-connect>Relier MELCloud</button>"],
    dreame: ["Dreame D20 Ultra", "<p>Dreame Home n'est pas connecté à Maisonnée.</p><button type=\"button\" class=\"btn primary\" data-dom-dreame-connect>Relier Dreame Home</button>"],
    tv: ["Samsung TV", "<p>SmartThings n'est pas connecté à Maisonnée.</p><button type=\"button\" class=\"btn primary\" data-dom-st-connect>Relier SmartThings</button>"]
  }[kind] || ["Équipement", "<p>Intégration à réaliser.</p>"];
  openSheet(copy[0], `<div class="dom-pending"><p class="muted">Non connecté</p>${copy[1]}<button type="button" class="btn" data-act="closeSheet">Fermer</button></div>`);
}
function domScenarioSheet(id) {
  const t = { nuit: "Bonne nuit", depart: "Départ", retour: "Retour à la maison" }[id] || "Scénario";
  openSheet(t, `<div class="dom-pending"><p><strong>À configurer</strong></p><p class="muted">Ce scénario n'envoie aucune commande pour le moment. Vous pourrez l'associer plus tard à des équipements réellement connectés.</p><button type="button" class="btn" data-act="closeSheet">Fermer</button></div>`);
}
function domPage() {
  const tab = domTab === "house" ? "house" : "board";
  if (domZone) {
    const devices = domRead().filter(x => x.zone === domZone);
    const batch = domZoneBatchCard(domZone);
    return `<section class="dom-page"><button class="btn" data-dom-back>← Domotique</button><div class="dom-page-heading"><h2>${DOM_ZONES[domZone]}</h2><button class="btn dom-settings-button" data-dom-settings="${domZone}" aria-label="Réglages ${DOM_ZONES[domZone]}" title="Réglages ${DOM_ZONES[domZone]}">⚙️</button></div><div class="dom-devices">${batch}${devices.map(domDeviceArticle).join("") || '<p class="muted">Aucun équipement dans cette zone.</p>'}</div></section>`;
  }
  return `<section class="dom-page">
    <div class="dom-page-heading"><h2>Domotique</h2><button class="btn dom-settings-button" data-dom-settings="" aria-label="Réglages Domotique" title="Réglages Domotique">⚙️</button></div>
    <div class="seg dom-seg" role="group" aria-label="Présentation">
      <button type="button" data-dom-tab="board" aria-pressed="${tab === "board"}">Tableau de bord</button>
      <button type="button" data-dom-tab="house" aria-pressed="${tab === "house"}">Vue maison</button>
    </div>
    ${tab === "house" ? domHouseView() : domBoard()}
  </section>`;
}
VIEWS.domotique = function () {
  Promise.resolve(domEnsureDefaults()).catch(() => {});
  setTimeout(() => {
    if (view !== "domotique") return;
    domPollOnView();
    domMelPollOnView();
    domDreamePollOnView();
    domStPollOnView();
  }, 0);
  return domPage();
};
function domCloudOptions(selected) {
  if (!domCloud.length) return `<option value="">Coller l'identifiant (app Shelly → Infos appareil)</option>`;
  return `<option value="">Choisir…</option>` + domCloud.map(d => `<option value="${esc(d.id)}" ${selected === d.id ? "selected" : ""}>${esc(d.name)} (${esc(d.id)})</option>`).join("");
}
function domForm(zone, id) {
  if (domConnected() && !domCloud.length && !domFormLoading) {
    domFormLoading = true;
    openSheet(id ? "Modifier un équipement" : "Ajouter un appareil", `<p class="muted">Chargement de la liste Shelly…</p>`);
    shellyServer("devices").then(r => { domCloud = r.devices || []; }).catch(() => {}).finally(() => { domFormLoading = false; domForm(zone, id); });
    return;
  }
  const item = domRead().find(x => x.id === id) || { name: "", zone: zone || "exterieur", type: "volet", id: "", shelly_id: "", channel: 0, channel_b: "", pulse_sec: 1 };
  domEdit = item.id;
  const { rooms, assign } = domHomeRead();
  const curRoom = item.id ? (assign[item.id] || domRoomGuess(item)) : domRoomGuess(item);
  const roomOpts = rooms.map(r => `<option value="${esc(r.id)}" ${curRoom === r.id ? "selected" : ""}>${esc(r.t)}</option>`).join("");
  openSheet(id ? "Modifier un équipement" : "Ajouter un appareil", `<form id="dom-form" class="dom-form">
    <label>Nom<input name="name" required maxlength="70" value="${esc(item.name)}" placeholder="Ex. Volet chambre"></label>
    <label>Pièce<select name="room_id" required>${roomOpts}</select></label>
    <label>Zone Shelly<select name="zone">${Object.entries(DOM_ZONES).map(([k, v]) => `<option value="${k}" ${item.zone === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Type<select name="type">${[["volet", "Volet"], ["lumiere", "Éclairage"], ["portail", "Portail / atelier"], ["prise", "Prise / relais"]].map(([k, v]) => `<option value="${k}" ${item.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Appareil Shelly<select name="shelly_id">${domCloudOptions(item.shelly_id || "")}</select></label>
    ${domCloud.length ? "" : `<label>Identifiant Shelly<input name="shelly_id_text" value="${esc(item.shelly_id || "")}" placeholder="ex. e8db84aabbcc"></label>`}
    <label>Canal<select name="channel">${[0, 1, 2, 3].map(n => `<option value="${n}" ${Number(item.channel) === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label>Canal 2 (Voiture, optionnel)<input name="channel_b" type="number" min="0" max="7" value="${item.channel_b != null ? esc(item.channel_b) : ""}" placeholder="vide si un seul canal"></label>
    <label>Impulsion portail (secondes)<input name="pulse_sec" type="number" min="0.5" max="30" step="0.5" value="${esc(item.pulse_sec || 1)}"></label>
    <p class="muted">La commande passe par le serveur du foyer. Personne dans l'appli ne voit la clé Shelly.</p>
    <button class="btn primary" type="submit">Enregistrer</button>${id ? '<button class="btn" type="button" data-dom-delete>Supprimer cet équipement</button>' : ""}
  </form>`);
}
function domConnectSheet() {
  openSheet("Relier Shelly Cloud", `<form id="dom-connect" class="dom-form">
    <p class="muted">App Shelly → Utilisateur → Clé d'autorisation cloud. Collez les deux valeurs. Elles sont enregistrées pour le foyer, pas dans ce téléphone.</p>
    <label>Adresse du serveur<input name="server_uri" required maxlength="120" placeholder="https://shelly-xx-eu.shelly.cloud" value="${esc((S.hh && S.hh.shelly_host) || "")}"></label>
    <label>Clé d'autorisation<input name="auth_key" required maxlength="400" autocomplete="off"></label>
    <button class="btn primary" type="submit">Tester et enregistrer</button>
  </form>`);
}
document.addEventListener("click", e => {
  const tab = e.target.closest("[data-dom-tab]");
  if (tab) { domTab = tab.dataset.domTab === "house" ? "house" : "board"; domZone = ""; render(); return; }
  const room = e.target.closest("[data-dom-room]");
  if (room) { domRoomSheet(room.dataset.domRoom); return; }
  const dev = e.target.closest("[data-dom-device]");
  if (dev) { domDeviceSheet(dev.dataset.domDevice); return; }
  const sc = e.target.closest("[data-dom-scenario]");
  if (sc) { domScenarioSheet(sc.dataset.domScenario); return; }
  const ph = e.target.closest("[data-dom-placeholder]");
  if (ph) { domPlaceholderSheet(ph.dataset.domPlaceholder); return; }
  if (e.target.closest("[data-dom-mel-open]")) { domMitsuSheet(); return; }
  if (e.target.closest("[data-dom-mel-connect]")) { domMelConnectSheet(); return; }
  if (e.target.closest("[data-dom-mel-devices]")) { domMelDevicePickerSheet(); return; }
  if (e.target.closest("[data-dom-mel-disconnect]")) {
    if (!confirm("Délier MELCloud de ce foyer ? Les commandes chauffage seront coupées.")) return;
    melcloudServer("disconnect", {}).then(r => {
      domMelStatus = { connected: false, device_id: null, device_name: null };
      domMelState = null;
      domMelStateAt = 0;
      if (S.hh) S.hh.melcloud_device_id = null;
      closeSheet(); render(); toast("MELCloud délié.");
    }).catch(err => toast(err.message));
    return;
  }
  const melPick = e.target.closest("[data-dom-mel-pick]");
  if (melPick) {
    const device_id = Number(melPick.dataset.domMelPick);
    melcloudServer("pick_device", { device_id }).then(r => {
      domMelStatus.device_id = r.device_id;
      domMelStatus.device_name = r.device_name;
      if (S.hh) S.hh.melcloud_device_id = r.device_id;
      toast("Appareil MELCloud sélectionné.");
      domMelRefreshState(true).then(() => { closeSheet(); render(); domMelDevicePickerSheet(); }).catch(() => { closeSheet(); render(); });
    }).catch(err => toast(err.message));
    return;
  }
  const melCmd = e.target.closest("[data-dom-mel-cmd]");
  if (melCmd) {
    const action = melCmd.dataset.domMelCmd;
    if (!action || melCmd.disabled) return;
    domMelBusy = action;
    render();
    domRunMelCommand(() => melcloudServer("command", { action })).then(r => {
      if (!r) return;
      domMelState = r;
      domMelStateAt = Date.now();
      toast("Consigne MELCloud mise à jour", null, null, null, "domotique");
      const sheet = document.getElementById("sheet");
      if (sheet && sheet.open && document.querySelector(".dom-mel-panel")) domMitsuSheet();
    }).catch(err => { if (err) toast(err.message); }).finally(() => { domMelBusy = ""; render(); });
    return;
  }
  const dreAutoToggle = e.target.closest("[data-dom-dreame-auto-toggle]");
  if (dreAutoToggle) {
    e.preventDefault();
    const minutes = Number(domDreameAutoWash.interval_minutes) || 5;
    domDreameSaveAutoWash(dreAutoToggle.dataset.domDreameAutoToggle === "on", minutes);
    return;
  }
  const dreWashProbe = e.target.closest("[data-dom-dreame-wash-probe]");
  if (dreWashProbe) {
    e.preventDefault();
    if (!domDreameCommandable() || dreWashProbe.disabled) return;
    dreWashProbe.disabled = true;
    dreameServer("wash_diagnostics").then(r => {
      // La surface de la tâche n'est pas la surface lavée depuis le dernier rinçage.
      if (!r || r.readable !== true) {
        domDreameWashDiagnostic = "Données de surface indisponibles. Automatisation à 5 m² non activable de façon sûre.";
      } else {
        const area = Number.isFinite(Number(r.cleaned_area)) && r.cleaned_area != null
          ? `Surface de la tâche : ${r.cleaned_area} m².` : "Surface de la tâche non reçue.";
        const wash = r.wash_base_status != null ? ` État de la station : ${r.wash_base_status}.` : "";
        const remaining = r.mop_cleaning_remainder != null ? ` Compteur serpillières : ${r.mop_cleaning_remainder}.` : "";
        domDreameWashDiagnostic = area + wash + remaining + " Il reste à vérifier le compteur depuis le dernier rinçage.";
      }
      domDreameFillHosts();
    }).catch(err => {
      domDreameWashDiagnostic = "Lecture impossible : " + err.message;
      domDreameFillHosts();
    }).finally(() => { dreWashProbe.disabled = false; });
    return;
  }
  const dreCmdEarly = e.target.closest("[data-dom-dreame-cmd]");
  if (dreCmdEarly) {
    const action = dreCmdEarly.dataset.domDreameCmd;
    if (!action) return;
    // Éviter les doubles départs et les doubles rinçages.
    if ((action === "start" || action === "play") &&
        (domDreameBusy === "start" || domDreameBusy === "play")) return;
    if (action === "wash_now") {
      if (domDreameBusy) {
        toast("Une commande Dreame est encore en cours.");
        return;
      }
      // Ne pas bloquer sur status=7 : le cloud peut annoncer « Nettoyage »
      // durant le lavage. Dreame reste maître de l'acceptation de la commande.
    }
    e.preventDefault();
    e.stopPropagation();
    // Lecture dans Programmes doit lancer le programme choisi, jamais les
    // anciennes pièces de l'onglet Nettoyage.
    if ((action === "start" || action === "play") &&
        dreCmdEarly.closest('[data-dom-dreame-tab-panel="programs"]')) {
      domDreameLaunchProgram(domDreameSelectedProgramId);
      return;
    }
    const labels = { start: "Lecture", play: "Lecture", pause: "Pause", stop: "Stop", dock: "Retour base", wash_now: "Rinçage des serpillières" };
    const body = (action === "start" || action === "play") ? domDreameStartPayload() : { action };
    const nRooms = (body.segment_ids || []).length;
    // Sécurité : une sélection vide ne doit jamais lancer toute la maison.
    // Cela vaut aussi pour le raccourci Lecture sur la carte Domotique.
    if ((action === "start" || action === "play") && nRooms === 0) {
      toast("Choisissez au moins une pièce à nettoyer (ou Toutes) avant Lecture.");
      if (!document.querySelector(".dom-dreame-panel")) domDreameSheet();
      return;
    }
    domDreameBusy = action;
    domDreameTask = action === "play" ? "start" : action;
    domDreameFillHosts();
    const sendStart = async () => {
      if (action === "start" || action === "play") {
        // Priorité aux paramètres choisis. Le lot de mode contient déjà Par zone.
        await domDreameFlushSettings();
        // Si l'utilisateur lance directement Lecture sans toucher aux modes,
        // assurer son choix Par zone une fois, à ce moment seulement.
        const deviceKey = String(domDreamePendingId() || "default");
        if (domDreameZoneInitDevice !== deviceKey) {
          domDreameQueueSetting("wash_method", "area");
          await domDreameFlushSettings();
        }
      }
      return dreameServer("command", body);
    };
    sendStart().then(r => {
      if (r) {
        domDreameMergeState(r);
        domDreameStateAt = 0;
      }
      const extra = (action === "start" || action === "play")
        ? (" · " + (domDreamePickedNames().join(", ") || (nRooms + " pièce(s)")))
        : "";
      if ((action === "start" || action === "play") && r?.settings_restore_error) {
        toast("Nettoyage lancé, mais puissance/itinéraire non confirmés : vérifiez Dreame Home.", null, null, null, "domotique");
      } else if ((action === "start" || action === "play") && r?.settings_reapply_sent) {
        toast("Nettoyage transmis · puissance et itinéraire renvoyés (état réel non confirmé)", null, null, null, "domotique");
      } else {
        toast((labels[action] || "Commande") + extra + " transmise au cloud Dreame (exécution non confirmée)", null, null, null, "domotique");
      }
      domDreameFillHosts();
      setTimeout(() => { domDreameRefreshState(true).then(() => domDreameFillHosts()).catch(() => {}); }, 2500);
    }).catch(err => { if (err) toast(err.message); }).finally(() => {
      domDreameBusy = "";
      domDreameFillHosts();
    });
    return;
  }
  const dreTab = e.target.closest("[data-dom-dreame-tab]");
  if (dreTab) {
    const tab = dreTab.dataset.domDreameTab;
    if (tab !== "cleaning" && tab !== "programs") return;
    domDreameActiveTab = tab;
    const panel = dreTab.closest(".dom-dreame-panel");
    if (!panel) return;
    panel.querySelectorAll("[data-dom-dreame-tab]").forEach(btn => {
      const active = btn.dataset.domDreameTab === tab;
      btn.classList.toggle("primary", active);
      btn.setAttribute("aria-selected", String(active));
    });
    panel.querySelectorAll("[data-dom-dreame-tab-panel]").forEach(section => {
      section.hidden = section.dataset.domDreameTabPanel !== tab;
    });
    return;
  }
  if (e.target.closest("[data-dom-dreame-pick-all]")) {
    domDreamePickRooms = domDreameNamedRooms().map(r => Number(r.id));
    domDreameFillHosts();
    return;
  }
  if (e.target.closest("[data-dom-dreame-pick-none]")) {
    domDreamePickRooms = [];
    domDreameFillHosts();
    return;
  }
  const drePickRoom = e.target.closest("[data-dom-dreame-pick-room]");
  if (drePickRoom) {
    const id = Number(drePickRoom.dataset.domDreamePickRoom);
    if (!Number.isFinite(id) || id <= 0) return;
    const set = new Set((domDreamePickRooms || []).map(Number));
    if (set.has(id)) set.delete(id);
    else set.add(id);
    domDreamePickRooms = [...set];
    const on = set.has(id);
    drePickRoom.classList.toggle("primary", on);
    drePickRoom.setAttribute("aria-pressed", on ? "true" : "false");
    const sum = document.querySelector("[data-dom-dreame-pick-sum]");
    if (sum) sum.textContent = domDreamePickSummary();
    return;
  }
  if (e.target.closest("[data-dom-dreame-open]")) { domDreameSheet(); return; }
  if (e.target.closest("[data-dom-dreame-connect]")) { domDreameConnectSheet(); return; }
  if (e.target.closest("[data-dom-dreame-devices]")) { domDreameDevicePickerSheet(); return; }
  if (e.target.closest("[data-dom-dreame-rooms]")) {
    domDreameEnsureRooms(false).then(() => domDreameRenameRoomsSheet()).catch(() => domDreameRenameRoomsSheet());
    return;
  }
  if (e.target.closest("[data-dom-dreame-progs]")) {
    const openList = () => openSheet("Programmes de nettoyage", `<div class="dom-settings">${domDreameProgramsBlock(domDreameCommandable())}<button type="button" class="btn ghost" data-act="closeSheet">Fermer</button></div>`);
    if (!domDreameRooms.length) domDreameEnsureRooms(false).then(openList).catch(openList);
    else openList();
    return;
  }
  if (e.target.closest("[data-dom-dreame-prog-manage]")) {
    domDreameProgramManageSheet();
    return;
  }
  if (e.target.closest("[data-dom-dreame-prog-back]")) {
    domDreameProgDraft = null;
    domDreameReturnToPrograms();
    return;
  }
  const dreProgSelect = e.target.closest("[data-dom-dreame-prog-select]");
  if (dreProgSelect) {
    domDreameSelectedProgramId = dreProgSelect.dataset.domDreameProgSelect;
    domDreameFillHosts();
    return;
  }
  if (e.target.closest("[data-dom-dreame-prog-add]")) {
    domDreameProgDraft = null;
    const openAdd = () => domDreameProgramSheet("");
    if (!domDreameRooms.length) domDreameEnsureRooms(false).then(openAdd).catch(openAdd);
    else openAdd();
    return;
  }
  const dreProgEdit = e.target.closest("[data-dom-dreame-prog-edit]");
  if (dreProgEdit) {
    domDreameProgramSheet(dreProgEdit.dataset.domDreameProgEdit);
    return;
  }
  const dreProgDel = e.target.closest("[data-dom-dreame-prog-del]");
  if (dreProgDel) {
    const id = dreProgDel.dataset.domDreameProgDel;
    if (!confirm("Supprimer ce programme de nettoyage ?")) return;
    dreameServer("delete_program", { id }).then(r => {
      if (Array.isArray(r.programs)) domDreamePrograms = r.programs;
      if (domDreameSelectedProgramId === id) domDreameSelectedProgramId = null;
      toast("Programme supprimé.");
      if (document.querySelector(".dom-dreame-prog-manager")) domDreameProgramManageSheet();
      else domDreameFillHosts();
    }).catch(err => toast(err.message));
    return;
  }
  const dreProgRun = e.target.closest("[data-dom-dreame-prog-run]");
  if (dreProgRun) {
    const program_id = dreProgRun.dataset.domDreameProgRun;
    if (program_id && !dreProgRun.disabled) domDreameLaunchProgram(program_id);
    return;
  }
  const dreFormRoute = e.target.closest("[data-dom-dreame-form-route]");
  if (dreFormRoute) {
    const form = dreFormRoute.closest("form");
    if (!form) return;
    const route = Number(dreFormRoute.dataset.domDreameFormRoute);
    if (!domDreameRouteOptions(Number(form.elements.cleaning_mode.value)).some(o => o.v === route)) return;
    form.elements.cleaning_route.value = String(route);
    form.querySelectorAll("[data-dom-dreame-form-route]").forEach(btn => {
      btn.classList.toggle("primary", btn === dreFormRoute);
      btn.setAttribute("aria-pressed", btn === dreFormRoute ? "true" : "false");
    });
    return;
  }
  const dreFormChip = e.target.closest("[data-dom-dreame-form-chip]");
  if (dreFormChip) {
    const form = dreFormChip.closest("form");
    const key = dreFormChip.dataset.domDreameFormChip;
    const value = Number(dreFormChip.dataset.value);
    if (!form || !key || !Number.isFinite(value)) return;
    const name = (form.querySelector('[name="name"]') || {}).value || "";
    const cleaning_mode = key === "cleaning_mode" ? value : Number((form.querySelector('[name="cleaning_mode"]') || {}).value || 2);
    const suction = key === "suction" ? value : Number((form.querySelector('[name="suction"]') || {}).value || 1);
    const water = key === "water" ? value : Number((form.querySelector('[name="water"]') || {}).value || 2);
    const cleaning_route = Number((form.querySelector('[name="cleaning_route"]') || {}).value || 1);
    const room_ids = [...form.querySelectorAll('input[name="room"]:checked')].map(el => Number(el.value));
    domDreameProgDraft = { id: domDreameProgEdit || "", name, cleaning_mode, suction, water, cleaning_route, wash_method: "area", room_ids };
    if (key === "cleaning_mode") {
      domDreameProgramSheet(domDreameProgEdit);
      return;
    }
    const hidden = form.querySelector(`input[name="${key}"]`);
    if (hidden) hidden.value = String(value);
    form.querySelectorAll(`[data-dom-dreame-form-chip="${key}"]`).forEach(btn => {
      // Garder l'apparence des boutons synchronisée avec la valeur enregistrée.
      // Sans cette classe, le clic est pris en compte mais le choix paraît inchangé.
      const selected = btn === dreFormChip;
      btn.classList.toggle("primary", selected);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    return;
  }
  if (e.target.closest("[data-dom-dreame-disconnect]")) {
    if (!confirm("Délier Dreame Home de ce foyer ? Les commandes aspirateur seront coupées.")) return;
    dreameServer("disconnect", {}).then(() => {
      domDreameStatus = { connected: false, device_id: null, device_name: null };
      domDreameState = null;
      domDreameWanted = { cleaning_mode: null, suction: null, water: null };
      domDreameSavePending();
      domDreameStateAt = 0;
      domDreameRooms = [];
      domDreameRoomsAt = 0;
      domDreameRoomsHint = "";
      domDreamePrograms = [];
      domDreamePickRooms = [];
      if (S.hh) S.hh.dreame_device_id = null;
      closeSheet(); render(); toast("Dreame Home délié.");
    }).catch(err => toast(err.message));
    return;
  }
  const drePick = e.target.closest("[data-dom-dreame-pick]");
  if (drePick) {
    const device_id = drePick.dataset.domDreamePick;
    dreameServer("pick_device", { device_id }).then(r => {
      domDreameStatus.device_id = r.device_id;
      domDreameStatus.device_name = r.device_name;
      domDreameLoadPending();
      if (S.hh) S.hh.dreame_device_id = r.device_id;
      toast("Aspirateur Dreame sélectionné.");
      domDreameRefreshState(true).then(() => { closeSheet(); render(); domDreameDevicePickerSheet(); }).catch(() => { closeSheet(); render(); });
    }).catch(err => toast(err.message));
    return;
  }
  if (e.target.closest("[data-dom-dreame-read-numeric]")) {
    if (!domDreameCommandable()) { toast("Connectez d’abord le Dreame."); return; }
    if (domDreameBusy) { toast("Attendez la fin du réglage en cours."); return; }
    domDreameBusy = "read_numeric";
    dreameServer("probe_mop_raw").then(async result => {
      const props = Array.isArray(result.properties) ? result.properties : [];
      const report = JSON.stringify({
        date: new Date().toISOString(),
        methode_locale: domDreameAdvancedDraft().wash,
        valeur_locale: domDreameAdvancedDraft()[domDreameAdvancedDraft().wash],
        cloud_code: result.cloud_code,
        nested_code: result.nested_code,
        result_location: result.result_location,
        properties: props
      }, null, 2);
      try { await navigator.clipboard.writeText(report); toast("Diagnostic copié : collez-le dans notre discussion."); }
      catch { window.prompt("Copiez ce diagnostic et envoyez-le dans notre discussion :", report); }
    }).catch(err => toast("Lecture impossible : " + err.message))
      .finally(() => { domDreameBusy = ""; });
    return;
  }
  const dreAdvanced = e.target.closest("[data-dom-dreame-advanced]");
  if (dreAdvanced) {
    const key = dreAdvanced.dataset.domDreameAdvanced;
    const value = dreAdvanced.dataset.value;
    if (key === "route") {
      const routes = { standard: 1, intensive: 2, deep: 3, fast: 4 };
      if (!Object.prototype.hasOwnProperty.call(routes, value)) return;
      if (!domDreameRouteAllowed(domDreamePrefNum("cleaning_mode", 2), value)) return;
      if (!domDreameCommandable()) { toast("Connectez d’abord le Dreame."); return; }
      const previousRoute = domDreameAdvancedDraft().route;
      if (previousRoute === value) return;
      domDreameAdvancedUpdate("route", value);
      domDreameQueueSetting("cleaning_route", routes[value]);
      return;
    }
    if (key === "wash") {
      if (value !== "area") return;
      if (!domDreameCommandable()) { toast("Connectez d’abord le Dreame."); return; }
      // Un appui ré-envoie toujours Par zone, sans bloquer les autres réglages.
      domDreameWashLive = null;
      domDreameAdvancedUpdate("wash", value);
      domDreameQueueSetting("wash_method", "area");
      return;
    }
    domDreameAdvancedUpdate(key, value);
    return;
  }
  const drePref = e.target.closest("[data-dom-dreame-pref]");
  if (drePref) {
    const key = drePref.dataset.domDreamePref;
    const value = parseInt(drePref.dataset.value, 10);
    if (!["cleaning_mode", "suction", "water"].includes(key) || !Number.isFinite(value)) return;
    // Plus de blocage quand une écriture précédente attend Dreame :
    // le dernier choix de chaque réglage remplace les choix intermédiaires.
    domDreameQueueSetting(key, value);
    return;
  }
  const dreRoom = e.target.closest("[data-dom-dreame-room]");
  if (dreRoom) {
    const segment_id = parseInt(dreRoom.dataset.domDreameRoom, 10);
    if (!Number.isFinite(segment_id)) return;
    domDreameBusy = "room_" + segment_id;
    render();
    domRunDreameCommand(() => dreameServer("command", { action: "clean_room", segment_id })).then(r => {
      if (!r) return;
      domDreameMergeState(r);
      domDreameStateAt = 0;
      toast("Nettoyage de la pièce lancé", null, null, null, "domotique");
      domDreameTask = "start";
      domDreameFillHosts();
      setTimeout(() => { domDreameRefreshState(true).then(() => { domDreameFillHosts(); render(); }).catch(() => {}); }, 2500);
    }).catch(err => { if (err) toast(err.message); }).finally(() => { domDreameBusy = ""; render(); });
    return;
  }
  if (e.target.closest("[data-dom-st-retry]")) {
    domStStateAt = 0;
    domStRefreshState(true).then(() => {
      domSoftRender();
      if (document.querySelector(".dom-tv-panel.mz-tv")) domTvFillPanel();
    }).catch(() => {});
    return;
  }
  if (e.target.closest("[data-dom-st-open]")) { domTvSheet(); return; }
  if (e.target.closest("[data-dom-st-connect]")) { domStConnectSheet(); return; }
  if (e.target.closest("[data-dom-st-devices]")) { domStDevicePickerSheet(); return; }
  if (e.target.closest("[data-dom-st-disconnect]")) {
    if (!confirm("Délier SmartThings de ce foyer ? Les commandes TV seront coupées.")) return;
    smartthingsServer("disconnect", {}).then(() => {
      domStStatus = { connected: false, device_id: null, device_name: null };
      domStState = null;
      domStStateAt = 0;
      if (S.hh) S.hh.smartthings_device_id = null;
      closeSheet(); render(); toast("SmartThings délié.");
    }).catch(err => toast(err.message));
    return;
  }
  const stPick = e.target.closest("[data-dom-st-pick]");
  if (stPick) {
    const device_id = stPick.dataset.domStPick;
    smartthingsServer("pick_device", { device_id }).then(r => {
      domStStatus.device_id = r.device_id;
      domStStatus.device_name = r.device_name;
      if (S.hh) S.hh.smartthings_device_id = r.device_id;
      toast("Appareil SmartThings sélectionné.");
      domStRefreshState(true).then(() => { closeSheet(); render(); domStDevicePickerSheet(); }).catch(() => { closeSheet(); render(); });
    }).catch(err => toast(err.message));
    return;
  }
  const stCmd = e.target.closest("[data-dom-st-cmd]");
  if (stCmd) {
    const action = stCmd.dataset.domStCmd;
    if (!action || stCmd.disabled) return;
    domStBusy = action;
    render();
    domRunStCommand(() => smartthingsServer("command", { action })).then(r => {
      if (!r) return;
      domStState = r;
      domStStateAt = Date.now();
      toast("Commande TV envoyée", null, null, null, "domotique");
      const sheet = document.getElementById("sheet");
      if (sheet && sheet.open && document.querySelector(".dom-tv-panel")) domTvSheet(true);
    }).catch(err => { if (err) toast(err.message); }).finally(() => { domStBusy = ""; render(); });
    return;
  }
  const z = e.target.closest("[data-dom-zone]"); if (z) { domZone = z.dataset.domZone; render(); return; }
  if (e.target.closest("[data-dom-back]")) { domZone = ""; render(); return; }
  const settings = e.target.closest("[data-dom-settings]"); if (settings) { domSettings(settings.dataset.domSettings); return; }
  const integRoom = e.target.closest("[data-dom-integ-room]");
  if (integRoom) {
    const key = integRoom.dataset.domIntegRoom;
    const val = integRoom.dataset.domIntegRoomVal;
    const roomId = val === "_none" ? null : val;
    const assign = { ...domHomeRead().assign, [key]: roomId };
    domHomeWrite({ assign }).then(() => {
      render();
      toast("Pièce mise à jour.");
      // Rouvrir la fiche avec le picker actualisé
      if (key === "_st") domTvSheet();
      else if (key === "_mel") domMitsuSheet();
      else if (key === "_dreame") domDreameSheet();
    }).catch(err => toast(err.message));
    return;
  }
  if (e.target.closest("[data-dom-rooms-manage]")) { domRoomsManageSheet(); return; }
  if (e.target.closest("[data-dom-room-add]")) { domRoomFormSheet(); return; }
  const roomEdit = e.target.closest("[data-dom-room-edit]"); if (roomEdit) { domRoomFormSheet(roomEdit.dataset.domRoomEdit); return; }
  const roomDel = e.target.closest("[data-dom-room-del]");
  if (roomDel) {
    const rid = roomDel.dataset.domRoomDel;
    const cur = domHomeRead();
    if (cur.rooms.length <= 1) { toast("Gardez au moins une pièce."); return; }
    if (!confirm("Supprimer cette pièce ? Les équipements concernés seront reclassés automatiquement.")) return;
    const rooms = cur.rooms.filter(r => r.id !== rid);
    const assign = { ...cur.assign };
    for (const k of Object.keys(assign)) if (assign[k] === rid) delete assign[k];
    domHomeWrite({ rooms, assign }).then(() => { closeSheet(); render(); toast("Pièce supprimée."); domRoomsManageSheet(); }).catch(err => toast(err.message));
    return;
  }
  const a = e.target.closest("[data-dom-add]"); if (a) { domForm(a.dataset.domAdd); return; }
  const d = e.target.closest("[data-dom-edit]"); if (d) { const row = domRead().find(x => x.id === d.dataset.domEdit); domForm(row ? row.zone : domZone, d.dataset.domEdit); return; }
  if (e.target.closest("[data-dom-connect]")) { domConnectSheet(); return; }
  if (e.target.closest("[data-dom-disconnect]")) {
    if (!confirm("Délier Shelly Cloud de ce foyer ? Les équipements restent, les commandes seront coupées.")) return;
    shellyServer("disconnect", {}).then(r => { if (S.hh) S.hh.shelly_host = r.host || null; closeSheet(); render(); toast("Shelly Cloud délié."); }).catch(err => toast(err.message));
    return;
  }
  if (e.target.closest("[data-dom-cloud-list]")) {
    toast("Lecture du compte Shelly…");
    shellyServer("devices").then(r => { domCloud = r.devices || []; toast((domCloud.length || 0) + " appareil(s) trouvés. Ouvrez un équipement pour l'associer."); }).catch(err => toast(err.message));
    return;
  }
  if (e.target.closest("[data-dom-delete]")) {
    if (!confirm("Supprimer cet équipement de la page ?")) return;
    const delId = domEdit;
    if (S.vShelly && mode === "cloud") remove("shelly", domEdit);
    else { domWriteLocal(domRead().filter(x => x.id !== domEdit)); render(); }
    if (delId) {
      const assign = { ...domHomeRead().assign };
      delete assign[delId];
      domHomeWrite({ assign }).catch(() => {});
    }
    closeSheet();
    return;
  }
  const zb = e.target.closest("[data-dom-zone-batch]");
  if (zb) {
    const zone = zb.dataset.domZoneBatch, action = zb.dataset.domAction;
    if (!zone || !action || zb.disabled) return;
    domBusy = "zone-" + zone + "-" + action;
    render();
    const labels = { Monter: "Tout ouvrir", Descendre: "Tout fermer", Stop: "Stop" };
    domRunCommand(() => shellyServer("command-zone", { zone, action })).then(r => {
      if (!r) return;
      const n = r.sent || r.total || domZoneVolets(zone).length;
      toast("Commande envoyée : " + (labels[action] || action) + " (" + n + " volet(s))", null, null, null, "domotique");
      domScheduleStateAfterCmd();
    }).catch(err => { if (err) toast(err.message); }).finally(() => {
      domBusy = "";
      render();
    });
    return;
  }
  const cmd = e.target.closest("[data-dom-cmd]");
  if (cmd) {
    const id = cmd.dataset.domCmd, action = cmd.dataset.domAction;
    if (!id || !action || cmd.disabled) return;
    domBusy = id + action;
    render();
    const row = domRead().find(x => x.id === id);
    domRunCommand(() => shellyServer("command", { id, action })).then(r => {
      if (!r) return;
      toast("Commande envoyée : " + action, null, null, null, "domotique");
      if (row && row.type === "volet") domScheduleStateAfterCmd();
    }).catch(err => { if (err) toast(err.message); }).finally(() => {
      domBusy = "";
      render();
    });
  }
});
document.addEventListener("submit", e => {
  if (e.target.id === "dom-dreame-rooms") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rooms = (domDreameRooms || []).map(r => {
      const name = String(fd.get("room_" + r.id) || "").trim();
      return { id: r.id, name: name || r.name };
    });
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    dreameServer("save_rooms", { rooms }).then(r => {
      if (Array.isArray(r.rooms)) {
        domDreameRooms = r.rooms;
        domDreameRoomsAt = Date.now();
      }
      toast("Noms des pièces enregistrés.");
      closeSheet();
      if (view === "domotique") render();
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-dreame-program") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const room_ids = fd.getAll("room").map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0);
    const program = {
      id: domDreameProgEdit || undefined,
      name: String(fd.get("name") || "").trim(),
      cleaning_mode: Number(fd.get("cleaning_mode")),
      suction: Number(fd.get("suction")),
      water: Number(fd.get("water")),
      cleaning_route: Number(fd.get("cleaning_route")),
      wash_method: "area",
      room_ids
    };
    if (!room_ids.length) {
      toast("Choisissez au moins une pièce pour ce programme.");
      return;
    }
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    dreameServer("save_program", { program }).then(r => {
      if (Array.isArray(r.programs)) domDreamePrograms = r.programs;
      domDreameSelectedProgramId = r.program?.id || program.id || null;
      domDreameProgDraft = null;
      toast("Programme enregistré.");
      domDreameReturnToPrograms();
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-dreame-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    toast("Connexion au compte Dreame…");
    dreameServer("connect", {
      email: fd.get("email"),
      password: fd.get("password"),
      region: fd.get("region"),
      country: String(fd.get("country") || "FR").trim().toUpperCase().slice(0, 2),
      lang: "fr"
    }).then(r => {
      domDreameStatus = { connected: true, device_id: r.device_id ?? null, device_name: r.device_name || null };
      domDreameDevices = r.devices || [];
      if (S.hh && r.device_id != null) S.hh.dreame_device_id = r.device_id;
      domDreameStatusAt = Date.now();
      closeSheet(); render();
      toast(r.device_name ? "Dreame relié · " + r.device_name : "Dreame Home relié.");
      domDreameRefreshState(true).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
      if ((domDreameDevices.length || 0) > 1) setTimeout(domDreameDevicePickerSheet, 400);
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-st-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    toast("Connexion à SmartThings…");
    smartthingsServer("connect", { pat: fd.get("pat") }).then(r => {
      domStStatus = { connected: true, device_id: r.device_id ?? null, device_name: r.device_name || null };
      domStDevices = r.devices || [];
      if (S.hh && r.device_id != null) S.hh.smartthings_device_id = r.device_id;
      domStStatusAt = Date.now();
      closeSheet(); render();
      toast(r.device_name ? "SmartThings relié · " + r.device_name : "SmartThings relié.");
      domStRefreshState(true).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
      if ((domStDevices.length || 0) > 1) setTimeout(domStDevicePickerSheet, 400);
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-mel-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    melcloudServer("connect", { email: fd.get("email"), password: fd.get("password") }).then(r => {
      domMelStatus = { connected: true, device_id: r.device_id ?? null, device_name: r.device_name || null };
      domMelDevices = r.devices || [];
      if (S.hh && r.device_id != null) S.hh.melcloud_device_id = r.device_id;
      domMelStatusAt = Date.now();
      closeSheet(); render();
      toast(r.device_name ? "MELCloud relié · " + r.device_name : "MELCloud relié.");
      domMelRefreshState(true).then(changed => { if (changed) domSoftRender(); }).catch(() => {});
      if ((domMelDevices.length || 0) > 1) setTimeout(domMelDevicePickerSheet, 400);
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    shellyServer("connect", { server_uri: fd.get("server_uri"), auth_key: fd.get("auth_key") }).then(r => {
      if (S.hh) S.hh.shelly_host = r.host;
      domCloud = r.devices || [];
      closeSheet(); render();
      toast(domCloud.length ? "Shelly Cloud relié · " + domCloud.length + " appareil(s)." : "Shelly Cloud relié.");
    }).catch(err => toast(err.message)).finally(() => { if (btn) btn.disabled = false; });
    return;
  }
  if (e.target.id === "dom-room-form") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const t = String(fd.get("t") || "").trim();
    if (!t) return;
    const patch = { t, ico: String(fd.get("ico") || "🏠").trim().slice(0, 8) || "🏠", sub: String(fd.get("sub") || "").trim().slice(0, 80) };
    const cur = domHomeRead();
    const rooms = domEditRoom
      ? cur.rooms.map(r => r.id === domEditRoom ? { ...r, ...patch } : r)
      : [...cur.rooms, { id: "room_" + Date.now().toString(36), ...patch }];
    domHomeWrite({ rooms }).then(() => { closeSheet(); render(); toast("Pièce enregistrée."); domRoomsManageSheet(); }).catch(err => toast(err.message));
    return;
  }
  if (e.target.id !== "dom-form") return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  const room_id = String(fd.get("room_id") || "").trim();
  const zone = String(fd.get("zone"));
  const type = String(fd.get("type"));
  const shelly_id = String(fd.get("shelly_id") || fd.get("shelly_id_text") || "").trim().toLowerCase();
  const channel = Number(fd.get("channel") || 0);
  const rawB = String(fd.get("channel_b") || "").trim();
  const channel_b = rawB === "" ? null : Number(rawB);
  const pulse_sec = Number(fd.get("pulse_sec") || 1);
  const row = { name, zone, type, shelly_id, channel, channel_b, pulse_sec };
  const saveRoom = async deviceId => {
    if (!deviceId || !room_id) return;
    const assign = { ...domHomeRead().assign, [deviceId]: room_id };
    await domHomeWrite({ assign });
  };
  (async () => {
    let deviceId = domEdit;
    if (S.vShelly && mode === "cloud") {
      if (domEdit) { patch("shelly", domEdit, row); }
      else {
        const created = await add("shelly", { ...row, position: domRead().length });
        if (created) deviceId = created.id;
      }
    } else {
      const rows = domRead();
      if (domEdit) { const found = rows.find(x => x.id === domEdit); if (found) Object.assign(found, row); }
      else {
        deviceId = "dom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        rows.push({ id: deviceId, ...row, position: rows.length });
      }
      domWriteLocal(rows);
      render();
    }
    try { await saveRoom(deviceId); } catch (err) { toast(err.message); return; }
    domZone = zone; closeSheet();
  })();
});

/* ---------- home and explore ---------- */
VIEWS.home = function () {
  const d = today(), meName = (meM() || {}).name;
  const due = live().filter(t => t.next_due <= d).sort((a, b) => a.next_due.localeCompare(b.next_due) || a.title.localeCompare(b.title));
  const done = S.log.filter(l => l.done_on === d);
  const total = due.length + done.length;
  const ribbon = total ? `<div class="ribbon" aria-hidden="true">${done.map(l => { const m = member(l.member_id); return `<i class="done" style="background:${m ? esc(m.color) : "var(--muted)"}"></i>`; }).join("")}${due.map(() => "<i></i>").join("")}</div>
    <p class="ribbon-cap">${done.length} sur ${total} ${total > 1 ? "tâches faites" : "tâche faite"} aujourd'hui${done.length === total ? ". Tout est fait !" : ""}</p>` : "";
  const pins = homePins();
  return `<div class="home-main">${meName ? `<p class="hello">Bonjour ${esc(meName)}</p>` : ""}<h1 class="day">${esc(fmtLong(d))}</h1>
    ${ribbon}
    ${due.length ? `<div class="list" style="margin-top:12px">${due.slice(0, 3).map(t => taskRow(t)).join("")}${due.length > 3 ? `<button class="row more" data-act="go" data-v="tasks">Voir les ${due.length} tâches du jour</button>` : ""}</div>` : ""}</div>
    <div class="home-side"><div class="tiles">${pins.map(k => { const m = modOf(k); const badge = k === "messages" ? unread() : 0; return `<button class="tile" data-act="go" data-v="${k}"><span class="tile-t">${esc(m.t)}</span><span class="tile-s">${esc(m.sub())}</span>${mi(k)}${badge ? `<i class="badge tile-badge">${badge > 9 ? "9+" : badge}</i>` : ""}</button>`; }).join("")}</div>
    ${pins.length ? "" : `<div class="empty"><strong>L'accueil est vide.</strong>Choisissez les modules à afficher dans Explorer.</div>`}</div>`;
};
VIEWS.today = VIEWS.home;
VIEWS.explore = function () {
  const pins = homePins();
  const ton = k => k === "agenda" ? "cal" : k === "recettes" ? "recette" : k;
  const sec = g => `<p class="group-h">${g}</p><div class="mn-house-grid">${MODS.filter(m => m.g === g).map(m => {
    const on = pins.includes(m.k);
    return `<button type="button" class="mn-card mn-card-${ton(m.k)}" data-act="${exploreEdit ? "pin" : "go"}" data-v="${m.k}" ${exploreEdit ? `aria-pressed="${on}"` : ""}>
      <span class="mn-card-h"><img src="assets/modules3d/${m.k}.svg" alt="" width="46" height="46"><span>${esc(m.t)}</span>${exploreEdit ? `<i class="pin-mark">${on ? I.tick : I.plus}</i>` : `<span class="mn-chev" aria-hidden="true">›</span>`}</span>
      <strong>${esc(m.sub())}</strong></button>`;
  }).join("")}</div>`;
  return `<p class="muted" style="margin-top:4px">${exploreEdit ? "Touchez un module pour l'afficher ou le retirer de votre accueil." : "Tous les modules du foyer."}</p>
    ${sec("Essentiels")}${sec("Organisation")}
    <div class="btns"><button class="btn ${exploreEdit ? "primary" : ""}" data-act="exploreEdit">${exploreEdit ? "Terminé" : "Personnaliser mon accueil"}</button></div>`;
};

/* ---------- calendar: month grid + days ---------- */
let calSel = today(), calMonth = today().slice(0, 7) + "-01";
// Préférence propre à cet appareil : le calendrier mensuel reste replié ou déployé.
let calMonthOpen = LS.get("mz_cal_month_open", true) !== false;
function bdaysOn(day) {
  const d = parse(day), m = d.getMonth() + 1, dd = d.getDate(), leap = new Date(d.getFullYear(), 1, 29).getMonth() === 1;
  return S.bdays.filter(b => b.month === m && (b.day === dd || (!leap && b.month === 2 && b.day === 29 && dd === 28)));
}
VIEWS.agenda = function () {
  if (GTASKS.enabled && !GTASKS.busy && Date.now() - GTASKS.at >= 120000) setTimeout(() => gTasksRefresh(), 0);
  const first = parse(calMonth), y = first.getFullYear(), mo = first.getMonth();
  const start = mondayOf(calMonth), end = addDays(start, 41);
  const occ = occurrences(start, end), busy = new Set(occ.map(e => e.on));
  for (const g of G.ev.items) if (!G.cals || G.cals.includes(g.cal)) busy.add(g.day);
  for (const t of S.tasks || []) if (!t.archived && t.next_due) busy.add(t.next_due);
  if (GTASKS.enabled) for (const t of GTASKS.items) if (gTasksDay(t)) busy.add(gTasksDay(t));
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const day = addDays(start, i), dt = parse(day), out = dt.getMonth() !== mo;
    if (i === 35 && out) break;
    const dot = busy.has(day) || bdaysOn(day).length;
    cells += `<button class="cal-d ${out ? "out" : ""} ${day === today() ? "now" : ""}" data-act="calPick" data-v="${day}" aria-pressed="${day === calSel}" aria-label="${esc(dayLabel(day))}">${dt.getDate()}${dot ? "<i></i>" : ""}</button>`;
  }
  let list = "";
  for (let i = 0; i < 7; i++) {
    const day = addDays(calSel, i), evs = occurrences(day, day), bs = bdaysOn(day), gs = gEventsOn(day);
    // Si la copie familiale vers Google Agenda est active, ses événements affichent déjà ces tâches : ne pas les doubler.
    const localTasks = (typeof gtConf === "function" && gtConf().on) ? [] : (S.tasks || []).filter(t => !t.archived && t.next_due === day);
    const googleTasks = gTasksOn(day);
    list += `<div class="day-band"><span>${esc(dayLabel(day))}${Math.abs(diffDays(today(), day)) <= 1 ? ` <span class="muted">· ${esc(fmtShort(day))}</span>` : ""}</span></div>
      ${evs.length || bs.length || gs.length || localTasks.length || googleTasks.length ? `<div class="list flat">${bs.map(b => `<button class="row" data-act="editBday" data-v="${b.id}"><span class="ev-time allday">${mi("anniv", "xs")}</span><span class="main"><span class="t">Anniversaire de ${esc(b.name)}</span>${b.year ? `<span class="m">${parse(day).getFullYear() - b.year} ans</span>` : ""}</span></button>`).join("")}${evs.map(e => eventRow(e)).join("")}${gs.map(gRow).join("")}${localTasks.map(t => taskRow(t)).join("")}${googleTasks.map(gTasksRow).join("")}</div>` : `<p class="none-day">Aucun événement</p>`}`;
  }
  return `<div class="cal">
      <div class="weeknav" style="margin-top:0">
        <button class="icon-btn plain mz-round-btn mz-round-btn--sm mz-round-btn--nav cal-month-arrow" data-act="calMonth" data-v="-1" aria-label="Mois précédent" ${calMonthOpen ? "" : "hidden"}>${I.left}</button>
        <button type="button" class="cal-month-toggle" data-act="calMonthToggle" aria-controls="calMonthContent" aria-expanded="${calMonthOpen}" aria-label="${calMonthOpen ? "Réduire" : "Afficher"} le calendrier du mois">
          <span class="cal-month-toggle-copy">
            <strong>${esc(cap(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })))}</strong>
          </span>
          <span class="cal-month-toggle-chevron mz-round-btn mz-round-btn--lg" aria-hidden="true">${I.right}</span>
        </button>
        <button class="icon-btn plain mz-round-btn mz-round-btn--sm mz-round-btn--nav cal-month-arrow" data-act="calMonth" data-v="1" aria-label="Mois suivant" ${calMonthOpen ? "" : "hidden"}>${I.right}</button>
      </div>
      <div id="calMonthContent" ${calMonthOpen ? "" : "hidden"}>
      <div class="cal-grid" role="grid">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="cal-h">${x}</span>`).join("")}${cells}</div>
      ${GTASKS.enabled ? `<p class="muted small" style="text-align:center;margin:6px 0 0">Google Tasks · ${GTASKS.error ? esc(GTASKS.error) + " · " : ""}<button class="linkbtn small" data-act="gTasksRefresh">Actualiser les tâches</button></p>` : `<p class="muted small" style="text-align:center;margin:6px 0 0"><button class="linkbtn small" data-act="gTasksEnable">Afficher Google Tasks</button></p>`}
      ${gOn() ? `<p class="muted small" style="text-align:center;margin:6px 0 0">Agenda Google ${G.ev.at ? "mis à jour " + esc(ago(new Date(G.ev.at).toISOString())) : ""} · <button class="linkbtn small" data-act="gRefresh">Actualiser</button>${G.list.length ? ` · <button class="linkbtn small" data-act="gCalsSheet">Agendas affichés</button>` : ""}</p>` : ""}
      ${calSel !== today() ? `<div style="text-align:center"><button class="linkbtn" data-act="calPick" data-v="${today()}">Revenir à aujourd'hui</button></div>` : ""}
      </div>
    </div>${list}`;
};

/* ---------- meals and shopping are two modules now ---------- */
VIEWS.repas = function () { return menuView() + `<p class="muted small" style="margin-top:26px">Import de recettes, cave à vins, photos : <a href="${CARNET_URL}" style="color:var(--accent);font-weight:700">ouvrir le Carnet de menus</a>.</p>`; };
VIEWS.courses = function () { return shopView(); };

/* ---------- recipes ---------- */
let recQ = "", recTab = null;
// favourites come from this account's Carnet de menus (its private space in Supabase)
async function loadFavs() {
  if (mode !== "cloud" || !user || !S.recipes || !S.recipes.length) return;
  // the household's shared carnet if there is one, otherwise this account's own
  const { data, error } = await sb.from("user_state").select("menu").eq("user_id", (S.hh && S.hh.carnet_user) || user.id).maybeSingle();
  if (error || !data || !data.menu) { S.favs = new Set(); return; }
  const priv = data.menu.priv || {}, byKey = {};
  for (const r of S.recipes) byKey[r.legacy_id || "c-" + r.id] = r.id;
  S.favs = new Set(Object.entries(priv).filter(([, o]) => o && o.fav).map(([k]) => byKey[k] || (k.startsWith("c-") ? k.slice(2) : null)).filter(Boolean));
}
const carnetCard = text => `<div class="card linkcard"><span>${text}</span><a class="linkbtn" href="${CARNET_URL}">Ouvrir le Carnet</a></div>`;
VIEWS.recettes = function () {
  if (!S.recipes) { loadRecipes().then(() => { if (view === "recettes") render(); }); return `<p class="muted">Chargement du livre de recettes…</p>`; }
  if (!S.recipes.length) return `<div class="empty"><strong>Le livre de recettes n'est pas accessible avec ce compte.</strong>Il faut que votre compte soit validé dans le Carnet de menus.</div>`;
  const nf = S.favs instanceof Set ? S.recipes.filter(r => S.favs.has(r.id)).length : 0;
  if (recTab === null) recTab = nf ? "fav" : "all";
  return `${carnetCard("Ajouter, modifier ou importer des recettes se fait dans le Carnet de menus.")}
    ${nf ? `<div class="seg" role="group" aria-label="Recettes"><button data-act="recTab" data-v="fav" aria-pressed="${recTab === "fav"}">★ Mes favoris (${nf})</button><button data-act="recTab" data-v="all" aria-pressed="${recTab === "all"}">Toutes (${S.recipes.length})</button></div>` : ""}
    <input class="input" id="recQ" type="search" placeholder="Chercher une recette" value="${esc(recQ)}" autocomplete="off" style="margin-top:10px">
    <div class="list" id="recBook" style="margin-top:12px">${recBookHtml()}</div>`;
};
function recBookHtml() {
  const n = recQ.trim().toLowerCase();
  let l = recTab === "fav" && S.favs instanceof Set ? S.recipes.filter(r => S.favs.has(r.id)) : S.recipes;
  if (n) l = l.filter(r => r.name.toLowerCase().includes(n) || (r.cat || "").toLowerCase().includes(n));
  return l.slice(0, 150).map(r => `<button class="row" data-act="openRecipe" data-v="${r.id}">${r.image ? `<img class="thumb" src="${esc(r.image)}" alt="" loading="lazy">` : `<span class="thumb">${mi("recettes", "sm")}</span>`}<span class="main"><span class="t">${isFav(r.id) ? "★ " : ""}${esc(r.name)}</span><span class="m">${esc(r.cat || "")}${r.time ? " · " + r.time + " min" : ""}</span></span></button>`).join("") || `<p class="muted" style="padding:14px">Aucune recette ne correspond.</p>`;
}
function recipeSheet(id) {
  const r = recipeOf(id); if (!r) return;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));
  openSheet(r.name, `
    ${r.image ? `<img src="${esc(r.image)}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:16px;margin-top:6px">` : ""}
    <p class="muted" style="margin-top:10px">${esc(r.cat || "")}${r.time ? " · " + r.time + " min" : ""}${r.serves ? " · " + r.serves + " pers." : ""}</p>
    ${Array.isArray(r.ing) && r.ing.length ? `<h3 style="margin-top:14px">Ingrédients</h3><ul class="ing">${r.ing.map(g => `<li><span>${esc(g.n)}</span><span class="muted">${esc(fmtQty(Number(g.q) || 0, g.u))}</span></li>`).join("")}</ul>` : ""}
    ${r.steps ? `<h3 style="margin-top:14px">Étapes</h3><ol class="steps">${String(r.steps).split(/\n+/).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
    <form data-form="recToMenu" style="margin-top:16px">
      <div class="field"><span class="label">Mettre au menu</span>${chipsHtml("day", days.map(d => [d, dayLabel(d).replace(/^(\S+) (\d+) .*/, "$1 $2")]), days[0])}</div>
      <div class="field">${chipsHtml("slot", [["midi", "Midi"], ["soir", "Soir"]], "soir")}</div>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary block" type="submit">Mettre au menu</button></div>
    </form>`, { recipe: id });
}

/* ---------- birthdays ---------- */
function nextBdays() {
  const t = today(), y = parse(t).getFullYear();
  return S.bdays.map(b => {
    let d = new Date(y, b.month - 1, Math.min(b.day, new Date(y, b.month, 0).getDate()));
    if (ymd(d) < t) d = new Date(y + 1, b.month - 1, Math.min(b.day, new Date(y + 1, b.month, 0).getDate()));
    return { ...b, next: ymd(d), days: diffDays(t, ymd(d)), age: b.year ? d.getFullYear() - b.year : null };
  }).sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
}
VIEWS.anniv = function () {
  if (!S.v3) return v3Notice();
  const l = nextBdays(), missing = members().filter(m => !S.bdays.some(b => b.member_id === m.id));
  const row = b => `<button class="row" data-act="editBday" data-v="${b.id}">
      <span class="datebox" style="--mc:${MC.anniv}"><b>${b.day}</b><span>${esc(parse(b.next).toLocaleDateString("fr-FR", { month: "short" }))}</span></span>
      <span class="main"><span class="t">${esc(b.name)}</span><span class="m">${b.days === 0 ? `<span class="hot">Aujourd'hui${b.age !== null ? ` : ${b.age} ans` : ""} !</span>` : `${b.days === 1 ? "Demain" : "Dans " + b.days + " jours"}${b.age !== null ? ` · ${b.age} ans` : ""}`}</span></span>
      ${b.member_id && member(b.member_id) ? av(member(b.member_id), "sm") : ""}</button>`;
  return `${l.length ? `<div class="list">${l.map(row).join("")}</div>` : `<div class="empty"><strong>Aucun anniversaire.</strong>Ajoutez ceux de la famille et des proches : ils apparaîtront aussi dans le calendrier.</div>`}
    ${missing.length ? `<p class="group-h">Membres du foyer sans date</p><div class="chips">${missing.map(m => `<button class="chip" data-act="newBday" data-m="${m.id}">${av(m, "sm")}${esc(m.name)}</button>`).join("")}</div>` : ""}`;
};
function bdaySheet(b, forMember) {
  const isNew = !b; const m = forMember ? member(forMember) : null;
  b = b || { name: m ? m.name : "", day: parse(today()).getDate(), month: parse(today()).getMonth() + 1, year: "", member_id: forMember || null, notes: "" };
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("fr-FR", { month: "long" }));
  openSheet(isNew ? "Nouvel anniversaire" : "Anniversaire", `
    <form data-form="bday">
      <label class="field"><span class="label">Qui</span><input class="input" name="name" value="${esc(b.name)}" required maxlength="60" ${isNew && !m ? "autofocus" : ""} placeholder="Ex. Mamie"></label>
      <div class="inline" style="gap:10px">
        <label class="field" style="flex:0 0 84px"><span class="label">Jour</span><input class="input" name="day" type="number" inputmode="numeric" min="1" max="31" value="${b.day}" required></label>
        <label class="field" style="flex:1"><span class="label">Mois</span><select class="input" name="month">${months.map((x, i) => `<option value="${i + 1}" ${b.month === i + 1 ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <label class="field" style="flex:0 0 100px"><span class="label">Année</span><input class="input" name="year" type="number" inputmode="numeric" min="1900" max="2100" value="${esc(b.year || "")}" placeholder="Facult."></label>
      </div>
      ${S.members.length ? `<div class="field"><span class="label">Membre du foyer</span>${chipsHtml("member", [["", "Personne"], ...memberOpts()], b.member_id || "")}</div>` : ""}
      <label class="field"><span class="label">Note</span><textarea class="input" name="notes" maxlength="500" placeholder="Idées de cadeaux…">${esc(b.notes)}</textarea></label>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary" type="submit" style="flex:1">Enregistrer</button>${isNew ? "" : `<button class="btn danger" type="button" data-act="delBday" data-v="${b.id}">Supprimer</button>`}</div>
    </form>`, { id: isNew ? null : b.id });
}

/* ---------- budget ---------- */
const BUD_CATS = [["Courses", "#F2A93B"], ["Maison", "#6A86F0"], ["Factures", "#A07CF5"], ["Transport", "#6CC4F2"], ["Enfants", "#E46CA6"], ["Santé", "#35C9B0"], ["Loisirs", "#F2917B"], ["Restaurants", "#F5C451"], ["Divers", "#8E9AAE"]];
const catColor = c => (BUD_CATS.find(x => x[0] === c) || BUD_CATS.at(-1))[1];
let budMonth = today().slice(0, 7);
VIEWS.budget = function () {
  if (!S.v3) return v3Notice();
  const rows = S.exp.filter(e => String(e.day).startsWith(budMonth)).sort((a, b) => String(b.day).localeCompare(String(a.day)) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const out = rows.filter(e => e.kind !== "in"), inn = rows.filter(e => e.kind === "in");
  const spent = out.reduce((a, e) => a + Number(e.amount), 0), got = inn.reduce((a, e) => a + Number(e.amount), 0);
  const lim = Number(S.hh.budget_limit) || 0, pct = lim ? Math.min(100, Math.round(spent / lim * 100)) : 0;
  const byCat = BUD_CATS.map(([c, col]) => [c, col, out.filter(e => e.category === c).reduce((a, e) => a + Number(e.amount), 0)]).filter(x => x[2] > 0).sort((a, b) => b[2] - a[2]);
  const byWho = members().map(m => [m, out.filter(e => e.paid_by === m.id).reduce((a, e) => a + Number(e.amount), 0)]).filter(x => x[1] > 0);
  const maxC = Math.max(1, ...byCat.map(x => x[2]));
  const m0 = budMonth + "-01";
  let days = "", last = "";
  for (const e of rows) {
    if (e.day !== last) { days += `${last ? "</div>" : ""}<p class="group-h">${esc(dayLabel(e.day))}</p><div class="list">`; last = e.day; }
    const p = member(e.paid_by);
    days += `<button class="row" data-act="editExp" data-v="${e.id}"><span class="cat-dot" style="--c:${catColor(e.category)}"></span><span class="main"><span class="t">${esc(e.label)}</span><span class="m">${esc(e.kind === "in" ? "Rentrée" : e.category)}${p ? " · " + esc(p.name) : ""}</span></span><span class="amt ${e.kind === "in" ? "in" : ""}">${e.kind === "in" ? "+" : "−"}${esc(eur(e.amount))}</span></button>`;
  }
  if (last) days += "</div>";
  return `<div class="weeknav" style="margin-top:0"><button class="icon-btn plain mz-round-btn mz-round-btn--sm mz-round-btn--nav" data-act="budMonth" data-v="-1" aria-label="Mois précédent">${I.left}</button><strong>${esc(cap(monthName(m0)))}</strong><button class="icon-btn plain mz-round-btn mz-round-btn--sm mz-round-btn--nav" data-act="budMonth" data-v="1" aria-label="Mois suivant">${I.right}</button></div>
    <div class="card bud-card">
      <span class="muted small">Dépensé</span>
      <span class="bud-big">${esc(eur(spent))}</span>
      ${lim ? `<div class="meter" role="img" aria-label="${pct} % du plafond"><i style="width:${pct}%;background:${spent > lim ? "var(--late)" : MC.budget}"></i></div>
        <span class="small ${spent > lim ? "hot" : "muted"}">${spent > lim ? `Plafond dépassé de ${eur(spent - lim)}` : `Reste ${eur(lim - spent)} sur ${eur(lim)}`}</span>` : `<button class="linkbtn small" data-act="budLimit">Fixer un plafond mensuel</button>`}
      ${got ? `<span class="small muted" style="display:block;margin-top:6px">Rentrées : ${esc(eur(got))}</span>` : ""}
      ${lim ? `<button class="linkbtn small" data-act="budLimit" style="display:block">Modifier le plafond</button>` : ""}
    </div>
    ${byCat.length ? `<h2>Par catégorie</h2><div class="list"><div class="bal">${byCat.map(([c, col, v]) => `<span class="cat-dot" style="--c:${col}"></span><span><span class="small">${esc(c)}</span><span class="bar"><i style="width:${Math.round(v / maxC * 100)}%;background:${col}"></i></span></span><span class="n">${esc(eur(v))}</span>`).join("")}</div></div>` : ""}
    ${byWho.length > 1 ? `<h2>Qui a payé</h2><div class="list"><div class="bal">${byWho.map(([m, v]) => `${av(m, "sm")}<span class="bar"><i style="width:${Math.round(v / spent * 100)}%;background:${esc(m.color)}"></i></span><span class="n">${esc(eur(v))}</span>`).join("")}</div></div>` : ""}
    ${rows.length ? `<h2>Opérations</h2>${days}` : `<div class="empty" style="margin-top:16px"><strong>Rien ce mois-ci.</strong>Ajoutez une dépense avec le bouton « Dépense ».</div>`}`;
};
function expSheet(e) {
  const isNew = !e;
  e = e || { label: "", amount: "", kind: "out", category: "Courses", paid_by: S.me, day: today() };
  openSheet(isNew ? "Nouvelle dépense" : "Opération", `
    <form data-form="exp">
      ${chipsHtml("kind", [["out", "Dépense"], ["in", "Rentrée"]], e.kind)}
      <label class="field"><span class="label">Montant (€)</span><input class="input" name="amount" inputmode="decimal" value="${esc(e.amount === "" ? "" : String(e.amount).replace(".", ","))}" required pattern="[0-9]+([,.][0-9]{1,2})?" ${isNew ? "autofocus" : ""} placeholder="0,00" style="font-size:24px;font-weight:700"></label>
      <label class="field"><span class="label">Pour quoi</span><input class="input" name="label" value="${esc(e.label)}" required maxlength="80" placeholder="Ex. Supermarché, cantine…"></label>
      <div class="field"><span class="label">Catégorie</span>${chipsHtml("category", BUD_CATS.map(([c]) => [c, c]), e.category)}</div>
      ${S.members.length ? `<div class="field"><span class="label">Payé par</span>${chipsHtml("paid_by", [["", "Commun"], ...memberOpts()], e.paid_by || "")}</div>` : ""}
      <label class="field"><span class="label">Date</span><input class="input" name="day" type="date" value="${esc(e.day)}" required></label>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary" type="submit" style="flex:1">Enregistrer</button>${isNew ? "" : `<button class="btn danger" type="button" data-act="delExp" data-v="${e.id}">Supprimer</button>`}</div>
    </form>`, { id: isNew ? null : e.id });
}

/* ---------- documents ---------- */
const DOC_CATS = ["Identité", "Santé", "Maison", "École", "Voiture", "Banque & impôts", "Assurances", "Garanties", "Autre"];
let docFilter = "", docPath = ""; // docPath: folder shown ("Maison/Travaux"), "" = all folders
const docKind = d => /pdf/.test(d.mime) ? "PDF" : /^image\//.test(d.mime) ? "Photo" : d.file_name ? (d.file_name.split(".").pop() || "").toUpperCase().slice(0, 4) : "—";
/* folders: a document's « category » is its folder (sub-folders written "Maison/Travaux").
   Empty folders are kept with the household (households.doc_folders, script supabase/migrations/0013_dossiers_documents.sql), otherwise on this phone. */
const docFoldersSaved = () => (S.hh && Array.isArray(S.hh.doc_folders) ? S.hh.doc_folders : LS.get("mz_docfolders", []));
function docFolders() {
  const set = new Set();
  const addPath = p => { const parts = String(p || "").split("/").filter(Boolean); for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join("/")); };
  docFoldersSaved().forEach(addPath); S.docs.forEach(d => addPath(d.category));
  return [...set].sort((x, y) => x.localeCompare(y, "fr"));
}
const docName = p => p.split("/").pop();
const docParent = p => p.split("/").slice(0, -1).join("/");
const docIn = p => S.docs.filter(d => d.category === p || d.category.startsWith(p + "/")).length;
async function docSaveFolders(list) {
  list = [...new Set(list)].sort();
  LS.set("mz_docfolders", list);
  if (mode === "cloud" && S.hh && "doc_folders" in S.hh) {
    const before = S.hh.doc_folders; S.hh.doc_folders = list; saveLocal();
    const { error } = await sb.from("households").update({ doc_folders: list }).eq("id", S.hh.id);
    if (error) { S.hh.doc_folders = before; saveLocal(); }
  }
}
VIEWS.docs = function () {
  if (!S.v3) return v3Notice();
  const all = docFolders();
  if (docPath && !all.includes(docPath)) docPath = "";
  const subs = all.filter(f => docParent(f) === docPath);
  const l = S.docs.filter(d => docPath ? d.category === docPath : !all.includes(d.category)).sort((a, b) => a.title.localeCompare(b.title));
  const soon = S.docs.filter(d => d.expires_on && diffDays(today(), d.expires_on) <= 30).sort((a, b) => a.expires_on.localeCompare(b.expires_on));
  const row = d => { const m = member(d.member_id), left = d.expires_on ? diffDays(today(), d.expires_on) : null;
    return `<button class="row" data-act="openDoc" data-v="${d.id}"><span class="filebox">${esc(docKind(d))}</span><span class="main"><span class="t">${esc(d.title)}</span><span class="m">${m ? esc(m.name) : "Tout le foyer"}${left !== null ? ` · <span class="${left <= 30 ? "hot" : ""}">${left < 0 ? "expiré depuis le " + esc(fmtShort(d.expires_on)) : "expire le " + esc(parse(d.expires_on).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }))}</span>` : ""}</span></span></button>`; };
  const frow = f => { const n = docIn(f), k = all.filter(x => docParent(x) === f).length;
    return `<button class="row" data-act="docOpenFolder" data-v="${esc(f)}"><span class="filebox" style="font-size:20px">📁</span><span class="main"><span class="t">${esc(docName(f))}</span><span class="m">${n ? plural(n, "document", "documents") : "vide"}${k ? " · " + plural(k, "dossier", "dossiers") : ""}</span></span></button>`; };
  const crumbs = docPath ? docPath.split("/").map((x, i, arr) => ` › <button class="linkbtn" data-act="docOpenFolder" data-v="${esc(arr.slice(0, i + 1).join("/"))}">${esc(x)}</button>`).join("") : "";
  return `${!docPath && soon.length ? `<div class="card warn"><strong>À renouveler</strong><span class="small">${soon.map(d => esc(d.title)).join(", ")}</span></div>` : ""}
    ${docPath ? `<div class="inline" style="flex-wrap:wrap;gap:4px;margin-top:4px"><button class="linkbtn" data-act="docOpenFolder" data-v="">Documents</button>${crumbs}</div>
      <div class="btns" style="margin-top:6px"><button class="btn" data-act="docRenameFolder">Renommer le dossier</button><button class="btn ghost danger" data-act="docDelFolder">Supprimer</button></div>` : ""}
    ${subs.length ? `<p class="group-h">Dossiers</p><div class="list">${subs.map(frow).join("")}</div>` : ""}
    ${l.length ? `${subs.length || docPath ? `<p class="group-h">Documents</p>` : ""}<div class="list" style="margin-top:${subs.length || docPath ? 0 : 12}px">${l.map(row).join("")}</div>`
      : !subs.length ? `<div class="empty" style="margin-top:12px"><strong>${docPath ? "Dossier vide." : "Aucun document."}</strong>${docPath ? "Ajoutez un document ici, ou un sous-dossier." : "Rangez ici cartes d'identité, carnets de santé, contrats, garanties… Seuls les membres du foyer y ont accès."}</div>` : ""}
    <div style="height:70px"></div>`;
};
function folderSheet(rename) {
  const cur = rename ? docName(docPath) : "";
  openSheet(rename ? "Renommer le dossier" : "Nouveau dossier", `<form data-form="docFolder">
    ${!rename && docPath ? `<p class="muted small" style="margin:6px 0 0">Dans « ${esc(docPath.split("/").join(" › "))} »</p>` : ""}
    <label class="field"><span class="label">Nom du dossier</span><input class="input" name="name" value="${esc(cur)}" maxlength="40" required placeholder="Ex. Travaux, Factures 2026…"></label>
    ${mode === "cloud" && S.hh && !("doc_folders" in S.hh) ? `<p class="muted small">Un dossier vide reste sur ce téléphone tant que le script supabase/migrations/0013_dossiers_documents.sql n'est pas collé dans Supabase ; dès qu'il contient un document, tout le foyer le voit.</p>` : ""}
    <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary" type="submit" style="flex:1">${rename ? "Renommer" : "Créer"}</button></div></form>`, { rename: !!rename });
}
function docSheet(d) {
  const isNew = !d;
  d = d || { title: "", category: "Autre", member_id: null, expires_on: null, notes: "", file_name: "" };
  openSheet(isNew ? "Nouveau document" : d.title, `
    <form data-form="doc">
      ${isNew ? `<label class="field"><span class="label">Fichier (photo ou PDF, 10 Mo maxi)</span><input class="input" name="file" type="file" accept="image/*,application/pdf" required></label>` :
        d.file_path || d.data ? `<div class="btns" style="margin-top:6px"><button class="btn primary" type="button" data-act="viewDoc" data-v="${d.id}">Ouvrir ${esc(d.file_name || "le fichier")}</button></div>` : `<p class="muted small" style="margin-top:6px">Exemple sans fichier joint.</p>`}
      <label class="field"><span class="label">Nom</span><input class="input" name="title" value="${esc(d.title)}" ${isNew ? "" : "required"} maxlength="80" placeholder="${isNew ? "Par défaut : le nom du fichier" : ""}"></label>
      <label class="field"><span class="label">Dossier</span><select class="input" name="folder">${(() => { const fs = docFolders(), cur = isNew ? (docPath || "Autre") : d.category; if (!fs.includes(cur)) fs.push(cur); return fs.sort((x, y) => x.localeCompare(y, "fr")).map(f => `<option value="${esc(f)}" ${f === cur ? "selected" : ""}>${esc(f.split("/").join(" › "))}</option>`).join(""); })()}</select></label>
      ${S.members.length ? `<div class="field"><span class="label">À qui</span>${chipsHtml("member", [["", "Tout le foyer"], ...memberOpts()], d.member_id || "")}</div>` : ""}
      <label class="field"><span class="label">Date d'expiration</span><input class="input" name="expires_on" type="date" value="${esc(d.expires_on || "")}"></label>
      <label class="field"><span class="label">Note</span><textarea class="input" name="notes" maxlength="500" placeholder="Numéro de contrat, où est l'original…">${esc(d.notes)}</textarea></label>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary" type="submit" style="flex:1">Enregistrer</button>${isNew ? "" : `<button class="btn danger" type="button" data-act="delDoc" data-v="${d.id}">Supprimer</button>`}</div>
    </form>`, { id: isNew ? null : d.id });
}
const readAsDataURL = f => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
async function viewDoc(id) {
  const d = S.docs.find(x => x.id === id); if (!d) return;
  const w = window.open("", "_blank");
  try {
    let url;
    if (mode === "cloud") { const { data, error } = await sb.storage.from("household-docs").createSignedUrl(d.file_path, 300); if (error) throw error; url = data.signedUrl; }
    else { if (!d.data) throw new Error("absent"); url = URL.createObjectURL(await (await fetch(d.data)).blob()); }
    if (w) w.location.href = url; else location.href = url;
  } catch (e) { if (w) w.close(); toast("Le fichier ne s'ouvre pas pour l'instant (réseau ?)."); }
}

/* ---------- weekly schedule ---------- */
let edtDay = isoDay(today());
function nowSlots() {
  const d = isoDay(today()), n = new Date(), t = pad(n.getHours()) + ":" + pad(n.getMinutes());
  return S.sched.filter(s => s.weekday === d && String(s.start_time).slice(0, 5) <= t && String(s.end_time).slice(0, 5) > t);
}
VIEWS.edt = function () {
  if (!S.v3) return v3Notice();
  const now = nowSlots();
  const dayRows = S.sched.filter(s => s.weekday === edtDay).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  const people = members().filter(m => dayRows.some(s => s.member_id === m.id));
  const slot = s => `<button class="row" data-act="editSlot" data-v="${s.id}"><span class="ev-time">${esc(hm(s.start_time))}</span><span class="main"><span class="t">${esc(s.title)}</span><span class="m">jusqu'à ${esc(hm(s.end_time))}${s.place ? " · " + esc(s.place) : ""}</span></span></button>`;
  return `${now.length && edtDay === isoDay(today()) ? `<div class="card now-card"><strong>En ce moment</strong>${now.map(s => { const m = member(s.member_id); return `<span class="inline" style="gap:8px;margin-top:6px">${av(m, "sm")}<span>${esc(m ? m.name : "")} : ${esc(s.title)} jusqu'à ${esc(hm(s.end_time))}</span></span>`; }).join("")}</div>` : ""}
    <div class="seg days" role="group" aria-label="Jour">${DAYS_SHORT.map((d, i) => `<button data-act="edtDay" data-v="${i + 1}" aria-pressed="${edtDay === i + 1}">${cap(d.replace(".", ""))}</button>`).join("")}</div>
    ${people.length ? people.map(m => `<p class="group-h inline" style="gap:8px">${av(m, "sm")}${esc(m.name)}</p><div class="list">${dayRows.filter(s => s.member_id === m.id).map(slot).join("")}</div>`).join("") :
      `<div class="empty" style="margin-top:14px"><strong>Rien le ${esc(DAYS[edtDay - 1])}.</strong>Ajoutez l'école, le travail, le sport… de chacun : toute la famille sait qui est où.</div>`}`;
};
function slotSheet(s) {
  const isNew = !s;
  s = s || { member_id: S.me, weekday: edtDay, start_time: "08:30", end_time: "16:30", title: "", place: "" };
  openSheet(isNew ? "Nouveau créneau" : "Créneau", `
    <form data-form="slot">
      <label class="field"><span class="label">Quoi</span><input class="input" name="title" value="${esc(s.title)}" required maxlength="60" ${isNew ? "autofocus" : ""} placeholder="Ex. École, Travail, Piscine"></label>
      <div class="field"><span class="label">Qui</span>${chipsHtml("member", memberOpts(), s.member_id || "")}</div>
      <div class="field"><span class="label">${isNew ? "Quels jours" : "Jour"}</span>${chipsHtml("weekday", DAYS_SHORT.map((d, i) => [i + 1, d]), isNew ? [s.weekday] : s.weekday, isNew)}</div>
      <div class="inline" style="gap:12px">
        <label class="field" style="flex:1"><span class="label">Début</span><input class="input" name="start" type="time" value="${esc(String(s.start_time).slice(0, 5))}" required></label>
        <label class="field" style="flex:1"><span class="label">Fin</span><input class="input" name="end" type="time" value="${esc(String(s.end_time).slice(0, 5))}" required></label>
      </div>
      <label class="field"><span class="label">Où</span><input class="input" name="place" value="${esc(s.place)}" maxlength="80" placeholder="Facultatif"></label>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary" type="submit" style="flex:1">Enregistrer</button>${isNew ? "" : `<button class="btn danger" type="button" data-act="delSlot" data-v="${s.id}">Supprimer</button>`}</div>
    </form>`, { id: isNew ? null : s.id });
}

/* ---------- quick add from home ---------- */
function quickAdd() {
  const acts = [["galerie", "Photos", "pickPhotos"], ["tasks", "Tâche", "newTask"], ["agenda", "Événement", "newEvent"], ["agenda", "Rendez-vous", "newAppointment"], ["courses", "Article de courses", "goShop"], ["budget", "Dépense", "newExp"], ["anniv", "Anniversaire", "newBday"], ["docs", "Document", "newDoc"], ["edt", "Créneau", "newSlot"], ["messages", "Message", "goMsg"]];
  openSheet("Ajouter", `<div class="sq-grid" style="margin-top:10px">${acts.map(([k, l, a]) => `<button class="sq" data-act="${a}"><span class="sq-ic">${mi(k)}</span><span class="sq-t">${l}</span></button>`).join("")}</div>`);
}

/* ---------- interactions ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case "pin": { const p = homePins(), i = p.indexOf(v); if (i >= 0) p.splice(i, 1); else p.push(v); LS.set("mz_home", MODS.map(m => m.k).filter(k => p.includes(k))); window.maisonneeModuleGrid?.setVisible(v, p.includes(v)); render(); break; }
    case "exploreEdit": exploreEdit = !exploreEdit; render(); break;
    case "quickAdd": quickAdd(); break;
    case "goShop": closeSheet(); view = "courses"; render(); setTimeout(() => { const i = $("#shopIn"); if (i) i.focus(); }, 50); break;
    case "goMsg": closeSheet(); view = "messages"; render(); setTimeout(() => { const t = $(".composer textarea"); if (t) t.focus(); }, 50); break;
    case "calPick": calSel = v; if (v.slice(0, 7) !== calMonth.slice(0, 7)) calMonth = v.slice(0, 7) + "-01"; render(); break;
    case "calMonthToggle": {
      calMonthOpen = !calMonthOpen;
      LS.set("mz_cal_month_open", calMonthOpen);
      const content = document.getElementById("calMonthContent");
      if (content) content.hidden = !calMonthOpen;
      document.querySelectorAll(".cal-month-arrow").forEach(btn => { btn.hidden = !calMonthOpen; });
      const toggle = document.querySelector(".cal-month-toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(calMonthOpen));
        toggle.setAttribute("aria-label", (calMonthOpen ? "Réduire" : "Afficher") + " le calendrier du mois");
      }
      break;
    }
    case "calMonth": { const d = parse(calMonth); d.setMonth(d.getMonth() + +v); calMonth = ymd(d); calSel = calMonth.slice(0, 7) === today().slice(0, 7) ? today() : calMonth; render(); break; }
    case "newEventOn": eventSheet(null, v); break;
    case "newAppointmentOn": eventSheet(null, v, true); break;
    case "openRecipe": recipeSheet(v); break;
    case "newBday": closeSheet(); if (!S.v3) { view = "anniv"; render(); break; } bdaySheet(null, b.dataset.m || null); break;
    case "editBday": bdaySheet(S.bdays.find(x => x.id === v)); break;
    case "delBday": closeSheet(); { const x = S.bdays.find(y => y.id === v); await remove("bdays", v); if (x) toast("Anniversaire supprimé.", "Annuler", () => add("bdays", x)); } break;
    case "newExp": closeSheet(); if (!S.v3) { view = "budget"; render(); break; } expSheet(null); break;
    case "editExp": expSheet(S.exp.find(x => x.id === v)); break;
    case "delExp": closeSheet(); { const x = S.exp.find(y => y.id === v); await remove("exp", v); if (x) toast("Opération supprimée.", "Annuler", () => add("exp", x)); } break;
    case "budMonth": { const d = parse(budMonth + "-01"); d.setMonth(d.getMonth() + +v); budMonth = ymd(d).slice(0, 7); render(); break; }
    case "budLimit": openSheet("Plafond mensuel", `<form data-form="budLimit"><label class="field"><span class="label">Dépenses maximum par mois (€)</span><input class="input" name="limit" inputmode="decimal" value="${S.hh.budget_limit ? String(S.hh.budget_limit).replace(".", ",") : ""}" placeholder="Ex. 1500" autofocus></label><p class="muted small" style="margin-top:8px">Laissez vide pour ne pas avoir de plafond.</p><div class="btns"><button class="btn primary block" type="submit">Enregistrer</button></div></form>`); break;
    case "newDoc": closeSheet(); if (!S.v3) { view = "docs"; render(); break; } docSheet(null); break;
    case "openDoc": docSheet(S.docs.find(x => x.id === v)); break;
    case "viewDoc": viewDoc(v); break;
    case "docFilter": docFilter = v; render(); break;
    case "docOpenFolder": docPath = v || ""; render(); window.scrollTo(0, 0); break;
    case "newFolder": closeSheet(); if (!S.v3) { view = "docs"; render(); break; } folderSheet(false); break;
    case "docRenameFolder": folderSheet(true); break;
    case "docDelFolder": {
      if (docIn(docPath) || docFolders().some(x => docParent(x) === docPath)) { toast("Videz d'abord ce dossier (documents et sous-dossiers)."); break; }
      const gone = docPath; docPath = docParent(gone);
      await docSaveFolders(docFoldersSaved().filter(x => x !== gone && !x.startsWith(gone + "/")));
      render(); toast("Dossier supprimé."); break;
    }
    case "delDoc": {
      if (!confirm("Supprimer ce document pour tout le foyer ?")) break;
      closeSheet(); const d = S.docs.find(x => x.id === v); await remove("docs", v);
      if (d && mode === "cloud" && d.file_path) await sb.storage.from("household-docs").remove([d.file_path]);
      toast("Document supprimé."); break;
    }
    case "newSlot": closeSheet(); if (!S.v3) { view = "edt"; render(); break; } slotSheet(null); break;
    case "editSlot": slotSheet(S.sched.find(x => x.id === v)); break;
    case "delSlot": closeSheet(); { const x = S.sched.find(y => y.id === v); await remove("sched", v); if (x) toast("Créneau supprimé.", "Annuler", () => add("sched", x)); } break;
    case "edtDay": edtDay = +v; render(); break;
    case "recTab": recTab = v; render(); break;
    case "linkCarnet": {
      const on = v === "1";
      if (on && !confirm("Relier votre Carnet de menus à ce foyer ? Le menu et les courses du foyer seront ceux de votre Carnet, et tous les membres pourront les modifier.")) break;
      await setHh({ carnet_user: on ? user.id : null });
      toast(on ? "Carnet relié : ouvrez-le une fois pour lancer la synchronisation." : "Carnet délié.");
      break;
    }
  }
});
document.addEventListener("input", e => { if (e.target.id === "recQ") { recQ = e.target.value; const el = $("#recBook"); if (el) el.innerHTML = recBookHtml(); } });

const parseAmount = s => Math.round(parseFloat(String(s).replace(/\s/g, "").replace(",", ".")) * 100) / 100;
document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form]"); if (!f) return;
  const kind = f.dataset.form; if (!["bday", "exp", "budLimit", "doc", "docFolder", "slot", "recToMenu"].includes(kind)) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries()), id = sheetCtx && sheetCtx.id;
  switch (kind) {
    case "bday": {
      const day = Math.min(31, Math.max(1, parseInt(fd.day, 10) || 1)), month = +fd.month, year = parseInt(fd.year, 10) || null;
      const row = { name: fd.name.trim(), day, month, year: year && year >= 1900 && year <= 2100 ? year : null, member_id: chipVal(f, "member") || null, notes: fd.notes.trim() };
      closeSheet();
      if (id) await patch("bdays", id, row); else { await add("bdays", { ...row, created_at: new Date().toISOString() }); toast("Anniversaire ajouté."); }
      break;
    }
    case "exp": {
      const amount = parseAmount(fd.amount);
      if (!(amount >= 0)) { toast("Montant invalide : écrivez par exemple 12,50."); break; }
      const row = { label: fd.label.trim(), amount, kind: chipVal(f, "kind") || "out", category: chipVal(f, "category") || "Divers", paid_by: chipVal(f, "paid_by") || null, day: fd.day };
      closeSheet(); budMonth = row.day.slice(0, 7);
      if (id) await patch("exp", id, row); else { await add("exp", { ...row, created_at: new Date().toISOString() }); toast(row.kind === "in" ? "Rentrée ajoutée." : "Dépense ajoutée."); }
      break;
    }
    case "budLimit": { const v = fd.limit.trim() ? parseAmount(fd.limit) : null; closeSheet(); await setHh({ budget_limit: v && v > 0 ? v : null }); break; }
    case "docFolder": {
      const name = (fd.name || "").replace(/\//g, "-").trim(); if (!name) break;
      closeSheet();
      if (sheetCtx.rename) {
        const old = docPath, nw = docParent(old) ? docParent(old) + "/" + name : name;
        if (nw === old) break;
        if (docFolders().includes(nw)) { toast("Un dossier porte déjà ce nom."); break; }
        const mv = p => p === old ? nw : p.startsWith(old + "/") ? nw + p.slice(old.length) : p;
        for (const d of S.docs.filter(x => x.category === old || x.category.startsWith(old + "/"))) await patch("docs", d.id, { category: mv(d.category) });
        await docSaveFolders(docFoldersSaved().map(mv).concat(nw));
        docPath = nw; render(); toast("Dossier renommé.");
      } else {
        const nw = docPath ? docPath + "/" + name : name;
        if (docFolders().includes(nw)) { docPath = nw; render(); break; }
        await docSaveFolders([...docFoldersSaved(), nw]);
        docPath = nw; render(); window.scrollTo(0, 0); toast("Dossier créé.");
      }
      break;
    }
    case "doc": {
      const btn = f.querySelector("[type=submit]");
      const meta = { category: fd.folder || "Autre", member_id: chipVal(f, "member") || null, expires_on: fd.expires_on || null, notes: fd.notes.trim() };
      if (id) { closeSheet(); await patch("docs", id, { ...meta, title: fd.title.trim() }); break; }
      const file = f.querySelector("[name=file]").files[0]; if (!file) break;
      if (file.size > 10 * 1024 * 1024) { toast("Fichier trop lourd : 10 Mo maximum."); break; }
      btn.disabled = true; btn.textContent = "Envoi…";
      const docId = uuid(), title = fd.title.trim() || file.name.replace(/\.[^.]+$/, "");
      const row = { id: docId, ...meta, title, file_name: file.name, mime: file.type || "", size: file.size, created_at: new Date().toISOString() };
      try {
        if (mode === "cloud") {
          const path = `${S.hh.id}/${docId}-${file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60)}`;
          const { error } = await sb.storage.from("household-docs").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (error) throw error;
          row.file_path = path;
        } else {
          if (file.size > 1.5 * 1024 * 1024) { toast("En mode démo, les fichiers sont limités à 1,5 Mo."); btn.disabled = false; btn.textContent = "Enregistrer"; break; }
          row.data = await readAsDataURL(file);
        }
        closeSheet(); await add("docs", row); toast("Document ajouté.");
      } catch (er) { console.warn(er); btn.disabled = false; btn.textContent = "Enregistrer"; toast("L'envoi n'a pas abouti. Réessayez dans un instant."); }
      break;
    }
    case "slot": {
      const who = chipVal(f, "member"); if (!who) { toast("Choisissez pour qui est ce créneau."); break; }
      const base = { member_id: who, start_time: fd.start, end_time: fd.end, title: fd.title.trim(), place: fd.place.trim() };
      if (base.end_time <= base.start_time) { toast("L'heure de fin doit être après le début."); break; }
      closeSheet();
      if (id) await patch("sched", id, { ...base, weekday: +(chipVal(f, "weekday") || edtDay) });
      else { const days = chipVals(f, "weekday").map(Number); if (!days.length) days.push(edtDay); await addMany("sched", days.map(w => ({ ...base, weekday: w, created_at: new Date().toISOString() }))); edtDay = days[0]; render(); toast(days.length > 1 ? `${days.length} créneaux ajoutés.` : "Créneau ajouté."); }
      break;
    }
    case "recToMenu": {
      const day = chipVal(f, "day") || today(), slot = chipVal(f, "slot") || "soir", rid = sheetCtx.recipe;
      closeSheet();
      const m = mealAt(day, slot), row = { recipe_id: rid, label: "", updated_at: new Date().toISOString() };
      if (m) await patch("meals", m.id, row); else await add("meals", { day, slot, cook: null, ...row });
      toast(`Au menu : ${dayLabel(day).toLowerCase()}, ${slot}.`);
      break;
    }
  }
});

/* ---------- demo data for the new modules ---------- */
function demoUpgrade3(d) {
  if (!d) return d;
  d.v3 = true;
  d.v4 = true; if (!d.photos) d.photos = [];
  const t = today(), td = parse(t), hid = "demo";
  if (!d.bdays) d.bdays = [
    { id: uuid(), household_id: hid, name: "Marie", day: parse(addDays(t, 12)).getDate(), month: parse(addDays(t, 12)).getMonth() + 1, year: 1985, member_id: "m2", notes: "" },
    { id: uuid(), household_id: hid, name: "Léa", day: 14, month: 3, year: 2015, member_id: "m3", notes: "" },
    { id: uuid(), household_id: hid, name: "Mamie Jeanne", day: parse(addDays(t, 4)).getDate(), month: parse(addDays(t, 4)).getMonth() + 1, year: 1948, member_id: null, notes: "Elle aimerait un livre de jardinage." }
  ];
  if (!d.exp) {
    const e = (label, amount, category, paid_by, ago, kind = "out") => ({ id: uuid(), household_id: hid, label, amount, kind, category, paid_by, day: addDays(t, -ago), created_at: new Date().toISOString() });
    d.exp = [e("Supermarché", 84.3, "Courses", "m1", 0), e("Cantine de Léa", 46, "Enfants", "m2", 2), e("Électricité", 72.15, "Factures", null, 5), e("Plein d'essence", 61.2, "Transport", "m1", 6), e("Cinéma", 28, "Loisirs", "m2", Math.min(9, td.getDate() - 1))].filter(x => x.day.slice(0, 7) === t.slice(0, 7) || x.category !== "Loisirs");
  }
  if (!d.docs) d.docs = [
    { id: uuid(), household_id: hid, title: "Passeport de Franck", category: "Identité", member_id: "m1", file_name: "", mime: "", size: 0, expires_on: addDays(t, 21), notes: "Original dans le tiroir du bureau." },
    { id: uuid(), household_id: hid, title: "Assurance habitation", category: "Assurances", member_id: null, file_name: "", mime: "application/pdf", size: 0, expires_on: addDays(t, 200), notes: "" },
    { id: uuid(), household_id: hid, title: "Carnet de santé de Léa", category: "Santé", member_id: "m3", file_name: "", mime: "image/jpeg", size: 0, expires_on: null, notes: "" }
  ];
  if (!d.sched) {
    const s = (member_id, weekday, start_time, end_time, title, place = "") => ({ id: uuid(), household_id: hid, member_id, weekday, start_time, end_time, title, place });
    d.sched = [1, 2, 4, 5].map(w => s("m3", w, "08:30", "16:30", "École", "École Jules Ferry")).concat([s("m3", 3, "08:30", "12:00", "École", "École Jules Ferry"), s("m3", 3, "14:00", "15:30", "Judo")],
      [1, 2, 3, 4, 5].map(w => s("m1", w, "09:00", "18:00", "Travail")), [1, 2, 4].map(w => s("m2", w, "08:00", "17:00", "Travail")));
  }
  return d;
}

/* ---------- gallery ---------- */
TABLES.photos = "photos";
const PH_BUCKET = "household-photos";
let phAlbum = "", phPending = [], lbList = [], lbIdx = -1;
const purl = {}; // signed address cache: path -> { url, until }
function v4Notice() { return `<div class="empty"><strong>Encore une étape.</strong>Collez le script <b>supabase/migrations/0004_galerie.sql</b> dans Supabase (comme les précédents), puis rouvrez l'appli.</div>`; }
const albums = () => [...new Set(S.photos.map(p => p.album).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const phSorted = () => S.photos.filter(p => !phAlbum || p.album === phAlbum).sort((a, b) => String(b.taken_at || b.created_at).localeCompare(String(a.taken_at || a.created_at)));

async function signPaths(paths) {
  const now = Date.now(), need = [...new Set(paths)].filter(p => p && !(purl[p] && purl[p].until > now + 6e4));
  if (!need.length || mode !== "cloud") return;
  for (let i = 0; i < need.length; i += 100) {
    const { data, error } = await sb.storage.from(PH_BUCKET).createSignedUrls(need.slice(i, i + 100), 3600);
    if (error || !data) continue;
    for (const d of data) if (d.signedUrl) purl[d.path] = { url: d.signedUrl, until: now + 3500e3 };
  }
}
async function photoSrc(p, full) {
  if (mode !== "cloud") return full ? (p.data || p.thumb) : p.thumb;
  const path = full ? p.file_path : p.thumb_path;
  await signPaths([path]);
  return purl[path] ? purl[path].url : "";
}

VIEWS.galerie = function () {
  if (!S.v4) return v4Notice();
  const al = albums(), list = phSorted();
  let grid = "", lastMonth = "";
  list.forEach((p, i) => {
    const mth = String(p.taken_at || p.created_at).slice(0, 7);
    if (mth !== lastMonth) { grid += `${lastMonth ? "</div>" : ""}<p class="group-h">${esc(cap(monthName(mth + "-01")))}</p><div class="ph-grid">`; lastMonth = mth; }
    grid += `<button class="ph" data-act="lbOpen" data-v="${i}" aria-label="Photo${p.caption ? " : " + esc(p.caption) : ""}"><img data-ph="${p.id}" alt="" loading="lazy"></button>`;
  });
  if (lastMonth) grid += "</div>";
  return `${al.length ? `<div class="who" style="margin-top:4px"><button class="plain" data-act="phAlbum" data-v="" aria-pressed="${!phAlbum}">Toutes</button>${al.map(a => `<button class="plain" data-act="phAlbum" data-v="${esc(a)}" aria-pressed="${phAlbum === a}">${esc(a)} <span class="muted">${S.photos.filter(p => p.album === a).length}</span></button>`).join("")}</div>` : ""}
    ${list.length ? grid : `<div class="empty" style="margin-top:12px"><strong>Aucune photo pour l'instant.</strong>Ajoutez des photos depuis votre téléphone : tout le foyer les verra, et elles restent privées.</div>`}`;
};
async function fillThumbs() {
  const imgs = [...document.querySelectorAll("img[data-ph]")];
  if (!imgs.length) return;
  const byId = Object.fromEntries(S.photos.map(p => [p.id, p]));
  if (mode === "cloud") await signPaths(imgs.map(i => (byId[i.dataset.ph] || {}).thumb_path));
  for (const i of imgs) { const p = byId[i.dataset.ph]; if (!p || i.src) continue; const u = mode === "cloud" ? (purl[p.thumb_path] || {}).url : p.thumb; if (u) i.src = u; }
}
function afterRender() {
  if (view === "galerie") fillThumbs();
  if (view !== "domotique") { domHeroLive = null; return; }
  const slot = document.querySelector(".dom-hero-photo");
  if (domHeroLive && slot && slot !== domHeroLive && slot.parentNode) slot.replaceWith(domHeroLive);
  domHeroLive = document.querySelector(".dom-hero-photo");
}

/* adding photos: pick → choose album → shrink → upload */
const phIn = document.createElement("input");
phIn.type = "file"; phIn.accept = "image/*"; phIn.multiple = true; phIn.hidden = true;
document.body.appendChild(phIn);
phIn.addEventListener("change", () => {
  phPending = [...phIn.files]; phIn.value = "";
  if (!phPending.length) return;
  if (mode === "demo" && S.photos.length + phPending.length > 12) { toast("En mode démo, la galerie est limitée à 12 photos."); phPending = phPending.slice(0, Math.max(0, 12 - S.photos.length)); if (!phPending.length) return; }
  const al = albums();
  openSheet(phPending.length > 1 ? `Ajouter ${phPending.length} photos` : "Ajouter la photo", `
    <form data-form="phUpload">
      <div class="field"><span class="label">Album</span>${chipsHtml("album", [["", "Aucun"], ...al.map(a => [a, a])], phAlbum)}</div>
      <label class="field"><span class="label">Ou un nouvel album</span><input class="input" name="newAlbum" maxlength="40" placeholder="Ex. Vacances d'été"></label>
      ${phPending.length === 1 ? `<label class="field"><span class="label">Légende</span><input class="input" name="caption" maxlength="200" placeholder="Facultatif"></label>` : ""}
      <p class="muted small" style="margin-top:10px">Les photos sont réduites (≈ 1600 pixels) pour ménager l'espace du foyer.</p>
      <div class="sheet-sticky btns" style="margin-top:0"><button class="btn primary block" type="submit">Ajouter</button></div>
    </form>`);
});
async function shrink(file, max, q) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (e) { src = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = URL.createObjectURL(file); }); }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", q));
  return { blob, w: c.width, h: c.height };
}
const blobToDataURL = b => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(b); });
async function uploadPhotos(files, album, caption, btn) {
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    if (btn) btn.textContent = `Envoi ${i + 1} sur ${files.length}…`;
    const f = files[i], id = uuid();
    try {
      const big = await shrink(f, mode === "cloud" ? 1600 : 900, mode === "cloud" ? 0.82 : 0.7), small = await shrink(f, 420, 0.72);
      const row = { id, household_id: S.hh.id, member_id: S.me, album, caption: files.length === 1 ? caption : "", storage: "supabase", width: big.w, height: big.h, size: big.blob.size + small.blob.size,
        taken_at: f.lastModified ? new Date(f.lastModified).toISOString() : null, created_at: new Date().toISOString() };
      if (mode === "cloud") {
        row.file_path = `${S.hh.id}/${id}.jpg`; row.thumb_path = `${S.hh.id}/${id}-t.jpg`;
        let r = await sb.storage.from(PH_BUCKET).upload(row.file_path, big.blob, { contentType: "image/jpeg" }); if (r.error) throw r.error;
        r = await sb.storage.from(PH_BUCKET).upload(row.thumb_path, small.blob, { contentType: "image/jpeg" }); if (r.error) throw r.error;
        r = await sb.from("photos").insert(row); if (r.error) { await sb.storage.from(PH_BUCKET).remove([row.file_path, row.thumb_path]); throw r.error; }
      } else { row.file_path = row.thumb_path = ""; row.data = await blobToDataURL(big.blob); row.thumb = await blobToDataURL(small.blob); }
      S.photos.unshift(row); ok++; saveLocal();
    } catch (e) { console.warn(e); }
  }
  return ok;
}

/* full-screen viewer */
function lbOpen(i) {
  lbList = phSorted(); lbIdx = i;
  let el = $("#lb");
  if (!el) { el = document.createElement("div"); el.id = "lb"; el.className = "lb"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
  el.hidden = false; document.body.style.overflow = "hidden"; lbDraw();
}
function lbClose() { const el = $("#lb"); if (el) el.hidden = true; document.body.style.overflow = ""; lbIdx = -1; }
async function lbDraw() {
  const el = $("#lb"), p = lbList[lbIdx]; if (!el || !p) return lbClose();
  const m = member(p.member_id), mine = p.member_id === S.me;
  const when = new Date(p.taken_at || p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  el.innerHTML = `<div class="lb-top"><button type="button" class="icon-btn plain mz-round-btn mz-round-btn--sm mz-round-btn--close" data-act="lbClose" aria-label="Fermer">${I.close}</button><span>${lbIdx + 1} / ${lbList.length}</span><span style="width:44px"></span></div>
    <div class="lb-img"><img id="lbImg" alt="${esc(p.caption || "Photo")}"></div>
    <div class="lb-info">${p.caption ? `<p style="margin:0 0 4px">${esc(p.caption)}</p>` : ""}<span class="small">${m ? esc(m.name) + " · " : ""}${esc(when)}${p.album ? " · " + esc(p.album) : ""}</span>
      <div class="btns" style="margin-top:10px"><button class="btn" data-act="lbSave">Enregistrer</button><button class="btn" data-act="lbAlbum">Album</button>${mine ? `<button class="btn danger" data-act="lbDel">Supprimer</button>` : ""}</div></div>
    ${lbIdx > 0 ? `<button class="lb-nav prev" data-act="lbGo" data-v="-1" aria-label="Photo précédente">${I.left}</button>` : ""}${lbIdx < lbList.length - 1 ? `<button class="lb-nav next" data-act="lbGo" data-v="1" aria-label="Photo suivante">${I.right}</button>` : ""}`;
  const img = $("#lbImg"), thumb = mode === "cloud" ? (purl[p.thumb_path] || {}).url : p.thumb;
  if (thumb) img.src = thumb;
  const full = await photoSrc(p, true); if (full && $("#lbImg") === img) img.src = full;
}
let lbX = null;
document.addEventListener("touchstart", e => { if (e.target.closest && e.target.closest("#lb .lb-img")) lbX = e.touches[0].clientX; }, { passive: true });
document.addEventListener("touchend", e => {
  if (lbX === null) return; const dx = e.changedTouches[0].clientX - lbX; lbX = null;
  if (Math.abs(dx) > 50) { const n = lbIdx + (dx < 0 ? 1 : -1); if (n >= 0 && n < lbList.length) { lbIdx = n; lbDraw(); } }
}, { passive: true });
document.addEventListener("keydown", e => {
  if (lbIdx < 0) return;
  if (e.key === "Escape") lbClose();
  if (e.key === "ArrowRight" && lbIdx < lbList.length - 1) { lbIdx++; lbDraw(); }
  if (e.key === "ArrowLeft" && lbIdx > 0) { lbIdx--; lbDraw(); }
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case "pickPhotos": closeSheet(); if (!S.v4) { view = "galerie"; render(); break; } phIn.click(); break;
    case "phAlbum": phAlbum = v; render(); break;
    case "lbOpen": lbOpen(+v); break;
    case "lbClose": lbClose(); break;
    case "lbGo": lbIdx += +v; lbDraw(); break;
    case "lbSave": {
      const p = lbList[lbIdx]; if (!p) break;
      try {
        const blob = await (await fetch(await photoSrc(p, true))).blob(), file = new File([blob], `photo-${String(p.taken_at || p.created_at).slice(0, 10)}.jpg`, { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (er) {} }
        else { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); }
      } catch (er) { toast("Impossible d'enregistrer : restez appuyé sur la photo, puis « Enregistrer »."); }
      break;
    }
    case "lbAlbum": {
      const p = lbList[lbIdx]; if (!p) break;
      openSheet("Changer d'album", `<form data-form="phAlbumSet"><div class="field"><span class="label">Album</span>${chipsHtml("album", [["", "Aucun"], ...albums().map(a => [a, a])], p.album)}</div>
        <label class="field"><span class="label">Ou un nouvel album</span><input class="input" name="newAlbum" maxlength="40"></label>
        <label class="field"><span class="label">Légende</span><input class="input" name="caption" maxlength="200" value="${esc(p.caption)}"></label>
        <div class="btns"><button class="btn primary block" type="submit">Enregistrer</button></div></form>`, { photo: p.id });
      break;
    }
    case "lbDel": {
      const p = lbList[lbIdx]; if (!p || !confirm("Supprimer cette photo pour tout le foyer ?")) break;
      await remove("photos", p.id);
      if (mode === "cloud" && !S.photos.some(x => x.id === p.id)) await sb.storage.from(PH_BUCKET).remove([p.file_path, p.thumb_path]);
      lbList = phSorted(); if (lbIdx >= lbList.length) lbIdx = lbList.length - 1; if (lbIdx < 0) lbClose(); else lbDraw();
      break;
    }
  }
});
document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form]"); if (!f || !["phUpload", "phAlbumSet"].includes(f.dataset.form)) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries()), album = (fd.newAlbum || "").trim() || chipVal(f, "album") || "";
  if (f.dataset.form === "phAlbumSet") { const id = sheetCtx.photo; closeSheet(); await patch("photos", id, { album, caption: (fd.caption || "").trim() }); if (lbIdx >= 0) { lbList = phSorted(); lbIdx = Math.max(0, lbList.findIndex(x => x.id === id)); lbDraw(); } return; }
  const btn = f.querySelector("[type=submit]"); btn.disabled = true;
  const files = phPending; phPending = [];
  const n = await uploadPhotos(files, album, (fd.caption || "").trim(), btn);
  closeSheet(); phAlbum = album; view = "galerie"; render();
  toast(n === files.length ? (n > 1 ? `${n} photos ajoutées.` : "Photo ajoutée.") : `${n} sur ${files.length} photos ajoutées. Réessayez pour les autres (réseau ?).`);
});

/* Carnet de menus link, shown in Ma famille */
const foyerViewCarnet = VIEWS.foyer;
VIEWS.foyer = function () {
  let card = "";
  if (mode === "cloud" && S.v5) {
    const owner = S.members.find(m => m.user_id === S.hh.carnet_user);
    card = `<h2>Carnet de menus</h2><div class="card">${
      (user && S.hh.carnet_user === user.id) ? `<p style="margin:0 0 6px"><strong>Votre Carnet est le carnet commun du foyer.</strong></p><p class="muted small">Chaque membre qui a un compte retrouve dans son Carnet de menus les mêmes menus, courses, cave, favoris et notes. Le menu et les courses sont aussi synchronisés avec Maisonnée.</p><div class="btns"><a class="btn" href="${CARNET_URL}">Ouvrir le Carnet</a><button class="btn ghost danger" data-act="linkCarnet" data-v="0">Délier</button></div>`
      : S.hh.carnet_user ? `<p style="margin:0"><strong>Carnet commun du foyer : celui de ${esc(owner ? owner.name : "un membre")}.</strong></p><p class="muted small" style="margin-top:6px">Ouvrez le Carnet de menus avec votre propre compte : vous y retrouvez les mêmes menus, courses, cave, favoris et notes que tout le foyer.</p><div class="btns"><a class="btn" href="${CARNET_URL}">Ouvrir le Carnet</a></div>`
      : `<p class="muted small" style="margin:0">Reliez votre Carnet de menus : le menu de la semaine et la liste de courses seront les mêmes dans les deux applis, dans les deux sens.</p><div class="btns"><button class="btn primary" data-act="linkCarnet" data-v="1">Relier mon Carnet</button></div>`}</div>`;
  } else if (mode === "cloud" && !S.v5) card = `<h2>Carnet de menus</h2><div class="empty"><strong>Encore une étape.</strong>Collez le script <b>supabase/migrations/0005_carnet_google.sql</b> dans Supabase pour relier votre Carnet, Google Agenda et les adresses.</div>`;
  return foyerViewCarnet() + card;
};

/* storage used, shown in Ma famille */
const foyerView0 = VIEWS.foyer;
VIEWS.foyer = function () {
  const used = S.photos.reduce((a, p) => a + (p.size || 0), 0) + S.docs.reduce((a, d) => a + (d.size || 0), 0), mo = used / 1048576;
  const pct = Math.min(100, Math.round(mo / 1024 * 100));
  return foyerView0() + (mode === "cloud" ? `<h2>Espace de stockage</h2><div class="card"><strong>${mo < 10 ? mo.toFixed(1).replace(".", ",") : Math.round(mo)} Mo utilisés</strong> <span class="muted small">sur 1 Go gratuits</span>
    <div class="meter" style="margin-top:10px"><i style="width:${Math.max(pct, used ? 1 : 0)}%;background:${pct > 85 ? "var(--late)" : "var(--accent)"}"></i></div>
    <span class="muted small">Photos de la galerie et documents. Les photos de recettes du Carnet comptent aussi dans ce 1 Go.</span></div>` : "");
};

/* ---------- Google Agenda via Supabase (lecture seule) ---------- */
const G = { tok: null, cals: LS.get("mz_gcals", null), list: LS.get("mz_gcallist", []), ev: LS.get("mz_gev", { at: 0, items: [] }), after: null, err: null, busy: false, connected: false };
const G_ENDPOINT = SB_URL + "/functions/v1/google-calendar";
const gClient = () => (S.hh && S.hh.google_client_id) || "";
const gValid = () => !!(G.tok && G.tok.exp > Date.now() + 60e3);
const gOn = () => !!(G.connected || G.ev.items.length);
async function gServer(action, method = "GET") {
  if (!sb) await loadSb();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("Connexion Maisonnée requise");
  const res = await fetch(G_ENDPOINT + "/" + action, { method, headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Erreur Google Agenda");
  return body;
}
async function gEnsure() {
  if (gValid()) return true;
  if (mode !== "cloud" || !user) return false;
  try {
    const t = await gServer("token");
    G.connected = !!t.connected;
    if (!t.connected || !t.access_token) { G.tok = null; return false; }
    G.tok = { t: t.access_token, exp: Date.parse(t.expires_at) || Date.now() + 3500e3 };
    return true;
  } catch (e) { console.warn("Google Agenda", e); return false; }
}
async function gConnect(silent, then) {
  try {
    const r = await gServer("start", "POST");
    LS.set("mz_greturn", then || view);
    location.href = r.url;
  } catch (e) { toast("Connexion Google impossible : " + e.message); }
}
(function gReturn() {
  const url = new URL(location.href), result = url.searchParams.get("google");
  if (!result) return;
  G.after = LS.get("mz_greturn", "foyer");
  LS.del("mz_greturn");
  G.err = result === "connected" ? null : result;
  url.searchParams.delete("google");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
})();
async function gApi(path) {
  const r = await fetch("https://www.googleapis.com/calendar/v3/" + path, { headers: { Authorization: "Bearer " + G.tok.t } });
  if (r.status === 401) { G.tok = null; throw new Error("expired"); }
  if (!r.ok) throw new Error("google " + r.status);
  return r.json();
}
/* Google Tasks — ressources natives du compte Google connecté, non dupliquées dans Supabase.
   L'API Tasks n'enregistre que la DATE (jamais une heure ni un rappel personnalisé). */
const GTASKS = { enabled: LS.get("mz_gtasks_enabled", false), lists: [], items: [], at: 0, busy: false, error: "", permission: false, userId: null };
const gTasksDay = task => task && task.due ? String(task.due).slice(0, 10) : "";
async function gTasksApi(path, method = "GET", payload) {
  if (!(await gEnsure())) throw new Error("Connecte ton compte Google depuis Ma famille.");
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/" + path, {
    method, headers: { Authorization: "Bearer " + G.tok.t, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  if (res.status === 401) { G.tok = null; throw new Error("Session Google expirée. Reconnecte Google depuis Ma famille."); }
  if (res.status === 403) { GTASKS.permission = true; throw new Error("Google Tasks n'est pas autorisé ou l'API Tasks n'est pas activée. Reconnecte Google depuis Ma famille puis vérifie l'API Tasks dans Google Cloud."); }
  if (res.status === 404) throw new Error("Liste ou tâche Google introuvable. Actualise Google Tasks.");
  if (!res.ok) throw new Error("Google Tasks : erreur " + res.status);
  return res.status === 204 ? null : res.json();
}
async function gTasksRefresh(force = false) {
  if (!GTASKS.enabled || mode !== "cloud" || !user || GTASKS.busy) return;
  if (GTASKS.userId !== user.id) {
    GTASKS.userId = user.id;
    GTASKS.items = [];
    GTASKS.lists = [];
    GTASKS.at = 0;
  }
  if (!force && Date.now() - GTASKS.at < 120000) return;
  GTASKS.busy = true;
  GTASKS.at = Date.now();
  try {
    const lists = [];
    let page = "";
    do {
      const part = await gTasksApi("users/@me/lists?maxResults=100" + (page ? "&pageToken=" + encodeURIComponent(page) : ""));
      lists.push(...(part.items || []));
      page = part.nextPageToken || "";
    } while (page && lists.length < 500);
    GTASKS.lists = lists;
    const items = [];
    for (const list of lists) {
      let next = "", n = 0;
      do {
        const part = await gTasksApi("lists/" + encodeURIComponent(list.id) + "/tasks?maxResults=100&showCompleted=true&showHidden=false&showDeleted=false" + (next ? "&pageToken=" + encodeURIComponent(next) : ""));
        items.push(...(part.items || []).map(task => ({ ...task, listId: list.id, listName: list.title })));
        next = part.nextPageToken || "";
      } while (next && ++n < 20);
    }
    GTASKS.items = items;
    GTASKS.error = "";
    GTASKS.permission = false;
  } catch (err) {
    GTASKS.error = err?.message || "Lecture Google Tasks impossible.";
  } finally {
    GTASKS.busy = false;
    gTasksFillFormLists();
    if (view === "agenda" && !document.querySelector("#sheet")?.open) softRender();
  }
}
function gTasksFillFormLists() {
  const select = document.querySelector('#sheetIn [name="google_list"]');
  if (!select) return;
  const selected = select.dataset.selected || select.value;
  select.innerHTML = GTASKS.lists.length
    ? GTASKS.lists.map(x => `<option value="${esc(x.id)}" ${x.id === selected ? "selected" : ""}>${esc(x.title)}</option>`).join("")
    : '<option value="">Aucune liste disponible</option>';
  if (!GTASKS.lists.some(x => x.id === selected) && GTASKS.lists.length) select.value = GTASKS.lists[0].id;
  const info = document.getElementById("gTaskInfo");
  if (info) info.textContent = GTASKS.error || "Google Tasks conserve la date et les notes ; son API ne gère ni heure, ni répétition, ni rappel personnalisé.";
}
function gTasksStart() {
  GTASKS.enabled = true;
  GTASKS.at = 0;
  LS.set("mz_gtasks_enabled", true);
  gTasksRefresh(true);
}
const gTasksOn = day => GTASKS.enabled && user && GTASKS.userId === user.id
  ? GTASKS.items.filter(t => gTasksDay(t) === day) : [];
function gTasksRow(task) {
  const done = task.status === "completed";
  return `<div class="row ev-row gtask-row">
    <button class="check ${done ? "on" : ""}" data-act="gTaskDone" data-v="${esc(task.id)}" data-list="${esc(task.listId)}" aria-label="${done ? "Réactiver" : "Terminer"} la tâche ${esc(task.title || "")}">${I.tick}</button>
    <button class="open" data-act="gTaskEdit" data-v="${esc(task.id)}" data-list="${esc(task.listId)}">
      <span class="ev-time allday">Tâche</span><span class="main"><span class="t">${esc(task.title || "Sans titre")}</span><span class="m">Google Tasks · ${esc(task.listName || "")}${done ? " · Terminée" : ""}</span></span>
    </button></div>`;
}
function gTasksSheetFill() {
  gTasksFillFormLists();
  if (GTASKS.enabled && !GTASKS.lists.length && !GTASKS.busy) gTasksRefresh(true);
}
async function gTasksSave(row, existing = null) {
  const listId = existing?.listId || row.listId;
  if (!listId) throw new Error("Choisis une liste Google Tasks.");
  const payload = { title: row.title, notes: row.notes || "", due: row.day ? row.day + "T12:00:00.000Z" : null };
  const path = "lists/" + encodeURIComponent(listId) + "/tasks" + (existing ? "/" + encodeURIComponent(existing.id) : "");
  await gTasksApi(path, existing ? "PATCH" : "POST", payload);
  GTASKS.at = 0;
  await gTasksRefresh(true);
}
async function gTasksRemove(task) {
  await gTasksApi("lists/" + encodeURIComponent(task.listId) + "/tasks/" + encodeURIComponent(task.id), "DELETE");
  GTASKS.at = 0;
  await gTasksRefresh(true);
}
async function gTasksComplete(task) {
  await gTasksApi("lists/" + encodeURIComponent(task.listId) + "/tasks/" + encodeURIComponent(task.id), "PATCH", { status: task.status === "completed" ? "needsAction" : "completed" });
  GTASKS.at = 0;
  await gTasksRefresh(true);
}

async function gFetch() {
  if (G.busy || !(await gEnsure())) return;
  G.busy = true;
  try {
    const cl = await gApi("users/me/calendarList?minAccessRole=reader&maxResults=250");
    // colours chosen for a single event in Google (« Tomate », « Paon »…) override the calendar's colour
    if (!G.palette) { try { const co = await gApi("colors"); G.palette = Object.fromEntries(Object.entries(co.event || {}).map(([k, v]) => [k, v.background])); } catch (_) { G.palette = {}; } }
    G.list = (cl.items || []).map(c => ({ id: c.id, name: c.summaryOverride || c.summary || c.id, color: c.backgroundColor || "#4C8DF6", primary: !!c.primary, accessRole: c.accessRole || "reader", on: !!c.selected || !!c.primary, defRem: (c.defaultReminders || []).filter(r => r.method === "popup").map(r => r.minutes) }));
    LS.set("mz_gcallist", G.list);
    if (!G.cals) { G.cals = G.list.filter(c => c.on).map(c => c.id); LS.set("mz_gcals", G.cals); }
    const tMin = new Date(parse(addDays(today(), -40))).toISOString(), tMax = new Date(parse(addDays(today(), 150))).toISOString(), items = [];
    for (const c of G.list.filter(c => G.cals.includes(c.id))) {
      let page = "";
      do {
        const j = await gApi(`calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=2500&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}${page ? "&pageToken=" + page : ""}`);
        for (const e of j.items || []) {
          if (e.status === "cancelled" || e.eventType === "birthday") continue;
          const base = { id: e.id, cal: c.id, calName: c.name, colorId: e.colorId || "", color: (e.colorId && G.palette[e.colorId]) || c.color, title: e.summary || "(Sans titre)", place: e.location || "", link: e.htmlLink || "", desc: e.description || "", gs: e.start || null, ge: e.end || null, rec: !!e.recurringEventId, rem: e.reminders || null };
          if (e.start && e.start.date) {
            const end = e.end && e.end.date ? e.end.date : addDays(e.start.date, 1);
            const nd = Math.min(31, Math.max(1, diffDays(e.start.date, end)));
            for (let d = e.start.date, k = 0; d < end && k < 31; d = addDays(d, 1), k++) items.push({ ...base, day: d, start_time: null, end_time: null, k, n: nd, endDay: addDays(end, -1) });
          } else if (e.start && e.start.dateTime) {
            const st = new Date(e.start.dateTime), en = e.end && e.end.dateTime ? new Date(e.end.dateTime) : null, day = ymd(st);
            const hhmm = x => pad(x.getHours()) + ":" + pad(x.getMinutes());
            const lastDay = en ? (hhmm(en) === "00:00" ? addDays(ymd(en), -1) : ymd(en)) : day, n = Math.min(31, Math.max(1, diffDays(day, lastDay) + 1));
            if (n === 1) items.push({ ...base, day, start_time: hhmm(st), end_time: en && ymd(en) === day ? hhmm(en) : null });
            else for (let k = 0; k < n; k++) items.push({ ...base, day: addDays(day, k), start_time: k === 0 ? hhmm(st) : null, end_time: k === n - 1 && hhmm(en) !== "00:00" ? hhmm(en) : null, k, n, endDay: lastDay });
          }
        }
        page = j.nextPageToken || "";
      } while (page);
    }
    G.ev = { at: Date.now(), items }; LS.set("mz_gev", G.ev);
  } catch (e) { if (e.message !== "expired") toast("Google Agenda ne répond pas pour l'instant."); }
  finally { G.busy = false; softRender(); }
}
async function gRefresh(then) { if (await gEnsure()) gFetch(); else toast("Reconnectez Google Agenda depuis Ma famille."); }
// Calendrier › « Agendas affichés »: which Google calendars appear in the calendar (on this phone)
function gCalsSheet() {
  openSheet("Agendas affichés", `<p class="muted small" style="margin:6px 0 10px">Touchez un agenda pour l'afficher ou le masquer dans le Calendrier (sur ce téléphone).</p>
    <div class="chips">${G.list.map(c => `<button class="chip" data-act="gCal" data-v="${esc(c.id)}" aria-pressed="${!!(G.cals && G.cals.includes(c.id))}"><span class="cat-dot" style="--c:${esc(c.color)}"></span>${esc(c.name)}</button>`).join("")}</div>
    <div class="sheet-sticky btns"><button class="btn primary block" data-act="closeSheet">Terminé</button></div>`);
}
const gEventsOn = day => G.ev.items.filter(e => e.day === day && (!G.cals || G.cals.includes(e.cal))).sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));
// a Google event as the Maisonnée form expects it
function gToForm(ev) {
  const hhmm = x => pad(x.getHours()) + ":" + pad(x.getMinutes());
  let day, end_day, start_time = null, end_time = null;
  if (ev.gs.date) { day = ev.gs.date; end_day = addDays(ev.ge && ev.ge.date ? ev.ge.date : addDays(day, 1), -1); }
  else {
    const st = new Date(ev.gs.dateTime), en = ev.ge && ev.ge.dateTime ? new Date(ev.ge.dateTime) : new Date(st.getTime() + 3600e3);
    day = ymd(st); start_time = hhmm(st);
    if (hhmm(en) === "00:00" && ymd(en) > day) { end_day = addDays(ymd(en), -1); end_time = "23:59"; } else { end_day = ymd(en); end_time = hhmm(en); }
  }
  return { id: "g:" + ev.id, title: ev.title, day, end_day: end_day > day ? end_day : null, start_time, end_time, place: ev.place, notes: ev.desc, repeat: "none", members: [], kind: null };
}
function gRow(e) {
  const multi = (e.n || 1) > 1, last = multi && e.k === e.n - 1;
  const span = !multi ? "" : e.k === 0 ? "jusqu'au " + esc(parse(e.endDay).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })) + " · " : last ? `dernier jour · ${e.n}/${e.n} · ` : `jour ${e.k + 1}/${e.n} · `;
  const t = last && e.end_time ? "→ " + esc(hm(e.end_time)) : e.start_time ? esc(hm(e.start_time)) : "Journée";
  if (multi) e = { ...e, end_time: null };
  const cal = G.list.find(c => c.id === e.cal), canW = cal && (!cal.accessRole || cal.accessRole === "owner" || cal.accessRole === "writer");
  const remOn = e.rem ? (e.rem.useDefault ? ((cal && cal.defRem) || []).length > 0 : (e.rem.overrides || []).length > 0) : !!(cal && cal.defRem && cal.defRem.length);
  const bell = canW && e.gs && (!multi || e.k === 0) ? `<button class="bell-btn ${remOn ? "on" : ""}" data-act="remSheet" data-src="g" data-v="${esc(e.id)}" data-day="${e.day}" aria-label="${remOn ? "Voir ou changer les rappels" : "Ajouter un rappel"}">🔔</button>` : "";
  return `<div class="row ev-row"><button class="open" data-act="gEvent" data-v="${esc(e.id)}" data-day="${e.day}"><span class="ev-time ${t === "Journée" ? "allday" : ""}">${t}</span><span class="gbar" style="background:${esc(e.color)}"></span><span class="main"><span class="t">${esc(e.title)}</span><span class="m">${e.colorId && gColorNames()[e.colorId] ? `<span class="who-tag" style="--c:${esc(e.color)}">${esc(gColorNames()[e.colorId])}</span> · ` : ""}${span}${e.end_time ? "jusqu'à " + esc(hm(e.end_time)) + " · " : ""}${e.place ? esc(e.place) + " · " : ""}Google · ${esc(e.calName)}</span></span></button>${bell}</div>`;
}
function gColorsSheet() {
  const names = gColorNames();
  const used = new Set(G.ev.items.map(e => e.colorId).filter(Boolean));
  openSheet("Couleurs des enfants", `<p class="muted small" style="margin-top:6px">Donnez un prénom aux couleurs utilisées dans Google Agenda. Les rendez-vous de cette couleur afficheront ce prénom, et vous pourrez choisir la personne en créant un rendez-vous.${used.size ? " Les couleurs déjà utilisées dans vos agendas sont en premier." : ""}</p>
    <form data-form="gColors">${[...G_COLORS].sort((a, b) => used.has(b[0]) - used.has(a[0])).map(([id, n]) => `<label class="field inline" style="gap:12px;align-items:center;margin-top:10px">
      <span class="cat-dot" style="--c:${esc(gColorHex(id))};width:22px;height:22px"></span><span style="width:86px;flex:none" class="small">${n}${used.has(id) ? " ●" : ""}</span>
      <input class="input" name="c${id}" value="${esc(names[id] || "")}" maxlength="30" placeholder="Prénom (facultatif)"></label>`).join("")}
      <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer</button></div></form>`);
}
document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form=gColors]"); if (!f) return;
  e.preventDefault();
  const fd = new FormData(f), out = {};
  for (const [id] of G_COLORS) { const v = String(fd.get("c" + id) || "").trim(); if (v) out[id] = v; }
  closeSheet();
  LS.set("mz_gcolor_names", out);
  if (mode === "cloud" && S.hh && "google_colors" in S.hh) await setHh({ google_colors: out });
  else render();
  toast("Couleurs enregistrées.");
});
// Google birthdays → the household's Anniversaires (shared with everyone)
async function gImportBdays() {
  if (!S.v3) { toast("Le module Anniversaires n'est pas encore installé."); return; }
  if (!(await gEnsure())) { toast("Connectez Google Agenda depuis Ma famille."); return; }
  const tMin = new Date().toISOString(), tMax = new Date(Date.now() + 367 * 864e5).toISOString();
  let items = [];
  try { const j = await gApi(`calendars/primary/events?eventTypes=birthday&singleEvents=true&maxResults=2500&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}`); items = j.items || []; } catch (e) {}
  if (!items.length) { try { const j = await gApi(`calendars/${encodeURIComponent("addressbook#contacts@group.v.calendar.google.com")}/events?singleEvents=true&maxResults=2500&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}`); items = j.items || []; } catch (e) {} }
  const nk = x => String(x).trim().toLowerCase(), have = new Set(S.bdays.map(b => nk(b.name) + "|" + b.day + "|" + b.month)), rows = [];
  for (const e of items) {
    const d = e.start && (e.start.date || String(e.start.dateTime || "").slice(0, 10)); if (!d) continue;
    const name = String(e.summary || "").replace(/^(anniversaire\s+(de\s+|d['’]\s*)|anniv\.?\s+)/i, "").replace(/(['’]s)?\s+birthday$/i, "").trim();
    if (!name) continue;
    const dt = parse(d), key = nk(name) + "|" + dt.getDate() + "|" + (dt.getMonth() + 1);
    if (have.has(key)) continue; have.add(key);
    rows.push({ name: name.slice(0, 60), day: dt.getDate(), month: dt.getMonth() + 1, year: null, member_id: null, notes: "Importé de Google", created_at: new Date().toISOString() });
  }
  if (rows.length) await addMany("bdays", rows);
  view = "anniv"; render();
  toast(rows.length ? `${rows.length} anniversaire${rows.length > 1 ? "s" : ""} importé${rows.length > 1 ? "s" : ""} de Google.` : items.length ? "Tous vos anniversaires Google sont déjà là." : "Aucun anniversaire trouvé dans votre agenda Google.");
}
function gCard() {
  if (mode !== "cloud") return `<h2>Agenda Google</h2><div class="card"><p class="muted small" style="margin:0">Disponible avec un vrai foyer (pas en mode démo).</p></div>`;
  if (!S.v5) return "";
  if (!gClient()) return `<h2>Agenda Google</h2><div class="card">
    <p class="small" style="margin:0 0 8px">Pour afficher vos agendas et anniversaires Google, il faut une fois créer un « identifiant client » dans la console Google (gratuit). Le guide est dans le fichier LISEZMOI du dossier maison.</p>
    <form data-form="gClient" class="inline"><input class="input" name="cid" placeholder="xxxx.apps.googleusercontent.com" required pattern=".+\\.apps\\.googleusercontent\\.com"><button class="btn ink" type="submit">Enregistrer</button></form></div>`;
  if (!G.connected && !G.ev.items.length) return `<h2>Agenda Google</h2><div class="card"><p class="small" style="margin:0">Affichez vos agendas Google dans le Calendrier (sur ce téléphone) et importez vos anniversaires.</p><div class="btns"><button class="btn primary" data-act="gConnect">Connecter mon agenda Google</button></div></div>`;
  return `<h2>Agenda Google</h2><div class="card">
    <p class="small" style="margin:0 0 8px">${G.ev.at ? "Mis à jour " + esc(ago(new Date(G.ev.at).toISOString())) : "Connecté"}. Visible sur ce téléphone seulement.</p>
    ${G.list.length ? `<div class="chips">${G.list.map(c => `<button class="chip" data-act="gCal" data-v="${esc(c.id)}" aria-pressed="${!!(G.cals && G.cals.includes(c.id))}"><span class="cat-dot" style="--c:${esc(c.color)}"></span>${esc(c.name)}</button>`).join("")}</div>` : ""}
    ${G.list.some(c => c.accessRole === "owner" || c.accessRole === "writer") ? `<label class="field"><span class="label">Agenda par défaut des nouveaux rendez-vous</span><select class="input" data-defdest><option value="local">Maisonnée (agenda familial)</option>${G.list.filter(c => c.accessRole === "owner" || c.accessRole === "writer").map(c => `<option value="${esc(c.id)}" ${defaultDest() === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    <div class="btns"><button class="btn" data-act="gRefresh">Actualiser</button><button class="btn" data-act="gBdays">Importer mes anniversaires</button><button class="btn" data-act="gColors">Couleurs des enfants</button><button class="btn ghost danger" data-act="gOff">Déconnecter</button></div></div>`;
}
const foyerViewG = VIEWS.foyer;
VIEWS.foyer = function () { return foyerViewG() + gCard(); };
if (G.ev.items.length && !G.ev.items[0].gs) G.ev.at = 0;
const gBoot = setInterval(() => {
  if (screen !== "app") return;
  clearInterval(gBoot);
  if (G.err && G.after) { toast(G.err === "cancelled" ? "Connexion Google annulée." : "Google n'a pas pu vous connecter : réessayez depuis Ma famille."); }
  if (G.after === "anniv-import") gImportBdays();
  else if (G.after) { view = G.after; render(); }
  gEnsure().then(ok => { if (ok && (G.after || Date.now() - G.ev.at > 15 * 60e3)) gFetch(); else softRender(); });
}, 300);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case "gConnect": gConnect(false, "foyer"); break;
    case "gRefresh": gRefresh(view); break;
    case "gBdays": gImportBdays(); break;
    case "gColors": gColorsSheet(); break;
    case "gOff": { try { await gServer("disconnect", "POST"); } catch (e) { toast("Déconnexion impossible : " + e.message); break; } G.tok = null; G.connected = false; G.ev = { at: 0, items: [] }; G.list = []; G.cals = null; ["mz_gtok", "mz_gev", "mz_gcallist", "mz_gcals"].forEach(k => LS.del(k)); render(); toast("Agenda Google déconnecté."); break; }
    case "gCal": { G.cals = G.cals || []; G.cals = G.cals.includes(v) ? G.cals.filter(x => x !== v) : [...G.cals, v]; LS.set("mz_gcals", G.cals); render(); if (b.closest("#sheet")) gCalsSheet(); gFetch().then(() => { if (view === "agenda") softRender(); }); break; }
    case "gCalsSheet": gCalsSheet(); break;
    case "remSheet": remSheet(b.dataset.src, v, b.dataset.day); break;
    case "gEvent": {
      const ev = G.ev.items.find(x => x.id === v && x.day === b.dataset.day); if (!ev) break;
      // calendars this account may write to: edit right here, in Maisonnée
      const cal = G.list.find(c => c.id === ev.cal);
      if (cal && (!cal.accessRole || cal.accessRole === "owner" || cal.accessRole === "writer")) {
        // always the event as it is in Google now (times, reminders), then edit it right here
        let full = null;
        try { if (await gEnsure()) full = await gApi(`calendars/${encodeURIComponent(ev.cal)}/events/${encodeURIComponent(ev.id)}`); } catch (_) {}
        if (full) Object.assign(ev, { gs: full.start, ge: full.end, desc: full.description || "", rec: !!full.recurringEventId });
        if (ev.gs) {
          const form = gToForm(ev), rm = full && full.reminders;
          if (!rm || rm.useDefault) form.gDefault = true; else form.reminders = (rm.overrides || []).map(o => o.minutes);
          eventSheet(form, null, !!form.start_time, { cal: ev.cal, id: ev.id, rec: ev.rec, colorId: ev.colorId });
          break;
        }
        toast("Google Agenda ne répond pas : reconnectez Google dans Ma famille pour modifier ce rendez-vous.");
      }
      openSheet(ev.title, `<p style="margin-top:8px"><strong>${esc(dayLabel(ev.day))}</strong>${ev.start_time ? " · " + esc(hm(ev.start_time)) + (ev.end_time ? " – " + esc(hm(ev.end_time)) : "") : " · toute la journée"}</p>
        ${ev.place ? `<p>${esc(ev.place)}</p>` : ""}<p class="muted small">Agenda Google « ${esc(ev.calName)} ». Pour le modifier, passez par Google Agenda.</p>
        ${ev.link ? `<div class="btns"><a class="btn" href="${esc(ev.link)}" target="_blank" rel="noopener">Ouvrir dans Google Agenda</a></div>` : ""}`);
      break;
    }
  }
});
document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form=gClient]"); if (!f) return;
  e.preventDefault();
  const cid = new FormData(f).get("cid").trim();
  await setHh({ google_client_id: cid }); toast("Identifiant Google enregistré.");
});

/* ---------- administration of the Carnet de menus accounts (administrator only) ---------- */
// Same list as Carnet › Mon compte › Gérer les membres: everyone who has a Carnet account,
// family or friends. Validating gives access to the common recipe book; it does NOT add anyone to this household.
const ADM = { me: null, list: null, busy: false };
async function admLoad() {
  if (mode !== "cloud" || !user || ADM.busy) return;
  ADM.busy = true;
  try {
    if (!ADM.me) { const { data } = await sb.from("profiles").select("role,status").eq("id", user.id).maybeSingle(); ADM.me = data || { role: "member" }; }
    if (ADM.me.role === "admin") { const { data, error } = await sb.rpc("admin_members"); ADM.list = error ? [] : data || []; }
  } catch (e) { ADM.list = []; }
  finally { ADM.busy = false; if (view === "foyer") softRender(); }
}
const foyerViewAdm = VIEWS.foyer;
VIEWS.foyer = function () {
  const base = foyerViewAdm();
  if (mode !== "cloud") return base;
  if (!ADM.me || (ADM.me.role === "admin" && !ADM.list)) { admLoad(); return base; }
  if (ADM.me.role !== "admin") return base;
  const ST = { pending: "en attente", active: "actif", blocked: "bloqué" };
  const inHh = new Set(S.members.map(m => m.user_id).filter(Boolean));
  const list = [...ADM.list].sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || String(a.pseudo).localeCompare(String(b.pseudo)));
  const waiting = list.filter(m => m.status === "pending").length;
  return base + `<h2>Comptes du Carnet de menus</h2>
    <p class="muted small" style="margin-top:-4px">Tous les comptes du Carnet, famille ou amis. « Valider » donne accès au livre de recettes commun ; seuls les membres de ce foyer partagent votre carnet, vos menus et Maisonnée.</p>
    ${waiting ? `<div class="card warn" style="margin-bottom:10px"><strong>${waiting} compte${waiting > 1 ? "s" : ""} en attente de validation</strong></div>` : ""}
    <div class="list">${list.map(m => `<div class="row"><span class="main"><span class="t">${esc(m.pseudo)}${m.role === "admin" ? " 👑" : ""}${inHh.has(m.id) ? ` <span class="muted small">· ${esc(S.hh.name)}</span>` : ""}</span>
      <span class="m">${esc(m.email || "")} · <span class="${m.status === "pending" ? "hot" : ""}">${ST[m.status] || esc(m.status)}</span></span></span>
      ${m.id === user.id ? "" : m.status !== "active" ? `<button class="btn primary" data-act="admSet" data-v="${m.id}" data-s="active">Valider</button>` : `<button class="btn ghost danger" data-act="admSet" data-v="${m.id}" data-s="blocked">Bloquer</button>`}</div>`).join("")}</div>`;
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act=admSet]"); if (!b) return;
  if (b.dataset.s === "blocked" && !confirm("Bloquer ce compte ? Il n'aura plus accès au Carnet de menus.")) return;
  b.disabled = true;
  const { error } = await sb.rpc("admin_set_member", { member: b.dataset.v, new_status: b.dataset.s, new_role: null });
  if (error) { b.disabled = false; toast("Refusé : " + error.message); return; }
  toast(b.dataset.s === "active" ? "Compte validé." : "Compte bloqué.");
  ADM.list = null; admLoad();
});

document.addEventListener("change", e => {
  if (!e.target.matches("[data-defdest]")) return;
  LS.set("mz_default_dest", e.target.value);
  toast("Agenda par défaut : " + e.target.options[e.target.selectedIndex].text + ".");
});

init();

/* COURSES V1 TEST : deux écrans, moteur et actions de courses.js inchangés.
   Préparation et magasin partagent les mêmes données Supabase et Carnet. */
document.addEventListener('DOMContentLoaded', function () {
  if (typeof VIEWS.courses !== 'function') return;
  const originalCourses = VIEWS.courses;
  const screenKey = 'mz_test_courses_ecran_v1';
  let uxScreen = sessionStorage.getItem(screenKey) === 'store' ? 'store' : 'prep';
  let prepY = 0, storeY = 0, query = '';
  let daysOpen = false, optionsOpen = false;
  const join = nodes => nodes.map(n => n.outerHTML).join('');
  const isShop = () => view === 'courses' && uxScreen === 'store';

  VIEWS.courses = function () {
    const raw = originalCourses();
    // En chargement, en erreur, ou hors cloud : garder l'écran d'origine.
    if (typeof raw !== 'string' || !raw.includes('id="cxList"')) return raw;
    const temp = document.createElement('template');
    temp.innerHTML = raw;
    const nodes = Array.from(temp.content.children);
    const d = nodes.findIndex(n => n.matches('.group-h') && n.textContent.trim() === 'Courses pour');
    const f = nodes.findIndex(n => n.matches('form[data-form="cxAdd"]'));
    const h = nodes.findIndex(n => n.id === 'cxList');
    if (d < 0 || f <= d || h <= f) return raw;
    const stats = nodes.find(n => n.matches('.cx-ultimate-stats'));
    const nums = stats ? Array.from(stats.querySelectorAll('strong')).map(n => parseInt(n.textContent, 10) || 0) : [0, 0, 0];
    const left = nums[0] || 0, bought = nums[1] || 0, days = nums[2] || 0;
    const total = left + bought, pct = total ? Math.round(bought * 100 / total) : 0;
    const form = nodes[f].outerHTML;
    const progress = nodes.find(n => n.matches('.cx-progress'));
    const tail = nodes.slice(f + 1, h).filter(n => !n.matches('.cx-progress'));
    const undo = tail.filter(n => n.querySelector('[data-act="cxFinishUndo"]'));
    const opts = nodes.slice(0, d).filter(n => n.matches('details'));
    const carnet = nodes.find(n => n.matches('.cx-ultimate-actions'))?.querySelector('a[href]');
    // On déplace le bouton original du catalogue près de la saisie, sans dupliquer son action.
    const cataloguePanel = tail.find(n => n.querySelector('[data-act="catOpen"]'));
    const catalogueButton = cataloguePanel?.querySelector('[data-act="catOpen"]')?.outerHTML || '<button type="button" class="btn block" data-act="catOpen">🛍️ Catalogue de produits</button>';
    const catalogueAccess = '<div class="btns mz-shop-catalogue-access" style="margin-top:10px">' + catalogueButton + '</div>';

    if (uxScreen === 'store') {
      return '<section class="mz-shop-screen mz-shop-store" aria-label="Courses en magasin">' +
        '<header class="mz-shop-store-header"><button type="button" data-act="mzShopBack" class="mz-shop-back">← Préparation</button>' +
        '<h2>En magasin</h2><p>' + bought + ' / ' + total + ' acheté' + (bought > 1 ? 's' : '') + ' · ' + left + ' à prendre</p></header>' +
        (progress ? progress.outerHTML : '') +
        '<div class="mz-shop-inlineadd"><label class="mz-shop-label" for="cxIn">Saisir un article</label>' + form + catalogueAccess + '</div>' +
        '<label class="mz-shop-search"><span aria-hidden="true">⌕</span><input type="search" id="mzShopSearch" class="input" autocomplete="off" aria-label="Rechercher un article" placeholder="Rechercher dans les rayons" value="' + esc(query) + '"></label>' +
        '<div class="mz-shop-store-list">' + join(nodes.slice(h)) + '</div>' +
        (undo.length ? '<div class="mz-shop-undo">' + join(undo) + '</div>' : '') +
        '</section>';
    }
    return '<section class="mz-shop-screen mz-shop-prep" aria-label="Préparer les courses">' +
      '<div class="mz-shop-hero"><h2>Préparer mes courses</h2><p><strong>' + left + '</strong> à prendre · <strong>' + bought + '</strong> dans le panier · ' + days + ' jour' + (days > 1 ? 's' : '') + '</p>' +
      '<div class="mz-shop-progress-track" role="progressbar" aria-label="Achats effectués" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
      '<div class="mz-shop-hero-actions"><button class="mz-shop-enter" type="button" data-act="mzShopEnter">🛒 En magasin <span>' + left + ' à prendre</span></button>' +
      '<button type="button" class="mz-round-btn mz-round-btn--md mz-shop-addfab" data-act="catOpen" aria-label="Choisir un article dans le catalogue">' + I.plus + '</button></div></div>' +
      '<div class="mz-shop-inlineadd"><label class="mz-shop-label" for="cxIn">Saisir un article</label>' + form + catalogueAccess + '</div>' +
      '<details class="mz-shop-panel" id="mzShopDays"' + (daysOpen ? ' open' : '') + '><summary><span>Jours et repas</span><small>' + days + ' jour' + (days > 1 ? 's' : '') + ' sélectionné' + (days > 1 ? 's' : '') + '</small></summary>' +
      '<div class="mz-shop-panel-content">' + join(nodes.slice(d, f)) + '</div></details>' +
      '<details class="mz-shop-panel" id="mzShopOptions"' + (optionsOpen ? ' open' : '') + '><summary><span>Options et aide</span><small>Catalogue, recettes, réglages</small></summary><div class="mz-shop-panel-content">' +
      (carnet ? '<div class="btns">' + carnet.outerHTML + '</div>' : '') +
      join(opts) + join(tail.filter(n => n !== cataloguePanel && !undo.includes(n))) + join(undo) + '</div></details></section>';
  };

  function filterStore() {
    const root = document.querySelector('.mz-shop-store');
    if (!root) return;
    const q = query.trim().toLocaleLowerCase('fr');
    root.querySelectorAll('.cx-item').forEach(row => {
      row.hidden = !!q && !row.textContent.toLocaleLowerCase('fr').includes(q);
    });
    root.querySelectorAll('.cx-fold').forEach(section => {
      const body = section.querySelector('.cx-fold-body'), toggle = section.querySelector('.cx-fold-toggle');
      if (!body || !toggle) return;
      const matches = Array.from(section.querySelectorAll('.cx-item')).some(row => !row.hidden);
      section.hidden = !!q && !matches;
      body.hidden = q ? false : toggle.getAttribute('aria-expanded') !== 'true';
      section.classList.toggle('is-open', !body.hidden);
    });
  }

  const oldAfterRender = afterRender;
  afterRender = function () {
    if (typeof oldAfterRender === 'function') oldAfterRender();
    if (isShop()) filterStore();
    const legacyUp = document.getElementById('cxUp');
    if (legacyUp && view === 'courses') legacyUp.hidden = true;
  };

  function changeShopScreen(next) {
    if (view !== 'courses' || next === uxScreen) return;
    if (uxScreen === 'store') storeY = window.scrollY; else prepY = window.scrollY;
    uxScreen = next;
    sessionStorage.setItem(screenKey, next);
    // L'ancien saut vers le bas de la liste est remplacé par l'écran magasin.
    LS.set('mz_cx_inlist', false);
    render();
    const y = next === 'store' ? storeY : prepY;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-act]');
    if (!b || view !== 'courses') return;
    if (b.dataset.act === 'mzShopEnter') { e.preventDefault(); changeShopScreen('store'); return; }
    if (b.dataset.act === 'mzShopBack') { e.preventDefault(); changeShopScreen('prep'); return; }
    // La flèche de l'en-tête revient à Préparation avant de quitter Courses.
    if (isShop() && b.dataset.act === 'go' && b.closest('header.top')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      changeShopScreen('prep');
    }
  }, true);
  document.addEventListener('toggle', function (e) {
    if (e.target.id === 'mzShopDays') daysOpen = e.target.open;
    if (e.target.id === 'mzShopOptions') optionsOpen = e.target.open;
  }, true);
  document.addEventListener('input', function (e) {
    if (e.target.id === 'mzShopSearch') { query = e.target.value; filterStore(); }
  });
  if (view === 'courses') render();
});

/* AGENDA SEARCH TEST 2026-11-04 : recherche de données affichables, actions originales. */
document.addEventListener("DOMContentLoaded", function () {
  if (typeof VIEWS.agenda !== "function") return;
  const originalAgenda = VIEWS.agenda;
  const magnifier = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.8 15.8 5.3 5.3"/></svg>';
  let opened = false, search = "", previousY = 0;
  const fold = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const found = (q, ...args) => args.some(s => fold(s).includes(q));
  const result = (date, name, kind, location, action, id, extra = "") => ({date,name,kind,location,action,id,extra});

  function allResults(input) {
    const q = fold(input.trim()), out = [];
    if (!q) return out;
    const min = addDays(today(), -365), max = addDays(today(), 730);
    // Événements Maisonnée, sur toutes les dates enregistrées.
    for (const e of S.events || []) {
      if (!found(q, e.title, e.place, e.notes)) continue;
      const add = day => out.push(result(day, e.title || "Événement", e.kind === "appointment" ? "Rendez-vous" : "Événement", e.place || "", "editEvent", e.id));
      if (!e.repeat || e.repeat === "none") { if (e.day) add(e.day); continue; }
      const rule = MaisonCal.repeatRule(e.repeat);
      if (!rule) { if (e.day) add(e.day); continue; }
      // La recherche des occurrences récurrentes est volontairement bornée.
      for (let i = 0; i < 800; i++) {
        const day = recurrenceDate(e.day, i, rule.unit, rule.interval);
        if (day > max) break;
        if (day >= min) add(day);
      }
    }
    // Même règle anti-doublon que l'agenda quand les tâches locales sont copiées sur Google.
    if (!(typeof gtConf === "function" && gtConf().on)) {
      for (const t of S.tasks || []) {
        if (t.archived || !t.next_due || !found(q, t.title, t.notes, t.room)) continue;
        out.push(result(t.next_due, t.title || "Tâche", "Tâche familiale", t.room || "", "editTask", t.id));
      }
    }
    // Le prochain anniversaire est proposé, et ouvre la fiche d'origine.
    for (const b of S.bdays || []) {
      if (!found(q, b.name, "anniversaire")) continue;
      const d = year => ymd(new Date(year, b.month - 1, b.day === 29 && b.month === 2 && new Date(year, 1, 29).getMonth() !== 1 ? 28 : b.day));
      const year = parse(today()).getFullYear();
      let date = d(year);
      if (date < today()) date = d(year + 1);
      out.push(result(date, "Anniversaire de " + b.name, "Anniversaire", "", "editBday", b.id));
    }
    // Google : uniquement les événements déjà présents dans le cache de lecture de Maisonnée.
    const used = new Set();
    for (const g of G.ev.items || []) {
      if (G.cals && !G.cals.includes(g.cal)) continue;
      const key = g.cal + ":" + g.id;
      if (used.has(key) || !found(q, g.title, g.place, g.desc, g.calName)) continue;
      used.add(key);
      out.push(result(g.day, g.title || "Événement Google", "Agenda Google", [g.place,g.calName].filter(Boolean).join(" · "), "gEvent", g.id, g.day));
    }
    if (GTASKS.enabled && user && GTASKS.userId === user.id) {
      for (const t of GTASKS.items || []) {
        const day = gTasksDay(t);
        if (!day || !found(q, t.title, t.notes, t.listName)) continue;
        out.push(result(day, t.title || "Tâche", "Google Tasks", t.listName || "", "gTaskEdit", t.id, t.listId));
      }
    }
    const now = today();
    return out.sort((a,b) => (a.date >= now ? 0 : 1) - (b.date >= now ? 0 : 1)
      || (a.date >= now ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
      || String(a.name).localeCompare(String(b.name), "fr"));
  }

  function resultMarkup() {
    if (!search.trim()) return '<p class="muted small mz-agenda-hint">Recherche par nom, lieu, événement, tâche ou description.</p>';
    const all = allResults(search), limit = 60;
    if (!all.length) return '<p class="mz-agenda-empty">Aucun résultat parmi les éléments actuellement disponibles.</p>';
    return '<p class="mz-agenda-count">' + all.length + ' résultat' + (all.length > 1 ? 's' : '') + (all.length > limit ? ' · 60 premiers affichés' : '') + '</p>' +
      '<div class="mz-agenda-results-list">' + all.slice(0,limit).map(x =>
        '<button type="button" class="mz-agenda-result" data-act="' + x.action + '" data-v="' + esc(x.id) + '"' +
        (x.action === "gEvent" ? ' data-day="' + esc(x.extra) + '"' : '') +
        (x.action === "gTaskEdit" ? ' data-list="' + esc(x.extra) + '"' : '') +
        '><span class="mz-agenda-type">' + esc(x.kind) + '</span><strong>' + esc(x.name) + '</strong>' +
        '<span class="mz-agenda-date">' + esc(dayLabel(x.date)) + (x.location ? ' · ' + esc(x.location) : '') + '</span></button>'
      ).join('') + '</div>';
  }

  VIEWS.agenda = function () {
    const base = originalAgenda();
    return '<div class="mz-agenda-search-toolbar"><strong>Mon agenda</strong>' +
      '<button type="button" class="mz-round-btn mz-round-btn--sm mz-agenda-magnifier" data-act="mzAgendaSearchToggle" aria-label="Rechercher dans l’agenda" aria-expanded="' + opened + '">' + magnifier + '</button></div>' +
      (opened ? '<section class="mz-agenda-search-panel" aria-label="Rechercher dans l’agenda">' +
        '<div class="mz-agenda-search-inputrow"><input id="mzAgendaSearchInput" class="input" type="search" autocomplete="off" enterkeyhint="search" placeholder="Nom, événement, lieu, tâche…" aria-label="Rechercher dans l’agenda" value="' + esc(search) + '">' +
        '<button type="button" class="mz-round-btn mz-round-btn--sm mz-agenda-search-x" data-act="mzAgendaSearchClose" aria-label="Fermer la recherche">' + I.close + '</button></div>' +
        '<div id="mzAgendaSearchResults" aria-live="polite">' + resultMarkup() + '</div>' +
        '<p class="muted small mz-agenda-scope">Recherche dans les éléments Maisonnée et Google déjà chargés. Les résultats Google Agenda sont limités à la période synchronisée (environ 40 jours passés et 150 jours à venir). Les occurrences répétées Maisonnée couvrent une période limitée.</p></section>' : '') +
      '<div id="mzAgendaNormal"' + (opened && search.trim() ? ' hidden' : '') + '>' + base + '</div>';
  };

  document.addEventListener("click", function (e) {
    if (view !== "agenda") return;
    const btn = e.target.closest('[data-act="mzAgendaSearchToggle"],[data-act="mzAgendaSearchClose"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!opened && btn.dataset.act === "mzAgendaSearchToggle") {
      previousY = window.scrollY;
      opened = true;
    } else {
      opened = false;
      search = "";
    }
    render();
    requestAnimationFrame(() => {
      window.scrollTo(0,previousY);
      if (opened) document.getElementById("mzAgendaSearchInput")?.focus({preventScroll:true});
    });
  }, true);

  document.addEventListener("input", function (e) {
    if (view !== "agenda" || e.target.id !== "mzAgendaSearchInput") return;
    search = e.target.value;
    const results = document.getElementById("mzAgendaSearchResults");
    if (results) results.innerHTML = resultMarkup();
    const original = document.getElementById("mzAgendaNormal");
    if (original) original.hidden = !!search.trim();
  });

  document.addEventListener("keydown", function (e) {
    if (view !== "agenda" || e.key !== "Escape" || !opened || !e.target.closest(".mz-agenda-search-panel")) return;
    e.preventDefault();
    document.querySelector('[data-act="mzAgendaSearchClose"]')?.click();
  });
});
