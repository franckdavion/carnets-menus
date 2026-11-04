"use strict";
/* Cache exclusivement la version de test sous /maison/essai/.
   Ne jamais supprimer ni remplacer le cache/PWA de la Maisonnée officielle. */
const CACHE = "maisonnee-essai-cartes-v5";
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "../maison.css", "../essai.css", "../essai-app.js", "../essai-modules.js", "../essai-cartes.js",
  "../espace.js", "../push-config.js", "../supabase/functions/_shared/cal.js",
  "../repas.js", "../courses.js", "../gtaches.js", "../catalogue.js",
  "../presences-core.js", "../presences.js", "../presences-export.js",
  "../natif.js", "../bandeau-jour.js", "../accueil.js",
  "../icon-180.png", "../icon-192.png", "../icon-512.png",
  "../assets/modules3d/fidelite.svg",
  "../../ingredient-arts.js", "../../ingredient-emojis.js", "../../navigation-retour.js"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    SHELL.map(url => new Request(url, { cache: "reload" }))
  )).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("maisonnee-essai-cartes-") && key !== CACHE)
        .map(key => caches.delete(key))
    )),
    self.clients.claim()
  ]));
});
/* Priorité au réseau dès qu'il est joignable : sinon l'iPhone restait bloqué
   sur un ancien essai-modules.js et affichait l'ancienne page Courses.
   La version stockée reste disponible en cas de coupure Internet. */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(new Request(request, { cache: "no-cache" }));
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    } catch (_) {
      const backup = await caches.match(request, { ignoreSearch: true });
      if (backup) return backup;
      if (request.mode === "navigate") {
        const shell = await caches.match(new URL("./index.html", self.location).href);
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
