/* ===================== Admin Panel =====================
   English interface; every customer-facing text has Arabic + English
   fields. Config is loaded fresh from /api/admin/config and saved with
   optimistic versioning, so a tab that failed to load (or is stale) can
   never overwrite the restaurant's real data.
========================================================= */
window.FORCE_LANG = 'en';

const SECTIONS = [
  ['orders', 'Orders', 'receipt-text'],
  ['branches', 'Branches', 'store'],
  ['products', 'Products', 'utensils'],
  ['categories', 'Categories', 'layout-grid'],
  ['delivery', 'Delivery Zones', 'truck'],
  ['discounts', 'Discounts', 'badge-percent'],
  ['loyalty', 'Points, Gifts & Levels', 'gift'],
  ['homepage', 'Homepage', 'house'],
  ['slider', 'Menu Slider', 'images'],
  ['pages', 'Pages', 'file-text'],
  ['notifications', 'Notifications', 'megaphone'],
  ['cashiers', 'Cashiers', 'users'],
  ['colors', 'Colors', 'palette'],
  ['general', 'Restaurant Settings', 'settings'],
  ['footer', 'Footer & Contact', 'panel-bottom'],
  ['data', 'Backup & Data', 'database']
];

let CONFIG = null;
let VERSION = 0;
let active = 'orders';
const $ = id => document.getElementById(id);

/* ---------- helpers ---------- */
function asBi(v) {
  if (v && typeof v === 'object') return { ar: v.ar || '', en: v.en || '' };
  return { ar: '', en: v ? String(v) : '' };
}
function bi(id, label, value, { area = false, ph = {} } = {}) {
  const v = asBi(value);
  const tag = (lang) => area
    ? `<textarea id="${id}_${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" placeholder="${escapeHtml(ph[lang] || '')}">${escapeHtml(v[lang])}</textarea>`
    : `<input type="text" id="${id}_${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" value="${escapeHtml(v[lang])}" placeholder="${escapeHtml(ph[lang] || '')}">`;
  return `<div class="form-group"><label>${escapeHtml(label)}</label><div class="bi-field"><div>${tag('ar')}<span class="bi-tag">AR</span></div><div>${tag('en')}<span class="bi-tag">EN</span></div></div></div>`;
}
function readBi(id) { return { ar: ($(id + '_ar')?.value || '').trim(), en: ($(id + '_en')?.value || '').trim() }; }
const hasBi = v => !!(v.ar || v.en);

function imgField(id, label, url, { wide = false, note = '' } = {}) {
  return `<div class="form-group"><label>${escapeHtml(label)}</label>
    <img src="${escapeHtml(url || PLACEHOLDER_IMG)}" class="image-preview ${wide ? 'wide' : ''}" id="${id}_preview">
    <input type="file" id="${id}" accept="image/*" data-url="${escapeHtml(url || '')}">
    ${url ? `<button type="button" class="btn-sm btn-del" data-clear-img="${id}" style="margin-top:6px">Remove image</button>` : ''}
    ${note ? `<p class="mini-note">${escapeHtml(note)}</p>` : ''}</div>`;
}
function bindImg(id, maxDim = 1200) {
  const input = $(id);
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const preview = $(id + '_preview');
    preview.style.opacity = '.4';
    try {
      const url = await uploadImage(file, maxDim);
      input.dataset.url = url;
      preview.src = url;
    } catch (e) {
      console.error(e);
      toast('Image upload failed: ' + e.message);
    }
    preview.style.opacity = '1';
  });
  const clear = document.querySelector(`[data-clear-img="${id}"]`);
  if (clear) clear.addEventListener('click', () => { input.dataset.url = ''; $(id + '_preview').src = PLACEHOLDER_IMG; clear.remove(); });
}
const readImg = id => ($(id) ? $(id).dataset.url || '' : '');

async function uploadImage(file, maxDim) {
  const blob = await compressImage(file, maxDim);
  const res = await api('/api/admin/upload', { method: 'POST', raw: true, body: blob, headers: { 'Content-Type': blob.type || file.type }, token: await StaffAuth.token() });
  return res.url;
}

function num(id, def = 0) { const v = Number($(id)?.value); return Number.isFinite(v) ? v : def; }
function branchCheckboxes(name, selected) {
  if (CONFIG.branches.length <= 1) return '';
  return `<div class="form-group"><label>Available in branches</label><div class="branch-checkbox-list">
    ${CONFIG.branches.map(b => `<label><input type="checkbox" class="${name}-branch" value="${b.id}" ${selected.includes(b.id) ? 'checked' : ''}> ${escapeHtml(tField(b.name))}</label>`).join('')}
    </div><p class="mini-note">Leave all unchecked to show in every branch.</p></div>`;
}
const readBranches = name => Array.from(document.querySelectorAll(`.${name}-branch:checked`)).map(c => c.value);
const nameOf = f => tField(f) || tField(f, 'ar') || '—';

/* ---------- saving ---------- */
let saving = Promise.resolve();
function syncBar(text, show = true) { const b = $('syncBar'); b.textContent = text; b.classList.toggle('show', show); }
function persist(okMsg = 'Saved') {
  saving = saving.then(async () => {
    syncBar('Saving…');
    try {
      const res = await api('/api/admin/config', { method: 'PUT', token: await StaffAuth.token(), body: { config: CONFIG, baseVersion: VERSION } });
      VERSION = res.version;
      CONFIG.version = res.version;
      syncBar(okMsg);
      setTimeout(() => syncBar('', false), 1400);
    } catch (e) {
      console.error(e);
      if (e.status === 409) { syncBar('', false); alert('The data was changed from another tab or device. The page will reload with the latest data.'); location.reload(); }
      else if (e.status === 401) { location.href = '/admin/login'; }
      else syncBar('Save failed — check your connection and try again');
    }
  });
  return saving;
}

function card(title, inner, { action = '' } = {}) {
  return `<div class="admin-card"><div class="admin-topbar"><h3>${escapeHtml(title)}</h3>${action}</div>${inner}</div>`;
}
const saveBtn = (id, label = 'Save Changes') => `<button class="btn-primary btn-inline" id="${id}">${label}</button>`;

/* ---------- layout ---------- */
function renderNav() {
  $('sideNav').innerHTML = SECTIONS.map(([k, l, i]) => `<button class="admin-nav-item ${active === k ? 'active' : ''}" data-key="${k}"><i data-lucide="${i}"></i><span>${l}</span></button>`).join('');
  $('mobileNav').innerHTML = SECTIONS.map(([k, l]) => `<button class="${active === k ? 'active' : ''}" data-key="${k}">${l}</button>`).join('');
  document.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => { active = b.dataset.key; show(); }));
}
function show() {
  renderNav();
  const el = $('section');
  el.innerHTML = '';
  window.scrollTo({ top: 0 });
  RENDER[active](el);
  renderIcons();
}

/* ===================== Orders (live, all branches) ===================== */
let ordersUnsub = null;
const ORDER_STATUSES = ['pending', 'preparing', 'delivered', 'cancelled'];
const STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', delivered: 'Delivered', cancelled: 'Cancelled' };

