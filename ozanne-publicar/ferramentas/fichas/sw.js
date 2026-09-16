const CACHE='ozanne-fichas-v2';
const ATIVOS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ATIVOS)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>{
    const rede=fetch(e.request).then(res=>{
      if(res && res.status===200 && res.type==='basic'){
        const copia=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copia));
      }
      return res;
    }).catch(()=>hit);
    return hit || rede;
  }));
});
