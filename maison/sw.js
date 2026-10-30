// Maisonnée : l'appli s'ouvre même sans réseau (les données viennent ensuite de Supabase).
// Le nom commence par « carnet-archive » pour que le Carnet de menus (même site) ne l'efface pas.
const CACHE = "carnet-archive-maison-v64";
const FILES = [
  "./", "index.html", "maison.css",
  "espace.js", "push-config.js", "supabase/functions/_shared/cal.js",
  "app.js", "modules.js", "repas.js", "courses.js", "gtaches.js", "catalogue.js",
  "presences-core.js", "presences.js", "presences-export.js",
  "natif.js", "accueil.js", "pont.js",
  "../ingredient-emojis.js", "../navigation-retour.js",
  "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("carnet-archive-maison") && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const scopePath = new URL("./", self.location).pathname;
  const own = u.origin === self.location.origin && (u.pathname.startsWith(scopePath) || /\/(ingredient-emojis|navigation-retour)\.js$/.test(u.pathname));
  const lib = /fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$/.test(u.hostname);
  if (!own && !lib) return;
  e.respondWith(fetch(own ? new Request(e.request, { cache: "no-cache" }) : e.request)
    .then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || (e.request.mode === "navigate" ? caches.match("index.html") : undefined))));
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
    const windows = await clients.matchAll({type:"window",includeUncontrolled:true});
    const existing = windows.find(c => c.url.startsWith(self.registration.scope));
    if (existing) { await existing.focus(); await existing.navigate(url); }
    else await clients.openWindow(url);
  })());
});
