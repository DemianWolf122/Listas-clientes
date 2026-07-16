/* atrıo · Ruta comercial — service worker
   App-shell precache + runtime caching de Leaflet, fuentes y tiles del mapa,
   para que la herramienta siga funcionando con señal pobre en la calle. */
var VERSION = 'atrio-ruta-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './vendor/leaflet.css',
  './vendor/leaflet.js'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==VERSION) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  var isTile = /basemaps\.cartocdn\.com/.test(url.hostname);
  var isAsset = /cdnjs\.cloudflare\.com|fontshare\.com|fonts\.g(oogleapis|static)\.com/.test(url.hostname);

  if(isTile || isAsset){
    // stale-while-revalidate
    e.respondWith(caches.open(VERSION).then(function(cache){
      return cache.match(req).then(function(cached){
        var net = fetch(req).then(function(res){
          if(res && (res.ok || res.type==='opaque')) cache.put(req, res.clone());
          return res;
        }).catch(function(){ return cached; });
        return cached || net;
      });
    }));
    return;
  }

  // app shell / same-origin: cache-first, fall back to network then to index
  e.respondWith(caches.match(req).then(function(cached){
    return cached || fetch(req).then(function(res){
      if(res && res.ok && url.origin===location.origin){
        var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){ return caches.match('./index.html'); });
  }));
});
