const CACHE="carnet-v38";
const FILES=["./","index.html","manifest.json","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:"reload"})))));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  // Only the app's own files and fonts are cached; GitHub API calls always go to the network.
  if(u.origin!==self.location.origin&&!/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))return;
  e.respondWith((u.origin===self.location.origin?fetch(e.request.url,{cache:"no-cache"}):fetch(e.request)).then(r=>{const c=r.clone();if(r.ok||r.type==="opaque")caches.open(CACHE).then(x=>x.put(e.request,c));return r;})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});