function staffOrderHtml(o, { admin }) {
  const money = n => fmtMoney(n);
  const items = (o.items || []).map(i => `<li><span>${i.qty}× ${escapeHtml(nameOf(i.name))}${(i.options && (i.options.en || i.options.ar)) || i.notes ? `<small>${escapeHtml([tField(i.options), i.notes].filter(Boolean).join(' • '))}</small>` : ''}</span><span>${money(i.lineTotal)}</span></li>`).join('')
    + (o.gifts || []).map(g => `<li class="gift-li"><span>🎁 ${g.qty}× ${escapeHtml(nameOf(g.name))}<small>${g.points} pts</small></span><span>Free</span></li>`).join('');
  const line = (l, v) => `<div><span>${l}</span><span>${v}</span></div>`;
  return `
    <article class="staff-order ${o.status === 'pending' ? 'is-new' : ''}" data-id="${o.id}">
      <div class="so-head"><div><strong>#${o.number}</strong><div class="mini-note">${escapeHtml(fmtDate(o.createdAtMs))}</div></div><span class="status-chip s-${o.status}">${STATUS_LABEL[o.status]}</span></div>
      <div class="so-meta"><span class="type-${o.type}">${o.type === 'delivery' ? 'Delivery' : 'Pickup'}</span><span>${escapeHtml(nameOf(o.branchName))}</span>${o.zone ? `<span>${escapeHtml(nameOf(o.zone.name))}</span>` : ''}${o.level ? `<span>${escapeHtml(nameOf(o.level.name))}</span>` : ''}</div>
      <div class="so-customer"><strong>${escapeHtml(o.customer?.name || '')}</strong><a href="tel:${escapeHtml(o.customer?.phone || '')}" dir="ltr">${escapeHtml(o.customer?.phone || '')}</a>${o.address ? `<span>${escapeHtml(o.address)}</span>` : ''}</div>
      ${o.notes ? `<div class="so-notes">${escapeHtml(o.notes)}</div>` : ''}
      <ul class="so-items">${items}</ul>
      <div class="so-totals">
        ${line('Subtotal', money(o.subtotal))}
        ${o.invoiceDiscount ? line('Order discount', '−' + money(o.invoiceDiscount)) : ''}
        ${o.levelDiscount ? line('Level discount', '−' + money(o.levelDiscount)) : ''}
        ${o.type === 'delivery' ? line('Delivery', money(o.deliveryFee)) : ''}
        ${o.deliveryDiscount ? line('Delivery discount', '−' + money(o.deliveryDiscount)) : ''}
        ${o.tax ? line('Tax', money(o.tax)) : ''}
        <div class="grand"><span>Total</span><span>${money(o.total)}</span></div>
      </div>
      <div class="so-actions">
        ${admin ? `<select data-status="${o.id}">${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>` : ''}
        <button class="act-print" data-print="${o.id}" title="Print"><i data-lucide="printer"></i></button>
        ${admin ? `<button class="act-delete" data-delete="${o.id}" title="Delete"><i data-lucide="x"></i></button>` : ''}
      </div>
    </article>`;
}

function renderOrders(el) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  el.innerHTML = `
    <div class="admin-card">
      <div class="filters">
        <div class="form-group"><label>Period</label><select id="fPeriod"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom…</option></select></div>
        <div class="form-group hidden" id="fFromWrap"><label>From</label><input type="date" id="fFrom"></div>
        <div class="form-group hidden" id="fToWrap"><label>To</label><input type="date" id="fTo"></div>
        <div class="form-group"><label>Status</label><select id="fStatus"><option value="">All</option>${ORDER_STATUSES.map(s => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join('')}</select></div>
        <div class="form-group"><label>Branch</label><select id="fBranch"><option value="">All branches</option>${CONFIG.branches.map(b => `<option value="${b.id}">${escapeHtml(nameOf(b.name))}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="stats-row" id="orderStats"></div>
    <div id="ordersBox"><div class="card skeleton tall"></div></div>`;
  let all = [];
  const range = () => {
    const p = $('fPeriod').value;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    if (p === 'today') return [d0.getTime(), Date.now() + 864e5];
    if (p === 'yesterday') return [d0.getTime() - 864e5, d0.getTime()];
    if (p === 'custom') {
      const f = $('fFrom').value ? new Date($('fFrom').value + 'T00:00').getTime() : d0.getTime() - 6 * 864e5;
      const t2 = $('fTo').value ? new Date($('fTo').value + 'T00:00').getTime() + 864e5 : Date.now() + 864e5;
      return [f, t2];
    }
    return [d0.getTime() - (Number(p) - 1) * 864e5, Date.now() + 864e5];
  };
  function draw() {
    const st = $('fStatus').value, br = $('fBranch').value;
    const list = all.filter(o => (!st || o.status === st) && (!br || o.branchId === br));
    const delivered = list.filter(o => o.status === 'delivered');
    $('orderStats').innerHTML = `<div><strong>${list.length}</strong><span>Orders</span></div><div><strong>${list.filter(o => o.status === 'pending' || o.status === 'preparing').length}</strong><span>Open</span></div><div><strong>${fmtMoney(delivered.reduce((s, o) => s + (o.total || 0), 0))}</strong><span>Delivered sales</span></div>`;
    $('ordersBox').innerHTML = list.length ? list.map(o => staffOrderHtml(o, { admin: true })).join('') : '<div class="admin-card"><p class="mini-note">No orders for this filter.</p></div>';
    document.querySelectorAll('[data-status]').forEach(s => s.addEventListener('change', async () => {
      s.disabled = true;
      try { await api('/api/orders/status', { method: 'POST', token: await StaffAuth.token(), body: { orderId: s.dataset.status, status: s.value } }); toast('Status updated'); }
      catch (e) { toast(e.message === 'customer_points_spent' ? 'Cannot reopen: the customer already spent the refunded gift points.' : 'Update failed'); draw(); }
      s.disabled = false;
    }));
    document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
      const o = all.find(x => x.id === b.dataset.delete);
      if (!confirm(`Delete order #${o.number}? This cannot be undone.`)) return;
      try { await api('/api/orders/delete', { method: 'POST', token: await StaffAuth.token(), body: { orderId: o.id } }); toast('Order deleted'); }
      catch (e) { toast('Delete failed'); }
    }));
    document.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printReceipt(all.find(x => x.id === b.dataset.print), CONFIG, 'en')));
    renderIcons();
  }
  async function listen() {
    if (ordersUnsub) ordersUnsub();
    const [from, to] = range();
    const { m, db } = await FB.firestore('staff');
    const q = m.query(m.collection(db, 'orders'), m.where('createdAtMs', '>=', from), m.where('createdAtMs', '<', to), m.orderBy('createdAtMs', 'desc'), m.limit(500));
    ordersUnsub = m.onSnapshot(q, snap => { all = snap.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, err => {
      console.error(err);
      $('ordersBox').innerHTML = `<div class="admin-card"><p class="form-error">Could not load orders: ${escapeHtml(err.code || err.message)}. Check that the Firestore rules from the README are published.</p></div>`;
    });
  }
  $('fPeriod').addEventListener('change', () => { const c = $('fPeriod').value === 'custom'; $('fFromWrap').classList.toggle('hidden', !c); $('fToWrap').classList.toggle('hidden', !c); listen(); });
  ['fFrom', 'fTo'].forEach(id => $(id).addEventListener('change', listen));
  ['fStatus', 'fBranch'].forEach(id => $(id).addEventListener('change', draw));
  listen().catch(e => { console.error(e); $('ordersBox').innerHTML = `<div class="admin-card"><p class="form-error">Firebase is not configured yet (see README).</p></div>`; });
}

