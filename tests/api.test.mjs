// End-to-end API test against a local stack:
//   firebase emulators:start --project demo-test      (Firestore + Auth emulators)
//   npx wrangler pages dev public --port 8788          (with .dev.vars, see README)
// Run: node tests/api.test.mjs
import assert from 'node:assert/strict';

const SITE = process.env.SITE || 'http://127.0.0.1:8788';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = 'http://127.0.0.1:8080/v1/projects/demo-test/databases/(default)/documents';

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(SITE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = {};
  try { json = await res.json(); } catch (e) { /* empty */ }
  return { ...json, status: res.status };
}

async function googleUser(sub, email) {
  const res = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub, email, email_verified: true, name: 'Test ' + sub }))}&providerId=google.com`, requestUri: 'http://localhost', returnSecureToken: true })
  });
  const j = await res.json();
  assert.ok(j.idToken, 'google sign-in via emulator: ' + JSON.stringify(j));
  return { token: j.idToken, uid: j.localId };
}

async function exchange(customToken) {
  const res = await fetch(`${AUTH}/accounts:signInWithCustomToken?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
  const j = await res.json();
  assert.ok(j.idToken, 'custom token exchange: ' + JSON.stringify(j));
  return j.idToken;
}

/* Raw Firestore REST as a given user, so the security rules are enforced. */
async function fsQuery(token, filters) {
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'orders' }], where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } } } })
  });
  return { status: res.status, body: await res.json() };
}
const eq = (field, v) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: v } } });
async function fsGet(path, token = 'owner') {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer ' + token } });
  return { status: res.status, body: await res.json() };
}
const intField = (doc, f) => Number(doc.body.fields[f].integerValue);

let passed = 0;
async function step(name, fn) { await fn(); passed++; console.log('✓', name); }

// clean slate
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents', { method: 'DELETE' });
await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-test/accounts', { method: 'DELETE' });

const site = await call('/api/site');
const config = site.config;
assert.ok(config && config.products.length, 'seed config must be loaded into local KV');
const branch = config.branches[0];
const burger = config.products.find(p => p.id === 'prod_classic_burger');

let admin, cust, cust2, cashierTok, order1, order2;

await step('admin login rejects a wrong password', async () => {
  const r = await call('/api/auth/admin', { method: 'POST', body: { password: 'nope' } });
  assert.equal(r.status, 401);
});
await step('admin login returns a custom token with role=admin', async () => {
  const r = await call('/api/auth/admin', { method: 'POST', body: { password: 'test1234' } });
  assert.equal(r.status, 200);
  admin = await exchange(r.token);
});
await step('admin config requires admin', async () => {
  assert.equal((await call('/api/admin/config')).status, 401);
  assert.equal((await call('/api/admin/config', { token: admin })).status, 200);
});
await step('stale config saves are rejected (version conflict)', async () => {
  const { config: c } = await call('/api/admin/config', { token: admin });
  const r = await call('/api/admin/config', { method: 'PUT', token: admin, body: { config: c, baseVersion: (c.version || 0) - 1 } });
  assert.equal(r.status, 409);
});

await step('ordering requires a Google sign-in', async () => {
  const r = await call('/api/orders/create', { method: 'POST', body: {} });
  assert.equal(r.status, 401);
  const asAdmin = await call('/api/orders/create', { method: 'POST', token: admin, body: {} });
  assert.equal(asAdmin.status, 401, 'staff tokens cannot order');
});

const c1 = await googleUser('cust1', 'c1@example.com');
const c2 = await googleUser('cust2', 'c2@example.com');
cust = c1.token; cust2 = c2.token;

const baseOrder = { branchId: branch.id, type: 'pickup', items: [{ productId: burger.id, qty: 6, selections: {} }], customer: { name: 'Ali', phone: '+96550000000' }, lang: 'ar' };

await step('new customer cannot redeem gifts without points', async () => {
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, gifts: [{ giftId: 'gift_cola', qty: 1 }] } });
  assert.equal(r.status, 409);
  assert.equal(r.error, 'insufficient_points');
});

