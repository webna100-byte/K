/* Cashier accounts (admin only). Stored in Firestore `cashiers`, which the
   security rules keep closed to every browser.
   GET    -> list
   POST   {name, username, password, branchId} -> create
   PATCH  {id, name?, password?, branchId?, active?} -> update
   DELETE {id} -> delete */
import { json, fail, handle, readJson, authUser, isAdmin } from '../../_lib/http.js';
import { hashPassword } from '../../_lib/google.js';
import { Firestore, where } from '../../_lib/firestore.js';

const USERNAME = /^[a-z0-9._-]{3,32}$/;

async function guard(request, env) {
  if (!isAdmin(await authUser(request, env))) throw Object.assign(new Error('unauthorized'), { status: 401 });
  return new Firestore(env);
}

const view = c => ({ id: c.id, name: c.data.name, username: c.data.username, branchId: c.data.branchId, active: !!c.data.active, createdAt: c.data.createdAt });

export const onRequestGet = handle(async ({ request, env }) => {
  const fs = await guard(request, env);
  const list = await fs.query('cashiers', { limit: 200 });
  return json({ cashiers: list.map(view) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const fs = await guard(request, env);
  const b = await readJson(request, 5000);
  const username = String(b.username || '').trim().toLowerCase();
  const name = String(b.name || '').trim().slice(0, 60);
  const password = String(b.password || '');
  const branchId = String(b.branchId || '');
  if (!USERNAME.test(username)) return fail(400, 'invalid_username');
  if (password.length < 6) return fail(400, 'weak_password');
  if (!name || !branchId) return fail(400, 'missing_fields');
  const taken = await fs.query('cashiers', { where: where('username', 'EQUAL', username), limit: 1 });
  if (taken.length) return fail(409, 'username_taken');
  const id = 'c' + Date.now().toString(36) + crypto.randomUUID().slice(0, 6);
  const { salt, hash } = await hashPassword(password);
  await fs.commit([fs.set(`cashiers/${id}`, { name, username, branchId, salt, hash, active: true, createdAt: Date.now() }, { mustNotExist: true })]);
  return json({ ok: true, id });
});

export const onRequestPatch = handle(async ({ request, env }) => {
  const fs = await guard(request, env);
  const b = await readJson(request, 5000);
  const id = String(b.id || '');
  if (!/^[a-z0-9-]{3,40}$/i.test(id)) return fail(400, 'invalid_id');
  const patch = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 60);
  if (typeof b.branchId === 'string' && b.branchId) patch.branchId = b.branchId;
  if (typeof b.active === 'boolean') patch.active = b.active;
  if (b.password) {
    if (String(b.password).length < 6) return fail(400, 'weak_password');
    Object.assign(patch, await hashPassword(String(b.password)));
  }
  if (!Object.keys(patch).length) return fail(400, 'nothing_to_update');
  await fs.commit([fs.merge(`cashiers/${id}`, patch, { mustExist: true })]);
  return json({ ok: true });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  const fs = await guard(request, env);
  const b = await readJson(request, 2000);
  const id = String(b.id || '');
  if (!/^[a-z0-9-]{3,40}$/i.test(id)) return fail(400, 'invalid_id');
  await fs.commit([fs.remove(`cashiers/${id}`)]);
  return json({ ok: true });
});