/* ===================== Branches ===================== */
function renderBranches(el) {
  el.innerHTML = card('Branches', `
    <div class="checkbox-row" style="margin-bottom:12px"><input type="checkbox" id="multiBranch" ${CONFIG.settings.multiBranch ? 'checked' : ''}><label for="multiBranch">Multiple branches (customers choose a branch first)</label></div>
    <div id="branchList"></div>`, { action: '<button class="btn-add" id="addBranch">+ Add</button>' }) + '<div class="admin-card hidden" id="branchForm"></div>';
  $('multiBranch').addEventListener('change', e => { CONFIG.settings.multiBranch = e.target.checked; persist(); });
  $('addBranch').addEventListener('click', () => branchForm(null));
  $('branchList').innerHTML = CONFIG.branches.map(b => `
    <div class="admin-list-item"><img src="${escapeHtml(b.image || PLACEHOLDER_IMG)}"><div class="info"><strong>${escapeHtml(nameOf(b.name))}</strong><div class="mini-note">${b.pickupEnabled === false ? 'Delivery only' : b.deliveryEnabled === false ? 'Pickup only' : 'Pickup & Delivery'}</div></div>
    <div class="actions"><button class="btn-sm btn-edit" data-edit="${b.id}">Edit</button><button class="btn-sm btn-del" data-del="${b.id}">Delete</button></div></div>`).join('') || '<p class="mini-note">No branches yet.</p>';
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => branchForm(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this branch?')) return;
    CONFIG.branches = CONFIG.branches.filter(x => x.id !== b.dataset.del);
    persist(); show();
  }));
}
function branchForm(id) {
  const b = id ? CONFIG.branches.find(x => x.id === id) : { name: {}, image: '', pickupEnabled: true, deliveryEnabled: true };
  const type = b.pickupEnabled === false ? 'delivery' : b.deliveryEnabled === false ? 'pickup' : 'both';
  const f = $('branchForm');
  f.classList.remove('hidden');
  f.innerHTML = `<h3>${id ? 'Edit branch' : 'New branch'}</h3>
    ${imgField('bImg', 'Image', b.image)}
    ${bi('bName', 'Branch name', b.name)}
    <div class="form-group"><label>Order options</label><select id="bType"><option value="both" ${type === 'both' ? 'selected' : ''}>Pickup & Delivery</option><option value="pickup" ${type === 'pickup' ? 'selected' : ''}>Pickup only</option><option value="delivery" ${type === 'delivery' ? 'selected' : ''}>Delivery only</option></select></div>
    <div style="display:flex;gap:10px">${saveBtn('bSave', 'Save')}<button class="btn-sm" id="bCancel">Cancel</button></div>`;
  bindImg('bImg', 800);
  $('bCancel').addEventListener('click', () => f.classList.add('hidden'));
  $('bSave').addEventListener('click', () => {
    const name = readBi('bName');
    if (!hasBi(name)) return toast('Name is required');
    const flags = { both: [true, true], pickup: [true, false], delivery: [false, true] }[$('bType').value];
    const data = { name, image: readImg('bImg'), pickupEnabled: flags[0], deliveryEnabled: flags[1] };
    if (id) Object.assign(b, data); else CONFIG.branches.push({ id: uid('branch'), ...data, deliveryZones: [] });
    if (!Array.isArray(b.deliveryZones) && id) b.deliveryZones = [];
    persist(); show();
  });
  f.scrollIntoView({ behavior: 'smooth' });
}

/* ===================== Categories ===================== */
function renderCategories(el) {
  el.innerHTML = card('Categories', '<div id="catList"></div>', { action: '<button class="btn-add" id="addCat">+ Add</button>' }) + '<div class="admin-card hidden" id="catForm"></div>';
  $('addCat').addEventListener('click', () => catForm(null));
  $('catList').innerHTML = sortByOrder(CONFIG.categories).map(c => `
    <div class="admin-list-item"><img src="${escapeHtml(c.image || PLACEHOLDER_IMG)}"><div class="info"><strong>${escapeHtml(nameOf(c.name))}</strong><div class="mini-note">Order: ${c.order || 0}</div></div>
    <div class="actions"><button class="btn-sm btn-edit" data-edit="${c.id}">Edit</button><button class="btn-sm btn-del" data-del="${c.id}">Delete</button></div></div>`).join('') || '<p class="mini-note">No categories yet.</p>';
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => catForm(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this category?')) return;
    CONFIG.categories = CONFIG.categories.filter(x => x.id !== b.dataset.del);
    persist(); show();
  }));
}
function catForm(id) {
  const c = id ? CONFIG.categories.find(x => x.id === id) : { name: {}, image: '', branchIds: [], order: CONFIG.categories.length };
  const f = $('catForm');
  f.classList.remove('hidden');
  f.innerHTML = `<h3>${id ? 'Edit category' : 'New category'}</h3>
    ${imgField('cImg', 'Image', c.image)}
    ${bi('cName', 'Category name', c.name)}
    <div class="form-group"><label>Display order</label><input type="number" id="cOrder" value="${c.order || 0}"></div>
    ${branchCheckboxes('cat', c.branchIds || [])}
    <div style="display:flex;gap:10px">${saveBtn('cSave', 'Save')}<button class="btn-sm" id="cCancel">Cancel</button></div>`;
  bindImg('cImg', 700);
  $('cCancel').addEventListener('click', () => f.classList.add('hidden'));
  $('cSave').addEventListener('click', () => {
    const name = readBi('cName');
    if (!hasBi(name)) return toast('Name is required');
    const data = { name, image: readImg('cImg'), order: num('cOrder'), branchIds: readBranches('cat') };
    if (id) Object.assign(c, data); else CONFIG.categories.push({ id: uid('cat'), ...data });
    persist(); show();
  });
  f.scrollIntoView({ behavior: 'smooth' });
}

