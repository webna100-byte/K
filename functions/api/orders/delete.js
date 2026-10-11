/* POST /api/orders/delete {orderId} (admin only). Gift points of an order
   that was never delivered or refunded go back to the customer first. */
import { json, fail, handle, readJson, authUser, isAdmin } from '../../_lib/http.js';
import { Firestore } from '../../_lib/firestore.js';

export const onRequestPost = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  const { orderId } = await readJson(request, 2000);
  if (!/^[0-9a-z]{10,30}$/.test(String(orderId || ''))) return fail(400, 'invalid_order');
  const fs = new Firestore(env);
  await fs.runTransaction(async tx => {
    const doc = await fs.get(`orders/${orderId}`, tx);
    if (!doc) return { writes: [], result: null };
    const o = doc.data;
    const writes = [];
    const gp = Number(o.giftPoints) || 0;
    if (gp > 0 && !o.giftRefunded && o.status !== 'delivered') {
      writes.push(fs.merge(`users/${o.uid}`, { updatedAt: Date.now() }, { increments: { points: gp } }));
    }
    writes.push(fs.remove(`orders/${orderId}`));
    return { writes, result: null };
  });
  return json({ ok: true });
});
