"use strict";
/* Version test : portefeuille local, aucun accès Supabase et aucune transmission des photos. */
(function () {
  const DATABASE = "maisonnee-cartes-local-v1";
  const STORE = "cards";
  const LIMIT = 60;
  const state = { cards: [], drafts: [], ready: false, busy: false, status: "", error: "", search: "" };
  const urls = new Map();
  let dbPromise = null, decoderPromise = null;
  const h = value => esc(value == null ? "" : value);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "carte-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const nameFromFile = (name, index) => {
    const raw = String(name || "").replace(/\.[^.]+$/, "").replace(/^(IMG|Screenshot|Capture|Photo)[ _-]*[0-9 _-]*/i, "").replace(/[_-]/g, " ").trim();
    return raw.length > 2 && !/^\d+$/.test(raw) ? raw.slice(0, 56) : "Carte " + index;
  };
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) { reject(new Error("Le stockage local est indisponible.")); return; }
        const req = indexedDB.open(DATABASE, 1);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("Impossible d'ouvrir le stockage."));
      });
    }
    return dbPromise;
  }
  async function all() {
    const base = await db();
    return new Promise((resolve, reject) => {
      const req = base.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function putMany(rows) {
    if (!rows.length) return;
    const base = await db();
    await new Promise((resolve, reject) => {
      const tx = base.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      for (const row of rows) tx.objectStore(STORE).put(row);
    });
  }
  async function erase(id) {
    const base = await db();
    await new Promise((resolve, reject) => {
      const tx = base.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(id);
    });
  }
  function imageUrl(id, file) {
    if (!file) return "";
    if (!urls.has(id)) urls.set(id, URL.createObjectURL(file));
    return urls.get(id);
  }
  function clearUrls() {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
  }
  function redraw() {
    if (typeof screen !== "undefined" && screen === "app") {
      if (view === "fidelite") render();
      else if (view === "home") window.maisonneeHomePaint?.();
    }
  }
  async function reload() {
    clearUrls();
    state.cards = (await all()).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "fr"));
    state.ready = true;
    state.error = "";
    redraw();
  }
  window.maisonneeCartesCount = () => state.cards.length;
  const lookup = id => state.cards.find(c => c.id === id);
  function previewRow(c) {
    const url = imageUrl(c.id, c.image);
    const detail = c.code ? "Code reconnu · " + c.code : c.image ? "Capture disponible" : "Numéro manuel";
    return '<div class="mz-wallet-item" data-wallet-search="' + h((c.name + " " + c.code).toLowerCase()) + '">' +
      '<button type="button" data-wallet="open" data-id="' + h(c.id) + '" class="mz-wallet-card">' +
      (url ? '<img src="' + url + '" alt="" loading="lazy">' : '<span class="mz-wallet-symbol">▥</span>') +
      '<span class="mz-wallet-info"><strong>' + h(c.name) + '</strong><small>' + h(detail) + '</small></span><span aria-hidden="true">›</span></button>' +
      '<div class="mz-wallet-tools"><button type="button" data-wallet="favorite" data-id="' + h(c.id) + '" aria-label="' + (c.favorite ? "Retirer des favoris" : "Mettre en favori") + '">' + (c.favorite ? "★ Favori" : "☆ Favori") + '</button><button type="button" data-wallet="edit" data-id="' + h(c.id) + '">Modifier</button></div></div>';
  }
  function draftRow(d, i) {
    const url = imageUrl(d.id, d.image);
    return '<div class="mz-wallet-draft"><img src="' + url + '" alt="Capture ' + (i + 1) + '">' +
      '<label>Nom de la carte<input class="input" type="text" data-wallet-name="' + h(d.id) + '" maxlength="60" value="' + h(d.name) + '"></label>' +
      '<small>' + (d.code ? 'Code détecté : ' + h(d.code) : "Code non reconnu : la capture restera disponible.") + '</small>' +
      '<button type="button" data-wallet="removeDraft" data-id="' + h(d.id) + '">Retirer</button></div>';
  }
  VIEWS.fidelite = function () {
    const list = state.cards.filter(c => (c.name + " " + (c.code || "")).toLocaleLowerCase("fr").includes(state.search.toLocaleLowerCase("fr")));
    return '<section class="mz-wallet">' +
      '<div class="mz-wallet-head"><div><h2>Mes cartes de fidélité</h2><p>Conservées sur cet appareil, consultables sans Internet.</p></div><span class="mz-wallet-offline">' + (!navigator.onLine ? "Hors ligne" : "Stockage iPhone") + '</span></div>' +
      '<div class="mz-wallet-actions"><button class="btn primary" type="button" data-wallet="pick">＋ Ajouter des captures</button><button class="btn" type="button" data-wallet="backup">Sauvegarder</button><button class="btn" type="button" data-wallet="pickBackup">Restaurer</button></div>' +
      '<input id="mz-wallet-files" class="mz-wallet-file" type="file" accept="image/*" multiple aria-label="Sélectionner des captures d’écran">' +
      '<input id="mz-wallet-backup" class="mz-wallet-file" type="file" accept=".json,application/json" aria-label="Importer une sauvegarde">' +
      (state.status ? '<p class="mz-wallet-status" role="status">' + h(state.status) + '</p>' : "") +
      (state.error ? '<p class="mz-wallet-error" role="alert">' + h(state.error) + '</p>' : "") +
      (state.drafts.length ? '<section class="mz-wallet-review"><h3>Vérifier les ' + state.drafts.length + ' captures</h3><p>Corrige les noms avant d’enregistrer. Les codes non reconnus seront conservés en image.</p><div class="mz-wallet-drafts">' + state.drafts.map(draftRow).join("") + '</div><div class="mz-wallet-actions"><button type="button" class="btn primary" data-wallet="saveDrafts" ' + (state.busy ? "disabled" : "") + '>Enregistrer ' + state.drafts.length + ' cartes</button><button type="button" class="btn" data-wallet="clearDrafts">Annuler</button></div></section>' : "") +
      (state.ready ? '<label class="mz-wallet-search">Rechercher une enseigne<input class="input" id="mz-wallet-search" type="search" placeholder="Nom du magasin" value="' + h(state.search) + '"></label><div class="mz-wallet-list">' +
        (list.length ? list.map(previewRow).join("") : '<div class="mz-wallet-empty">' + (state.cards.length ? "Aucune carte trouvée." : "Aucune carte enregistrée. Ajoute tes captures Klarna pour commencer.") + '</div>') + '</div>' :
        '<p class="mz-wallet-status">Ouverture du stockage local…</p>') +
      '<p class="mz-wallet-note">Les photos et les numéros restent sur cet appareil. La sauvegarde est nécessaire avant de changer ou réinitialiser l’iPhone.</p></section>';
  };
  async function sha256(blob) {
    if (!crypto.subtle) return String(blob.size) + "-" + String(blob.lastModified || "");
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  }
  function decoder() {
    if (!decoderPromise) {
      decoderPromise = new Promise(resolve => {
        if (window.ZXing?.BrowserMultiFormatReader) { resolve(true); return; }
        if (!navigator.onLine) { resolve(false); return; }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
        script.async = true;
        const timeout = setTimeout(() => resolve(false), 9000);
        script.onload = () => { clearTimeout(timeout); resolve(!!window.ZXing?.BrowserMultiFormatReader); };
        script.onerror = () => { clearTimeout(timeout); resolve(false); };
        document.head.appendChild(script);
      });
    }
    return decoderPromise;
  }
  async function readBarcode(blob) {
    let url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (typeof window.BarcodeDetector !== "undefined") {
        try {
          const hits = await new window.BarcodeDetector().detect(image);
          if (hits[0]?.rawValue) return { code: String(hits[0].rawValue), format: String(hits[0].format || "") };
        } catch (_) {}
      }
      if (await decoder()) {
        try {
          const result = await new window.ZXing.BrowserMultiFormatReader().decodeFromImageElement(image);
          return { code: String(result.getText()), format: String(result.getBarcodeFormat()) };
        } catch (_) {}
      }
      return { code: "", format: "" };
    } catch (_) {
      return { code: "", format: "" };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function addImages(files) {
    if (state.busy) return;
    const images = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, LIMIT);
    if (!images.length) { state.error = "Sélectionne des images ou captures d’écran."; redraw(); return; }
    state.busy = true;
    state.error = "";
    const existing = new Set(state.cards.map(c => c.hash).filter(Boolean).concat(state.drafts.map(c => c.hash).filter(Boolean)));
    const knownCodes = new Set(state.cards.map(c => c.code).filter(Boolean).concat(state.drafts.map(c => c.code).filter(Boolean)));
    let duplicates = 0, failures = 0;
    try {
      for (const file of images) {
        state.status = "Analyse des captures : " + (duplicates + failures + state.drafts.length + 1) + " / " + images.length;
        redraw();
        try {
          const hash = await sha256(file);
          if (existing.has(hash)) { duplicates++; continue; }
          const found = await readBarcode(file);
          if (found.code && knownCodes.has(found.code)) { duplicates++; continue; }
          existing.add(hash); if (found.code) knownCodes.add(found.code);
          state.drafts.push({ id: uid(), name: nameFromFile(file.name, state.cards.length + state.drafts.length + 1), code: found.code, format: found.format, hash, image: file, favorite: false, savedAt: Date.now() });
        } catch (e) { failures++; }
      }
      state.status = state.drafts.length + " capture(s) à vérifier" + (duplicates ? " · " + duplicates + " doublon(s) ignoré(s)" : "") + (failures ? " · " + failures + " erreur(s)" : "") + ".";
    } finally {
      state.busy = false;
      redraw();
    }
  }
  async function saveDrafts() {
    if (state.busy || !state.drafts.length) return;
    state.busy = true; state.error = ""; state.status = "Enregistrement local…"; redraw();
    try {
      const batch = state.drafts.map(d => ({ ...d, name: String(d.name).trim().slice(0, 60) || "Carte de fidélité" }));
      await putMany(batch);
      state.drafts = [];
      state.status = batch.length + " carte(s) sauvegardée(s) sur cet appareil.";
      await reload();
    } catch (e) { state.error = "Impossible d’enregistrer les cartes : " + (e.message || e); }
    finally { state.busy = false; redraw(); }
  }
  function fullscreen(c) {
    if (!c) return;
    let dlg = document.getElementById("mz-wallet-dialog");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "mz-wallet-dialog";
      dlg.className = "mz-wallet-dialog";
      dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    const url = imageUrl(c.id, c.image);
    dlg.innerHTML = '<div class="mz-wallet-full"><div class="mz-wallet-fulltop"><strong>' + h(c.name) + '</strong><button type="button" data-wallet="close" aria-label="Fermer">✕</button></div>' +
      '<div class="mz-wallet-codearea">' + (url ? '<img src="' + url + '" alt="Carte de fidélité ' + h(c.name) + '">' : '<strong>' + h(c.code || "Code non disponible") + '</strong>') + '</div>' +
      (c.code ? '<p class="mz-wallet-number">' + h(c.code) + '</p>' : '<p class="mz-wallet-number">Présente la capture au lecteur en caisse.</p>') +
      '<p class="mz-wallet-hint">Agrandis l’image si nécessaire. La luminosité se règle depuis l’iPhone.</p></div>';
    if (!dlg.open) dlg.showModal();
  }
  function editCard(c) {
    if (!c) return;
    openSheet("Modifier la carte", '<form data-wallet-edit="' + h(c.id) + '">' +
      '<label class="field"><span class="label">Nom du magasin</span><input class="input" name="name" maxlength="60" required value="' + h(c.name) + '"></label>' +
      '<label class="field"><span class="label">Numéro ou contenu du code (facultatif)</span><input class="input" name="code" maxlength="256" value="' + h(c.code || "") + '"></label>' +
      '<p class="muted small">Modifier le numéro ne remplace pas le code-barres présent sur la capture.</p>' +
      '<div class="sheet-sticky btns"><button class="btn primary" type="submit">Enregistrer</button><button class="btn danger" type="button" data-wallet="delete" data-id="' + h(c.id) + '">Supprimer</button></div></form>');
  }
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  function base64ToBlob(text) {
    if (!/^data:image\/[\w.+-]+;base64,/.test(String(text))) return null;
    const [header, raw] = text.split(",");
    const type = header.slice(5).split(";")[0];
    const bytes = atob(raw);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
    return new Blob([out], { type });
  }
  async function exportBackup() {
    if (!state.cards.length) { toast("Aucune carte à sauvegarder."); return; }
    state.status = "Préparation de la sauvegarde…"; redraw();
    try {
      const rows = [];
      for (const card of state.cards) {
        rows.push({ ...card, image: card.image ? await blobToBase64(card.image) : null });
      }
      const payload = { kind: "maisonnee-cartes", version: 1, exportedAt: new Date().toISOString(), cards: rows };
      const file = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const href = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = href; link.download = "maisonnee-cartes-sauvegarde.json";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      state.status = "Sauvegarde préparée. Conserve le fichier JSON en lieu sûr.";
    } catch (e) { state.error = "Sauvegarde impossible : " + (e.message || e); }
    redraw();
  }
  async function importBackup(file) {
    if (!file) return;
    state.status = "Restauration du fichier…"; state.error = ""; redraw();
    try {
      if (file.size > 80 * 1024 * 1024) throw new Error("Fichier de sauvegarde trop volumineux.");
      const data = JSON.parse(await file.text());
      if (data.kind !== "maisonnee-cartes" || data.version !== 1 || !Array.isArray(data.cards) || data.cards.length > 100) throw new Error("Ce fichier n’est pas une sauvegarde Maisonnée valide.");
      const knownHash = new Set(state.cards.map(c => c.hash).filter(Boolean));
      const knownCodes = new Set(state.cards.map(c => c.code).filter(Boolean));
      const batch = [];
      for (const row of data.cards) {
        if (!row || typeof row.name !== "string") continue;
        const code = typeof row.code === "string" ? row.code.slice(0, 256) : "";
        const hash = typeof row.hash === "string" ? row.hash.slice(0, 128) : "";
        if ((hash && knownHash.has(hash)) || (code && knownCodes.has(code))) continue;
        const image = row.image ? base64ToBlob(row.image) : null;
        if (hash) knownHash.add(hash);
        if (code) knownCodes.add(code);
        batch.push({ id: uid(), name: row.name.slice(0, 60) || "Carte restaurée", code, format: String(row.format || "").slice(0, 60), hash, image, favorite: !!row.favorite, savedAt: Date.now() });
      }
      await putMany(batch);
      state.status = batch.length + " carte(s) restaurée(s).";
      await reload();
    } catch (e) { state.error = "Restauration impossible : " + (e.message || e); }
    redraw();
  }
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-wallet]");
    if (!button) return;
    event.preventDefault(); event.stopPropagation();
    const cmd = button.dataset.wallet, card = lookup(button.dataset.id);
    if (cmd === "pick") document.getElementById("mz-wallet-files")?.click();
    else if (cmd === "pickBackup") document.getElementById("mz-wallet-backup")?.click();
    else if (cmd === "open") fullscreen(card);
    else if (cmd === "close") document.getElementById("mz-wallet-dialog")?.close();
    else if (cmd === "edit") editCard(card);
    else if (cmd === "favorite" && card) {
      try { await putMany([{ ...card, favorite: !card.favorite }]); await reload(); }
      catch (e) { state.error = "Modification impossible."; redraw(); }
    } else if (cmd === "delete" && card) {
      if (!confirm("Supprimer « " + card.name + " » de cet iPhone ?")) return;
      try { await erase(card.id); closeSheet(); await reload(); }
      catch (e) { state.error = "Suppression impossible."; redraw(); }
    } else if (cmd === "saveDrafts") await saveDrafts();
    else if (cmd === "clearDrafts") {
      state.drafts = []; state.status = ""; clearUrls(); redraw();
    } else if (cmd === "removeDraft") {
      state.drafts = state.drafts.filter(d => d.id !== button.dataset.id); clearUrls(); redraw();
    } else if (cmd === "backup") await exportBackup();
  });
  document.addEventListener("change", async event => {
    if (event.target.id === "mz-wallet-files") await addImages(event.target.files);
    else if (event.target.id === "mz-wallet-backup") await importBackup(event.target.files?.[0]);
  });
  document.addEventListener("input", event => {
    if (event.target.hasAttribute("data-wallet-name")) {
      const draft = state.drafts.find(d => d.id === event.target.dataset.walletName);
      if (draft) draft.name = event.target.value;
    } else if (event.target.id === "mz-wallet-search") {
      state.search = event.target.value;
      document.querySelectorAll(".mz-wallet-item").forEach(el => {
        el.hidden = !String(el.dataset.walletSearch || "").includes(state.search.toLocaleLowerCase("fr"));
      });
    }
  });
  document.addEventListener("submit", async event => {
    const form = event.target.closest("form[data-wallet-edit]");
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const card = lookup(form.dataset.walletEdit);
    if (!card) return;
    const fields = new FormData(form);
    const name = String(fields.get("name") || "").trim();
    if (!name) return;
    try {
      await putMany([{ ...card, name: name.slice(0, 60), code: String(fields.get("code") || "").slice(0, 256) }]);
      closeSheet(); await reload();
    } catch (e) { state.error = "Modification impossible : " + (e.message || e); redraw(); }
  }, true);
  window.addEventListener("online", redraw);
  window.addEventListener("offline", redraw);
  navigator.serviceWorker?.addEventListener("controllerchange", redraw);
  reload().catch(e => { state.ready = false; state.error = "Stockage indisponible : " + (e.message || e); redraw(); });
})();