/* ===================== Products ===================== */
const GROUP_TYPES = { single_price: 'Single choice — different prices (e.g. size)', single_flat: 'Single choice — no price', multi_priced: 'Multiple choice — add price', multi_flat: 'Multiple choice — no price' };
function renderProducts(el) {
  el.innerHTML = card('Products', '<div id="prodList"></div>', { action: '<button class="btn-add" id="addProd">+ Add</button>' }) + '<div class="admin-card hidden" id="prodForm"></div>';
  $('addProd').addEventListener('click', () => prodForm(null));
  $('prodList').innerHTML = sortByOrder(CONFIG.products).map(p => {
    const cat = CONFIG.categories.find(c => c.id === p.categoryId);
    return `<div class="admin-list-item"><img src="${escapeHtml(p.image || PLACEHOLDER_IMG)}"><div class="info"><strong>${escapeHtml(nameOf(p.name))}</strong><div class="mini-note">${cat ? escapeHtml(nameOf(cat.name)) : ''} • ${fmtMoney(Pricing.productBasePrice(p, decimals()))}${p.discountPercent ? ` (−${p.discountPercent}%)` : ''}</div></div>
      <div class="actions"><button class="btn-sm btn-edit" data-edit="${p.id}">Edit</button><button class="btn-sm btn-del" data-del="${p.id}">Delete</button></div></div>`;
  }).join('') || '<p class="mini-note">No products yet.</p>';
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => prodForm(b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this product?')) return;
    CONFIG.products = CONFIG.products.filter(x => x.id !== b.dataset.del);
    persist(); show();
  }));
}
function prodForm(id) {
  const src = id ? CONFIG.products.find(x => x.id === id) : null;
  const p = src ? JSON.parse(JSON.stringify(src)) : { categoryId: CONFIG.categories[0]?.id || '', image: '', price: 0, discountPercent: 0, branchIds: [], order: CONFIG.products.length, name: {}, description: {}, optionGroups: [] };
  p.optionGroups = p.optionGroups || [];
  const f = $('prodForm');
  f.classList.remove('hidden');
  f.innerHTML = `<h3>${id ? 'Edit product' : 'New product'}</h3>
    ${imgField('pImg', 'Image', p.image)}
    ${bi('pName', 'Name', p.name)}
    ${bi('pDesc', 'Description', p.description, { area: true })}
    <div class="form-row">
      <div class="form-group"><label>Price</label><input type="number" step="0.001" min="0" id="pPrice" value="${p.price || 0}"><p class="mini-note hidden" id="pPriceNote">Price comes from the first option of the size/price group.</p></div>
      <div class="form-group"><label>Category</label><select id="pCat">${CONFIG.categories.map(c => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${escapeHtml(nameOf(c.name))}</option>`).join('')}</select></div>
      <div class="form-group"><label>Discount %</label><input type="number" min="0" max="100" id="pDisc" value="${p.discountPercent || 0}"></div>
      <div class="form-group"><label>Display order</label><input type="number" id="pOrder" value="${p.order || 0}"></div>
    </div>
    ${branchCheckboxes('prod', p.branchIds || [])}
    <h4>Options & add-ons</h4>
    <div id="groups"></div>
    <button type="button" class="btn-sm btn-edit" id="addGroup" style="margin-bottom:14px">+ Add option group</button>
    <div style="display:flex;gap:10px">${saveBtn('pSave', 'Save')}<button class="btn-sm" id="pCancel">Cancel</button></div>`;
  bindImg('pImg', 900);

  function syncGroupsFromDom() {
    f.querySelectorAll('.option-group-card').forEach(gc => {
      const g = p.optionGroups[Number(gc.dataset.gi)];
      g.name = { ar: gc.querySelector('.g-ar').value.trim(), en: gc.querySelector('.g-en').value.trim() };
      gc.querySelectorAll('.option-line').forEach(line => {
        const o = g.options[Number(line.dataset.oi)];
        o.name = { ar: line.querySelector('.o-ar').value.trim(), en: line.querySelector('.o-en').value.trim() };
        const d = line.querySelector('.o-price');
        if (d) o.priceDelta = Number(d.value) || 0;
      });
    });
  }
  function priceState() {
    const pg = Pricing.pricingGroup(p);
    $('pPrice').disabled = !!pg;
    $('pPriceNote').classList.toggle('hidden', !pg);
  }
  function groups() {
    $('groups').innerHTML = p.optionGroups.map((g, gi) => `
      <div class="option-group-card" data-gi="${gi}">
        <div class="form-row"><div class="form-group"><label>Group name (AR)</label><input class="g-ar" dir="rtl" value="${escapeHtml(asBi(g.name).ar)}"></div><div class="form-group"><label>Group name (EN)</label><input class="g-en" value="${escapeHtml(asBi(g.name).en)}"></div></div>
        <div class="form-group"><label>Type</label><select class="g-type">${Object.entries(GROUP_TYPES).map(([k, v]) => `<option value="${k}" ${g.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        ${(g.options || []).map((o, oi) => `<div class="option-line" data-oi="${oi}">
          <input class="o-ar" dir="rtl" placeholder="Option (AR)" value="${escapeHtml(asBi(o.name).ar)}">
          <input class="o-en" placeholder="Option (EN)" value="${escapeHtml(asBi(o.name).en)}">
          ${g.type === 'single_price' || g.type === 'multi_priced' ? `<input class="o-price" type="number" step="0.001" style="max-width:100px" placeholder="${g.type === 'single_price' && gi === p.optionGroups.indexOf(Pricing.pricingGroup(p)) ? 'Price' : '+ Price'}" value="${o.priceDelta || 0}">` : ''}
          <button type="button" class="btn-sm btn-del o-del">×</button></div>`).join('')}
        <button type="button" class="btn-sm btn-edit o-add">+ Option</button>
        <button type="button" class="btn-sm btn-del g-del" style="float:inline-end">Delete group</button><div style="clear:both"></div>
      </div>`).join('');
    f.querySelectorAll('.option-group-card').forEach(gc => {
      const gi = Number(gc.dataset.gi), g = p.optionGroups[gi];
      gc.querySelector('.g-type').addEventListener('change', e => { syncGroupsFromDom(); g.type = e.target.value; groups(); });
      gc.querySelector('.o-add').addEventListener('click', () => { syncGroupsFromDom(); (g.options = g.options || []).push({ id: uid('opt'), name: {}, priceDelta: 0 }); groups(); });
      gc.querySelector('.g-del').addEventListener('click', () => { syncGroupsFromDom(); p.optionGroups.splice(gi, 1); groups(); });
      gc.querySelectorAll('.option-line').forEach(line => line.querySelector('.o-del').addEventListener('click', () => { syncGroupsFromDom(); g.options.splice(Number(line.dataset.oi), 1); groups(); }));
      gc.querySelectorAll('.o-price').forEach(i => i.addEventListener('input', () => { syncGroupsFromDom(); priceState(); }));
    });
    priceState();
  }
  groups();
  $('addGroup').addEventListener('click', () => { syncGroupsFromDom(); p.optionGroups.push({ id: uid('grp'), type: 'single_flat', name: {}, options: [] }); groups(); });
  $('pCancel').addEventListener('click', () => f.classList.add('hidden'));
  $('pSave').addEventListener('click', () => {
    syncGroupsFromDom();
    p.name = readBi('pName');
    p.description = readBi('pDesc');
    if (!hasBi(p.name)) return toast('Name is required');
    p.image = readImg('pImg');
    p.price = num('pPrice');
    p.categoryId = $('pCat').value;
    p.discountPercent = Math.min(100, Math.max(0, num('pDisc')));
    p.order = num('pOrder');
    p.branchIds = readBranches('prod');
    p.optionGroups = p.optionGroups.filter(g => hasBi(asBi(g.name)) || (g.options || []).length);
    if (id) CONFIG.products[CONFIG.products.findIndex(x => x.id === id)] = p;
    else CONFIG.products.push({ ...p, id: uid('prod') });
    persist(); show();
  });
  f.scrollIntoView({ behavior: 'smooth' });
}

/* ===================== Delivery zones ===================== */
function renderDelivery(el) {
  const branches = CONFIG.branches.filter(b => b.deliveryEnabled !== false);
  if (!branches.length) { el.innerHTML = card('Delivery Zones', '<p class="mini-note">No branch has delivery enabled.</p>'); return; }
  el.innerHTML = card('Delivery Zones', `
    <div class="form-group"><label>Branch</label><select id="zBranch">${branches.map(b => `<option value="${b.id}">${escapeHtml(nameOf(b.name))}</option>`).join('')}</select></div>
    <div id="zoneList"></div>
    <div class="form-row" style="align-items:flex-end">
      <div class="form-group" style="flex:2">${bi('zName', 'New zone name', {})}</div>
      <div class="form-group"><label>Delivery fee</label><input type="number" step="0.001" min="0" id="zPrice" value="0"></div>
    </div>
    <button class="btn-add" id="zAdd">+ Add zone</button>`);
  const sel = $('zBranch');
  function list() {
    const b = CONFIG.branches.find(x => x.id === sel.value);
    b.deliveryZones = b.deliveryZones || [];
    $('zoneList').innerHTML = b.deliveryZones.map(z => `<div class="admin-list-item"><div class="info"><strong>${escapeHtml(nameOf(z.name))}</strong><div class="mini-note">${escapeHtml(asBi(z.name).ar)}</div></div>
      <input type="number" step="0.001" min="0" value="${z.price}" data-zprice="${z.id}" style="max-width:110px;border:1px solid var(--border);border-radius:10px;padding:8px">
      <div class="actions"><button class="btn-sm btn-del" data-zdel="${z.id}">Delete</button></div></div>`).join('') || '<p class="mini-note">No zones for this branch yet.</p>';
    el.querySelectorAll('[data-zprice]').forEach(i => i.addEventListener('change', () => { b.deliveryZones.find(z => z.id === i.dataset.zprice).price = Number(i.value) || 0; persist(); }));
    el.querySelectorAll('[data-zdel]').forEach(btn => btn.addEventListener('click', () => { if (!confirm('Delete zone?')) return; b.deliveryZones = b.deliveryZones.filter(z => z.id !== btn.dataset.zdel); persist(); list(); }));
  }
  sel.addEventListener('change', list);
  $('zAdd').addEventListener('click', () => {
    const name = readBi('zName');
    if (!hasBi(name)) return toast('Zone name is required');
    CONFIG.branches.find(x => x.id === sel.value).deliveryZones.push({ id: uid('zone'), name, price: num('zPrice') });
    ['zName_ar', 'zName_en'].forEach(i => { $(i).value = ''; });
    persist(); list();
  });
  list();
}

