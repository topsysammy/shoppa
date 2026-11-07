// Imported by the generated service worker (vite.config.ts > workbox.importScripts).

// Sync rule 4: when the browser fires Background Sync for the outbox, ask any
// open Shoppa tab to push its queued writes. The writes live in IndexedDB and
// are sent by the page, so with no tab open they go out on next open instead.
self.addEventListener('sync', (event) => {
  if (event.tag !== 'shoppa-outbox') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'shoppa:sync' }));
    }),
  );
});

// N4: Web Push from the `push` Edge Function.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Shoppa', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Shoppa';
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/maskable-192.png',
        tag: data.tag,
        renotify: Boolean(data.tag),
        data: { url: data.url || '/notifications' },
      }),
      // Let open tabs refresh their inbox.
      self.clients.matchAll({ type: 'window' }).then((clients) => clients.forEach((c) => c.postMessage({ type: 'shoppa:sync' }))),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/notifications', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
