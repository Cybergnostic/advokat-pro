const CACHE_NAME = 'advokat-pro-v13';
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/responsive.css",
  "./js/data.js",
  "./js/notifications.js",
  "./js/theme.js",
  "./js/config.js",
  "./js/helpers.js",
  "./js/navigation.js",
  "./js/autocomplete.js",
  "./js/cases.js",
  "./js/files.js",
  "./js/actions.js",
  "./js/deadlines.js",
  "./js/claims.js",
  "./js/mutations.js",
  "./js/tariff.js",
  "./js/details.js",
  "./js/calendar.js",
  "./js/render.js",
  "./js/app.js"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(error => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        throw error;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  self.registration.showNotification(event.data.title || 'Advokat Pro', {
    body: event.data.body || '',
    tag: event.data.tag || 'advokat-pro',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png'
  });
});

self.addEventListener('push', event => {
  let payload = {
    title: 'Advokat Pro',
    body: 'Novi predmet je dodat u zajedničku bazu.',
    tag: 'advokat-pro-new-case',
    url: './'
  };
  try {
    if (event.data) payload = Object.assign(payload, event.data.json());
  } catch (_) {}

  event.waitUntil(self.registration.showNotification(payload.title || 'Advokat Pro', {
    body: payload.body || '',
    tag: payload.tag || 'advokat-pro',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    data: { url: payload.url || './' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if (client.url.startsWith(self.location.origin)) {
        client.focus();
        if ('navigate' in client) return client.navigate(target);
        return client;
      }
    }
    return clients.openWindow(target);
  }));
});