/* ===================== Discounts ===================== */
function ruleEditor(kind) {
  const rules = CONFIG.discounts[kind];
  const types = kind === 'delivery' ? { percent: 'Percentage %', fixed: 'Fixed amount', free: 'Free delivery' } : { percent: 'Percentage %', fixed: 'Fixed amount' };
  return `<div id="rules_${kind}">${rules.map((r, i) => `
    <div class="rule-row" data-i="${i}">
      <div class="form-group"><label>Order from</label><input type="number" step="0.001" min="0" class="r-min" value="${r.min ?? 0}"></div>
      <div class="form-group"><label>Up to (empty = no limit)</label><input type="number" step="0.001" min="0" class="r-max" value="${r.max ?? ''}"></div>
      <div class="form-group"><label>Type</label><select class="r-type">${Object.entries(types).map(([k, v]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="form-group"><label>Value</label><input type="number" step="0.001" min="0" class="r-val" value="${r.value ?? 0}" ${r.type === 'free' ? 'disabled' : ''}></div>
      <button class="btn-sm btn-del r-del" title="Delete">×</button>
    </div>`).join('') || '<p class="mini-note">No rules yet.</p>'}</div>
    <div style="display:flex;gap:10px;margin-top:10px"><button class="btn-sm btn-edit" data-add-rule="${kind}">+ Add range</button>${saveBtn('saveRules_' + kind, 'Save')}</div>`;
}
function renderDiscounts(el) {
  CONFIG.discounts = CONFIG.discounts || { invoice: [], delivery: [] };
  ['invoice', 'delivery'].forEach(k => { CONFIG.discounts[k] = CONFIG.discounts[k] || []; });
  el.innerHTML =
    card('Order (invoice) discounts', `<p class="mini-note">Discount on the order subtotal by price range, e.g. 100–150 → 5%, 200–250 → 10%. When ranges overlap the one with the highest “from” wins.</p>${ruleEditor('invoice')}`) +
    card('Delivery discounts', `<p class="mini-note">Discount on the delivery fee by order subtotal: a percentage, a fixed amount, or free delivery.</p>${ruleEditor('delivery')}`) +
    card('Minimum order & tax', `<div class="form-row"><div class="form-group"><label>Minimum delivery order</label><input type="number" step="0.001" min="0" id="minOrder" value="${CONFIG.settings.minimumOrder || 0}"></div><div class="form-group"><label>Tax rate %</label><input type="number" step="0.01" min="0" id="taxRate" value="${CONFIG.settings.taxRate || 0}"></div></div>${saveBtn('saveMin', 'Save')}`);
  function read(kind) {
    return Array.from(document.querySelectorAll(`#rules_${kind} .rule-row`)).map(row => {
      const max = row.querySelector('.r-max').value;
      return { id: CONFIG.discounts[kind][Number(row.dataset.i)].id, min: Number(row.querySelector('.r-min').value) || 0, max: max === '' ? null : Number(max), type: row.querySelector('.r-type').value, value: Number(row.querySelector('.r-val').value) || 0 };
    });
  }
  ['invoice', 'delivery'].forEach(kind => {
    document.querySelectorAll(`#rules_${kind} .r-type`).forEach(s => s.addEventListener('change', () => { s.closest('.rule-row').querySelector('.r-val').disabled = s.value === 'free'; }));
    document.querySelectorAll(`#rules_${kind} .r-del`).forEach(b => b.addEventListener('click', () => { CONFIG.discounts[kind] = read(kind); CONFIG.discounts[kind].splice(Number(b.closest('.rule-row').dataset.i), 1); persist(); show(); }));
    document.querySelector(`[data-add-rule="${kind}"]`).addEventListener('click', () => { CONFIG.discounts[kind] = read(kind); CONFIG.discounts[kind].push({ id: uid('rule'), min: 0, max: null, type: 'percent', value: 0 }); show(); });
    $('saveRules_' + kind).addEventListener('click', () => {
      const rules = read(kind);
      if (rules.some(r => r.max !== null && r.max < r.min)) return toast('“Up to” must be greater than “from”');
      if (rules.some(r => r.type === 'percent' && r.value > 100)) return toast('Percentage cannot exceed 100');
      CONFIG.discounts[kind] = rules; persist(); toast('Saved');
    });
  });
  $('saveMin').addEventListener('click', () => { CONFIG.settings.minimumOrder = Math.max(0, num('minOrder')); CONFIG.settings.taxRate = Math.max(0, num('taxRate')); persist(); toast('Saved'); });
}

/* ===================== Loyalty ===================== */
function renderLoyalty(el) {
  const L = CONFIG.loyalty = CONFIG.loyalty || { enabled: true, amountPerPoint: 1, tiers: [], levels: [] };
  L.tiers = L.tiers || []; L.levels = L.levels || [];
  while (L.levels.length < 3) L.levels.push({ id: ['silver', 'gold', 'diamond'][L.levels.length], name: {}, points: 0, discountPercent: 0, image: '' });
  const cur = getCurrency().code;
  el.innerHTML =
    card('Points', `
      <div class="checkbox-row" style="margin-bottom:12px"><input type="checkbox" id="lEnabled" ${L.enabled !== false ? 'checked' : ''}><label for="lEnabled">Loyalty program enabled</label></div>
      <div class="form-group"><label>Customers earn 1 point for every … ${escapeHtml(cur)} spent</label><input type="number" step="0.001" min="0.001" id="lRate" value="${L.amountPerPoint || 1}" style="max-width:160px"></div>
      <p class="mini-note">Points are calculated on the order total after discounts and without the delivery fee, and are added only when the order is marked Delivered. Gift points are deducted when the order is placed and returned if it is cancelled.</p>
      ${saveBtn('lSave', 'Save')}`) +
    card('Levels (Silver → Gold → Diamond)', `
      <p class="mini-note">A level is reached with lifetime earned points (spending points on gifts never lowers a level). Each level gives a permanent discount on every order.</p>
      ${L.levels.map((lv, i) => `<div class="option-group-card">
        <h4 style="margin-top:0">Level ${i + 1}</h4>
        ${bi('lvName' + i, 'Level name', lv.name)}
        <div class="form-row"><div class="form-group"><label>Points required</label><input type="number" min="0" id="lvPts${i}" value="${lv.points || 0}"></div><div class="form-group"><label>Permanent discount %</label><input type="number" min="0" max="100" step="0.5" id="lvDisc${i}" value="${lv.discountPercent || 0}"></div></div>
        ${imgField('lvImg' + i, 'Level image', lv.image)}
      </div>`).join('')}
      ${saveBtn('lvSave', 'Save levels')}`) +
    card('Gift categories', `
      <p class="mini-note">Each category has a points cost and up to 3 gifts. Customers can redeem any number of gifts (including the same gift more than once) as long as they have enough points.</p>
      <div id="tiers"></div>
      <div style="display:flex;gap:10px;margin-top:10px"><button class="btn-sm btn-edit" id="addTier">+ Add category</button>${saveBtn('tSave', 'Save gifts')}</div>`);
  function tiersHtml() {
    $('tiers').innerHTML = L.tiers.map((tier, ti) => `<div class="option-group-card" data-ti="${ti}">
      <div class="admin-topbar"><h4 style="margin:0">Category ${ti + 1}</h4><button class="btn-sm btn-del" data-tdel="${ti}">Delete category</button></div>
      <div class="form-group"><label>Points per gift in this category</label><input type="number" min="1" id="tPts${ti}" value="${tier.points || 0}" style="max-width:160px"></div>
      ${[0, 1, 2].map(gi => { const g = (tier.gifts || [])[gi] || {}; return `<div style="border-top:1px dashed var(--border);padding-top:10px;margin-top:10px">
        <strong class="mini-note">Gift ${gi + 1}</strong>
        ${bi(`g${ti}_${gi}`, 'Gift name (leave empty to skip)', g.name)}
        ${imgField(`gImg${ti}_${gi}`, 'Gift image', g.image)}</div>`; }).join('')}
    </div>`).join('') || '<p class="mini-note">No gift categories yet.</p>';
    L.tiers.forEach((tier, ti) => [0, 1, 2].forEach(gi => bindImg(`gImg${ti}_${gi}`, 700)));
    el.querySelectorAll('[data-tdel]').forEach(b => b.addEventListener('click', () => { if (!confirm('Delete this gift category?')) return; readTiers(); L.tiers.splice(Number(b.dataset.tdel), 1); tiersHtml(); renderIcons(); }));
  }
  function readTiers() {
    L.tiers = L.tiers.map((tier, ti) => ({
      id: tier.id || uid('tier'),
      points: Math.max(1, Math.round(num('tPts' + ti, 1))),
      gifts: [0, 1, 2].map(gi => {
        const name = readBi(`g${ti}_${gi}`);
        if (!hasBi(name)) return null;
        const old = (tier.gifts || [])[gi];
        return { id: (old && old.id) || uid('gift'), name, image: readImg(`gImg${ti}_${gi}`) };
      }).filter(Boolean)
    }));
  }
  tiersHtml();
  L.levels.forEach((lv, i) => bindImg('lvImg' + i, 900));
  $('lSave').addEventListener('click', () => { L.enabled = $('lEnabled').checked; L.amountPerPoint = Math.max(0.001, num('lRate', 1)); persist(); toast('Saved'); });
  $('lvSave').addEventListener('click', () => {
    L.levels = L.levels.map((lv, i) => ({ id: lv.id || uid('level'), name: readBi('lvName' + i), points: Math.max(0, Math.round(num('lvPts' + i))), discountPercent: Math.min(100, Math.max(0, num('lvDisc' + i))), image: readImg('lvImg' + i) }));
    const pts = L.levels.map(l => l.points);
    if (pts[0] > pts[1] || pts[1] > pts[2]) return toast('Each level must need more points than the one before');
    persist(); toast('Saved');
  });
  $('addTier').addEventListener('click', () => { readTiers(); L.tiers.push({ id: uid('tier'), points: 100, gifts: [] }); tiersHtml(); renderIcons(); });
  $('tSave').addEventListener('click', () => { readTiers(); L.tiers.sort((a, b) => a.points - b.points); persist(); tiersHtml(); renderIcons(); });
}

/* ===================== Homepage ===================== */
function renderHomepage(el) {
  const hp = CONFIG.settings.homepage = CONFIG.settings.homepage || {};
  ['hero', 'login', 'categories', 'featured', 'cta'].forEach(k => { hp[k] = hp[k] || {}; });
  el.innerHTML = card('Homepage', `
    <h4>Hero</h4>
    ${bi('hEye', 'Small line above title', hp.hero.eyebrow)}${bi('hTitle', 'Title', hp.hero.title)}${bi('hText', 'Text', hp.hero.text)}${bi('hBtn', 'Button', hp.hero.button)}
    ${imgField('hImg', 'Background image', hp.hero.image, { wide: true })}
    <h4>Sign-in card</h4>
    ${bi('lTitle', 'Title', hp.login.title)}${bi('lText', 'Text', hp.login.text)}${bi('lBtn', 'Google button text', hp.login.button)}
    <h4>Categories section</h4>
    ${bi('cEye', 'Small line', hp.categories.eyebrow)}${bi('cTitle', 'Title', hp.categories.title)}
    <div class="selection-grid">${sortByOrder(CONFIG.categories).map(c => `<label class="selection-option"><input type="checkbox" class="hcat" value="${c.id}" ${(hp.categories.selectedIds || []).includes(c.id) ? 'checked' : ''}> ${escapeHtml(nameOf(c.name))}</label>`).join('')}</div>
    <h4>Featured products</h4>
    ${bi('fEye', 'Small line', hp.featured.eyebrow)}${bi('fTitle', 'Title', hp.featured.title)}${bi('fBtn', 'Product button', hp.featured.button)}
    <div class="selection-grid">${sortByOrder(CONFIG.products).map(p => `<label class="selection-option"><input type="checkbox" class="hprod" value="${p.id}" ${(hp.featured.selectedIds || []).includes(p.id) ? 'checked' : ''}> ${escapeHtml(nameOf(p.name))}</label>`).join('')}</div>
    <h4>Bottom call to action</h4>
    ${bi('aEye', 'Small line', hp.cta.eyebrow)}${bi('aTitle', 'Title', hp.cta.title)}${bi('aBtn', 'Button', hp.cta.button)}
    ${saveBtn('hSave')}`);
  bindImg('hImg', 1600);
  $('hSave').addEventListener('click', () => {
    CONFIG.settings.homepage = {
      hero: { eyebrow: readBi('hEye'), title: readBi('hTitle'), text: readBi('hText'), button: readBi('hBtn'), image: readImg('hImg') },
      login: { title: readBi('lTitle'), text: readBi('lText'), button: readBi('lBtn') },
      categories: { eyebrow: readBi('cEye'), title: readBi('cTitle'), selectedIds: Array.from(document.querySelectorAll('.hcat:checked')).map(x => x.value) },
      featured: { eyebrow: readBi('fEye'), title: readBi('fTitle'), button: readBi('fBtn'), selectedIds: Array.from(document.querySelectorAll('.hprod:checked')).map(x => x.value) },
      cta: { eyebrow: readBi('aEye'), title: readBi('aTitle'), button: readBi('aBtn') }
    };
    persist(); toast('Saved');
  });
}

/* ===================== Slider ===================== */
function renderSlider(el) {
  const s = CONFIG.settings.slider = CONFIG.settings.slider || { images: [], intervalSeconds: 4 };
  el.innerHTML = card('Menu page slider', `
    <div style="display:flex;flex-wrap:wrap;gap:10px">${s.images.map((src, i) => `<div style="position:relative"><img src="${escapeHtml(src)}" style="width:140px;height:62px;object-fit:cover;border-radius:8px"><button data-i="${i}" class="btn-sm btn-del" style="position:absolute;top:2px;inset-inline-end:2px">×</button></div>`).join('')}</div>
    ${s.images.length < 5 ? `<div class="form-group" style="margin-top:12px"><label>Add image (16:7 recommended)</label><input type="file" id="sAdd" accept="image/*"></div>` : ''}
    <div class="form-group"><label>Seconds per slide</label><input type="number" min="1" id="sInt" value="${s.intervalSeconds || 4}" style="max-width:120px"></div>
    ${saveBtn('sSave')}`);
  el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { s.images.splice(Number(b.dataset.i), 1); persist(); show(); }));
  const add = $('sAdd');
  if (add) add.addEventListener('change', async () => { if (!add.files[0]) return; try { s.images.push(await uploadImage(add.files[0], 1600)); persist(); show(); } catch (e) { toast('Upload failed'); } });
  $('sSave').addEventListener('click', () => { s.intervalSeconds = Math.max(1, num('sInt', 4)); persist(); toast('Saved'); });
}

/* ===================== Pages ===================== */
const PAGE_DEFS = [
  ['login', 'Sign in page (menu)', ['title', 'text', 'button']],
  ['privacy', 'Privacy policy (menu)', ['title', 'text*']],
  ['returns', 'Return & exchange policy (menu)', ['title', 'text*']],
  ['levels', 'Levels (bottom bar)', ['title', 'text', 'lockedText', 'button']],
  ['gifts', 'Gifts (bottom bar)', ['title', 'text', 'lockedText', 'button']],
  ['notifications', 'Notifications (bottom bar)', ['title', 'text', 'emptyText', 'button']],
  ['orders', 'My Orders (bottom bar)', ['title', 'text', 'lockedText', 'button', 'emptyText']]
];
const FIELD_LABEL = { title: 'Title', text: 'Text under the title', 'text*': 'Page content', lockedText: 'Message when signed out', button: 'Button text', emptyText: 'Message when empty' };
function renderPages(el) {
  CONFIG.pages = CONFIG.pages || {};
  el.innerHTML = `<div class="admin-card"><p class="mini-note">Each page shows its 16:9 image right under the header. Home is edited in “Homepage”. The sign-in button uses the Secondary color from “Colors”.</p>
    <div class="form-group"><label>Page</label><select id="pgSel">${PAGE_DEFS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div><div id="pgForm"></div>`;
  const sel = $('pgSel');
  function form() {
    const [key, label, fields] = PAGE_DEFS.find(d => d[0] === sel.value);
    const pg = CONFIG.pages[key] = CONFIG.pages[key] || {};
    $('pgForm').innerHTML = card(label, `
      ${imgField('pgImg', 'Top image (16:9)', pg.image, { wide: true })}
      ${fields.map(f => bi('pg_' + f.replace('*', ''), FIELD_LABEL[f], pg[f.replace('*', '')], { area: f.endsWith('*') || f === 'text' })).join('')}
      <a class="btn-sm btn-edit" href="/${key}" target="_blank" style="display:inline-block;margin-bottom:12px">Preview page ↗</a><br>
      ${saveBtn('pgSave')}`);
    bindImg('pgImg', 1600);
    $('pgSave').addEventListener('click', () => {
      pg.image = readImg('pgImg');
      fields.forEach(f => { const k = f.replace('*', ''); pg[k] = readBi('pg_' + k); });
      persist(); toast('Saved');
    });
    renderIcons();
  }
  sel.addEventListener('change', form);
  form();
}

/* ===================== Notifications ===================== */
async function renderNotifications(el) {
  el.innerHTML = card('Send a notification', `
    <p class="mini-note">Sent as a push notification to every customer who enabled notifications (Android, desktop, and iPhone when the site is added to the home screen), and shown on the Notifications page.</p>
    ${bi('nTitle', 'Title', {})}${bi('nBody', 'Message', {}, { area: true })}
    <div class="form-group"><label>Link (optional, e.g. /menu or /gifts)</label><input type="text" id="nLink" placeholder="/menu"></div>
    ${imgField('nImg', 'Image (optional)', '')}
    ${saveBtn('nSend', 'Send notification')}`) + card('Sent notifications', '<div id="nList"><p class="mini-note">Loading…</p></div>');
  bindImg('nImg', 1000);
  async function list() {
    try {
      const site = await (await fetch('/api/site', { cache: 'no-store' })).json();
      $('nList').innerHTML = (site.notifications || []).map(n => `<div class="admin-list-item"><div class="info"><strong>${escapeHtml(nameOf(n.title))}</strong><div class="mini-note">${escapeHtml(fmtDate(n.at))} · ${escapeHtml(tField(n.body))}</div></div><div class="actions"><button class="btn-sm btn-del" data-ndel="${n.id}">Delete</button></div></div>`).join('') || '<p class="mini-note">Nothing sent yet.</p>';
      el.querySelectorAll('[data-ndel]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Remove from the Notifications page?')) return; await api('/api/admin/notify', { method: 'DELETE', token: await StaffAuth.token(), body: { id: b.dataset.ndel } }); setTimeout(list, 300); }));
    } catch (e) { $('nList').innerHTML = '<p class="mini-note">Could not load.</p>'; }
  }
  $('nSend').addEventListener('click', async e => {
    const title = readBi('nTitle'), body = readBi('nBody');
    if (!hasBi(title)) return toast('Title is required');
    if (!confirm('Send this notification to all customers now?')) return;
    e.target.disabled = true;
    try {
      const res = await api('/api/admin/notify', { method: 'POST', token: await StaffAuth.token(), body: { title, body, link: $('nLink').value.trim(), image: readImg('nImg') } });
      toast(res.push && (res.push.ar === 'failed' || res.push.en === 'failed') ? 'Saved, but push sending failed (check Firebase settings)' : 'Notification sent');
      show();
    } catch (err) { toast('Send failed'); e.target.disabled = false; }
  });
  list();
}

