"use strict";
/* Cache exclusivement la version de test sous /maison/essai/.
   Ne jamais supprimer ni remplacer le cache/PWA de la Maisonnée officielle. */
const CACHE = "maisonnee-essai-cartes-v3";
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
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(async () => {
      return await caches.match(request, { ignoreSearch: true }) ||
        await caches.match(new URL("./index.html", self.location).href) ||
        Response.error();
    }));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    });
  }));
});
