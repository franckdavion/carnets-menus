// Maisonnée : l'appli s'ouvre même sans réseau (les données viennent ensuite de Supabase).
// Le nom commence par « carnet-archive » pour que le Carnet de menus (même site) ne l'efface pas.
const CACHE = "carnet-archive-maison-v3";
const FILES = ["./", "index.html", "app.js", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("carnet-archive-maison") && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const own = u.origin === self.location.origin && u.pathname.startsWith(new URL("./", self.location).pathname);
  const lib = /fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$/.test(u.hostname);
  if (!own && !lib) return;
  e.respondWith(fetch(own ? new Request(e.request, { cache: "no-cache" }) : e.request)
    .then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || (e.request.mode === "navigate" ? caches.match("index.html") : undefined))));
});