/* ===================== Cashiers ===================== */
async function renderCashiers(el) {
  el.innerHTML = card('Cashier accounts', `
    <p class="mini-note">Each cashier signs in at <strong>${location.origin}/cashier</strong> and only sees the orders of their branch, with a sound alert that keeps ringing until each new order is accepted or rejected. Cashiers cannot open the admin panel or delete orders.</p>
    <div id="cList"><p class="mini-note">Loading…</p></div>`) + card('Add cashier', `
    <div class="form-row">
      <div class="form-group"><label>Display name</label><input type="text" id="cName" placeholder="Downtown cashier"></div>
      <div class="form-group"><label>Username</label><input type="text" id="cUser" autocapitalize="none" placeholder="downtown1"></div>
      <div class="form-group"><label>Password (min 6)</label><input type="text" id="cPass" autocomplete="new-password"></div>
      <div class="form-group"><label>Branch</label><select id="cBranch">${CONFIG.branches.map(b => `<option value="${b.id}">${escapeHtml(nameOf(b.name))}</option>`).join('')}</select></div>
    </div>${saveBtn('cAdd', 'Create cashier')}`);
  const token = await StaffAuth.token();
  async function list() {
    try {
      const { cashiers } = await api('/api/admin/cashiers', { token });
      $('cList').innerHTML = cashiers.map(c => `<div class="admin-list-item"><div class="info"><strong>${escapeHtml(c.name)}</strong> ${c.active ? '' : '<span class="badge">Disabled</span>'}<div class="mini-note">@${escapeHtml(c.username)} · ${escapeHtml(nameOf(CONFIG.branches.find(b => b.id === c.branchId)?.name))}</div></div>
        <div class="actions"><button class="btn-sm btn-edit" data-cpass="${c.id}">New password</button><button class="btn-sm ${c.active ? '' : 'btn-ok'}" data-ctoggle="${c.id}" data-active="${c.active}">${c.active ? 'Disable' : 'Enable'}</button><button class="btn-sm btn-del" data-cdel="${c.id}">Delete</button></div></div>`).join('') || '<p class="mini-note">No cashiers yet.</p>';
      el.querySelectorAll('[data-cpass]').forEach(b => b.addEventListener('click', async () => { const p = prompt('New password (min 6 characters):'); if (!p) return; try { await api('/api/admin/cashiers', { method: 'PATCH', token, body: { id: b.dataset.cpass, password: p } }); toast('Password changed'); } catch (e) { toast(e.message); } }));
      el.querySelectorAll('[data-ctoggle]').forEach(b => b.addEventListener('click', async () => { await api('/api/admin/cashiers', { method: 'PATCH', token, body: { id: b.dataset.ctoggle, active: b.dataset.active !== 'true' } }); list(); }));
      el.querySelectorAll('[data-cdel]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this cashier account?')) return; await api('/api/admin/cashiers', { method: 'DELETE', token, body: { id: b.dataset.cdel } }); list(); }));
    } catch (e) { $('cList').innerHTML = `<p class="form-error">Could not load cashiers (${escapeHtml(e.message)}). Check the Firebase settings.</p>`; }
  }
  $('cAdd').addEventListener('click', async () => {
    try {
      await api('/api/admin/cashiers', { method: 'POST', token, body: { name: $('cName').value, username: $('cUser').value, password: $('cPass').value, branchId: $('cBranch').value } });
      toast('Cashier created'); show();
    } catch (e) {
      toast({ invalid_username: 'Username: 3–32 letters, numbers, . _ -', weak_password: 'Password must be at least 6 characters', username_taken: 'Username already exists', missing_fields: 'Fill in all fields' }[e.message] || 'Failed: ' + e.message);
    }
  });
  list();
}

