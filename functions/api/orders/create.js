/* POST /api/orders/create (Google-signed-in customers only)
   Body: { branchId, type, zoneId, items:[{productId, qty, selections, notes}],
           gifts:[{giftId, qty}], customer:{name, phone, address, notes}, lang }

   Everything is recomputed here from the stored menu (prices, discounts,
   level discount, points). Gift points are checked and deducted inside the
   same Firestore transaction that creates the order, so a customer can
   never spend the same points twice (two tabs, two phones, replayed
   requests, a gift kept in an old cart...). */
import '../../../public/js/pricing.js';
import { json, fail, handle, readJson, authUser, isGoogleCustomer, loadConfig } from '../../_lib/http.js';
import { Firestore } from '../../_lib/firestore.js';
import { dayKey, orderId } from '../../_lib/orders.js';
import { branchBusy } from '../busy.js';

const Pricing = globalThis.Pricing;
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

export const onRequestPost = handle(async ({ request, env }) => {
  const user = await authUser(request, env);
  if (!isGoogleCustomer(user)) return fail(401, 'login_required');

  const body = await readJson(request, 100000);
  const customer = body.customer || {};
  const name = str(customer.name, 60);
  const phone = str(customer.phone, 24);
  const address = str(customer.address, 300);
  const notes = str(customer.notes, 500);
  if (!name) return fail(400, 'name_required');
  if (!/^\+?[0-9\s-]{6,20}$/.test(phone)) return fail(400, 'phone_invalid');
  if (body.type === 'delivery' && address.length < 3) return fail(400, 'address_required');

  const config = await loadConfig(env);
  if (!config) return fail(503, 'not_configured');
  const branchKey = str(body.branchId, 80);
  if (/^[\w-]+$/.test(branchKey) && await branchBusy(env, branchKey)) return fail(423, 'restaurant_busy');
  const fs = new Firestore(env);
  const now = Date.now();
  const id = orderId(now);

  try {
    const order = await fs.runTransaction(async tx => {
      const [userDoc, counter] = await fs.getMany([`users/${user.uid}`, 'meta/counter'], tx);
      const u = userDoc ? userDoc.data : {};
      const available = Number(u.points) || 0;
      const quote = Pricing.computeOrder(config, body, { lifetimePoints: Number(u.lifetimePoints) || 0 });
      if (quote.giftPoints > available) {
        throw Object.assign(new Error('insufficient_points'), { status: 409, publicMessage: 'insufficient_points' });
      }
      const number = ((counter && Number(counter.data.orders)) || 1000) + 1;
      const order = {
        number,
        uid: user.uid,
        customer: { name, phone, email: user.email || '' },
        address: quote.type === 'delivery' ? address : '',
        notes,
        branchId: quote.branch.id,
        branchName: quote.branch.name,
        type: quote.type,
        zone: quote.zone,
        items: quote.lines.map(l => ({ productId: l.productId, name: l.name, qty: l.qty, options: l.options, notes: l.notes, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
        gifts: quote.gifts.map(g => ({ giftId: g.giftId, name: g.name, qty: g.qty, points: g.points })),
        giftPoints: quote.giftPoints,
        subtotal: quote.subtotal,
        invoiceDiscount: quote.invoiceDiscount,
        level: quote.level,
        levelDiscount: quote.levelDiscount,
        deliveryFee: quote.deliveryFee,
        deliveryDiscount: quote.deliveryDiscount,
        tax: quote.tax,
        total: quote.total,
        currency: quote.currency,
        pointsEarned: quote.pointsEarned,
        pointsAwarded: false,
        giftRefunded: false,
        status: 'pending',
        statusHistory: [{ status: 'pending', at: now, by: 'customer' }],
        lang: body.lang === 'en' ? 'en' : 'ar',
        createdAtMs: now,
        day: dayKey(now, config.settings.timezone),
        createdAt: new Date(now)
      };
      const profile = { name: u.name || name, email: user.email || '', phone, updatedAt: now };
      if (quote.type === 'delivery') profile.address = address;
      if (!userDoc) Object.assign(profile, { points: 0, lifetimePoints: 0, createdAt: now });
      const writes = [
        fs.set(`orders/${id}`, order, { mustNotExist: true }),
        fs.merge(`users/${user.uid}`, profile, { increments: quote.giftPoints ? { points: -quote.giftPoints } : {} }),
        fs.set('meta/counter', { orders: number })
      ];
      return { writes, result: order };
    });
    return json({ ok: true, id, number: order.number, total: order.total, pointsEarned: order.pointsEarned });
  } catch (e) {
    if (e.code) return fail(400, e.code, { minimum: e.minimum, productId: e.productId, giftId: e.giftId });
    throw e;
  }
});
