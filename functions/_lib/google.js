/* Google service-account helpers for Cloudflare Workers (no Node SDKs):
   - OAuth access tokens for Firestore / FCM REST APIs
   - Firebase custom tokens (staff logins: admin, cashier)
   - Firebase ID token verification (every authenticated API call)

   Environment (Cloudflare Pages > Settings > Variables and Secrets):
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY */

const enc = new TextEncoder();

function b64url(input) {
  const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cachedKey = null;
async function signingKey(env) {
  if (cachedKey) return cachedKey;
  const pem = String(env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, '');
  if (!body) throw new Error('FIREBASE_PRIVATE_KEY is not configured');
  cachedKey = await crypto.subtle.importKey('pkcs8', b64urlDecode(body.replace(/\+/g, '-').replace(/\//g, '_')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return cachedKey;
}

async function signJwt(env, payload) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signingKey(env), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

let cachedToken = null;
export async function accessToken(env) {
  if (env.FIRESTORE_EMULATOR_HOST) return 'owner'; // local development only
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 120 > now) return cachedToken.token;
  const assertion = await signJwt(env, {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`
  });
  if (!res.ok) throw new Error('Google OAuth failed: ' + res.status + ' ' + await res.text());
  const json = await res.json();
  cachedToken = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return cachedToken.token;
}

/* Custom token -> the browser calls signInWithCustomToken(), and the claims
   end up inside the user's ID token, where Firestore rules and our own API
   read them (role, branchId, cid). */
export async function createCustomToken(env, uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(env, {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
    claims
  });
}

let jwks = null;
async function googleKeys(force) {
  const now = Date.now();
  if (!force && jwks && jwks.exp > now) return jwks.keys;
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new Error('Could not load Firebase public keys');
  const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  const json = await res.json();
  jwks = { keys: json.keys || [], exp: now + maxAge * 1000 };
  return jwks.keys;
}

/* Returns the decoded payload of a valid Firebase ID token, or null. */
export async function verifyIdToken(env, token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  } catch (e) { return null; }
  const pid = env.FIREBASE_PROJECT_ID;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== pid || payload.iss !== `https://securetoken.google.com/${pid}`) return null;
  if (!payload.sub || payload.exp < now || payload.iat > now + 300) return null;
  // Local development with the Firebase Auth emulator (unsigned tokens).
  // Only active when FIREBASE_AUTH_EMULATOR_HOST is explicitly set.
  if (env.FIREBASE_AUTH_EMULATOR_HOST) { payload.uid = payload.sub; return payload; }
  if (header.alg !== 'RS256') return null;
  let keys = await googleKeys(false);
  let jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) { keys = await googleKeys(true); jwk = keys.find(k => k.kid === header.kid); }
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlDecode(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  payload.uid = payload.sub;
  return payload;
}

/* PBKDF2 password hashing for cashier accounts (stored in Firestore,
   never readable by any browser thanks to the security rules). */
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64urlDecode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return { salt: b64url(salt), hash: b64url(bits) };
}

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