await step('server recomputes prices (client prices ignored) and creates order', async () => {
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: burger.id, qty: 6, selections: {}, unitPrice: 0.01 }] } });
  assert.equal(r.status, 200, JSON.stringify(r));
  order1 = r;
  // 6 x 9.5 = 57 -> 5% invoice discount (50–99.99) = 2.85 -> 54.15, tax 2% = 1.08 -> 55.23
  assert.equal(r.total, 55.23);
  assert.equal(r.pointsEarned, 54); // floor(54.15 / 1)
  assert.equal(r.number, 1001);
});

await step('customers only read their own orders (rules)', async () => {
  const mine = await fsQuery(cust, [eq('uid', c1.uid)]);
  assert.equal(mine.status, 200);
  assert.equal(mine.body.filter(x => x.document).length, 1);
  const other = await fsQuery(cust2, [eq('uid', c1.uid)]);
  assert.equal(other.status, 403);
});

await step('points are not added before delivery', async () => {
  const u = await fsGet(`users/${c1.uid}`);
  assert.equal(intField(u, 'points'), 0);
});

await step('cashier account: create, wrong password, login', async () => {
  let r = await call('/api/admin/cashiers', { method: 'POST', token: admin, body: { name: 'Front', username: 'front1', password: 'secret12', branchId: branch.id } });
  assert.equal(r.status, 200, JSON.stringify(r));
  r = await call('/api/admin/cashiers', { method: 'POST', token: admin, body: { name: 'Dup', username: 'front1', password: 'secret12', branchId: branch.id } });
  assert.equal(r.status, 409);
  r = await call('/api/auth/cashier', { method: 'POST', body: { username: 'front1', password: 'wrong' } });
  assert.equal(r.status, 401);
  r = await call('/api/auth/cashier', { method: 'POST', body: { username: 'FRONT1', password: 'secret12' } });
  assert.equal(r.status, 200);
  cashierTok = await exchange(r.token);
});

await step('cashier reads only its branch orders (rules)', async () => {
  const own = await fsQuery(cashierTok, [eq('branchId', branch.id)]);
  assert.equal(own.status, 200);
  const other = await fsQuery(cashierTok, [eq('branchId', 'branch_westside')]);
  assert.equal(other.status, 403);
});

await step('cashier cannot skip steps or delete', async () => {
  let r = await call('/api/orders/status', { method: 'POST', token: cashierTok, body: { orderId: order1.id, status: 'delivered' } });
  assert.equal(r.status, 409);
  r = await call('/api/orders/delete', { method: 'POST', token: cashierTok, body: { orderId: order1.id } });
  assert.equal(r.status, 401);
});

await step('accept -> preparing -> delivered adds points once', async () => {
  let r = await call('/api/orders/status', { method: 'POST', token: cashierTok, body: { orderId: order1.id, status: 'preparing' } });
  assert.equal(r.status, 200, JSON.stringify(r));
  r = await call('/api/orders/status', { method: 'POST', token: cashierTok, body: { orderId: order1.id, status: 'delivered' } });
  assert.equal(r.status, 200);
  r = await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: order1.id, status: 'delivered' } });
  assert.equal(r.status, 200);
  const u = await fsGet(`users/${c1.uid}`);
  assert.equal(intField(u, 'points'), 54);
  assert.equal(intField(u, 'lifetimePoints'), 54);
});

await step('give the customer enough points for the next checks', async () => {
  // Second big order, delivered by admin: 20 x 9.5 = 190 -> 10% = 171 -> 171 pts
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: burger.id, qty: 20, selections: {} }] } });
  assert.equal(r.status, 200);
  await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: r.id, status: 'delivered' } });
  const u = await fsGet(`users/${c1.uid}`);
  assert.equal(intField(u, 'points'), 225);
});

await step('gift points: same gift twice + another, deducted at order time', async () => {
  // 2 x cola (100) = 200 <= 225
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [], gifts: [{ giftId: 'gift_cola', qty: 2 }] } });
  assert.equal(r.status, 200, JSON.stringify(r));
  order2 = r;
  const u = await fsGet(`users/${c1.uid}`);
  assert.equal(intField(u, 'points'), 25);
});

