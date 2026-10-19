// Service worker: caches the app shell, and every chapter file you have read, for offline use.
// Bump VERSION when shipping changes to the shell.
const VERSION='br-v3-2026-10-19';
const SHELL=['./','index.html','app.js','style.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','data/catalog.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION&&k!=='br-data'&&k!=='br-fonts').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET')return;
  if(u.hostname==='raw.githubusercontent.com')return;            // LSB download: never cached here (it lives in IndexedDB)
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)||u.hostname==='cdnjs.cloudflare.com'){e.respondWith(cacheFirst('br-fonts',e.request));return}
  if(u.origin!==location.origin)return;
  if(/\/data\/.+\.json$/.test(u.pathname)&&!u.pathname.endsWith('catalog.json')){e.respondWith(staleWhileRevalidate('br-data',e.request));return}
  e.respondWith(staleWhileRevalidate(VERSION,e.request));
});
async function cacheFirst(name,req){const c=await caches.open(name);const hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}
async function staleWhileRevalidate(name,req){const c=await caches.open(name);const hit=await c.match(req,{ignoreSearch:true});const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit);return hit||net}
