import { verifyIdToken } from './google.js';
import { Firestore } from './firestore.js';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

export const fail = (status, error, extra = {}) => json({ error, ...extra }, status);

export async function readJson(request, maxBytes = 200000) {
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(new Error('payload too large'), { status: 413 });
  try { return JSON.parse(text || '{}'); } catch (e) { throw Object.assign(new Error('invalid json'), { status: 400 }); }
}

export async function authUser(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return verifyIdToken(env, token);
}

export function isAdmin(user) { return !!user && user.role === 'admin'; }

/* Cashier accounts can be disabled/deleted at any time by the admin, so a
   still-valid token is not enough: the account must still be active. */
export async function activeCashier(user, env) {
  if (!user || user.role !== 'cashier' || !user.cid) return null;
  const doc = await new Firestore(env).get(`cashiers/${user.cid}`);
  if (!doc || !doc.data.active || doc.data.branchId !== user.branchId) return null;
  return doc.data;
}

export function isGoogleCustomer(user) {
  return !!user && !user.role && user.firebase && user.firebase.sign_in_provider === 'google.com';
}

/* ---- Site config lives in Cloudflare KV (binding: STORE) ---- */
export async function loadConfig(env) {
  if (!env.STORE) throw new Error('KV binding STORE is not configured');
  return env.STORE.get('config', 'json');
}

export const SITE_CACHE_URL = 'https://site-cache.internal/api/site';

export async function purgeSiteCache() {
  try {
    await caches.default.delete(new Request(SITE_CACHE_URL));
    await caches.default.delete(new Request('https://site-cache.internal/meta-config'));
  } catch (e) { /* ignore */ }
}

/* Small per-IP brute-force guard for the staff login endpoints, kept in the
   edge cache so it costs no KV writes. Only failed attempts count. */
export async function loginGuard(request, bucket, max = 8, windowSec = 600) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = new Request(`https://ratelimit.internal/${bucket}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  return {
    blocked: count >= max,
    fail: () => cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${windowSec}` } }))
  };
}

export function handle(fn) {
  return async (ctx) => {
    try {
      return await fn(ctx);
    } catch (e) {
      console.error(e);
      return fail(e.status && e.status < 500 ? e.status : 500, e.publicMessage || (e.status && e.status < 500 ? e.message : 'server_error'));
    }
  };
}