await step('points cannot be spent twice (replayed / parallel requests)', async () => {
  const body = { ...baseOrder, items: [], gifts: [{ giftId: 'gift_cola', qty: 1 }] };
  const results = await Promise.all([1, 2, 3].map(() => call('/api/orders/create', { method: 'POST', token: cust, body })));
  assert.ok(results.every(r => r.status === 409), 'only 25 points left, every attempt must fail');
});

await step('rejecting an order returns its gift points', async () => {
  const r = await call('/api/orders/status', { method: 'POST', token: cashierTok, body: { orderId: order2.id, status: 'cancelled' } });
  assert.equal(r.status, 200);
  const u = await fsGet(`users/${c1.uid}`);
  assert.equal(intField(u, 'points'), 225);
  // cancelling again must not refund twice
  await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: order2.id, status: 'cancelled' } });
  assert.equal(intField(await fsGet(`users/${c1.uid}`), 'points'), 225);
});

await step('level discount applies once lifetime points reach a level', async () => {
  // lifetime = 225 < 300 (silver) -> no level yet
  let me = await call('/api/me', { token: cust });
  assert.equal(me.lifetimePoints, 225);
  // 10 x 9.5 = 95 -> 5% = 90.25 -> 90 pts -> lifetime 315 (Silver: 300 pts, 5%)
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: burger.id, qty: 10, selections: {} }] } });
  await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: r.id, status: 'delivered' } });
  me = await call('/api/me', { token: cust });
  assert.equal(me.lifetimePoints, 315);
  // next order: 2 x 9.5 = 19, no invoice rule, silver 5% = 0.95 -> 18.05 + 2% tax 0.36 = 18.41
  const r2 = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: burger.id, qty: 2, selections: {} }] } });
  assert.equal(r2.total, 18.41);
  // spending points on gifts must not lower the level
  const g = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [], gifts: [{ giftId: 'gift_brownie', qty: 1 }] } });
  assert.equal(g.status, 200);
  me = await call('/api/me', { token: cust });
  assert.equal(me.points, 315 - 250);
  assert.equal(me.lifetimePoints, 315);
});

await step('moving a delivered order back removes its points again', async () => {
  const r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: burger.id, qty: 2, selections: {} }] } });
  await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: r.id, status: 'delivered' } });
  const before = await call('/api/me', { token: cust });
  await call('/api/orders/status', { method: 'POST', token: admin, body: { orderId: r.id, status: 'cancelled' } });
  const after = await call('/api/me', { token: cust });
  assert.equal(before.lifetimePoints - after.lifetimePoints, r.pointsEarned);
});

await step('admin can delete; disabled cashier is locked out', async () => {
  let r = await call('/api/orders/delete', { method: 'POST', token: admin, body: { orderId: order2.id } });
  assert.equal(r.status, 200);
  const list = await call('/api/admin/cashiers', { token: admin });
  await call('/api/admin/cashiers', { method: 'PATCH', token: admin, body: { id: list.cashiers[0].id, active: false } });
  r = await call('/api/orders/status', { method: 'POST', token: cashierTok, body: { orderId: order1.id, status: 'cancelled' } });
  assert.equal(r.status, 401);
  const q = await fsQuery(cashierTok, [eq('branchId', branch.id)]);
  assert.equal(q.status, 403);
});

await step('invalid input is rejected', async () => {
  let r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, customer: { name: 'A', phone: 'abc' } } });
  assert.equal(r.error, 'phone_invalid');
  r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, items: [{ productId: 'nope', qty: 1 }] } });
  assert.equal(r.error, 'product_unavailable');
  r = await call('/api/orders/create', { method: 'POST', token: cust, body: { ...baseOrder, type: 'delivery', zoneId: '', customer: { ...baseOrder.customer, address: 'Street 1' } } });
  assert.equal(r.error, 'zone_required');
});

console.log(`\n${passed} checks passed`);
