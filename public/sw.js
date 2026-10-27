/* Push only: private pages and API responses are never cached. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data;
  try { data = event.data?.json(); } catch { data = null; }
  const path = typeof data?.url === 'string' && /^\/community\/[0-9a-f-]{36}$/i.test(data.url) ? data.url : '/community';
  event.waitUntil(self.registration.showNotification('Ny kommentar i ZET', {
    body: 'Nogen har kommenteret din træning.', icon: '/icon-192.png',
    tag: typeof data?.tag === 'string' ? data.tag : 'zet-comment', data: { path },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path;
  const url = new URL(typeof path === 'string' && /^\/community(?:\/[0-9a-f-]{36})?$/i.test(path) ? path : '/community', self.location.origin).href;
  event.waitUntil(self.clients.openWindow(url));
});
