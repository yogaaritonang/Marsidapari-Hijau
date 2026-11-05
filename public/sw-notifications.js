// Service Worker event listener for notifications & push handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = (event.notification.data && event.notification.data.url) || '/';
  let targetUrl;
  try {
    targetUrl = new URL(requestedUrl, self.location.origin);
    if (targetUrl.origin !== self.location.origin) targetUrl = new URL('/', self.location.origin);
  } catch {
    targetUrl = new URL('/', self.location.origin);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        return client.navigate(targetUrl.href).then((navigatedClient) => navigatedClient?.focus());
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl.href) : undefined;
    })
  );
});

// Listener for background push events if configured with Web Push server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Marsiadapari Hijau';
    const options = {
      body: data.body || 'Pembaruan baru telah tersedia.',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Marsiadapari Hijau', {
        body: text,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: '/' },
      })
    );
  }
});
