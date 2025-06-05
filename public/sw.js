// Basic service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // We use skipWaiting() to activate the new service worker immediately,
  // without waiting for the user to close all tabs.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // clients.claim() allows an active service worker to take control of all clients
  // (tabs) within its scope immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For now, we're not implementing any specific caching or fetch handling.
  // This is the most basic fetch listener to make the PWA installable.
  // More complex strategies (cache-first, network-first) can be added later.
  // console.log('Service Worker: Fetching', event.request.url);
  // event.respondWith(fetch(event.request)); // Example: Network-only
});
