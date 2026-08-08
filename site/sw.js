/* trace sw mskha76e */
const C='trace-mskha76e';
const CORE=['./app.html','./manifest.webmanifest','./pwa/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./app.html'))));
});
self.addEventListener('push',e=>{
  let d={kind:'note',body:''}; try{d=e.data.json()}catch(_){ }
  const flare=d.kind==='flare';
  e.waitUntil(self.registration.showNotification(flare?'I need you':'trace',{
    body:d.body||(flare?'The flare. Open now.':'Something landed for you.'),
    tag:'trace-'+d.kind, renotify:flare, requireInteraction:flare,
    icon:'pwa/icon-512.png', badge:'pwa/icon-512.png', vibrate:flare?[300,120,300,120,600]:[60],
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws){ if('focus' in w) return w.focus(); }
    return clients.openWindow('./app.html');
  }));
});