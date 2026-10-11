/* POST /api/auth/cashier {username, password} -> custom token with
   role=cashier and the cashier's branch. Accounts are created by the admin. */
import { json, fail, handle, readJson, loginGuard } from '../../_lib/http.js';
import { createCustomToken, hashPassword, safeEqual } from '../../_lib/google.js';
import { Firestore, where } from '../../_lib/firestore.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const guard = await loginGuard(request, 'cashier-login');
  if (guard.blocked) return fail(429, 'too_many_attempts');
  const body = await readJson(request, 2000);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) { await guard.fail(); return fail(401, 'invalid_login'); }
  const fs = new Firestore(env);
  const found = await fs.query('cashiers', { where: where('username', 'EQUAL', username), limit: 1 });
  const cashier = found[0];
  if (!cashier || !cashier.data.active) { await guard.fail(); return fail(401, 'invalid_login'); }
  const { hash } = await hashPassword(password, cashier.data.salt);
  if (!safeEqual(hash, cashier.data.hash)) { await guard.fail(); return fail(401, 'invalid_login'); }
  const token = await createCustomToken(env, `staff_cashier_${cashier.id}`, { role: 'cashier', branchId: cashier.data.branchId, cid: cashier.id });
  return json({ token, name: cashier.data.name, branchId: cashier.data.branchId });
});