/* ===================== Colors ===================== */
const COLOR_BLOCKS = [['header', 'Header'], ['secondary', 'Secondary (buttons, sign-in, accents)'], ['homepage', 'Homepage background'], ['branches', 'Branches page background'], ['menu', 'Menu & cart background'], ['checkout', 'Checkout background']];
function renderColors(el) {
  const colors = CONFIG.settings.colors = CONFIG.settings.colors || {};
  el.innerHTML = COLOR_BLOCKS.map(([k, l]) => {
    const c = colors[k] || { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 135 };
    return `<div class="admin-card" data-color="${k}"><h3>${l}</h3>
      <div class="form-row"><div class="form-group"><label>Type</label><select class="ct"><option value="solid" ${c.type === 'solid' ? 'selected' : ''}>Solid</option><option value="gradient" ${c.type === 'gradient' ? 'selected' : ''}>Gradient</option></select></div>
      <div class="form-group"><label>Color 1</label><input type="color" class="c1" value="${c.color1}"></div>
      <div class="form-group g2 ${c.type === 'gradient' ? '' : 'hidden'}"><label>Color 2</label><input type="color" class="c2" value="${c.color2}"></div>
      <div class="form-group g2 ${c.type === 'gradient' ? '' : 'hidden'}"><label>Angle</label><input type="number" class="ca" value="${c.angle || 135}"></div></div>
      <div class="color-preview"></div><button class="btn-primary btn-inline cs">Save</button></div>`;
  }).join('');
  el.querySelectorAll('[data-color]').forEach(box => {
    const q = s => box.querySelector(s);
    const value = () => ({ type: q('.ct').value, color1: q('.c1').value, color2: q('.c2').value, angle: Number(q('.ca').value) || 135 });
    const prev = () => { q('.color-preview').style.background = colorValue(value()); box.querySelectorAll('.g2').forEach(g => g.classList.toggle('hidden', q('.ct').value !== 'gradient')); };
    box.querySelectorAll('input,select').forEach(i => i.addEventListener('input', prev));
    prev();
    q('.cs').addEventListener('click', () => { colors[box.dataset.color] = value(); persist(); applyTheme(); toast('Saved'); });
  });
}

