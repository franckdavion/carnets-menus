// Maisonnée : surcouche native (Capacitor) pour partager sa position en arrière-plan.
// Dans Safari ou la PWA installée, ce fichier ne fait rien : le partage reste « appli ouverte ».
// Dans l'appli native, il remplace geoTick / geoToggle d'app.js :
//   - le GPS natif continue quand l'appli passe en arrière-plan ou que l'écran est verrouillé ;
//   - une position n'est envoyée à Supabase (table member_locations) que si le membre
//     s'est éloigné de plus de 50 m de sa dernière position enregistrée.
(() => {
  const C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;

  const SEUIL = 50;          // mètres : en dessous, rien n'est envoyé
  const PRECISION_MAX = 100; // mètres : un relevé plus flou ne compte pas comme un déplacement
  const FILTRE_NATIF = 30;   // mètres : le GPS ne réveille l'appli qu'après ce déplacement

  let BG = null, watcherId = null, demarrage = null, envoiEnCours = false;
  const lastKey = () => "mz_natif_last_" + (S.me || "");

  function plugin() {
    if (BG) return Promise.resolve(BG);
    if (typeof C.registerPlugin === "function") return Promise.resolve(BG = C.registerPlugin("BackgroundGeolocation"));
    if (C.Plugins && C.Plugins.BackgroundGeolocation) return Promise.resolve(BG = C.Plugins.BackgroundGeolocation);
    // Pont natif sans registerPlugin : on charge le cœur de Capacitor
    return new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@capacitor/core@7/dist/capacitor.js";
      s.onload = () => window.Capacitor && window.Capacitor.registerPlugin ? ok(BG = window.Capacitor.registerPlugin("BackgroundGeolocation")) : ko(new Error("capacitor"));
      s.onerror = ko;
      document.head.appendChild(s);
    });
  }

  const pret = () => !!(S.hh && S.me && S.v2 && geoOn() && (mode === "cloud" || mode === "demo"));

  // distance en mètres entre deux points (formule de haversine)
  function metres(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // dernière position enregistrée : celle du foyer (Supabase), sinon celle gardée sur le téléphone
  function derniere() {
    const mine = S.locs.find(l => l.id === S.me);
    return mine ? { lat: mine.lat, lng: mine.lng } : LS.get(lastKey(), null);
  }

  async function recu(loc) {
    if (!loc || !pret()) return;
    const prec = Math.round(loc.accuracy || 0);
    const avant = derniere();
    if (avant && prec > PRECISION_MAX) return;
    const pos = { lat: +loc.latitude.toFixed(5), lng: +loc.longitude.toFixed(5) };
    if (avant && metres(avant, pos) <= SEUIL) return;   // règle des 50 m
    if (envoiEnCours) return;
    envoiEnCours = true;
    try {
      const row = { id: S.me, ...pos, accuracy: prec, updated_at: new Date(loc.time || Date.now()).toISOString() };
      if (S.v5 || mode === "demo") { const a = await addressOf(pos.lat, pos.lng); if (a) row.address = a; }
      if (await upsert("locs", row)) LS.set(lastKey(), pos);
    } finally { envoiEnCours = false; }
  }

  function refus(bg) {
    arreter();
    LS.set(geoKey(), false);
    softRender();
    toast("Position refusée. Dans Réglages › Maisonnée › Position, choisissez « Toujours ».", "Réglages", () => bg.openSettings());
  }

  function demarrer() {
    if (watcherId || demarrage || !pret()) return demarrage;
    demarrage = (async () => {
      const bg = await plugin();
      watcherId = await bg.addWatcher({
        backgroundTitle: "Maisonnée partage votre position",
        backgroundMessage: "Visible uniquement par les membres du foyer.",
        requestPermissions: true,
        stale: false,
        distanceFilter: FILTRE_NATIF
      }, (loc, err) => {
        if (err) { if (err.code === "NOT_AUTHORIZED") refus(bg); return; }
        recu(loc);
      });
      if (!pret()) arreter();   // partage coupé pendant le démarrage
    })().catch(() => {}).finally(() => { demarrage = null; });
    return demarrage;
  }

  async function arreter() {
    if (!watcherId) return;
    const id = watcherId; watcherId = null;
    try { (await plugin()).removeWatcher({ id }); } catch (_) {}
  }

  // remplace la lecture « appli ouverte » d'app.js (toutes les 4 min, sans seuil de distance)
  geoTick = function () { if (pret()) demarrer(); else arreter(); };

  const geoToggleWeb = geoToggle;
  geoToggle = async function (on) {
    if (!on) { await arreter(); LS.del(lastKey()); }
    return geoToggleWeb(on);
  };

  geoTick();
})();
