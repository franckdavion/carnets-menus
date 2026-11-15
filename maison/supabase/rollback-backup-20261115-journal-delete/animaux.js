"use strict";
/* Mes animaux : fiches du foyer, médailles QR, signalements. Aucune liste de membres parallèle. */
(function () {
  const C = typeof maisonAnimauxCore !== "undefined" ? maisonAnimauxCore : null;
  const BUCKET = "household-pets";
  const hid = () => S && S.hh && S.hh.id;
  const memberOk = () => !!(hid() && S.me && (S.members || []).some(m => m.id === S.me));
  let pets = [], medals = [], events = [], sightings = [], sessions = [], busy = false, err = "", filter = "", asked = false, painting = false, channel;

  const species = [["chien", "Chien"], ["chat", "Chat"], ["autre", "Autre"]];
  const statusLabel = s => s === "lost" ? "Perdu" : s === "found" ? "Retrouvé" : "À la maison";
  function medalLink(token) { return C ? C.medalUrl(null, token) : "https://carnets-menus.vercel.app/a/" + token; }
  function activeMedal(petId) { return medals.find(m => m.pet_id === petId && m.active); }

  async function loadPets() {
    err = "";
    if (mode !== "cloud" || !sb || !hid()) { pets = []; return; }
    const [p, m, e, s, sess] = await Promise.all([
      sb.from("household_pets").select("*").eq("household_id", hid()).order("name"),
      sb.from("pet_medals").select("*").eq("household_id", hid()).order("created_at", { ascending: false }),
      sb.from("pet_events").select("*").eq("household_id", hid()).order("created_at", { ascending: false }).limit(120),
      sb.from("pet_sightings").select("*").eq("household_id", hid()).order("created_at", { ascending: false }).limit(60),
      sb.from("pet_consult_sessions").select("*").eq("household_id", hid()).order("opened_at", { ascending: false }).limit(40)
    ]);
    if (p.error) { err = /schema cache|does not exist|relation/i.test(p.error.message || "") ? "La base n’a pas encore la table des animaux (migration 0032)." : (p.error.message || "lecture"); pets = []; return; }
    pets = p.data || []; medals = m.data || []; events = e.data || []; sightings = s.data || [];
    sessions = (sess.error && /does not exist|schema cache/i.test(sess.error.message || "")) ? [] : (sess.data || []);
  }
  async function photoUrl(path) {
    if (!path || !sb) return "";
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    return (data && data.signedUrl) || "";
  }
  async function thumbs() {
    const map = {};
    await Promise.all(pets.map(async p => { if (p.photo_path) map[p.id] = await photoUrl(p.photo_path); }));
    return map;
  }

  function card(p, photo) {
    const st = p.status || "ok";
    return `<article class="row mz-pet-card" data-act="petOpen" data-v="${esc(p.id)}">
      ${photo ? `<img class="thumb" src="${esc(photo)}" alt="">` : `<span class="thumb">${mi("animaux", "sm")}</span>`}
      <span class="main"><span class="t">${esc(p.name)}</span>
      <span class="m">${esc(p.breed || p.species || "")} · <b class="mz-pet-st mz-pet-st-${esc(st)}">${statusLabel(st)}</b></span></span>
      <span class="mz-pet-mini">
        <button type="button" class="btn" data-act="petQr" data-v="${esc(p.id)}">QR</button>
      </span></article>`;
  }

  VIEWS.animaux = function () {
    if (mode === "cloud" && memberOk() && !asked) { asked = true; refresh(); }
    if (mode !== "cloud") return `<div class="empty"><strong>Mes animaux</strong><br>Connectez le foyer pour partager les fiches et les médailles avec toute la famille.</div>`;
    if (!memberOk()) return `<div class="empty"><strong>Accès foyer</strong><br>Seuls les membres rattachés au foyer voient les animaux.</div>`;
    const q = filter.trim().toLowerCase();
    const list = q ? pets.filter(p => (p.name + " " + p.breed + " " + p.species).toLowerCase().includes(q)) : pets;
    const lost = pets.filter(p => p.status === "lost");
    return `${err ? `<div class="empty">${esc(err)}</div>` : ""}
      ${lost.length ? `<div class="note">Recherche en cours : ${lost.map(p => esc(p.name)).join(", ")}</div>` : ""}
      <div class="row" style="margin-top:4px"><input class="input" id="petQ" type="search" placeholder="Chercher un animal" value="${esc(filter)}" autocomplete="off">
      <button class="btn primary" data-act="petNew">Ajouter un animal</button></div>
      <div class="list" style="margin-top:12px">${list.map(p => card(p, p._photo || "")).join("") || `<p class="muted" style="padding:14px">Aucun animal pour l’instant. Ajoutez le premier : la fiche et le QR appartiennent au foyer.</p>`}</div>
      <p class="muted small">Tous les membres du foyer voient les mêmes animaux. Un nouveau membre y a accès automatiquement.</p>`;
  };

  function clearPetDeepLinkKeys(wantSess, wantEv) {
    if (typeof LS === "undefined") return;
    if (typeof LS.del === "function") {
      LS.del("mz_open_pet");
      if (wantSess) LS.del("mz_pet_session");
      if (wantEv) LS.del("mz_pet_event");
    } else {
      LS.set("mz_open_pet", "");
      if (wantSess) LS.set("mz_pet_session", "");
      if (wantEv) LS.set("mz_pet_event", "");
    }
  }

  async function refresh() {
    await loadPets();
    watch();
    const ph = await thumbs();
    pets.forEach(p => { p._photo = ph[p.id] || ""; });
    if (view === "animaux" && !painting) {
      painting = true;
      try { render(); } finally { painting = false; }
      const want = typeof LS !== "undefined" ? LS.get("mz_open_pet") : null;
      const wantSess = typeof LS !== "undefined" ? LS.get("mz_pet_session") : null;
      const wantEv = typeof LS !== "undefined" ? LS.get("mz_pet_event") : null;
      if (want) {
        const opened = await openPet(want, wantSess || null, wantEv || null);
        if (opened) clearPetDeepLinkKeys(wantSess, wantEv);
      }
    }
  }
  function watch() {
    if (!sb || !hid() || channel) return;
    channel = sb.channel("mz-pets-" + hid())
      .on("postgres_changes", { event: "*", schema: "public", table: "household_pets", filter: "household_id=eq." + hid() }, () => { asked = true; refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pet_events", filter: "household_id=eq." + hid() }, () => { asked = true; refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pet_sightings", filter: "household_id=eq." + hid() }, () => { asked = true; refresh(); })
      .subscribe();
  }

  function showLogViews() { return typeof LS !== "undefined" && LS.get("mz_pet_log_views") === "1"; }
  function logIsOpen() { return typeof LS !== "undefined" && LS.get("mz_pet_log_open") === "1"; }
  function sessionSummary(sess) {
    const snap = sess.snapshot || {};
    const w = d => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const bits = [];
    if (snap.view_at) bits.push("Consultation " + w(snap.view_at));
    if (snap.found_at) bits.push("Signalement retrouvé");
    if (snap.location) {
      const loc = snap.location;
      if (loc.source === "manual" && loc.address) bits.push("Lieu : " + loc.address);
      else if (loc.lat != null) bits.push("GPS " + Number(loc.lat).toFixed(4) + ", " + Number(loc.lng).toFixed(4) + (loc.accuracy ? " ±" + loc.accuracy + " m" : ""));
    }
    if (snap.finder_name) bits.push(snap.finder_name);
    if (snap.finder_phone) bits.push(snap.finder_phone);
    return bits.join(" · ");
  }

  function journalBlock(petId, ev, fmt, highlightSession, highlightEvent) {
    const kind = fmt.kind, when = fmt.when;
    const views = ev.filter(e => e.kind === "view");
    const acts = ev.filter(e => e.kind !== "view");
    const shown = showLogViews() ? ev : (acts.length ? acts : []);
    const open = logIsOpen() && (shown.length > 0 || showLogViews());
    const hint = acts.length
      ? (acts.length + " à suivre" + (views.length ? " · " + views.length + " consultation" + (views.length > 1 ? "s" : "") : ""))
      : (views.length + " consultation" + (views.length > 1 ? "s" : ""));
    const petSessions = sessions.filter(s => s.pet_id === petId).slice(0, 8);
    const sessRows = petSessions.length ? petSessions.map(s => {
      const hi = highlightSession && s.id === highlightSession ? " mz-pet-log-row--hi" : "";
      const mapLink = (s.snapshot && s.snapshot.location && s.snapshot.location.lat != null)
        ? ` <a href="https://www.openstreetmap.org/?mlat=${s.snapshot.location.lat}&mlon=${s.snapshot.location.lng}#map=16/${s.snapshot.location.lat}/${s.snapshot.location.lng}" target="_blank" rel="noopener">Carte</a>` : "";
      return `<li class="mz-pet-log-row${hi}"><span><strong>Consultation</strong> · ${esc(sessionSummary(s))}${mapLink}<br><span class="muted">${new Date(s.opened_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span></li>`;
    }).join("") : "";
    const rows = (shown.length ? shown : []).map(e => {
      const pld = e.payload || {};
      const raw = String(pld.finder_phone || "");
      const phone = raw.replace(/[^\d+]/g, "");
      const msg = pld.message && pld.message !== "Coordonnées laissées" ? pld.message : "";
      const si = sightings.find(s => s.event_id === e.id && s.lat != null);
      const menuBits = [];
      if (phone) {
        menuBits.push(`<a role="menuitem" href="tel:${esc(phone)}">Appeler${pld.finder_name ? " " + esc(pld.finder_name) : ""}</a>`);
        menuBits.push(`<button type="button" role="menuitem" data-act="petLogCopy" data-v="${esc(raw)}">Copier le numéro</button>`);
      }
      if (si) menuBits.push(`<a role="menuitem" href="https://www.openstreetmap.org/?mlat=${si.lat}&mlon=${si.lng}#map=16/${si.lat}/${si.lng}" target="_blank" rel="noopener">Ouvrir la carte</a>`);
      const menu = menuBits.length ? `<details class="mz-pet-menu"><summary aria-label="Actions">⋯</summary><div class="mz-pet-menu-pop" role="menu">${menuBits.join("")}</div></details>` : "";
      const hiEv = highlightEvent && e.id === highlightEvent ? " mz-pet-log-row--hi" : "";
      return `<li class="mz-pet-log-row${hiEv}" data-event-id="${esc(e.id)}"><span>${esc(kind(e.kind))}${pld.finder_name ? " · " + esc(pld.finder_name) : ""}${phone ? ` · <a href="tel:${esc(phone)}">${esc(raw)}</a>` : ""}${msg ? "<br>" + esc(msg) : ""}<br><span class="muted">${when(e.created_at)}</span></span>${menu}</li>`;
    }).join("");
    const empty = !shown.length ? `<p class="muted small mz-pet-log-empty">${views.length && !showLogViews() ? "Les consultations de la médaille sont masquées." : "Rien pour l’instant."}</p>` : "";
    return `<div class="mz-pet-log" id="mzPetLog" data-pet="${esc(petId)}">
      <div class="mz-pet-log-bar">
        <button type="button" class="mz-pet-log-toggle" data-act="petLogToggle" aria-expanded="${open ? "true" : "false"}">
          <strong>Journal</strong><span class="muted">${esc(hint)}</span>
        </button>
        <details class="mz-pet-menu">
          <summary aria-label="Options du journal">⋯</summary>
          <div class="mz-pet-menu-pop" role="menu">
            <button type="button" role="menuitem" data-act="petLogViews">${showLogViews() ? "Masquer les consultations" : "Afficher les consultations"}</button>
          </div>
        </details>
      </div>
      <div class="mz-pet-log-body" ${open ? "" : "hidden"}>${sessRows ? `<p class="label" style="margin:8px 0 4px">Dossiers de consultation</p><ul class="ing mz-pet-log-list">${sessRows}</ul>` : ""}<ul class="ing mz-pet-log-list">${rows}</ul>${empty}</div>
    </div>`;
  }

  function field(name, label, value, extra) {
    extra = extra || {};
    const t = extra.area ? `<textarea class="input" name="${name}" rows="${extra.rows || 3}" maxlength="${extra.max || 400}">${esc(value || "")}</textarea>`
      : extra.sel ? `<select class="input" name="${name}">${extra.sel.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`
      : `<input class="input" name="${name}" value="${esc(value || "")}" ${extra.type ? `type="${extra.type}"` : ""} maxlength="${extra.max || 80}" ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ""}>`;
    return `<label class="field"><span class="label">${label}</span>${t}</label>`;
  }
  function tog(name, label, on) {
    return `<label class="switch" style="margin:0"><span>${label}</span><input type="checkbox" name="${name}" ${on ? "checked" : ""}></label>`;
  }

  async function openPet(id, highlightSession, highlightEvent) {
    const p = pets.find(x => x.id === id);
    if (!p) return false;
    const med = activeMedal(p.id);
    const photo = p._photo || await photoUrl(p.photo_path);
    const ev = events.filter(e => e.pet_id === id).slice(0, 12);
    const si = sightings.filter(s => s.pet_id === id).slice(0, 8);
    const when = d => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const kind = k => (C && C.kindLabel(k)) || k;
    const lastGps = si.find(s => s.lat != null && s.lng != null);
    openSheet(p.name, `
      ${photo ? `<div class="mz-pet-hero"><img class="mz-pet-hero-bg" src="${esc(photo)}" alt=""><img class="mz-pet-hero-img" src="${esc(photo)}" alt="${esc(p.name)}"></div>` : ""}
      <p class="muted">${esc(p.breed || p.species || "")} · ${statusLabel(p.status)}</p>
      <div class="btns">
        <button class="btn primary" data-act="petEdit" data-v="${esc(id)}">Modifier la fiche</button>
        <button class="btn" data-act="petQr" data-v="${esc(id)}">QR / médaille</button>
        <button class="btn" data-act="petPreview" data-v="${esc(id)}">Aperçu du scan QR</button>
      </div>
      <label class="switch"><span><strong>Mode perdu</strong><br><span class="muted small">La fiche publique insiste sur la recherche. Une consultation n’est pas un signalement de retrouvailles.</span></span>
        <input type="checkbox" data-act="petLost" data-v="${esc(id)}" ${p.status === "lost" ? "checked" : ""}></label>
      ${si.length ? `<h3>Positions reçues</h3>${lastGps ? `<div id="petOsm" class="mz-pet-map" role="img" aria-label="Dernière position"></div>
        <p class="muted small"><a href="https://www.openstreetmap.org/?mlat=${lastGps.lat}&mlon=${lastGps.lng}#map=16/${lastGps.lat}/${lastGps.lng}" target="_blank" rel="noopener">Ouvrir dans OpenStreetMap</a></p>` : ""}
        <ul class="ing">${si.map(s => `<li><span>${esc(s.address || ((s.lat != null) ? (Number(s.lat).toFixed(4) + ", " + Number(s.lng).toFixed(4)) : "sans GPS"))}</span><span class="muted">${when(s.created_at)} · ${s.source === "gps" ? "GPS" : "manuel"}${s.accuracy ? " · ±" + s.accuracy + " m" : ""}</span></li>`).join("")}</ul>` : `<p class="muted small">Aucune position volontaire pour l’instant.</p>`}
      ${ev.length || sessions.filter(s => s.pet_id === id).length ? journalBlock(id, ev, { kind, when }, highlightSession, highlightEvent) : ""}
      <p class="muted small">${med ? "Médaille active : l’URL gravée ne change pas si vous modifiez la fiche." : "Générez un QR pour la médaille."}</p>
    `, { pet: id });
    if (highlightEvent) {
      requestAnimationFrame(() => {
        const row = document.querySelector(`.mz-pet-log [data-event-id="${highlightEvent}"]`);
        if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
    if (lastGps) {
      const load = window.L ? Promise.resolve() : new Promise((ok, ko) => {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(c);
        }
        const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
      });
      load.then(() => requestAnimationFrame(() => {
        const el = document.getElementById("petOsm");
        if (!el || !window.L || el._leaflet_id) return;
        const map = L.map(el, { zoomControl: false, attributionControl: true }).setView([lastGps.lat, lastGps.lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OSM" }).addTo(map);
        L.marker([lastGps.lat, lastGps.lng]).addTo(map);
        setTimeout(() => { map.invalidateSize(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }, 250);
      })).catch(() => {});
    }
    return true;
  }

  function formPet(p) {
    p = p || { name: "", species: "chien", breed: "", sex: "", birth_date: "", color: "", signs: "", description: "", contact_name: "", phone: "", phone2: "", phone_emergency: "", publish_phone: true, publish_phone2: false, publish_emergency: false, message_public: "", approach_note: "", medical_note: "", publish_medical: false, vet_name: "", vet_phone: "", publish_vet: false, reward: "", publish_reward: false, notify_on_view: true };
    openSheet(p.id ? "Fiche de " + p.name : "Nouvel animal", `
      <form data-form="petSave">
        <input type="hidden" name="id" value="${esc(p.id || "")}">
        ${field("name", "Prénom", p.name, { max: 40, ph: "Bounty" })}
        <div class="inline" style="gap:10px">${field("species", "Espèce", p.species, { sel: species })}${field("breed", "Race / type", p.breed, { max: 60 })}</div>
        <div class="inline" style="gap:10px">${field("sex", "Sexe", p.sex, { sel: [["", "Non précisé"], ["male", "Mâle"], ["female", "Femelle"]] })}${field("birth_date", "Naissance", p.birth_date || "", { type: "date" })}</div>
        ${field("color", "Couleur", p.color)}${field("signs", "Signes distinctifs", p.signs, { area: true, rows: 2 })}
        ${field("description", "Description", p.description, { area: true })}
        <p class="label">Photo principale</p>
        <input class="input" type="file" name="photo" accept="image/*">
        <h3>Coordonnées publiées sur la médaille</h3>
        ${field("contact_name", "Contact principal", p.contact_name)}
        ${field("phone", "Téléphone principal", p.phone, { type: "tel" })}
        ${tog("publish_phone", "Afficher ce numéro sur la fiche QR", p.publish_phone !== false)}
        ${field("phone2", "Deuxième contact", p.phone2, { type: "tel" })}
        ${tog("publish_phone2", "Afficher le deuxième numéro", !!p.publish_phone2)}
        ${field("phone_emergency", "Numéro de secours", p.phone_emergency, { type: "tel" })}
        ${tog("publish_emergency", "Afficher le numéro de secours", !!p.publish_emergency)}
        ${field("message_public", "Message aux personnes qui scannent", p.message_public, { area: true, rows: 2, max: 400 })}
        <h3>Utile en cas de découverte</h3>
        ${field("approach_note", "Précautions pour l’approcher", p.approach_note, { area: true, rows: 2 })}
        ${field("medical_note", "Infos médicales (privées par défaut)", p.medical_note, { area: true, rows: 2 })}
        ${tog("publish_medical", "Publier l’info médicale sur la fiche QR", !!p.publish_medical)}
        ${field("vet_name", "Vétérinaire", p.vet_name)}${field("vet_phone", "Tél. vétérinaire", p.vet_phone, { type: "tel" })}
        ${tog("publish_vet", "Publier le vétérinaire", !!p.publish_vet)}
        ${field("reward", "Récompense (facultatif)", p.reward)}
        ${tog("publish_reward", "Publier la récompense", !!p.publish_reward)}
        ${tog("notify_on_view", "M’alerter quand la médaille est consultée (ce n’est pas « retrouvé »)", p.notify_on_view !== false)}
        <p class="muted small">L’adresse du foyer n’est jamais publiée. Les autres membres voient la même fiche.</p>
        <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer</button></div>
      </form>`, { pet: p.id || null });
  }

  async function savePet(fd) {
    if (!hid() || !sb) return;
    const on = n => fd.get(n) === "on";
    const row = {
      household_id: hid(),
      name: String(fd.get("name") || "").trim().slice(0, 40),
      species: String(fd.get("species") || "chien"),
      breed: String(fd.get("breed") || "").trim(),
      sex: String(fd.get("sex") || ""),
      birth_date: String(fd.get("birth_date") || "") || null,
      color: String(fd.get("color") || "").trim(),
      signs: String(fd.get("signs") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      contact_name: String(fd.get("contact_name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      phone2: String(fd.get("phone2") || "").trim(),
      phone_emergency: String(fd.get("phone_emergency") || "").trim(),
      publish_phone: on("publish_phone"),
      publish_phone2: on("publish_phone2"),
      publish_emergency: on("publish_emergency"),
      message_public: String(fd.get("message_public") || "").trim(),
      approach_note: String(fd.get("approach_note") || "").trim(),
      medical_note: String(fd.get("medical_note") || "").trim(),
      publish_medical: on("publish_medical"),
      vet_name: String(fd.get("vet_name") || "").trim(),
      vet_phone: String(fd.get("vet_phone") || "").trim(),
      publish_vet: on("publish_vet"),
      reward: String(fd.get("reward") || "").trim(),
      publish_reward: on("publish_reward"),
      notify_on_view: on("notify_on_view"),
      updated_by: user && user.id
    };
    if (row.name.length < 1) { toast("Indiquez le prénom"); return; }
    const id = String(fd.get("id") || "");
    let petId = id;
    if (id) {
      const { error } = await sb.from("household_pets").update(row).eq("id", id).eq("household_id", hid());
      if (error) throw error;
    } else {
      row.created_by = user && user.id;
      row.status = "ok";
      const { data, error } = await sb.from("household_pets").insert(row).select("id").single();
      if (error) throw error;
      petId = data.id;
      await ensureMedal(petId);
    }
    const file = fd.get("photo");
    if (file && file.size) await uploadPhoto(petId, file);
    closeSheet();
    toast("Fiche enregistrée · le QR de la médaille reste le même");
    await refresh();
  }

  async function uploadPhoto(petId, file) {
    const path = hid() + "/" + petId + "/main.jpg";
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) throw error;
    const { error: e2 } = await sb.from("household_pets").update({ photo_path: path }).eq("id", petId).eq("household_id", hid());
    if (e2) throw e2;
  }

  async function ensureMedal(petId) {
    const have = activeMedal(petId);
    if (have) return have;
    const token = C ? C.newToken() : Math.random().toString(16).slice(2) + Date.now().toString(16);
    const { data, error } = await sb.from("pet_medals").insert({ pet_id: petId, household_id: hid(), public_token: token, active: true }).select("*").single();
    if (error) throw error;
    medals.unshift(data);
    return data;
  }

  function qrSvg(text) {
    if (typeof qrcode !== "function") return "";
    const q = qrcode(0, "M");
    q.addData(text); q.make();
    const n = q.getModuleCount(), s = 8, m = 4;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `<rect x="${(c + m) * s}" y="${(r + m) * s}" width="${s}" height="${s}"/>`;
    const w = (n + m * 2) * s;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" width="${w}" height="${w}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${d}</g></svg>`;
  }

  async function openPreview(id) {
    const p = pets.find(x => x.id === id);
    if (!p) return;
    const photo = p._photo || await photoUrl(p.photo_path);
    const pub = C ? C.publicPayload(p, { photo_url: photo }) : null;
    if (!pub || !C.publicCardScene) { toast("Aperçu indisponible"); return; }
    openSheet("Aperçu du scan QR", `
      <p class="muted small" style="margin:0 0 10px">Même carte que lors d’un flash du QR. Aperçu local : aucune alerte envoyée à la famille.</p>
      ${C.publicCardScene(pub, { preview: true, embed: true })}
    `, { pet: id });
  }

  async function openQr(id) {
    const p = pets.find(x => x.id === id); if (!p) return;
    let med;
    try { med = await ensureMedal(id); } catch (e) { toast(e.message || "QR indisponible"); return; }
    const url = medalLink(med.public_token);
    const svg = qrSvg(url);
    openSheet("Médaille de " + p.name, `
      <p class="muted">URL permanente gravée sur la médaille. Modifier la fiche ne la change pas.</p>
      <div class="mz-pet-qr">${svg || "<p>Module QR absent.</p>"}</div>
      <p class="mz-pet-url"><code>${esc(url)}</code></p>
      <div class="btns">
        <button class="btn primary" data-act="petPreview" data-v="${esc(id)}">Aperçu du scan QR</button>
        <button class="btn" data-act="petQrDl" data-fmt="svg" data-v="${esc(id)}">Télécharger SVG (gravure)</button>
        <button class="btn" data-act="petQrDl" data-fmt="png" data-v="${esc(id)}">Télécharger PNG HD</button>
      </div>
      <p class="muted small">Noir sur blanc, zone calme autour du code, côté d’au moins 12 mm une fois gravé. Contraste maximal, pas de fond photo.</p>
      <button class="btn ghost" data-act="petQrRevoke" data-v="${esc(id)}">Révoquer cette médaille (nouvelle URL)</button>
    `, { pet: id });
  }

  function download(name, mime, data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: mime }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function dlQr(id, fmt) {
    const p = pets.find(x => x.id === id); const med = activeMedal(id); if (!p || !med) return;
    const url = medalLink(med.public_token);
    const svg = qrSvg(url);
    const file = "medaille-" + p.name.replace(/\s+/g, "-").toLowerCase();
    if (fmt === "svg") { download(file + ".svg", "image/svg+xml", svg); return; }
    const img = new Image();
    const blob = await new Promise((ok, ko) => {
      img.onload = () => { const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; c.getContext("2d").drawImage(img, 0, 0, 1024, 1024); c.toBlob(b => b ? ok(b) : ko(new Error("png")), "image/png"); };
      img.onerror = ko;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    download(file + ".png", "image/png", blob);
  }

  async function revokeMedal(id) {
    const med = activeMedal(id); if (!med) return;
    if (!confirm("L’ancienne médaille ne fonctionnera plus. Une nouvelle URL sera créée pour une nouvelle gravure.")) return;
    await sb.from("pet_medals").update({ active: false, revoked_at: new Date().toISOString() }).eq("id", med.id);
    medals = medals.map(m => m.id === med.id ? { ...m, active: false, revoked_at: new Date().toISOString() } : m);
    await ensureMedal(id);
    toast("Nouvelle médaille créée");
    openQr(id);
  }

  async function setLost(id, on) {
    const next = on ? "lost" : "ok";
    const { error } = await sb.from("household_pets").update({ status: next }).eq("id", id).eq("household_id", hid());
    if (error) { toast(error.message); return; }
    const p = pets.find(x => x.id === id); if (p) p.status = next;
    toast(on ? "Mode perdu activé sur la fiche publique" : "Recherche terminée");
    if (view === "animaux") render();
  }

  document.addEventListener("click", e => {
    const go = e.target.closest('[data-act="go"][data-v="animaux"]');
    if (go) asked = false;
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act, id = b.dataset.v;
    if (a === "petNew") { e.preventDefault(); formPet(null); }
    else if (a === "petOpen") { e.preventDefault(); openPet(id); }
    else if (a === "petEdit") { e.preventDefault(); formPet(pets.find(x => x.id === id)); }
    else if (a === "petQr") { e.preventDefault(); openQr(id); }
    else if (a === "petPreview") { e.preventDefault(); openPreview(id); }
    else if (a === "petQrDl") { e.preventDefault(); dlQr(id, b.dataset.fmt).catch(err => toast(err.message)); }
    else if (a === "petQrRevoke") { e.preventDefault(); revokeMedal(id); }
    else if (a === "petLogToggle") {
      e.preventDefault();
      const box = b.closest(".mz-pet-log");
      const body = box && box.querySelector(".mz-pet-log-body");
      if (!body) return;
      const on = body.hidden;
      body.hidden = !on;
      b.setAttribute("aria-expanded", on ? "true" : "false");
      if (typeof LS !== "undefined") LS.set("mz_pet_log_open", on ? "1" : "0");
    } else if (a === "petLogViews") {
      e.preventDefault();
      if (typeof LS !== "undefined") {
        LS.set("mz_pet_log_views", showLogViews() ? "" : "1");
        if (showLogViews()) LS.set("mz_pet_log_open", "1");
      }
      const box = b.closest(".mz-pet-log");
      const petId = (box && box.dataset.pet) || id;
      const p = pets.find(x => x.id === petId);
      if (!p || !box) return;
      const ev = events.filter(x => x.pet_id === petId).slice(0, 12);
      const when = d => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const kind = k => (C && C.kindLabel(k)) || k;
      box.outerHTML = journalBlock(petId, ev, { kind, when });
    } else if (a === "petLogCopy") {
      e.preventDefault();
      const n = String(id || "");
      if (!n) return;
      const done = () => toast("Numéro copié");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(done).catch(() => { try { document.execCommand("copy"); done(); } catch (err) { toast(n); } });
      else toast(n);
    }
  });
  document.addEventListener("click", e => {
    document.querySelectorAll(".mz-pet-menu[open]").forEach(d => { if (!d.contains(e.target)) d.removeAttribute("open"); });
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t && t.id === "petQ") { filter = t.value; if (view === "animaux") render(); }
    if (t && t.dataset.act === "petLost") setLost(t.dataset.v, t.checked);
  });
  document.addEventListener("submit", e => {
    const f = e.target.closest("[data-form=petSave]"); if (!f) return;
    e.preventDefault();
    if (busy) return;
    busy = true;
    savePet(new FormData(f)).catch(err => toast(err.message || "Enregistrement impossible")).finally(() => { busy = false; });
  });

  window.addEventListener("mz-view", () => { if (view === "animaux") { asked = false; refresh(); } });
  window.addEventListener("mz-pet-deeplink", () => {
    if (view !== "animaux") return;
    asked = true;
    refresh();
  });
  window.maisonneeAnimauxCount = () => pets.length;
  window.maisonAnimaux = { refresh, loadPets, medalLink };
})();
