/* Règles partagées : fiche publique, textes d'alerte, anti-abus. Sans secret. */
(function (root) {
  const VIEW_GAP_MS = 15 * 60 * 1000;
  const BOT = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|quora|pinterest|linkedin|twitterbot|googlebot|bingbot|yandex|duckduck|applebot|semrush|ahrefs|headless|phantom|puppeteer/i;
  const KINDS = { view: "view", found: "found", location: "location", message: "message" };
  const GEO = { DENIED: 1, UNAVAILABLE: 2, TIMEOUT: 3 };

  function newToken() {
    const a = new Uint8Array(18);
    (root.crypto || require("crypto").webcrypto).getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
  }
  const CANON = "https://carnets-menus.vercel.app";
  function medalUrl(_origin, token) {
    return CANON + "/a/" + String(token || "");
  }
  function geoErrorMessage(code, opts) {
    opts = opts || {};
    const n = opts.petName || "l’animal";
    if (code === GEO.DENIED) {
      if (opts.deniedBefore) return "La localisation reste bloquée pour ce site dans le navigateur.";
      return "L’autorisation de localisation a été refusée (réglages Android ou navigateur).";
    }
    if (code === GEO.UNAVAILABLE) return "Position indisponible : GPS désactivé, signal faible ou navigateur limité.";
    if (code === GEO.TIMEOUT) return "La recherche GPS a pris trop de temps.";
    return "Nous n’avons pas pu obtenir votre position.";
  }
  function geoManualLead(petName, failed) {
    const n = petName || "l’animal";
    if (failed) return "Nous n’avons pas pu obtenir votre position. Indiquez simplement où vous avez trouvé " + n + ".";
    return "Vous pouvez aussi indiquer un lieu sans GPS (adresse, ville, lieu-dit).";
  }
  function inAppBrowserName(ua) {
    ua = String(ua || "");
    if (/Instagram|FBAN|FBAV|Facebook/i.test(ua)) return "Facebook";
    if (/MicroMessenger/i.test(ua)) return "WeChat";
    if (/Line\//i.test(ua)) return "Line";
    if (/Snapchat/i.test(ua)) return "Snapchat";
    if (/; wv\)/i.test(ua) || /\bwv\b/i.test(ua)) return "une application";
    return "";
  }
  function embeddedBrowserHint(ua) {
    const app = inAppBrowserName(ua);
    if (!app) return "";
    return "Ce lien s’ouvre dans " + app + ". Pour le GPS, ouvrez-le dans Chrome ou Samsung Internet (menu ⋮ → Ouvrir dans le navigateur).";
  }
  function shouldRetryGps(code, attemptCount) {
    if (code === GEO.DENIED) return false;
    return attemptCount < 1 && (code === GEO.TIMEOUT || code === GEO.UNAVAILABLE);
  }
  function gpsOptions() {
    return { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
  }
  function gpsOptionsRelaxed() {
    return { enableHighAccuracy: false, timeout: 22000, maximumAge: 120000 };
  }
  function locationFromCoords(coords) {
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null;
    const accuracy = Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null;
    return { lat: coords.latitude, lng: coords.longitude, accuracy, source: "gps" };
  }
  function isBot(ua) {
    return !ua || BOT.test(String(ua));
  }
  function phones(pet) {
    const out = [];
    if (pet.publish_phone && pet.phone) out.push({ label: pet.contact_name || "Famille", n: pet.phone });
    if (pet.publish_phone2 && pet.phone2) out.push({ label: "Second contact", n: pet.phone2 });
    if (pet.publish_emergency && pet.phone_emergency) out.push({ label: "Secours", n: pet.phone_emergency });
    return out;
  }
  function publicPayload(pet, extras) {
    extras = extras || {};
    if (!pet) return null;
    return {
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      sex: pet.sex || "",
      color: pet.color || "",
      signs: pet.signs || "",
      description: pet.description || "",
      message: pet.message_public || "",
      approach: pet.approach_note || "",
      medical: pet.publish_medical ? (pet.medical_note || "") : "",
      vet: pet.publish_vet ? (pet.vet_name || "") : "",
      vet_phone: pet.publish_vet ? (pet.vet_phone || "") : "",
      reward: pet.publish_reward ? (pet.reward || "") : "",
      status: pet.status === "lost" || pet.status === "found" ? pet.status : "ok",
      phones: phones(pet),
      photo_url: extras.photo_url || "",
      lost: pet.status === "lost"
    };
  }
  function forbiddenPublicKeys(obj) {
    const bad = ["household_id", "created_by", "updated_by", "photo_path", "phone", "phone2", "phone_emergency", "medical_note", "id"];
    return Object.keys(obj || {}).filter(k => bad.includes(k));
  }
  function pushCopy(kind, name) {
    const n = name || "l’animal";
    if (kind === KINDS.view) return { title: "🐾 Médaille consultée", body: "La médaille de " + n + " vient d’être consultée.", tag: "pet-view" };
    if (kind === KINDS.found) return { title: "🐾 Signalement", body: n + " a été signalé retrouvé. Une personne a ouvert la fiche et l’a indiqué.", tag: "pet-found" };
    if (kind === KINDS.location) return { title: "🐾 Position transmise", body: n + " : une position GPS volontaire est disponible.", tag: "pet-gps" };
    if (kind === KINDS.message) return { title: "🐾 Message", body: "Un message a été laissé pour " + n + ".", tag: "pet-msg" };
    return { title: "🐾 Mes animaux", body: "Nouvelle activité pour " + n + ".", tag: "pet" };
  }
  function shouldNotifyView(pet, lastViewAt, now) {
    if (!pet || pet.notify_on_view === false) return false;
    if (!lastViewAt) return true;
    return (now - lastViewAt) >= VIEW_GAP_MS;
  }
  function kindLabel(kind) {
    return { view: "Consultation", found: "Signalement retrouvé", location: "Position GPS", message: "Message" }[kind] || kind;
  }
  function isMember(members, householdId, userId) {
    if (!householdId || !userId) return false;
    return (members || []).some(m => m.household_id === householdId && m.user_id === userId);
  }
  function leaveMember(members, householdId, userId) {
    return (members || []).map(m => m.household_id === householdId && m.user_id === userId ? { ...m, user_id: null } : m);
  }
  function joinMember(members, householdId, userId, name) {
    if (isMember(members, householdId, userId)) return members.slice();
    return (members || []).concat([{ household_id: householdId, user_id: userId, name: name || "Membre" }]);
  }
  function medalSurvivesPetEdit(before, after) {
    return before && after && before.public_token === after.public_token && before.pet_id === after.pet_id;
  }
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function telDigits(n) {
    return String(n || "").replace(/[^\d+]/g, "");
  }
  function publicCardInfoBlocks(pet) {
    const esc = escapeHtml;
    const tel = telDigits;
    const parts = [];
    if (pet.signs) parts.push(`<p class="id-block"><strong>Signes :</strong> ${esc(pet.signs)}</p>`);
    if (pet.description) parts.push(`<p class="id-block">${esc(pet.description)}</p>`);
    if (pet.message) parts.push(`<p class="id-block">${esc(pet.message)}</p>`);
    if (pet.approach) parts.push(`<p class="id-block"><strong>Approche :</strong> ${esc(pet.approach)}</p>`);
    if (pet.medical) parts.push(`<p class="id-block"><strong>Santé :</strong> ${esc(pet.medical)}</p>`);
    if (pet.vet) parts.push(`<p class="id-block">Vétérinaire : ${esc(pet.vet)}${pet.vet_phone ? ` · <a href="tel:${esc(tel(pet.vet_phone))}" style="color:inherit">${esc(pet.vet_phone)}</a>` : ""}</p>`);
    if (pet.reward) parts.push(`<p class="id-block"><strong>Récompense :</strong> ${esc(pet.reward)}</p>`);
    return parts.join("");
  }
  function publicCardDock(pet, opts) {
    opts = opts || {};
    const esc = escapeHtml;
    const tel = telDigits;
    const preview = !!opts.preview;
    const note = opts.note != null ? opts.note : "";
    const noteKind = opts.noteKind || "";
    const n = pet.name || "ce chien";
    const phones = pet.phones || [];
    const primary = phones[0];
    const call = primary
      ? (preview
        ? `<span class="id-act id-act-call"><span class="id-act-ico" aria-hidden="true">📞</span><span>Appeler${primary.label ? " · " + esc(primary.label) : ""}</span></span>`
        : `<a class="id-act id-act-call" href="tel:${esc(tel(primary.n))}"><span class="id-act-ico" aria-hidden="true">📞</span><span>Appeler${primary.label ? " · " + esc(primary.label) : ""}</span></a>`)
      : `<button class="id-act id-act-call is-disabled" type="button" disabled><span class="id-act-ico" aria-hidden="true">📞</span><span>Aucun numéro publié</span></button>`;
    const found = preview
      ? `<span class="id-act id-act-found"><span class="id-act-ico" aria-hidden="true">✓</span><span>J’ai trouvé ${esc(n)}</span></span>`
      : `<button class="id-act id-act-found" type="button" id="aFound"><span class="id-act-ico" aria-hidden="true">✓</span><span>J’ai trouvé ${esc(n)}</span></button>`;
    const gps = preview
      ? `<span class="id-act id-act-gps"><span class="id-act-ico" aria-hidden="true">📍</span><span>Envoyer ma position</span></span>`
      : `<button class="id-act id-act-gps" type="button" id="aGps"><span class="id-act-ico" aria-hidden="true">📍</span><span>Envoyer ma position</span></button>`;
    const manualLoc = preview ? "" : `
      <div class="id-manual-loc" id="aManualPanel" hidden>
        <p class="id-manual-lead" id="aManualLead">${esc(geoManualLead(n, false))}</p>
        <input id="aAddr" type="text" maxlength="200" placeholder="Adresse, ville ou lieu-dit" autocomplete="street-address" enterkeyhint="send">
        <button class="id-act id-act-manual" type="button" id="aAddrSend"><span class="id-act-ico" aria-hidden="true">📍</span><span>Envoyer cette position</span></button>
      </div>`;
    return `
      ${call}
      ${found}
      ${gps}
      ${manualLoc}
      <details class="id-more">
        <summary>Plus d’options</summary>
        <div class="id-more-in">
          ${phones.length > 1 ? phones.slice(1).map(p => preview
    ? `<span class="tel-link">Appeler ${esc(p.label)}${p.n ? " · " + esc(p.n) : ""}</span>`
    : `<a class="tel-link" href="tel:${esc(tel(p.n))}">Appeler ${esc(p.label)}${p.n ? " · " + esc(p.n) : ""}</a>`).join("") : ""}
          <p class="hint"><strong>Vous, facultatif.</strong> Prénom et téléphone pour que la famille puisse vous rappeler. Pas de compte.</p>
          <input id="aWho" type="text" maxlength="60" placeholder="Votre prénom" autocomplete="name" enterkeyhint="next">
          <input id="aTel" type="tel" maxlength="24" placeholder="Votre téléphone" autocomplete="tel" inputmode="tel">
          <button class="btn-mini" type="button" id="aWhoSend">Envoyer mes coordonnées</button>
          <button class="btn-mini" type="button" id="aMsg">Laisser un message</button>
          <div id="aMsgBox" style="display:none">
            <textarea id="aMsgTxt" rows="3" maxlength="400" placeholder="Message pour la famille"></textarea>
            <button class="btn-mini" type="button" id="aMsgSend">Envoyer le message</button>
          </div>
        </div>
      </details>
      <p class="status${noteKind ? " " + noteKind : ""}" id="aNote">${esc(note || "")}</p>
      <p class="id-foot">Carte d’identité numérique · sans compte, sans application à installer.</p>`;
  }
  function publicCardMain(pet) {
    const esc = escapeHtml;
    const n = pet.name || "l’animal";
    const photo = pet.photo_url
      ? `<figure class="id-photo"><img class="id-photo-bg" src="${esc(pet.photo_url)}" alt=""><img class="id-photo-img" src="${esc(pet.photo_url)}" alt="${esc(n)}"></figure>`
      : `<div class="id-photo" aria-hidden="true"></div>`;
    return `
      <header class="id-chip"><span>Carte</span><b>Maisonnée</b></header>
      ${photo}
      <div class="id-scroll">
        ${pet.lost ? `<p class="id-lost">Animal recherché — prévenez la famille sans le poursuivre s’il a peur.</p>` : ""}
        <h1 class="id-name">${esc(n)}</h1>
        <p class="id-meta">${esc([pet.breed, pet.species, pet.color].filter(Boolean).join(" · "))}</p>
        ${publicCardInfoBlocks(pet)}
      </div>`;
  }
  function publicCardHint() {
    return `<p class="id-scene-hint">Consulter cette carte peut prévenir la famille. Ce n’est pas un signalement de retrouvailles.</p>`;
  }
  function publicCardScene(pet, opts) {
    opts = opts || {};
    const esc = escapeHtml;
    const embed = opts.embed !== false;
    const preview = !!opts.preview;
    if (opts.err) {
      return `<div class="id-scene${embed ? " id-scene--embed" : ""}"><main class="id-card"><div class="id-err"><h1>Médaille introuvable</h1><p class="id-meta">${esc(opts.err)}</p><p class="id-foot">Cette carte n’ouvre pas Maisonnée et ne demande aucun compte.</p></div></main></div>`;
    }
  if (!pet) return "";
    const note = opts.note != null ? opts.note : (preview ? "Aperçu · la famille n’est pas prévenue." : "");
    const noteKind = opts.noteKind || (preview ? "ok" : "");
    return `<div class="id-scene${embed ? " id-scene--embed" : ""}${preview ? " id-scene--preview" : ""}" data-pet-card>
      <main class="id-card">${publicCardMain(pet)}</main>
      ${publicCardHint()}
      <div class="id-dock">${publicCardDock(pet, { preview, note, noteKind })}</div>
    </div>`;
  }
  const api = { VIEW_GAP_MS, KINDS, GEO, CANON, newToken, medalUrl, isBot, publicPayload, forbiddenPublicKeys, pushCopy, shouldNotifyView, kindLabel, phones, isMember, leaveMember, joinMember, medalSurvivesPetEdit, geoErrorMessage, geoManualLead, inAppBrowserName, embeddedBrowserHint, shouldRetryGps, gpsOptions, gpsOptionsRelaxed, locationFromCoords, escapeHtml, telDigits, publicCardInfoBlocks, publicCardDock, publicCardMain, publicCardHint, publicCardScene };
  root.maisonAnimauxCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
