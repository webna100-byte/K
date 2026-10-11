// Pure-logic tests (no services needed): node --test tests/unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../public/js/pricing.js';
import { statusEffects, dayKey, orderId } from '../functions/_lib/orders.js';

const P = globalThis.Pricing;
const demo = JSON.parse(fs.readFileSync(new URL('../public/seed/demo-config.json', import.meta.url)));
const base = { branchId: 'branch_downtown', type: 'pickup', items: [], gifts: [] };

test('subtotal, invoice range discount, tax, points', () => {
  const q = P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, { lifetimePoints: 0 });
  assert.equal(q.subtotal, 57);
  assert.equal(q.invoiceDiscount, 2.85);
  assert.equal(q.tax, 1.08);
  assert.equal(q.total, 55.23);
  assert.equal(q.pointsEarned, 54);
});

test('delivery: zone required, percent and free delivery ranges', () => {
  assert.throws(() => P.computeOrder(demo, { ...base, type: 'delivery', items: [{ productId: 'prod_cola', qty: 1 }] }, {}), /zone_required/);
  const zone = demo.branches[0].deliveryZones[0];
  const half = P.computeOrder(demo, { ...base, type: 'delivery', zoneId: zone.id, items: [{ productId: 'prod_classic_burger', qty: 4 }] }, {}); // 38 -> 50% off delivery
  assert.equal(half.deliveryFee, 4.5);
  assert.equal(half.deliveryDiscount, 2.25);
  const free = P.computeOrder(demo, { ...base, type: 'delivery', zoneId: zone.id, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, {});
  assert.equal(free.deliveryDiscount, free.deliveryFee);
  // delivery fee never earns points
  assert.equal(free.pointsEarned, P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, {}).pointsEarned);
});

test('level discount uses lifetime points and stacks after the invoice discount', () => {
  const q = P.computeOrder(demo, { ...base, items: [{ productId: 'prod_classic_burger', qty: 6 }] }, { lifetimePoints: 1000 });
  assert.equal(q.level.id, 'gold');
  assert.equal(q.levelDiscount, 5.42); // 10% of 54.15
  assert.equal(P.levelFor(demo.loyalty, 299), null);
  assert.equal(P.levelFor(demo.loyalty, 2500).id, 'diamond');
});

test('gifts: several, same gift twice, unknown gift rejected', () => {
  const q = P.computeOrder(demo, { ...base, gifts: [{ giftId: 'gift_cola', qty: 2 }, { giftId: 'gift_brownie', qty: 1 }] }, {});
  assert.equal(q.giftPoints, 450);
  assert.equal(q.total, 0);
  assert.throws(() => P.computeOrder(demo, { ...base, gifts: [{ giftId: 'nope', qty: 1 }] }, {}), /invalid_gift/);
});

test('options are validated against the product', () => {
  const product = { id: 'p', price: 5, optionGroups: [
    { id: 'size', type: 'single_price', options: [{ id: 's', priceDelta: 5 }, { id: 'l', priceDelta: 7 }] },
    { id: 'extra', type: 'multi_priced', options: [{ id: 'cheese', priceDelta: 1 }] }
  ] };
  assert.equal(P.unitPrice(product, { size: 'l', extra: ['cheese'] }, 2).price, 8);
  assert.equal(P.unitPrice(product, {}, 2).price, 5);
  assert.throws(() => P.unitPrice(product, { extra: ['bacon'] }, 2), /invalid_option/);
});

test('three-decimal currencies round correctly', () => {
  assert.equal(P.currencyDecimals('KWD'), 3);
  assert.equal(P.round(1.23456, 3), 1.235);
});

test('status effects: points once on delivery, gift refund once on cancel', () => {
  const o = { status: 'pending', pointsEarned: 10, giftPoints: 100 };
  assert.deepEqual(statusEffects(o, 'preparing'), { pointsAwarded: false, giftRefunded: false, points: 0, lifetime: 0, needPoints: 0 });
  const d = statusEffects({ ...o, status: 'preparing' }, 'delivered');
  assert.equal(d.points, 10); assert.equal(d.lifetime, 10); assert.equal(d.pointsAwarded, true);
  assert.equal(statusEffects({ ...o, status: 'delivered', pointsAwarded: true }, 'delivered').points, 0);
  const c = statusEffects({ ...o, status: 'pending' }, 'cancelled');
  assert.equal(c.points, 100); assert.equal(c.giftRefunded, true);
  const reopen = statusEffects({ ...o, status: 'cancelled', giftRefunded: true }, 'pending');
  assert.equal(reopen.points, -100); assert.equal(reopen.needPoints, 100);
});

test('order ids sort newest first; day key uses the restaurant time zone', () => {
  assert.ok(orderId(2000) < orderId(1000));
  assert.equal(dayKey(Date.UTC(2026, 0, 1, 22, 0), 'Asia/Kuwait'), '2026-01-02');
});
