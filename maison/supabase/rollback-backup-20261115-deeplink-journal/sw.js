// Maisonnée : l'appli s'ouvre même sans réseau (les données viennent ensuite de Supabase).
// Le nom commence par « carnet-archive » pour que le Carnet de menus (même site) ne l'efface pas.
const CACHE = "carnet-archive-maison-v191";
const MAISON_HOME = "https://carnets-menus.vercel.app/maison/";
function maisonLaunchUrl(raw) {
  const s = String(raw || "./").trim() || "./";
  try {
    const u = /^https?:/i.test(s) ? new URL(s) : new URL(s, MAISON_HOME);
    if (/\.github\.io$/i.test(u.hostname)) {
      u.protocol = "https:";
      u.host = "carnets-menus.vercel.app";
      u.pathname = u.pathname.replace(/^\/carnets-menus/, "") || "/maison/";
      if (!u.pathname.startsWith("/maison")) u.pathname = "/maison/" + u.pathname.replace(/^\//, "");
    }
    return u.href;
  } catch (_) {
    return MAISON_HOME;
  }
}
const FILES = [
  "./", "index.html", "ouvrir-frais.html", "maison.css", "trajets-v2.css", "fonds-bibliotheque.css",
  "espace.js", "push-config.js", "shared-constants.js", "vendor/supabase.min.js", "supabase/functions/_shared/cal.js",
  "app.js", "essai-cartes.js", "modules.js", "repas.js", "courses.js", "gtaches.js", "catalogue.js",
  "animaux-core.js", "animaux.js", "animal-card.css", "animal.html", "vendor/qrcode.min.js", "assets/modules3d/animaux.svg",
  "presences-core.js", "presences-trajets-core.js", "presences.js", "presences-trajets.js", "presences-export.js",
  "natif.js", "accueil.js", "bandeau-jour.js", "fonds-bibliotheque.js",
  "../ingredient-arts.js", "../ingredient-emojis.js", "../navigation-retour.js",
  "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("carnet-archive-maison") && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const scopePath = new URL("./", self.location).pathname;
  const own = u.origin === self.location.origin && (u.pathname.startsWith(scopePath) || /\/(ingredient-arts|ingredient-emojis|navigation-retour)\.js$/.test(u.pathname));
  // Ne pas intercepter jsDelivr : sur iPhone PWA, fetch() du CDN via le SW
  // échoue souvent avec « Load failed » et bloque Supabase / la domotique.
  if (!own) return;
  // Cache d’abord pour supabase.min.js : un aller-retour GitHub Pages à froid
  // fait rater getSession sur iPhone, et toute la domotique reste « non connectée ».
  if (/\/animal-card\.css$/.test(u.pathname)) {
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })).catch(() =>
      caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }))
    ));
    return;
  }
  if (/\/vendor\/supabase\.min\.js$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(new Request(e.request, { cache: "reload" })).then(r => {
        if (r.ok) c.put(e.request, r.clone());
        return r;
      });
    })));
    return;
  }
  e.respondWith(fetch(new Request(e.request, { cache: "no-cache" }))
    .then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    // En ligne, privilégier la version publiée. Hors ligne, la requête
    // peut contenir ?v=... alors que le précache contient le fichier sans query.
    .catch(async () => {
      // Priorité au cache de Maisonnée : le cache du Carnet de menus partage
      // le même domaine, mais ne doit pas fournir d'anciens scripts Maison.
      const maisonCache = await caches.open(CACHE);
      const cached = await maisonCache.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      if (e.request.mode === "navigate") {
        const home = new URL("index.html", self.location).href;
        return (await maisonCache.match(home, { ignoreSearch: true })) ||
          (await caches.match(e.request, { ignoreSearch: true })) ||
          (await caches.match(home, { ignoreSearch: true })) || Response.error();
      }
      return (await caches.match(e.request, { ignoreSearch: true })) || Response.error();
    }));
});

self.addEventListener("push", event => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch (_) { p = {body:event.data?.text() || ""}; }
  const url = maisonLaunchUrl(p.url);
  const opts = {
    body: String(p.body || "Nouvelle notification").slice(0, 240),
    icon: MAISON_HOME + "icon-192.png",
    badge: MAISON_HOME + "icon-192.png",
    tag: String(p.tag || "maison"),
    data: { url }
  };
  if (p.renotify) opts.renotify = true;
  event.waitUntil(self.registration.showNotification(String(p.title || "Maisonnée").slice(0, 100), opts));
});
function isMaisonClientUrl(href) {
  try {
    const u = new URL(href);
    return u.origin === "https://carnets-menus.vercel.app" && u.pathname.startsWith("/maison/");
  } catch (_) { return false; }
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = maisonLaunchUrl(event.notification.data?.url);
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const maison = windows.filter(c => typeof c.url === "string" && isMaisonClientUrl(c.url));
    for (const w of maison) {
      try { w.postMessage({ type: "mz-deeplink", url }); } catch (_) {}
    }
    const existing = maison[0];
    if (existing) {
      await existing.focus();
      if (existing.navigate) {
        try { await existing.navigate(url); return; } catch (_) {}
      }
    }
    await clients.openWindow(url);
  })());
});
