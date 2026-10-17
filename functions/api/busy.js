/* GET  /api/busy?branchId=...      -> { busy }   (public, used by checkout)
   POST /api/busy {branchId, busy}  -> { busy }   (the branch cashier or admin)
   While a branch is "busy" it does not accept new orders. */
import { json, fail, handle, readJson, authUser, isAdmin, activeCashier, loadConfig } from '../_lib/http.js';
import { Firestore } from '../_lib/firestore.js';

const validId = id => /^[\w-]{1,80}$/.test(String(id || ''));

export async function branchBusy(env, branchId) {
  const doc = await new Firestore(env).get(`branchStatus/${branchId}`);
  return !!(doc && doc.data.busy);
}

export const onRequestGet = handle(async ({ request, env }) => {
  const branchId = new URL(request.url).searchParams.get('branchId');
  if (!validId(branchId)) return fail(400, 'invalid_branch');
  return json({ busy: await branchBusy(env, branchId) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  const user = await authUser(request, env);
  const admin = isAdmin(user);
  const cashier = admin ? null : await activeCashier(user, env);
  if (!admin && !cashier) return fail(401, 'unauthorized');
  const body = await readJson(request, 2000);
  const branchId = admin ? body.branchId : user.branchId;
  if (!validId(branchId)) return fail(400, 'invalid_branch');
  if (admin) {
    const config = await loadConfig(env);
    if (!config || !(config.branches || []).some(b => b.id === branchId)) return fail(400, 'invalid_branch');
  }
  const busy = !!body.busy;
  const fs = new Firestore(env);
  await fs.commit([fs.set(`branchStatus/${branchId}`, { busy, updatedAt: Date.now(), by: admin ? 'admin' : `cashier:${cashier.name}` })]);
  return json({ busy });
});
