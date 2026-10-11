/* GET /api/site -> everything the public pages need in one request:
   the restaurant config, the latest notifications and the public Firebase
   web config. Cached at the edge for a short time so visitors cost almost
   no KV reads; admin saves purge the cache. */
import { json, handle, loadConfig, SITE_CACHE_URL } from '../_lib/http.js';
import { firebaseWebConfig } from '../_lib/public.js';

export const onRequestGet = handle(async ({ env, waitUntil }) => {
  const cache = caches.default;
  const key = new Request(SITE_CACHE_URL);
  const hit = await cache.match(key);
  if (hit) return hit;
  const [config, notifications] = await Promise.all([
    loadConfig(env),
    env.STORE.get('notifications', 'json')
  ]);
  const res = json({ config, notifications: notifications || [], firebase: firebaseWebConfig(env) }, 200, {
    'Cache-Control': 'public, max-age=20'
  });
  waitUntil(cache.put(key, res.clone()));
  return res;
});
