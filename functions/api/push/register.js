/* POST /api/push/register {token, lang, previousLang?}
   Subscribes a device's FCM token to the broadcast topic for its language.
   Signed-in customers also get the token saved on their profile so they
   receive order-status updates. */
import { json, fail, handle, readJson, authUser, isGoogleCustomer } from '../../_lib/http.js';
import { subscribeTopic, unsubscribeTopic, LANG_TOPICS } from '../../_lib/push.js';
import { Firestore } from '../../_lib/firestore.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const b = await readJson(request, 5000);
  const token = String(b.token || '');
  if (token.length < 20 || token.length > 4096) return fail(400, 'invalid_token');
  const lang = b.lang === 'en' ? 'en' : 'ar';
  const other = lang === 'ar' ? 'en' : 'ar';
  await subscribeTopic(env, token, LANG_TOPICS[lang]);
  if (b.previousLang && b.previousLang !== lang) {
    try { await unsubscribeTopic(env, token, LANG_TOPICS[other]); } catch (e) { console.error(e); }
  }
  const user = await authUser(request, env);
  if (isGoogleCustomer(user)) {
    const fs = new Firestore(env);
    const doc = await fs.get(`users/${user.uid}`);
    const tokens = (doc && Array.isArray(doc.data.pushTokens) ? doc.data.pushTokens : []).filter(t => t !== token);
    tokens.unshift(token);
    await fs.commit([fs.merge(`users/${user.uid}`, { pushTokens: tokens.slice(0, 5), lang })]);
  }
  return json({ ok: true });
});
