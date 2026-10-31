"use strict";
/* Maisonnée : accueil en modules, Explorer, calendrier du mois, et les modules
   Anniversaires, Budget, Documents, Emploi du temps, Recettes, Courses. Chargé après app.js. */

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
const DOM_ZONES = { exterieur: "Extérieur", rdc: "Maison RDC", etage: "Maison étage" };
const DOM_KEY = "maisonnee_domotique_zones_v1";
const DOM_DEFAULT = [
  { name: "Portail piéton", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Portail voiture", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Atelier", zone: "exterieur", type: "portail", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Éclairages extérieurs", zone: "exterieur", type: "lumiere", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Volets RDC", zone: "rdc", type: "volet", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" },
  { name: "Volets étage", zone: "etage", type: "volet", channel: 0, channel_b: null, pulse_sec: 1, shelly_id: "" }
];
const SHELLY_ENDPOINT = SB_URL + "/functions/v1/shelly-cloud";
let domZone = "", domEdit = "", domCloud = [], domBusy = "", domState = {}, domStateAt = 0, domFormLoading = false;
document.addEventListener("click", e => {
  if (e.target.closest('[data-act="go"][data-v="domotique"]')) domZone = "";
}, true);
function domConnected() { return !!(S.hh && S.hh.shelly_host); }
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
  return {
    pieton: pieton && { id: pieton.id, name: pieton.name, ready: ready(pieton) },
    voiture: voiture && { id: voiture.id, name: voiture.name, ready: ready(voiture) }
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
async function domRefreshState(force) {
  if (!domConnected() || mode !== "cloud") return false;
  if (!force && Date.now() - domStateAt < 8000) return false;
  try {
    const r = await shellyServer("state");
    domState = r.states || {};
    domStateAt = Date.now();
    return true;
  } catch (_) { return false; }
}
window.domRefreshState = domRefreshState;
async function shellyServer(action, body) {
  if (!sb) await loadSb();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("Connexion Maisonnée requise");
  const res = await fetch(SHELLY_ENDPOINT + "/" + action, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer " + session.access_token, apikey: SB_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Erreur Shelly Cloud");
  return out;
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
  if (st && st.label) return st.label;
  return "Prêt";
}
function domSettings(zone) {
  const rows = domRead().filter(x => !zone || x.zone === zone);
  const heading = zone ? DOM_ZONES[zone] : "Domotique";
  const cloud = mode === "cloud" && S.hh;
  const connect = !zone && cloud ? (domConnected()
    ? `<p class="muted">Compte Shelly relié (${esc((S.hh.shelly_host || "").replace(/^https:\/\//, ""))}). La clé reste sur le serveur.</p><div class="btns"><button class="btn" data-dom-cloud-list>Choisir un appareil du compte</button><button class="btn ghost danger" data-dom-disconnect>Délier Shelly Cloud</button></div>`
    : `<p class="muted">Dans l'app Shelly : Utilisateur → Clé d'autorisation cloud. Copiez l'adresse du serveur et la clé.</p><button class="btn primary" data-dom-connect>Relier Shelly Cloud</button>`)
    : (!cloud ? '<p class="muted">Ouvrez Maisonnée avec le compte du foyer pour relier Shelly Cloud.</p>' : "");
  openSheet("Réglages · " + heading, `<div class="dom-settings">${connect}<p class="muted">Gérez les équipements de ${zone ? "cette zone" : "vos trois zones"}.</p><div class="dom-settings-list">${rows.map(x => `<button type="button" class="btn dom-settings-row" data-dom-edit="${esc(x.id)}"><span>${esc(x.name)} <small class="muted">· ${DOM_ZONES[x.zone]}</small></span><span>Modifier ›</span></button>`).join("") || '<p class="muted">Aucun équipement configuré.</p>'}</div><button class="btn primary" data-dom-add="${zone || "exterieur"}">＋ Ajouter un appareil</button></div>`);
}
function domPage() {
  const items = domRead();
  if (!domZone) return `<section class="dom-page"><div class="dom-page-heading"><h2>🏠 Domotique</h2><button class="btn dom-settings-button" data-dom-settings="" aria-label="Réglages Domotique" title="Réglages Domotique">⚙️</button></div><p class="muted">${domConnected() ? "Compte Shelly relié. Choisissez une zone." : "Choisissez une zone, puis reliez Shelly Cloud dans les réglages."}</p><div class="dom-zones">${Object.entries(DOM_ZONES).map(([id, title]) => `<button class="dom-zone" data-dom-zone="${id}"><strong>${title}</strong><span>${items.filter(x => x.zone === id).length} équipement(s) ›</span></button>`).join("")}</div></section>`;
  const devices = items.filter(x => x.zone === domZone);
  return `<section class="dom-page"><button class="btn" data-dom-back>← Domotique</button><div class="dom-page-heading"><h2>${DOM_ZONES[domZone]}</h2><button class="btn dom-settings-button" data-dom-settings="${domZone}" aria-label="Réglages ${DOM_ZONES[domZone]}" title="Réglages ${DOM_ZONES[domZone]}">⚙️</button></div><div class="dom-devices">${devices.map(x => {
    const ready = domConnected() && x.shelly_id;
    return `<article class="dom-device"><div class="dom-device-head"><strong>${domIcon(x.type)} ${esc(x.name)}</strong></div><p class="muted">${esc(domLinkLine(x))}</p><div class="dom-actions">${domActions(x).map(t => `<button class="btn" data-dom-cmd="${esc(x.id)}" data-dom-action="${esc(t)}" ${ready ? "" : "disabled"} ${domBusy === x.id + t ? "aria-busy=true" : ""}>${t}</button>`).join("")}</div></article>`;
  }).join("") || '<p class="muted">Aucun équipement dans cette zone.</p>'}</div></section>`;
}
VIEWS.domotique = function () {
  Promise.resolve(domEnsureDefaults()).then(() => domRefreshState()).then(changed => { if (changed && view === "domotique") render(); }).catch(() => {});
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
  openSheet(id ? "Modifier un équipement" : "Ajouter un appareil", `<form id="dom-form" class="dom-form">
    <label>Nom<input name="name" required maxlength="70" value="${esc(item.name)}" placeholder="Ex. Volet chambre"></label>
    <label>Zone<select name="zone">${Object.entries(DOM_ZONES).map(([k, v]) => `<option value="${k}" ${item.zone === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
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
  const z = e.target.closest("[data-dom-zone]"); if (z) { domZone = z.dataset.domZone; render(); return; }
  if (e.target.closest("[data-dom-back]")) { domZone = ""; render(); return; }
  const settings = e.target.closest("[data-dom-settings]"); if (settings) { domSettings(settings.dataset.domSettings); return; }
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
    if (S.vShelly && mode === "cloud") remove("shelly", domEdit);
    else { domWriteLocal(domRead().filter(x => x.id !== domEdit)); render(); }
    closeSheet();
    return;
  }
  const cmd = e.target.closest("[data-dom-cmd]");
  if (cmd) {
    const id = cmd.dataset.domCmd, action = cmd.dataset.domAction;
    if (!id || !action || cmd.disabled) return;
    domBusy = id + action; cmd.disabled = true;
    const row = domRead().find(x => x.id === id);
    shellyServer("command", { id, action }).then(() => toast("Commande envoyée : " + action, null, null, null, "domotique")).catch(err => toast(err.message)).finally(() => {
      domBusy = "";
      const after = row && row.type === "volet" ? domRefreshState(true) : Promise.resolve();
      after.finally(() => render());
    });
  }
});
document.addEventListener("submit", e => {
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
  if (e.target.id !== "dom-form") return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  const zone = String(fd.get("zone"));
  const type = String(fd.get("type"));
  const shelly_id = String(fd.get("shelly_id") || fd.get("shelly_id_text") || "").trim().toLowerCase();
  const channel = Number(fd.get("channel") || 0);
  const rawB = String(fd.get("channel_b") || "").trim();
  const channel_b = rawB === "" ? null : Number(rawB);
  const pulse_sec = Number(fd.get("pulse_sec") || 1);
  const row = { name, zone, type, shelly_id, channel, channel_b, pulse_sec };
  if (S.vShelly && mode === "cloud") {
    if (domEdit) patch("shelly", domEdit, row);
    else add("shelly", { ...row, position: domRead().length });
  } else {
    const rows = domRead();
    if (domEdit) { const found = rows.find(x => x.id === domEdit); if (found) Object.assign(found, row); }
    else rows.push({ id: "dom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), ...row, position: rows.length });
    domWriteLocal(rows); render();
  }
  domZone = zone; closeSheet();
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
  return `<p class="muted" style="margin-top:4px">${exploreEdit ? "Touchez un module pour l'afficher ou le retirer de l'accueil." : "Tous les modules du foyer."}</p>
    ${sec("Essentiels")}${sec("Organisation")}
    <div class="btns"><button class="btn ${exploreEdit ? "primary" : ""}" data-act="exploreEdit">${exploreEdit ? "Terminé" : "Personnaliser l'accueil"}</button></div>`;
};

/* ---------- calendar: month grid + days ---------- */
let calSel = today(), calMonth = today().slice(0, 7) + "-01";
function bdaysOn(day) {
  const d = parse(day), m = d.getMonth() + 1, dd = d.getDate(), leap = new Date(d.getFullYear(), 1, 29).getMonth() === 1;
  return S.bdays.filter(b => b.month === m && (b.day === dd || (!leap && b.month === 2 && b.day === 29 && dd === 28)));
}
VIEWS.agenda = function () {
  const first = parse(calMonth), y = first.getFullYear(), mo = first.getMonth();
  const start = mondayOf(calMonth), end = addDays(start, 41);
  const occ = occurrences(start, end), busy = new Set(occ.map(e => e.on));
  for (const g of G.ev.items) if (!G.cals || G.cals.includes(g.cal)) busy.add(g.day);
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
    list += `<div class="day-band"><span>${esc(dayLabel(day))}${Math.abs(diffDays(today(), day)) <= 1 ? ` <span class="muted">· ${esc(fmtShort(day))}</span>` : ""}</span></div>
      ${evs.length || bs.length || gs.length ? `<div class="list flat">${bs.map(b => `<button class="row" data-act="editBday" data-v="${b.id}"><span class="ev-time allday">${mi("anniv", "xs")}</span><span class="main"><span class="t">Anniversaire de ${esc(b.name)}</span>${b.year ? `<span class="m">${parse(day).getFullYear() - b.year} ans</span>` : ""}</span></button>`).join("")}${evs.map(e => eventRow(e)).join("")}${gs.map(gRow).join("")}</div>` : `<p class="none-day">Aucun événement</p>`}`;
  }
  return `<div class="cal">
      <div class="weeknav" style="margin-top:0"><button class="icon-btn plain" data-act="calMonth" data-v="-1" aria-label="Mois précédent">${I.left}</button>
        <strong>${esc(cap(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })))}</strong>
        <button class="icon-btn plain" data-act="calMonth" data-v="1" aria-label="Mois suivant">${I.right}</button></div>
      <div class="cal-grid" role="grid">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="cal-h">${x}</span>`).join("")}${cells}</div>
      ${gOn() ? `<p class="muted small" style="text-align:center;margin:6px 0 0">Agenda Google ${G.ev.at ? "mis à jour " + esc(ago(new Date(G.ev.at).toISOString())) : ""} · <button class="linkbtn small" data-act="gRefresh">Actualiser</button>${G.list.length ? ` · <button class="linkbtn small" data-act="gCalsSheet">Agendas affichés</button>` : ""}</p>` : ""}
      ${calSel !== today() ? `<div style="text-align:center"><button class="linkbtn" data-act="calPick" data-v="${today()}">Revenir à aujourd'hui</button></div>` : ""}
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
  return `<div class="weeknav" style="margin-top:0"><button class="icon-btn plain" data-act="budMonth" data-v="-1" aria-label="Mois précédent">${I.left}</button><strong>${esc(cap(monthName(m0)))}</strong><button class="icon-btn plain" data-act="budMonth" data-v="1" aria-label="Mois suivant">${I.right}</button></div>
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
function afterRender() { if (view === "galerie") fillThumbs(); }

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
  el.innerHTML = `<div class="lb-top"><button class="icon-btn plain" data-act="lbClose" aria-label="Fermer">✕</button><span>${lbIdx + 1} / ${lbList.length}</span><span style="width:44px"></span></div>
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
