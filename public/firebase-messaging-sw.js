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
