/* POST /api/orders/status {orderId, status} (admin or the branch cashier)
   pending -> preparing (accept) | cancelled (reject)
   preparing -> delivered | cancelled
   Points are added to the customer only when the order becomes
   "delivered"; gift points go back when it is cancelled. */
import { json, fail, handle, readJson, authUser, isAdmin, activeCashier, loadConfig } from '../../_lib/http.js';
import { Firestore } from '../../_lib/firestore.js';
import { STATUSES, CASHIER_TRANSITIONS, statusEffects, statusMessage } from '../../_lib/orders.js';
import { sendToTokens } from '../../_lib/push.js';

export const onRequestPost = handle(async ({ request, env, waitUntil }) => {
  const user = await authUser(request, env);
  const admin = isAdmin(user);
  const cashier = admin ? null : await activeCashier(user, env);
  if (!admin && !cashier) return fail(401, 'unauthorized');

  const { orderId, status } = await readJson(request, 2000);
  if (!/^[0-9a-z]{10,30}$/.test(String(orderId || ''))) return fail(400, 'invalid_order');
  if (!STATUSES.includes(status)) return fail(400, 'invalid_status');

  const fs = new Firestore(env);
  const now = Date.now();
  const by = admin ? 'admin' : `cashier:${cashier.name}`;

  const result = await fs.runTransaction(async tx => {
    const doc = await fs.get(`orders/${orderId}`, tx);
    if (!doc) throw Object.assign(new Error('not_found'), { status: 404, publicMessage: 'not_found' });
    const order = doc.data;
    if (!admin) {
      if (order.branchId !== user.branchId) throw Object.assign(new Error('forbidden'), { status: 403, publicMessage: 'forbidden' });
      if (!(CASHIER_TRANSITIONS[order.status] || []).includes(status)) throw Object.assign(new Error('transition'), { status: 409, publicMessage: 'invalid_transition' });
    }
    if (order.status === status) return { writes: [], result: { order, changed: false } };

    const fx = statusEffects(order, status);
    const writes = [];
    if (fx.points || fx.lifetime) {
      if (fx.needPoints) {
        const u = await fs.get(`users/${order.uid}`, tx);
        if (!u || (Number(u.data.points) || 0) < fx.needPoints) {
          throw Object.assign(new Error('insufficient_points'), { status: 409, publicMessage: 'customer_points_spent' });
        }
      }
      writes.push(fs.merge(`users/${order.uid}`, { updatedAt: now }, { increments: { points: fx.points, lifetimePoints: fx.lifetime } }));
    }
    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []).concat({ status, at: now, by }).slice(-20);
    writes.push(fs.merge(`orders/${orderId}`, {
      status, statusHistory: history, updatedAtMs: now, pointsAwarded: fx.pointsAwarded, giftRefunded: fx.giftRefunded
    }, { mustExist: true }));
    return { writes, result: { order: { ...order, status }, changed: true } };
  });

  if (result.changed) {
    waitUntil((async () => {
      try {
        const u = await fs.get(`users/${result.order.uid}`);
        const tokens = u && Array.isArray(u.data.pushTokens) ? u.data.pushTokens : [];
        if (!tokens.length) return;
        const config = await loadConfig(env);
        const msg = statusMessage(result.order, status, config && config.settings.restaurantName);
        if (!msg) return;
        const origin = new URL(request.url).origin;
        const dead = await sendToTokens(env, tokens, { ...msg, link: origin + '/orders' });
        if (dead.length) await fs.commit([fs.merge(`users/${result.order.uid}`, { pushTokens: tokens.filter(t => !dead.includes(t)) })]);
      } catch (e) { console.error(e); }
    })());
  }
  return json({ ok: true, status });
});
