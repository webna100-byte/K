/* Firebase Cloud Messaging service worker. The Firebase web config is
   passed in the registration URL (?cfg=...) so this file never needs
   editing per restaurant. Notification clicks open the link sent with
   the message (handled by the Firebase SDK via fcm_options.link). */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let cfg = {};
try { cfg = JSON.parse(new URL(self.location.href).searchParams.get('cfg') || '{}'); } catch (e) { cfg = {}; }
if (cfg.apiKey) {
  firebase.initializeApp(cfg);
  firebase.messaging();
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* Clicks on notifications the open page showed itself (Push.listen). */
self.addEventListener('notificationclick', e => {
  const data = e.notification.data || {};
  if (!data.fg) return;
  e.notification.close();
  const url = new URL(data.link || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const same = list.find(c => c.url === url);
    return same ? same.focus() : self.clients.openWindow(url);
  }));
});
