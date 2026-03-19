/**
 * 🤖 ZettBOT: Service Worker
 * File: sw.js (Upload file ini ke GitHub Pages)
 */

const CACHE_NAME = 'gas-pwa-cache-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Menyimpan aset statis cangkang PWA ke Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('ZettBOT: Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Event: Melayani cangkang aplikasi dari cache saat offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kembalikan dari cache jika ada, jika tidak lakukan fetch dari jaringan
        return response || fetch(event.request);
      })
  );
});

// Activate Event: Membersihkan cache lama jika versi diperbarui
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('ZettBOT: Menghapus cache lama', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
