// Maisonnée : l'appli s'ouvre même sans réseau (les données viennent ensuite de Supabase).
// Le nom commence par « carnet-archive » pour que le Carnet de menus (même site) ne l'efface pas.
const CACHE = "carnet-archive-maison-v140";
const FILES = [
  "./", "index.html", "ouvrir-frais.html", "maison.css", "trajets-v2.css", "fonds-bibliotheque.css",
  "espace.js", "push-config.js", "shared-constants.js", "vendor/supabase.min.js", "supabase/functions/_shared/cal.js",
  "app.js", "essai-cartes.js", "modules.js", "repas.js", "courses.js", "gtaches.js", "catalogue.js",
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
  const url = typeof p.url === "string" && p.url.startsWith("./") ? p.url : "./";
  event.waitUntil(self.registration.showNotification(String(p.title || "Maisonnée").slice(0,100), {
    body:String(p.body || "Nouvelle notification").slice(0,240),
    icon:"./icon-192.png", badge:"./icon-192.png",
    tag:String(p.tag || "maison"), data:{url}
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url || "./", self.registration.scope).href;
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const scope = self.registration.scope;
    const existing = windows.find(c => typeof c.url === "string" && c.url.startsWith(scope));
    if (existing) {
      await existing.focus();
      if (existing.navigate) {
        try { await existing.navigate(url); }
        catch (_) { await clients.openWindow(url); }
      } else await clients.openWindow(url);
    } else await clients.openWindow(url);
  })());
});
