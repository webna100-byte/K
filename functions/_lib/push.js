/* Firebase Cloud Messaging (HTTP v1) + topic management, via REST.
   Broadcasts go to a per-language topic (one request no matter how many
   subscribers), which keeps every send far inside the Workers free plan's
   per-request subrequest limit. */
import { accessToken } from './google.js';

export const LANG_TOPICS = { ar: 'all_ar', en: 'all_en' };

async function iid(env, action, topic, tokens) {
  if (env.FIRESTORE_EMULATOR_HOST) return; // no push service in local development
  const res = await fetch(`https://iid.googleapis.com/iid/v1:${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json', access_token_auth: 'true' },
    body: JSON.stringify({ to: `/topics/${topic}`, registration_tokens: tokens })
  });
  if (!res.ok) throw new Error(`IID ${action} failed: ${res.status} ${await res.text()}`);
}

export const subscribeTopic = (env, token, topic) => iid(env, 'batchAdd', topic, [token]);
export const unsubscribeTopic = (env, token, topic) => iid(env, 'batchRemove', topic, [token]);

function buildMessage(target, { title, body, link, icon, image }) {
  const message = { ...target, notification: { title, body } };
  if (image) message.notification.image = image;
  message.webpush = { notification: { icon: icon || undefined, badge: icon || undefined }, fcm_options: link ? { link } : undefined };
  message.data = { link: link || '' };
  return { message };
}

async function send(env, payload) {
  if (env.FIRESTORE_EMULATOR_HOST) { console.log('[dev] push', JSON.stringify(payload)); return {}; }
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`FCM ${res.status}: ${text}`);
    err.unregistered = res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text);
    throw err;
  }
  return res.json();
}

export const sendToTopic = (env, topic, msg) => send(env, buildMessage({ topic }, msg));

/* Returns the tokens that turned out to be dead, so callers can drop them. */
export async function sendToTokens(env, tokens, msg) {
  const dead = [];
  await Promise.all((tokens || []).slice(0, 5).map(async token => {
    try { await send(env, buildMessage({ token }, msg)); }
    catch (e) { if (e.unregistered) dead.push(token); else console.error(e); }
  }));
  return dead;
}
