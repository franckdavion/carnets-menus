"use strict";
/* Version test : portefeuille local, aucun accès Supabase et aucune transmission des photos. */
(function () {
  const DATABASE = "maisonnee-cartes-local-v1";
  const STORE = "cards";
  const LIMIT = 60;
  const state = { cards: [], drafts: [], ready: false, busy: false, status: "", error: "", search: "", crop: null, manage: false };
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
  /* Catalogue local de styles : ces vignettes sont dessinées dans Maisonnée
     pour rester disponibles en mode avion, sans charger des logos externes. */
  const BRANDS = [
    ["intermarche","Intermarché","#fff","#222","Intermarché",["intermarche","inter marche"]],
    ["leclerc","E.Leclerc","#fa9300","#087ac0","E.Leclerc",["e leclerc","eleclerc","leclerc"]],
    ["action","Action","#fff","#07529d","ACTION",["action"]],
    ["bricomarche","Bricomarché","#fff","#222","BRICOMARCHÉ",["bricomarche","brico marche"]],
    ["match","Match","#fff","#278442","MATCH",["supermarche match","match"]],
    ["auchan","Auchan","#ed1d2e","#fff","Auchan",["auchan"]],
    ["intersport","Intersport","#fff","#1d5390","INTERSPORT",["intersport"]],
    ["carrefour","Carrefour","#08448c","#fff","Carrefour",["carrefour","carrefour market"]],
    ["decathlon","Decathlon","#364bbb","#fff","DECATHLON",["decathlon"]],
    ["gammvert","Gamm vert","#00745f","#fff","Gamm vert",["gamm vert","gammvert"]],
    ["gifi","GiFi","#fff","#ec2071","GiFi",["gifi"]],
    ["superu","Super U","#287b96","#fff","U",["super u","hyper u","magasins u","systeme u","utile","superu"]],
    ["norauto","Norauto","#023b87","#fff","Norauto",["norauto"]],
    ["colruyt","Colruyt","#eeeae1","#1b1b1b","colruyt",["colruyt"]],
    ["darty","Darty","#ec1b27","#fff","DARTY",["darty"]],
    ["gosport","GO Sport","#000","#fff","GO SPORT",["go sport","gosport"]],
    ["histoiredor","Histoire d’Or","#ae002f","#ffefcc","Histoire d’Or",["histoire d or","histoiredor"]],
    ["ikea","IKEA","#07559a","#f8d800","IKEA",["ikea"]],
    ["lahalle","La Halle","#08051a","#fff","LA HALLE",["la halle","lahalle"]],
    ["lidl","Lidl","#143a79","#f9d100","LIDL",["lidl"]],
    ["picwic","PicWic","#a50023","#ffdd00","PicWic",["picwic","pic wic"]],
    ["bricodepot","Brico Dépôt","#fff","#df2730","BRICO DÉPÔT",["brico depot","bricodepot"]],
    ["boulanger","Boulanger","#f16b21","#fff","boulanger",["boulanger"]],
    ["fnac","Fnac","#fdd400","#171717","fnac",["fnac"]],
    ["cultura","Cultura","#fff","#e9502c","cultura",["cultura"]],
    ["leroymerlin","Leroy Merlin","#007e50","#fff","LEROY MERLIN",["leroy merlin","leroymerlin"]],
    ["aldi","Aldi","#0060a9","#fff","ALDI",["aldi"]],
    ["kiabi","Kiabi","#fff","#164fac","KIABI",["kiabi"]],
    ["castorama","Castorama","#005aab","#fff","Castorama",["castorama"]],
    ["jardiland","Jardiland","#007341","#fff","Jardiland",["jardiland"]],
    ["gemo","Gémo","#fff","#ec202c","Gémo",["gemo"]],
    ["sephora","Sephora","#101010","#fff","SEPHORA",["sephora"]]
  ].map(([id,name,bg,ink,mark,aliases]) => ({id,name,bg,ink,mark,aliases}));
  const NORMAL = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const brandById = id => BRANDS.find(b => b.id === id) || null;
  function brandFromText(input) {
    const hay = " " + NORMAL(input) + " ";
    const matches = [];
    for (const brand of BRANDS) {
      for (const alias of brand.aliases) {
        const key = " " + NORMAL(alias) + " ";
        if (hay.includes(key)) matches.push({ brand, length: key.length });
      }
    }
    matches.sort((a,b) => b.length - a.length);
    return matches[0]?.brand || null;
  }
  function brandOf(card) {
    return brandById(card?.brandId) || brandFromText(card?.name) || null;
  }
  function brandTile(card, forDraft = false) {
    const brand = brandOf(card), id = brand?.id || "generic";
    const label = brand?.mark || card?.name || "Ma carte";
    return '<span class="mz-wallet-brand-tile mz-wallet-brand--' + id + (forDraft ? ' mz-wallet-brand-mini' : '') +
      '" style="--wallet-bg:' + (brand?.bg || "#173a5a") + ';--wallet-ink:' + (brand?.ink || "#e5f5ff") + '" aria-label="' + h(label) + '">' +
      '<span class="mz-wallet-brand-logo">' + h(label) + '</span></span>';
  }
  function brandOptions(card) {
    const active = brandOf(card)?.id || "";
    return '<option value=""' + (!active ? " selected" : "") + '>Autre enseigne / à identifier</option>' +
      BRANDS.map(b => '<option value="' + b.id + '"' + (active === b.id ? " selected" : "") + '>' + h(b.name) + '</option>').join("");
  }
  function applyBrand(card, id) {
    const brand = brandById(id);
    const old = brandOf(card);
    const previous = String(card.name || "");
    card.brandId = brand?.id || "";
    if (brand && (!previous || /^carte\s*\d+$/i.test(previous) ||
        /^carte restaur/i.test(previous) || (old && NORMAL(previous) === NORMAL(old.name)))) {
      card.name = brand.name;
    }
    return card;
  }

  function previewRow(c) {
    const brand = brandOf(c);
    return '<div class="mz-wallet-item mz-wallet-mosaic-item" data-wallet-search="' +
      h((c.name + " " + (brand?.name || "") + " " + (c.code || "")).toLocaleLowerCase("fr")) + '">' +
      '<button type="button" data-wallet="open" data-id="' + h(c.id) +
      '" class="mz-wallet-mosaic-card" aria-label="Afficher la carte ' + h(c.name) + '">' +
      brandTile(c) + (c.favorite ? '<span class="mz-wallet-star" aria-label="Favori">★</span>' : '') +
      '</button></div>';
  }
  function draftRow(d, i) {
    const url = imageUrl(d.id, d.image);
    return '<div class="mz-wallet-draft">' +
      '<div class="mz-wallet-draft-identity">' + brandTile(d, true) +
      '<img src="' + url + '" alt="Capture du code-barres ' + (i + 1) + '"></div>' +
      '<label>Enseigne<select class="input" data-wallet-brand="' + h(d.id) +
      '">' + brandOptions(d) + '</select></label>' +
      '<label>Nom de la carte<input class="input" type="text" data-wallet-name="' + h(d.id) +
      '" maxlength="60" value="' + h(d.name) + '"></label>' +
      '<small>' + (d.code ? 'Code détecté : ' + h(d.code) : 'Code non reconnu : la capture sera conservée.') + '</small>' +
      '<div class="mz-wallet-draft-actions"><button type="button" data-wallet="recognize" data-id="' + h(d.id) +
      '">⌕ Reconnaître l’enseigne</button><button type="button" data-wallet="crop" data-id="' + h(d.id) +
      '">✂ Recadrer</button><button type="button" data-wallet="removeDraft" data-id="' + h(d.id) +
      '">Retirer</button></div></div>';
  }
  VIEWS.fidelite = function () {
    const filtered = state.cards.filter(c => (c.name + " " + (brandOf(c)?.name || "") + " " + (c.code || ""))
      .toLocaleLowerCase("fr").includes(state.search.toLocaleLowerCase("fr")));
    const fav = filtered.filter(c => c.favorite), rest = filtered.filter(c => !c.favorite);
    const section = (title, entries) => entries.length ?
      '<section class="mz-wallet-mosaic-section"><h3>' + h(title) + '</h3><div class="mz-wallet-list mz-wallet-mosaic-grid">' +
      entries.map(previewRow).join("") + '</div></section>' : "";
    return '<section class="mz-wallet mz-wallet-mosaic">' +
      '<div class="mz-wallet-head"><div><h2>Cartes de fidélité</h2><p>Tes cartes restent accessibles sans Internet sur cet appareil.</p></div>' +
      '<span class="mz-wallet-offline">' + (!navigator.onLine ? "Hors ligne" : "Stockage iPhone") + '</span></div>' +
      '<div class="mz-wallet-actions mz-wallet-main-actions"><button class="btn primary" type="button" data-wallet="pick">＋ Ajouter des cartes</button>' +
      '<button class="btn" type="button" data-wallet="manageToggle">' + (state.manage ? "Fermer les options" : "⋯ Gérer") + '</button></div>' +
      (state.manage ? '<div class="mz-wallet-manage"><p>Les cartes et leurs captures sont enregistrées uniquement sur cet appareil.</p>' +
        '<div class="mz-wallet-actions"><button class="btn" type="button" data-wallet="backup">Sauvegarder mes cartes</button>' +
        '<button class="btn" type="button" data-wallet="pickBackup">Restaurer une sauvegarde</button></div></div>' : '') +
      '<input id="mz-wallet-files" class="mz-wallet-file" type="file" accept="image/*" multiple aria-label="Sélectionner des captures d’écran">' +
      '<input id="mz-wallet-backup" class="mz-wallet-file" type="file" accept=".json,application/json" aria-label="Importer une sauvegarde">' +
      (state.status ? '<p class="mz-wallet-status" role="status">' + h(state.status) + '</p>' : "") +
      (state.error ? '<p class="mz-wallet-error" role="alert">' + h(state.error) + '</p>' : "") +
      (state.drafts.length ? '<section class="mz-wallet-review"><h3>Vérifier ' + state.drafts.length + ' carte(s)</h3>' +
        '<p>Choisis l’enseigne pour obtenir sa vignette. Si elle n’est pas proposée, tu peux garder un nom personnalisé.</p>' +
        '<div class="mz-wallet-drafts">' + state.drafts.map(draftRow).join("") + '</div>' +
        '<div class="mz-wallet-actions"><button type="button" class="btn primary" data-wallet="saveDrafts" ' +
        (state.busy ? "disabled" : "") + '>Enregistrer ' + state.drafts.length + ' carte(s)</button>' +
        '<button type="button" class="btn" data-wallet="recognizeDrafts" ' + (state.busy ? "disabled" : "") +
        '>⌕ Reconnaître les enseignes</button>' +
        '<button type="button" class="btn" data-wallet="clearDrafts">Annuler</button></div></section>' : "") +
      (state.ready ? '<label class="mz-wallet-search">⌕ Rechercher<input class="input" id="mz-wallet-search" type="search" ' +
        'placeholder="Enseigne ou numéro de carte" value="' + h(state.search) + '"></label>' +
        (filtered.length ? section("Utilisation fréquente", fav) + section(rest.length && fav.length ? "Toutes les cartes" : "Mes cartes", rest) :
        '<div class="mz-wallet-empty">' + (state.cards.length ? "Aucune carte trouvée." :
          "Aucune carte enregistrée. Importe une capture Klarna pour commencer.") + '</div>') :
        '<p class="mz-wallet-status">Ouverture du stockage local…</p>') +
      '<p class="mz-wallet-note">Les vignettes d’enseignes fonctionnent hors ligne. Pense à sauvegarder tes cartes avant un changement d’iPhone.</p></section>';
  };
  async function sha256(blob) {
    if (!crypto.subtle) return String(blob.size) + "-" + String(blob.lastModified || "");
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  }
  function decoder() {
    if (window.ZXing?.BrowserMultiFormatReader) return Promise.resolve(true);
    if (!navigator.onLine) return Promise.resolve(false);
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
  /* OCR facultative et locale dans le navigateur : le moteur est téléchargé
     uniquement sur demande lorsque Internet est disponible, sans téléverser
     les captures. L'identification reste à confirmer avant l'enregistrement. */
  let ocrScriptPromise = null, ocrWorker = null;
  async function loadTextReader() {
    if (window.Tesseract?.createWorker) return true;
    if (!navigator.onLine) return false;
    if (!ocrScriptPromise) ocrScriptPromise = new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      const timer = setTimeout(() => resolve(false), 15000);
      script.onload = () => { clearTimeout(timer); resolve(!!window.Tesseract?.createWorker); };
      script.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.appendChild(script);
    });
    return ocrScriptPromise;
  }
  async function ocrSource(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url; await img.decode();
      const top = Math.max(1, Math.round(img.naturalHeight * .75));
      const ratio = Math.min(1.7, 1350 / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(top * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return blob;
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.naturalWidth, top, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Impossible de lire la capture.")), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }
  async function recognizeBrandOnCard(card) {
    if (!card?.image) return { brand: null, reason: "Capture indisponible." };
    const matched = brandFromText(card.name);
    if (matched) return { brand: matched, reason: "Enseigne retrouvée dans le nom." };
    if (!navigator.onLine) return { brand: null, reason: "Reconnaissance automatique indisponible hors ligne : choisis l’enseigne dans la liste." };
    try {
      if (!(await loadTextReader())) return { brand: null, reason: "Le lecteur de texte ne s’est pas chargé. Choisis l’enseigne dans la liste." };
      if (!ocrWorker) ocrWorker = await window.Tesseract.createWorker("eng");
      const image = await ocrSource(card.originalImage || card.image);
      const result = await ocrWorker.recognize(image);
      const words = String(result?.data?.text || "");
      const brand = brandFromText(words);
      return { brand, reason: brand ? "Nom repéré sur la capture (à vérifier)." :
        "Aucune enseigne reconnue avec certitude. Sélectionne-la dans la liste." };
    } catch (error) {
      return { brand: null, reason: "Lecture automatique impossible. Choisis l’enseigne manuellement." };
    }
  }
  async function recognizeOne(id) {
    if (state.busy) return;
    const draft = state.drafts.find(d => d.id === id), card = draft || lookup(id);
    if (!card) return;
    state.busy = true; state.error = "";
    state.status = "Lecture du nom de l’enseigne sur la capture…"; redraw();
    try {
      const found = await recognizeBrandOnCard(card);
      if (found.brand) {
        const updated = applyBrand({ ...card }, found.brand.id);
        if (draft) Object.assign(draft, updated);
        else await putMany([updated]);
        state.status = found.brand.name + " — " + found.reason;
        if (!draft) await reload();
      } else state.status = found.reason;
    } finally { state.busy = false; redraw(); }
  }
  async function recognizeDrafts() {
    if (state.busy || !state.drafts.length) return;
    state.busy = true;
    let done = 0, found = 0;
    try {
      for (const draft of state.drafts) {
        done++;
        if (brandOf(draft)) { found++; continue; }
        state.status = "Identification " + done + " / " + state.drafts.length + "…";
        redraw();
        const result = await recognizeBrandOnCard(draft);
        if (result.brand) { applyBrand(draft, result.brand.id); found++; }
      }
      state.status = found + " enseigne(s) associée(s) sur " + done +
        ". Vérifie les propositions et choisis les enseignes manquantes.";
    } finally { state.busy = false; redraw(); }
  }

  async function addImages(files) {
    if (state.busy) return;
    const images = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, LIMIT);
    if (!images.length) { state.error = "Sélectionne des images ou captures d’écran."; redraw(); return; }
    state.busy = true;
    state.error = "";
    const existing = new Set(state.cards.map(c => c.hash).filter(Boolean).concat(state.drafts.map(c => c.hash).filter(Boolean)));
    const knownCodes = new Set(state.cards.map(c => c.code).filter(Boolean).concat(state.drafts.map(c => c.code).filter(Boolean)));
    let duplicates = 0, failures = 0, lastAdded = null;
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
          const fileName = nameFromFile(file.name, state.cards.length + state.drafts.length + 1);
          const detectedBrand = brandFromText(fileName);
          lastAdded = uid();
          state.drafts.push({ id: lastAdded, name: detectedBrand?.name || fileName, brandId: detectedBrand?.id || "", code: found.code, format: found.format, hash, image: file, originalImage: file, favorite: false, savedAt: Date.now() });
        } catch (e) { failures++; }
      }
      state.status = state.drafts.length + " capture(s) à vérifier" + (duplicates ? " · " + duplicates + " doublon(s) ignoré(s)" : "") + (failures ? " · " + failures + " erreur(s)" : "") + ".";
    } finally {
      state.busy = false;
      redraw();
    }
    // Pour une carte seule, essayer de lire le nom de l’enseigne tout de suite.
    // Sur un lot (ex. 20 captures), laisser le lancement de l’OCR à l’utilisateur.
    if (images.length === 1 && lastAdded && navigator.onLine &&
        !brandOf(state.drafts.find(d => d.id === lastAdded))) await recognizeOne(lastAdded);
  }
  async function saveDrafts() {
    if (state.busy || !state.drafts.length) return;
    state.busy = true; state.error = ""; state.status = "Enregistrement local…"; redraw();
    try {
      const batch = state.drafts.map(d => ({ ...d, brandId: brandOf(d)?.id || "", name: String(d.name).trim().slice(0, 60) || brandOf(d)?.name || "Carte de fidélité" }));
      await putMany(batch);
      state.drafts = [];
      state.status = batch.length + " carte(s) sauvegardée(s) sur cet appareil.";
      await reload();
    } catch (e) { state.error = "Impossible d’enregistrer les cartes : " + (e.message || e); }
    finally { state.busy = false; redraw(); }
  }

  /* Recadrage tactile non destructif : coordonnées normalisées dans l'image,
     coins redimensionnables et déplacement du cadre. L'original est conservé. */
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function cropDefault(image) {
    return image.naturalHeight > image.naturalWidth * 1.35
      ? { x: .07, y: .15, w: .86, h: .30 }
      : { x: .06, y: .22, w: .88, h: .55 };
  }
  function cropFit() {
    const image = document.getElementById("mz-wallet-crop-image");
    const stage = document.getElementById("mz-wallet-crop-stage");
    if (!image?.naturalWidth || !image?.naturalHeight || !stage) return;
    const maxWidth = Math.max(160, Math.min(window.innerWidth - 58, 670));
    const maxHeight = Math.max(220, Math.min(window.innerHeight * .56, 640));
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    stage.style.width = Math.round(image.naturalWidth * scale) + "px";
    stage.style.height = Math.round(image.naturalHeight * scale) + "px";
  }
  function cropPaint() {
    const region = document.getElementById("mz-wallet-crop-region");
    if (!region || !state.crop) return;
    const r = state.crop.rect;
    region.style.left = (r.x * 100) + "%";
    region.style.top = (r.y * 100) + "%";
    region.style.width = (r.w * 100) + "%";
    region.style.height = (r.h * 100) + "%";
  }
  function cropPoint(event, stage) {
    const box = stage.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / Math.max(1, box.width), 0, 1),
      y: clamp((event.clientY - box.top) / Math.max(1, box.height), 0, 1)
    };
  }
  function cropPointerDown(event) {
    if (!state.crop || state.crop.busy || event.button > 0) return;
    const stage = event.target.closest("#mz-wallet-crop-stage");
    if (!stage) return;
    event.preventDefault();
    const rect = { ...state.crop.rect }, point = cropPoint(event, stage);
    const corner = event.target.closest("[data-crop-handle]")?.dataset.cropHandle;
    const inside = event.target.closest("#mz-wallet-crop-region");
    if (!corner && !inside) {
      rect.x = clamp(point.x - rect.w / 2, 0, 1 - rect.w);
      rect.y = clamp(point.y - rect.h / 2, 0, 1 - rect.h);
      state.crop.rect = rect;
      cropPaint();
    }
    state.crop.drag = {
      id: event.pointerId, mode: corner || "move",
      start: point, original: { ...state.crop.rect }
    };
    stage.setPointerCapture(event.pointerId);
  }
  function cropPointerMove(event) {
    const current = state.crop;
    if (!current?.drag || current.drag.id !== event.pointerId) return;
    event.preventDefault();
    const stage = document.getElementById("mz-wallet-crop-stage");
    if (!stage) return;
    const point = cropPoint(event, stage);
    const drag = current.drag, a = drag.original;
    const dx = point.x - drag.start.x, dy = point.y - drag.start.y;
    const minimumWidth = .13, minimumHeight = .055;
    let left = a.x, top = a.y, right = a.x + a.w, bottom = a.y + a.h;
    if (drag.mode === "move") {
      left = clamp(a.x + dx, 0, 1 - a.w);
      top = clamp(a.y + dy, 0, 1 - a.h);
      right = left + a.w; bottom = top + a.h;
    } else {
      if (drag.mode.includes("w")) left = clamp(a.x + dx, 0, right - minimumWidth);
      if (drag.mode.includes("e")) right = clamp(a.x + a.w + dx, left + minimumWidth, 1);
      if (drag.mode.includes("n")) top = clamp(a.y + dy, 0, bottom - minimumHeight);
      if (drag.mode.includes("s")) bottom = clamp(a.y + a.h + dy, top + minimumHeight, 1);
    }
    current.rect = { x: left, y: top, w: right - left, h: bottom - top };
    cropPaint();
  }
  function cropPointerUp(event) {
    if (!state.crop?.drag || state.crop.drag.id !== event.pointerId) return;
    state.crop.drag = null;
    const stage = document.getElementById("mz-wallet-crop-stage");
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  async function openCrop(card) {
    if (!card?.image) { toast("Aucune image à recadrer."); return; }
    const source = card.originalImage || card.image;
    let dlg = document.getElementById("mz-wallet-crop");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "mz-wallet-crop";
      dlg.className = "mz-wallet-crop-dialog";
      dlg.addEventListener("close", () => { state.crop = null; });
      document.body.appendChild(dlg);
    }
    const sourceUrl = imageUrl(card.id + "-original", source);
    dlg.innerHTML = '<div class="mz-wallet-crop-content">' +
      '<div class="mz-wallet-crop-top"><strong>Recadrer · ' + h(card.name) + '</strong><button type="button" data-wallet="cropClose" aria-label="Fermer le recadrage">✕</button></div>' +
      '<p>Place le cadre autour du code-barres. Glisse le cadre pour le déplacer et tire les coins pour l’ajuster.</p>' +
      '<div class="mz-wallet-crop-scroll"><div class="mz-wallet-crop-stage" id="mz-wallet-crop-stage">' +
      '<img id="mz-wallet-crop-image" src="' + sourceUrl + '" alt="Capture originale à recadrer">' +
      '<div class="mz-wallet-crop-region" id="mz-wallet-crop-region" role="group" aria-label="Zone conservée">' +
      ['nw', 'ne', 'sw', 'se'].map(handle =>
        '<span class="mz-wallet-crop-handle" data-crop-handle="' + handle + '" aria-hidden="true"></span>').join("") +
      '</div></div></div>' +
      '<div class="mz-wallet-crop-actions"><button type="button" class="btn" data-wallet="cropReset">Réinitialiser</button>' +
      '<button type="button" class="btn primary" data-wallet="cropSave">Utiliser ce cadrage</button></div>' +
      '<small>La capture originale est conservée pour permettre un nouveau recadrage.</small>' +
      '</div>';
    const stage = dlg.querySelector("#mz-wallet-crop-stage");
    stage.addEventListener("pointerdown", cropPointerDown);
    stage.addEventListener("pointermove", cropPointerMove);
    stage.addEventListener("pointerup", cropPointerUp);
    stage.addEventListener("pointercancel", cropPointerUp);
    state.crop = { id: card.id, source, rect: { x: .08, y: .2, w: .84, h: .35 }, busy: false, drag: null };
    if (!dlg.open) dlg.showModal();
    try {
      const image = dlg.querySelector("#mz-wallet-crop-image");
      await image.decode();
      if (!state.crop || state.crop.id !== card.id) return;
      state.crop.rect = cropDefault(image);
      cropFit();
      cropPaint();
    } catch (e) {
      dlg.close();
      toast("Impossible de lire cette capture pour la recadrer.");
    }
  }
  async function applyCrop() {
    const crop = state.crop;
    if (!crop || crop.busy) return;
    crop.busy = true;
    const button = document.querySelector('#mz-wallet-crop [data-wallet="cropSave"]');
    if (button) { button.disabled = true; button.textContent = "Recadrage…"; }
    try {
      const image = document.getElementById("mz-wallet-crop-image");
      if (!image?.naturalWidth || !image?.naturalHeight) throw new Error("Image non chargée");
      const r = crop.rect;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * r.w));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * r.h));
      if (canvas.width * canvas.height > 20000000) throw new Error("Zone trop grande pour le traitement.");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Traitement de l'image indisponible.");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, image.naturalWidth * r.x, image.naturalHeight * r.y,
        image.naturalWidth * r.w, image.naturalHeight * r.h, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Impossible de créer la capture recadrée.")), "image/png"));
      const draft = state.drafts.find(d => d.id === crop.id);
      const saved = lookup(crop.id);
      const original = draft || saved;
      if (!original) throw new Error("Carte introuvable.");
      const updated = { ...original, image: blob, originalImage: original.originalImage || crop.source };
      if (!updated.code) {
        const found = await readBarcode(blob);
        if (found.code) { updated.code = found.code; updated.format = found.format; }
      }
      if (draft) Object.assign(draft, updated);
      else await putMany([updated]);
      document.getElementById("mz-wallet-crop")?.close();
      if (saved) await reload();
      else { clearUrls(); redraw(); }
      state.status = "Code-barres recadré. Vérifie l’aperçu avant d’enregistrer.";
      redraw();
    } catch (e) {
      toast("Recadrage impossible : " + (e?.message || e));
      crop.busy = false;
      if (button) { button.disabled = false; button.textContent = "Utiliser ce cadrage"; }
    }
  }
  function resetCrop() {
    const image = document.getElementById("mz-wallet-crop-image");
    if (!state.crop || !image) return;
    state.crop.rect = cropDefault(image);
    cropPaint();
  }

  // EAN-13 : représentation vectorielle calculée uniquement pour un numéro
  // à 13 chiffres dont la clé de contrôle est valide. Aucune API externe.
  function walletEan13Svg(value) {
    const code = String(value || "").replace(/\s/g, "");
    if (!/^\d{13}$/.test(code)) return "";
    const sum = [...code.slice(0, 12)].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0);
    if ((10 - sum % 10) % 10 !== Number(code[12])) return "";
    const left = ["0001101","0011001","0010011","0111101","0100011",
      "0110001","0101111","0111011","0110111","0001011"];
    const middle = ["0100111","0110011","0011011","0100001","0011101",
      "0111001","0000101","0010001","0010111","0001001"];
    const right = ["1110010","1100110","1101100","1000010","1011100",
      "1010000","1010100","1001000","1000100","1110100"];
    const parity = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG",
      "LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
    const scheme = parity[Number(code[0])];
    let bits = "101";
    for (let i = 1; i <= 6; i++) {
      const digit = Number(code[i]);
      bits += (scheme[i - 1] === "L" ? left : middle)[digit];
    }
    bits += "01010";
    for (let i = 7; i <= 12; i++) bits += right[Number(code[i])];
    bits += "101";
    if (bits.length !== 95) return "";
    let path = "";
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === "1") path += "M" + (i + 11) + " 9h1v122h-1z";
    }
    return '<svg class="mz-wallet-ean13" xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="0 0 117 142" role="img" aria-label="Code-barres EAN 13 ' + h(code) + '" ' +
      'shape-rendering="crispEdges"><rect width="117" height="142" fill="#fff"/>' +
      '<path fill="#000" d="' + path + '"/></svg>';
  }
  async function walletCaptureImage(blob) {
    if (!blob) throw new Error("Capture absente");
    const src = typeof blob === "string" && /^data:image\//.test(blob)
      ? blob : await blobToBase64(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.alt = "Capture de la carte de fidélité";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image illisible"));
      image.src = src;
    });
  }
  async function walletShowCapture(card, dlg) {
    const area = dlg?.querySelector("#mz-wallet-codearea");
    if (!area || !card) return;
    area.textContent = "Chargement de la capture enregistrée…";
    const sources = [card.image, card.originalImage].filter((src, i, arr) => src && arr.indexOf(src) === i);
    for (const source of sources) {
      try {
        const image = await walletCaptureImage(source);
        if (dlg.open && dlg.dataset.cardId === String(card.id)) {
          area.replaceChildren(image);
          dlg.querySelector('[data-wallet="showBarcode"]')?.removeAttribute("hidden");
        }
        return;
      } catch (_) { /* essayer la capture originale, si elle existe */ }
    }
    if (dlg.open && dlg.dataset.cardId === String(card.id)) {
      const ean = walletEan13Svg(card.code);
      area.innerHTML = ean || '<p class="mz-wallet-image-warning">Capture indisponible. Le numéro de la carte est conservé. Tu peux ajouter une nouvelle capture depuis Klarna.</p>';
    }
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
    dlg.dataset.cardId = String(c.id);
    const barcode = walletEan13Svg(c.code);
    const hasPhoto = !!(c.image || c.originalImage);
    dlg.innerHTML = '<div class="mz-wallet-full"><div class="mz-wallet-fulltop"><strong>' + h(c.name) +
      '</strong><button type="button" data-wallet="close" aria-label="Fermer">✕</button></div>' +
      '<div class="mz-wallet-codearea" id="mz-wallet-codearea">' +
      (barcode || (hasPhoto ? 'Chargement de la capture enregistrée…' :
        '<p class="mz-wallet-image-warning">Aucune capture disponible.</p>')) + '</div>' +
      (c.code ? '<p class="mz-wallet-number">' + h(c.code) + '</p>' : '<p class="mz-wallet-number">Présente la capture au lecteur en caisse.</p>') +
      '<p class="mz-wallet-hint">' + (barcode ? "Code-barres EAN-13 généré localement depuis le numéro enregistré." :
        "La capture est conservée sur cet iPhone.") + '</p>' +
      (hasPhoto || barcode ? '<div class="mz-wallet-full-toggle">' +
        (hasPhoto ? '<button type="button" data-wallet="showCapture" data-id="' + h(c.id) + '">Voir la capture</button>' : '') +
        (barcode ? '<button type="button" data-wallet="showBarcode" data-id="' + h(c.id) +
          '" ' + (hasPhoto ? "hidden" : "") + '>Voir le code-barres</button>' : '') + '</div>' : '') +
      '<div class="mz-wallet-full-actions"><button type="button" data-wallet="favorite" data-id="' + h(c.id) + '">' +
      (c.favorite ? "★ Retirer des favoris" : "☆ Utilisation fréquente") + '</button>' +
      '<button type="button" data-wallet="edit" data-id="' + h(c.id) + '">Modifier la carte</button>' +
      '<button type="button" data-wallet="crop" data-id="' + h(c.id) + '">✂ Recadrer</button></div></div>';
    if (!dlg.open) dlg.showModal();
    if (!barcode && hasPhoto) walletShowCapture(c, dlg);
  }
  function editCard(c) {
    if (!c) return;
    openSheet("Personnaliser la carte", '<form data-wallet-edit="' + h(c.id) + '">' +
      '<div class="mz-wallet-edit-brand">' + brandTile(c, true) + '</div>' +
      '<label class="field"><span class="label">Choisir l’enseigne</span><select class="input" name="brand" data-wallet-edit-brand>' +
      brandOptions(c) + '</select></label>' +
      '<p class="muted small">Choisir une enseigne applique ses couleurs à la vignette et peut renseigner le nom.</p>' +
      '<label class="field"><span class="label">Nom de la carte</span><input class="input" name="name" maxlength="60" required value="' +
      h(c.name) + '"></label>' +
      '<label class="field"><span class="label">Numéro ou contenu du code (facultatif)</span>' +
      '<input class="input" name="code" maxlength="256" value="' + h(c.code || "") + '"></label>' +
      '<p class="muted small">Modifier le numéro ne remplace pas les barres présentes sur la capture.</p>' +
      '<div class="mz-wallet-edit-actions"><button class="btn" type="button" data-wallet="recognize" data-id="' +
      h(c.id) + '">⌕ Rechercher le nom sur la capture</button>' +
      '<button class="btn" type="button" data-wallet="crop" data-id="' + h(c.id) + '">✂ Recadrer</button></div>' +
      '<div class="sheet-sticky btns"><button class="btn primary" type="submit">Enregistrer</button>' +
      '<button class="btn danger" type="button" data-wallet="delete" data-id="' + h(c.id) +
      '">Supprimer</button></div></form>');
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
        rows.push({ ...card, image: card.image ? await blobToBase64(card.image) : null, originalImage: card.originalImage ? await blobToBase64(card.originalImage) : null });
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
        const originalImage = typeof row.originalImage === "string" ? base64ToBlob(row.originalImage) : null;
        if (hash) knownHash.add(hash);
        if (code) knownCodes.add(code);
        batch.push({ id: uid(), name: row.name.slice(0, 60) || "Carte restaurée", brandId: brandById(row.brandId)?.id || brandFromText(row.name)?.id || "", code, format: String(row.format || "").slice(0, 60), hash, image, originalImage, favorite: !!row.favorite, savedAt: Date.now() });
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
    else if (cmd === "showCapture" && card) await walletShowCapture(card, document.getElementById("mz-wallet-dialog"));
    else if (cmd === "showBarcode" && card) {
      const dialog = document.getElementById("mz-wallet-dialog");
      const area = dialog?.querySelector("#mz-wallet-codearea");
      if (area) area.innerHTML = walletEan13Svg(card.code);
      button.hidden = true;
    }
    else if (cmd === "edit") { document.getElementById("mz-wallet-dialog")?.close(); editCard(card); }
    else if (cmd === "crop") { document.getElementById("mz-wallet-dialog")?.close(); if (button.closest("#sheet")) closeSheet(); await openCrop(card || state.drafts.find(d => d.id === button.dataset.id)); }
    else if (cmd === "recognize") { if (button.closest("#sheet")) closeSheet(); document.getElementById("mz-wallet-dialog")?.close(); await recognizeOne(button.dataset.id); }
    else if (cmd === "recognizeDrafts") await recognizeDrafts();
    else if (cmd === "manageToggle") { state.manage = !state.manage; redraw(); }
    else if (cmd === "cropSave") await applyCrop();
    else if (cmd === "cropReset") resetCrop();
    else if (cmd === "cropClose") document.getElementById("mz-wallet-crop")?.close();
    else if (cmd === "favorite" && card) {
      try { document.getElementById("mz-wallet-dialog")?.close(); await putMany([{ ...card, favorite: !card.favorite }]); await reload(); }
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
    else if (event.target.hasAttribute("data-wallet-brand")) {
      const draft = state.drafts.find(d => d.id === event.target.dataset.walletBrand);
      if (!draft) return;
      applyBrand(draft, event.target.value);
      const row = event.target.closest(".mz-wallet-draft");
      const input = row?.querySelector("[data-wallet-name]");
      if (input) input.value = draft.name;
      const thumb = row?.querySelector(".mz-wallet-brand-tile");
      if (thumb) thumb.outerHTML = brandTile(draft, true);
    } else if (event.target.hasAttribute("data-wallet-edit-brand")) {
      const form = event.target.closest("form[data-wallet-edit]");
      const card = lookup(form?.dataset.walletEdit);
      if (!card || !form) return;
      const temp = applyBrand({ ...card, name: form.querySelector('[name="name"]')?.value || card.name }, event.target.value);
      const field = form.querySelector('[name="name"]');
      if (field) field.value = temp.name;
      const preview = form.querySelector(".mz-wallet-edit-brand");
      if (preview) preview.innerHTML = brandTile(temp, true);
    }
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
      await putMany([{ ...card, brandId: brandById(fields.get("brand"))?.id || brandFromText(name)?.id || "", name: name.slice(0, 60), code: String(fields.get("code") || "").slice(0, 256) }]);
      closeSheet(); await reload();
    } catch (e) { state.error = "Modification impossible : " + (e.message || e); redraw(); }
  }, true);
  window.addEventListener("resize", () => { if (state.crop) cropFit(); });
  window.addEventListener("online", () => { decoderPromise = null; ocrScriptPromise = null; redraw(); });
  window.addEventListener("offline", redraw);
  navigator.serviceWorker?.addEventListener("controllerchange", redraw);
  reload().catch(e => { state.ready = false; state.error = "Stockage indisponible : " + (e.message || e); redraw(); });
})();