/* ===================== General ===================== */
const TIMEZONES = ['Asia/Kuwait', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Muscat', 'Asia/Amman', 'Asia/Jerusalem', 'Asia/Baghdad', 'Africa/Cairo', 'Africa/Casablanca', 'Europe/Istanbul', 'Europe/London', 'UTC'];
function renderGeneral(el) {
  const s = CONFIG.settings;
  el.innerHTML = card('Restaurant settings', `
    ${imgField('gLogo', 'Logo', s.logo, { note: 'Also used as the app icon when customers add the site to their home screen.' })}
    ${bi('gName', 'Restaurant name', s.restaurantName)}
    <div class="form-row">
      <div class="form-group"><label>Currency</label><select id="gCur">${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === s.currency ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('')}</select></div>
      <div class="form-group"><label>Time zone</label><select id="gTz">${TIMEZONES.map(z => `<option ${z === s.timezone ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
      <div class="form-group"><label>Default site language</label><select id="gLang"><option value="ar" ${s.defaultLang !== 'en' ? 'selected' : ''}>Arabic</option><option value="en" ${s.defaultLang === 'en' ? 'selected' : ''}>English</option></select></div>
      <div class="form-group"><label>Receipt width</label><select id="gPaper"><option value="80" ${(s.receipt?.paperWidth || 80) == 80 ? 'selected' : ''}>80 mm</option><option value="58" ${s.receipt?.paperWidth == 58 ? 'selected' : ''}>58 mm</option><option value="a4" ${s.receipt?.paperWidth === 'a4' ? 'selected' : ''}>A4 / normal printer</option></select></div>
      <div class="form-group"><label>Receipt language</label><select id="gRLang"><option value="ar" ${(s.receipt?.lang || 'ar') === 'ar' ? 'selected' : ''}>Arabic</option><option value="en" ${s.receipt?.lang === 'en' ? 'selected' : ''}>English</option></select></div>
    </div>
    ${saveBtn('gSave')}`);
  bindImg('gLogo', 512);
  $('gSave').addEventListener('click', () => {
    const name = readBi('gName');
    if (!hasBi(name)) return toast('Restaurant name is required');
    Object.assign(s, { logo: readImg('gLogo'), restaurantName: name, currency: $('gCur').value, timezone: $('gTz').value, defaultLang: $('gLang').value, receipt: { paperWidth: $('gPaper').value === 'a4' ? 'a4' : Number($('gPaper').value), lang: $('gRLang').value } });
    persist(); toast('Saved');
  });
}

/* ===================== Footer ===================== */
function renderFooterSettings(el) {
  const s = CONFIG.settings;
  const so = s.socialLinks = s.socialLinks || {};
  el.innerHTML = card('Footer & contact', `
    <div class="form-row"><div class="form-group"><label>Phone</label><input type="tel" id="fPhone" dir="ltr" value="${escapeHtml(s.phone || '')}"></div><div class="form-group"><label>Email</label><input type="email" id="fEmail" value="${escapeHtml(s.footerEmail || '')}"></div></div>
    ${bi('fAddr', 'Address', s.address)}
    <h4>Social links</h4>
    <div class="form-row">${['instagram', 'snapchat', 'tiktok', 'facebook', 'x', 'youtube'].map(k => `<div class="form-group"><label>${k}</label><input type="url" id="so_${k}" value="${escapeHtml(so[k] || '')}" placeholder="https://"></div>`).join('')}</div>
    ${saveBtn('fSave')}`);
  $('fSave').addEventListener('click', () => {
    s.phone = $('fPhone').value.trim(); s.footerEmail = $('fEmail').value.trim(); s.address = readBi('fAddr');
    ['instagram', 'snapchat', 'tiktok', 'facebook', 'x', 'youtube'].forEach(k => { so[k] = $('so_' + k).value.trim(); });
    persist(); toast('Saved');
  });
}

/* ===================== Backup & data ===================== */
function renderData(el) {
  el.innerHTML = card('Backup', `<p class="mini-note">Download all menu and site settings as a file. Orders and customer points stay in Firebase.</p><button class="btn-add" id="dExport">Download backup</button>`) +
    card('Restore / import', `<p class="mini-note">Replace all site settings with a backup file. This overwrites the current menu.</p><input type="file" id="dImport" accept="application/json">`) +
    card('Demo data', `<p class="mini-note">Replace everything with the bilingual demo restaurant (useful for showing the template).</p><button class="btn-sm btn-del" id="dDemo">Load demo data</button>`);
  $('dExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(CONFIG, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `site-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  $('dImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.settings || !Array.isArray(data.products)) throw new Error('Not a valid backup');
      if (!confirm('Replace ALL current settings with this file?')) return;
      await replaceConfig(data);
    } catch (err) { toast(err.message); }
  });
  $('dDemo').addEventListener('click', async () => { if (!confirm('Replace ALL current settings with the demo restaurant?')) return; await replaceConfig(await (await fetch('/seed/demo-config.json')).json()); });
}
async function replaceConfig(data) {
  data.version = VERSION;
  CONFIG = data;
  await persist('Imported');
  show();
}

const RENDER = { orders: renderOrders, branches: renderBranches, categories: renderCategories, products: renderProducts, delivery: renderDelivery, discounts: renderDiscounts, loyalty: renderLoyalty, homepage: renderHomepage, slider: renderSlider, pages: renderPages, notifications: renderNotifications, cashiers: renderCashiers, colors: renderColors, general: renderGeneral, footer: renderFooterSettings, data: renderData };

/* ===================== Boot ===================== */
(async function init() {
  applyDocDir();
  try { await Store.load({ fresh: true }); } catch (e) { /* firebase config comes from here */ }
  if (!Store.firebase) { document.body.innerHTML = '<div class="fatal"><p>Could not reach the server.</p><button class="btn-primary btn-inline" onclick="location.reload()">Retry</button></div>'; return; }
  try { await StaffAuth.init(); } catch (e) { console.error(e); }
  if (!StaffAuth.user || StaffAuth.role() !== 'admin') { location.replace('/admin/login'); return; }
  try {
    const { config } = await api('/api/admin/config', { token: await StaffAuth.token() });
    if (!config) {
      $('section').innerHTML = card('Welcome! Set up the site', `<p>No restaurant data yet. Start from the bilingual demo and edit it, or restore a backup file.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn-add" id="startDemo">Start from demo</button><label class="btn-sm" style="padding:10px 14px">Restore backup <input type="file" id="startImport" accept="application/json" hidden></label></div>`);
      $('startDemo').addEventListener('click', async () => { const d = await (await fetch('/seed/demo-config.json')).json(); VERSION = 0; d.version = 0; CONFIG = d; await persist('Created'); Store.data = CONFIG; show(); });
      $('startImport').addEventListener('change', async e => { const d = JSON.parse(await e.target.files[0].text()); VERSION = 0; CONFIG = d; await persist('Imported'); Store.data = CONFIG; show(); });
      return;
    }
    CONFIG = config;
    VERSION = Number(config.version) || 0;
    Store.data = CONFIG;
    applyTheme();
    show();
  } catch (e) {
    console.error(e);
    // Never fall back to anything: editing is blocked until the real data loads.
    $('section').innerHTML = card('Could not load the restaurant data', `<p class="form-error">${escapeHtml(e.message)}</p><p class="mini-note">Nothing was changed. Editing is disabled until the data loads, so the restaurant's data can never be overwritten by mistake.</p><button class="btn-add" onclick="location.reload()">Retry</button>`);
  }
})();

$('logoutBtn').addEventListener('click', async () => { await StaffAuth.signOut(); location.href = '/admin/login'; });
