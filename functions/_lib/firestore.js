/* Minimal Firestore REST client (service account, bypasses security rules). */
import { accessToken } from './google.js';

export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
  return { stringValue: String(v) };
}

export function encodeFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) fields[k] = encodeValue(v);
  return fields;
}

export function decodeValue(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

export function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = decodeValue(v);
  return out;
}

export class Firestore {
  constructor(env) {
    this.env = env;
    this.root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const host = env.FIRESTORE_EMULATOR_HOST ? `http://${env.FIRESTORE_EMULATOR_HOST}` : 'https://firestore.googleapis.com';
    this.base = `${host}/v1/${this.root}`;
  }

  name(path) { return `${this.root}/${path}`; }

  async req(url, init = {}) {
    const token = await accessToken(this.env);
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
    if (res.status === 404) return null;
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`Firestore ${res.status}: ${text}`);
      err.status = res.status;
      err.firestore = true;
      throw err;
    }
    return text ? JSON.parse(text) : {};
  }

  /* -> { id, data } or null */
  async get(path, transaction) {
    if (transaction) return (await this.getMany([path], transaction))[0];
    const doc = await this.req(`${this.base}/${path}`);
    if (!doc) return null;
    return { id: doc.name.split('/').pop(), data: decodeFields(doc.fields) };
  }

  /* Several documents in one request (and one consistent snapshot inside
     a transaction). Returns results in the order of `paths` (null = missing). */
  async getMany(paths, transaction) {
    const body = { documents: paths.map(p => this.name(p)) };
    if (transaction) body.transaction = transaction;
    const json = await this.req(`${this.base}:batchGet`, { method: 'POST', body: JSON.stringify(body) });
    const byName = {};
    for (const r of json || []) if (r.found) byName[r.found.name] = { id: r.found.name.split('/').pop(), data: decodeFields(r.found.fields) };
    return paths.map(p => byName[this.name(p)] || null);
  }

  async beginTransaction() {
    const json = await this.req(`${this.base}:beginTransaction`, { method: 'POST', body: '{}' });
    return json.transaction;
  }

  async rollback(transaction) {
    try { await this.req(`${this.base}:rollback`, { method: 'POST', body: JSON.stringify({ transaction }) }); } catch (e) { /* ignore */ }
  }

  /* writes: built with the helpers below */
  async commit(writes, transaction) {
    const body = { writes };
    if (transaction) body.transaction = transaction;
    return this.req(`${this.base}:commit`, { method: 'POST', body: JSON.stringify(body) });
  }

  /* Runs fn(tx) inside a transaction, retrying on contention. fn returns
     { writes, result }. */
  async runTransaction(fn, attempts = 4) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      const tx = await this.beginTransaction();
      try {
        const { writes, result } = await fn(tx);
        if (writes && writes.length) await this.commit(writes, tx);
        else await this.rollback(tx);
        return result;
      } catch (e) {
        lastErr = e;
        if (e.firestore && (e.status === 409 || /ABORTED/.test(String(e.message)))) {
          await new Promise(r => setTimeout(r, 80 * (i + 1)));
          continue;
        }
        await this.rollback(tx);
        throw e;
      }
    }
    throw lastErr;
  }

  async query(collection, structuredQueryRest) {
    const json = await this.req(`${this.base}:runQuery`, {
      method: 'POST',
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], ...structuredQueryRest } })
    });
    return (json || []).filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), data: decodeFields(r.document.fields) }));
  }

  /* ---- write builders ---- */
  set(path, data, { mustNotExist = false } = {}) {
    const w = { update: { name: this.name(path), fields: encodeFields(data) } };
    if (mustNotExist) w.currentDocument = { exists: false };
    return w;
  }

  merge(path, data, { increments = {}, mustExist = false } = {}) {
    const w = {
      update: { name: this.name(path), fields: encodeFields(data) },
      updateMask: { fieldPaths: Object.keys(data).map(k => '`' + k + '`') }
    };
    const transforms = Object.entries(increments).filter(([, v]) => v).map(([fieldPath, v]) => ({ fieldPath, increment: encodeValue(v) }));
    if (transforms.length) w.updateTransforms = transforms;
    if (mustExist) w.currentDocument = { exists: true };
    return w;
  }

  remove(path) { return { delete: this.name(path) }; }
}

export const where = (field, op, value) => ({ fieldFilter: { field: { fieldPath: field }, op, value: encodeValue(value) } });
