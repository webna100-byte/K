/* ===================== Checkout ===================== */
boot('checkout', async (data) => {
  const user = Auth.user;
  if (!user) { location.replace(loginUrl('/checkout')); return; }
  if (Store.isMultiBranch() && !Store.getSelectedBranch()) { location.replace('/branches'); return; }
  const branchId = Store.ensureBranch();
  const branch = data.branches.find(b => b.id === branchId);
  const cart = Store.getCart();
  const gifts = Store.getGiftCart();
  if (!branch || (!cart.length && !gifts.length)) { location.replace('/cart'); return; }

  const pickupOn = branch.pickupEnabled !== false;
  const deliveryOn = branch.deliveryEnabled !== false;
  const zones = Array.isArray(branch.deliveryZones) ? branch.deliveryZones : [];
  let orderType = pickupOn ? 'pickup' : 'delivery';
  let me = { name: user.displayName || '', phone: '', address: '', lifetimePoints: 0, points: 0 };
  try { me = { ...me, ...(await Auth.profile(true)) }; } catch (e) { console.error(e); }

  document.getElementById('pageTitle').textContent = t('checkout');
  const root = document.getElementById('checkoutRoot');
  root.innerHTML = `
    ${Store.isMultiBranch() ? `<div class="menu-branch-bar"><span><i data-lucide="map-pin"></i> ${tx(branch.name)}</span><a href="/branches">${t('change_branch')}</a></div>` : ''}
    <div class="order-type-tabs ${pickupOn && deliveryOn ? '' : 'hidden'}">
      <button type="button" class="order-type-btn" id="pickupTab"><i data-lucide="shopping-bag"></i><span>${t('pickup')}</span></button>
      <button type="button" class="order-type-btn" id="deliveryTab"><i data-lucide="bike"></i><span>${t('delivery')}</span></button>
    </div>
    ${pickupOn && deliveryOn ? '' : `<p class="mini-note notice">${pickupOn ? t('only_pickup') : t('only_delivery')}</p>`}
    <div class="busy-banner hidden" id="busyBanner"><i data-lucide="clock"></i><span>${t('restaurant_busy')}</span></div>
    <form id="checkoutForm" novalidate>
      <div class="card">
        <h3 id="infoTitle"></h3>
        <div class="form-group"><label for="custName">${t('name')} <span class="req">*</span></label><input type="text" id="custName" maxlength="60" autocomplete="name" value="${escapeHtml(me.name)}" required></div>
        <div class="form-group"><label for="custPhone">${t('phone')} <span class="req">*</span></label><input type="tel" id="custPhone" dir="ltr" maxlength="20" autocomplete="tel" inputmode="tel" value="${escapeHtml(me.phone)}" required></div>
        <div class="form-group delivery-only"><label for="custZone">${t('zone')} <span class="req">*</span></label>
          <select id="custZone">${zones.length ? `<option value="">${t('select_zone')}</option>` + zones.map(z => `<option value="${escapeHtml(z.id)}">${tx(z.name)} — ${fmtMoney(z.price)}</option>`).join('') : `<option value="">${t('no_zones')}</option>`}</select>
        </div>
        <div class="form-group delivery-only"><label for="custAddress">${t('address')} <span class="req">*</span></label><textarea id="custAddress" class="notes-field" maxlength="300" autocomplete="street-address">${escapeHtml(me.address)}</textarea></div>
        <div class="form-group"><label for="custNotes">${t('order_notes')}</label><textarea id="custNotes" class="notes-field" maxlength="500"></textarea></div>
      </div>
      <div class="card">
        <h3>${t('order_summary')}</h3>
        <div id="orderSummary"></div>
      </div>
      <p class="form-error hidden" id="formError"></p>
      <button type="submit" class="btn-primary" id="sendBtn"><i data-lucide="send"></i> <span>${t('place_order')}</span></button>
    </form>`;

  const zoneSelect = document.getElementById('custZone');
  const pickupTab = document.getElementById('pickupTab');
  const deliveryTab = document.getElementById('deliveryTab');
  pickupTab.addEventListener('click', () => setType('pickup'));
  deliveryTab.addEventListener('click', () => setType('delivery'));
  zoneSelect.addEventListener('change', renderSummary);

  function setType(type) {
    if (type === 'pickup' && !pickupOn) type = 'delivery';
    if (type === 'delivery' && !deliveryOn) type = 'pickup';
    orderType = type;
    pickupTab.classList.toggle('active', type === 'pickup');
    deliveryTab.classList.toggle('active', type === 'delivery');
    root.querySelectorAll('.delivery-only').forEach(el => el.classList.toggle('hidden', type !== 'delivery'));
    document.getElementById('infoTitle').textContent = type === 'pickup' ? t('pickup_info') : t('delivery_info');
    renderSummary();
  }

  function input() {
    return {
      branchId: branch.id,
      type: orderType,
      zoneId: zoneSelect.value,
      items: Store.getCart().map(i => ({ productId: i.productId, qty: i.qty, selections: i.selections, notes: i.notes })),
      gifts: Store.getGiftCart().map(g => ({ giftId: g.giftId, qty: g.qty }))
    };
  }

  function errorText(code, extra = {}) {
    if (code === 'below_minimum') return t('below_minimum', { amount: fmtMoney(extra.minimum || data.settings.minimumOrder || 0) });
    if (code === 'empty_cart') return t('empty_cart_err');
    const map = { zone_required: 'zone_required', no_zones: 'no_zones', product_unavailable: 'product_unavailable', invalid_option: 'invalid_option', invalid_gift: 'invalid_gift', insufficient_points: 'insufficient_points', restaurant_busy: 'restaurant_busy', phone_invalid: 'phone_invalid', address_required: 'address_required', name_required: 'name_required', login_required: 'login_required_to_order' };
    return map[code] ? t(map[code]) : t('order_failed');
  }

  let quote = null;
  function renderSummary() {
    const box = document.getElementById('orderSummary');
    let q, error = null;
    const probe = { ...input() };
    // Show totals even before a zone is picked.
    if (orderType === 'delivery' && !probe.zoneId && zones.length) probe.zoneId = zones[0].id;
    try { q = Pricing.computeOrder(data, probe, { lifetimePoints: me.lifetimePoints }); } catch (e) { error = e; }
    if (!q) {
      try { q = Pricing.computeOrder(data, { ...probe, type: 'pickup' }, { lifetimePoints: me.lifetimePoints }); } catch (e2) { q = null; }
    }
    quote = q;
    if (!q) { box.innerHTML = `<p class="form-error">${escapeHtml(errorText(error && error.code, error))}</p>`; return; }
    const line = (label, value, cls = '') => `<div class="checkout-line ${cls}"><span>${escapeHtml(label)}</span><span>${value}</span></div>`;
    let html = q.lines.map(l => `
      <div class="summary-item"><div><strong>${l.qty}× ${tx(l.name)}</strong>${l.options[getLang()] || l.notes ? `<div class="mini-note">${escapeHtml([l.options[getLang()], l.notes].filter(Boolean).join(' • '))}</div>` : ''}</div><span>${fmtMoney(l.lineTotal)}</span></div>`).join('');
    html += q.gifts.map(g => `
      <div class="summary-item gift"><div><strong>${g.qty}× ${tx(g.name)}</strong><div class="mini-note"><i data-lucide="gift"></i> ${fmtNumber(g.points)} ${t('pts')}</div></div><span>${t('free')}</span></div>`).join('');
    html += line(t('subtotal'), fmtMoney(q.subtotal));
    if (q.invoiceDiscount) html += line(t('invoice_discount'), '−' + fmtMoney(q.invoiceDiscount), 'discount');
    if (q.levelDiscount) html += line(t('level_discount', { level: tField(q.level.name) }) + ` (${q.level.discountPercent}%)`, '−' + fmtMoney(q.levelDiscount), 'discount');
    if (orderType === 'delivery' && q.type === 'delivery') {
      html += line(t('delivery_fee'), q.deliveryFee ? fmtMoney(q.deliveryFee) : t('free'));
      if (q.deliveryDiscount) html += line(t('delivery_discount'), '−' + fmtMoney(q.deliveryDiscount), 'discount');
    }
    if (q.tax) html += line(t('tax'), fmtMoney(q.tax));
    html += `<div class="checkout-total"><span>${t('total')}</span><span>${fmtMoney(q.total)}</span></div>`;
    if (q.pointsEarned) html += `<p class="points-note"><i data-lucide="sparkles"></i> ${escapeHtml(t('points_to_earn', { n: fmtNumber(q.pointsEarned) }))}</p>`;
    if (error) html = `<p class="form-error">${escapeHtml(errorText(error.code, error))}</p>` + html;
    box.innerHTML = html;
    renderIcons();
  }

  setType(orderType);

  /* "Busy" mode set by the branch cashier: no new orders until it is off. */
  let busy = false;
  async function checkBusy() {
    try { busy = !!(await api('/api/busy?branchId=' + encodeURIComponent(branch.id))).busy; } catch (e) { return; }
    const banner = document.getElementById('busyBanner'), btn = document.getElementById('sendBtn');
    if (!banner || !btn) return;
    banner.classList.toggle('hidden', !busy);
    btn.disabled = busy;
    if (busy) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  checkBusy();
  const busyTimer = setInterval(() => { if (document.getElementById('busyBanner')) checkBusy(); else clearInterval(busyTimer); }, 30000);

  const form = document.getElementById('checkoutForm');
  const errBox = document.getElementById('formError');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.classList.add('hidden');
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const notes = document.getElementById('custNotes').value.trim();
    const showErr = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); errBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    if (busy) return showErr(t('restaurant_busy'));
    if (!name) return showErr(t('name_required'));
    if (!/^\+?[0-9\s-]{6,20}$/.test(phone)) return showErr(t('phone_invalid'));
    if (orderType === 'delivery') {
      if (!zoneSelect.value) return showErr(t('zone_required'));
      if (address.length < 3) return showErr(t('address_required'));
    }
    try { Pricing.computeOrder(data, input(), { lifetimePoints: me.lifetimePoints }); } catch (err) { return showErr(errorText(err.code, err)); }
    const giftCost = Store.giftCartPoints();
    if (giftCost > (Number(me.points) || 0)) return showErr(t('insufficient_points'));

    const btn = document.getElementById('sendBtn');
    btn.disabled = true; btn.classList.add('loading');
    try {
      const res = await api('/api/orders/create', {
        method: 'POST',
        token: await Auth.token(),
        body: { ...input(), customer: { name, phone, address, notes }, lang: getLang() }
      });
      Store.saveCart([]);
      Store.clearGiftCart();
      Auth._profile = null;
      updateCartCount();
      document.getElementById('pageTitle').classList.add('hidden');
      root.innerHTML = `
        <div class="success-card">
          <span class="success-icon"><i data-lucide="check"></i></span>
          <h2>${t('order_sent_title')}</h2>
          <p>${escapeHtml(t('order_sent_text', { n: res.number }))}</p>
          ${res.pointsEarned ? `<p class="points-note"><i data-lucide="sparkles"></i> ${escapeHtml(t('points_to_earn', { n: fmtNumber(res.pointsEarned) }))}</p>` : ''}
          <a class="btn-primary btn-inline" href="/orders">${t('view_my_orders')}</a>
        </div>`;
      renderIcons();
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error(err);
      btn.disabled = false; btn.classList.remove('loading');
      if (err.status === 401) { location.href = loginUrl('/checkout'); return; }
      showErr(errorText(err.message, err.data || {}));
      if (err.message === 'restaurant_busy') checkBusy();
      if (err.message === 'insufficient_points') { Auth._profile = null; }
    }
  });
}, { colors: 'checkout', needsAuth: true });
