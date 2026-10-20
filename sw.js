const CACHE='control-tarjetas-v65';
const ASSETS=['./','./index.html','./styles.css','./app.js', './pending-expenses.js?v=silent-1', './native-note-bridge.js?v=2', './voice-expense-parser.js?v=1', './installment-schedule.js?v=1', './agenda-model.js?v=20', './theme.js?v=system-bars-1','./manifest.json','./notas.html','./icon-192.png','./icon-512.png','./drive-backup.js','./drive-backup.css','./drive-respaldos.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('control-tarjetas-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(self.registration.scope.replace(url.origin,''))||url.pathname.endsWith('/drive-callback.html'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return r}).catch(()=>caches.match(e.request,{ignoreSearch:url.pathname.endsWith('/notas.html')})));
});
