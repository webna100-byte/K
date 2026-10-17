/* ===================== Cashier panel =====================
   Live orders of the cashier's own branch. A new order rings until it is
   accepted or rejected. No delete, no admin access. */
(async function () {
  const $ = id => document.getElementById(id);
  applyDocDir();
  try { await Store.load({ fresh: true }); } catch (e) { /* handled below */ }
  if (!Store.firebase) { showFatal(t('load_error')); return; }
  try { await StaffAuth.init(); } catch (e) { console.error(e); }
  if (StaffAuth.role() !== 'cashier') { location.replace('/cashier/login'); return; }
  const data = Store.data;
  applyTheme();
  const branchId = StaffAuth.claims.branchId;
  const branch = data.branches.find(b => b.id === branchId);
  const tz = data.settings.timezone;
  const dayKey = ms => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } };

  if (data.settings.logo) { $('logo').src = data.settings.logo; $('logo').classList.remove('hidden'); }
  $('branchName').textContent = `${tField(data.settings.restaurantName)} · ${branch ? tField(branch.name) : ''}`;
  $('cashierName').textContent = t('cashier_panel');
  $('logoutBtn').textContent = t('logout');
  $('langBtn').textContent = t('lang_switch_full');
  $('langBtn').addEventListener('click', () => { setLang(getLang() === 'ar' ? 'en' : 'ar'); location.reload(); });
  $('logoutBtn').addEventListener('click', async () => { await StaffAuth.signOut(); location.href = '/cashier/login'; });
  $('shiftNote').textContent = t('start_shift_note');
  $('shiftBtn').querySelector('span').textContent = t('start_shift');
  $('alarm').querySelector('span').textContent = t('new_order_alert');

  /* ---------- Busy mode: pauses new orders for this branch ---------- */
  $('busyLabel').textContent = t('busy');
  $('busyStrip').textContent = t('busy_on');
  function showBusy(on) { $('busyChk').checked = on; $('busyToggle').classList.toggle('on', on); $('busyStrip').classList.toggle('hidden', !on); }
  api('/api/busy?branchId=' + encodeURIComponent(branchId)).then(r => showBusy(!!r.busy)).catch(console.error);
  $('busyChk').addEventListener('change', async () => {
    const want = $('busyChk').checked;
    $('busyChk').disabled = true;
    try {
      const r = await api('/api/busy', { method: 'POST', token: await StaffAuth.token(), body: { busy: want } });
      showBusy(!!r.busy);
      toast(r.busy ? t('busy_on_toast') : t('busy_off_toast'));
    } catch (e) { console.error(e); showBusy(!want); toast(t('action_failed')); }
    $('busyChk').disabled = false;
  });

  /* ---------- Alarm (Web Audio, no sound file needed) ---------- */
  let audio = null, alarmTimer = null, wakeLock = null;
  function beep() {
    if (!audio) return;
    const now = audio.currentTime;
    [[880, 0], [1175, .18], [880, .36], [1175, .54]].forEach(([f, at]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + at);
      g.gain.exponentialRampToValueAtTime(0.35, now + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(now + at); o.stop(now + at + 0.17);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function setAlarm(on) {
    $('alarm').classList.toggle('show', on);
    document.title = on ? `🔔 ${t('new_order_alert')}` : t('cashier_panel');
    if (on && !alarmTimer) { beep(); alarmTimer = setInterval(beep, 1800); }
    if (!on && alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
  }
  async function keepAwake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* not critical */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && audio) { audio.resume(); keepAwake(); } });
  $('shiftBtn').addEventListener('click', () => {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    $('shift').remove();
    keepAwake();
    draw();
  });

  /* ---------- Live data ---------- */
  const orders = new Map();
  const sources = { active: new Map(), today: new Map() };
  let tab = 'new';
  const TABS = [['new', 'tab_new', o => o.status === 'pending'], ['preparing', 'tab_preparing', o => o.status === 'preparing'], ['done', 'tab_done', o => o.status === 'delivered' && o.day === dayKey(Date.now())], ['cancelled', 'tab_cancelled', o => o.status === 'cancelled' && o.day === dayKey(Date.now())]];

  function merge() {
    orders.clear();
    for (const src of Object.values(sources)) for (const [id, o] of src) orders.set(id, o);
    draw();
  }

  function money(n) { return fmtMoney(n); }
  function ago(ms) {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return t('just_now');
    if (m < 60) return t('minutes_ago', { n: m });
    return t('hours_ago', { n: Math.floor(m / 60) });
  }
  function orderCard(o) {
    const line = (l, v) => `<div><span>${l}</span><span>${v}</span></div>`;
    const items = (o.items || []).map(i => `<li><span>${i.qty}× ${tx(i.name)}${tField(i.options) || i.notes ? `<small>${escapeHtml([tField(i.options), i.notes].filter(Boolean).join(' • '))}</small>` : ''}</span><span>${money(i.lineTotal)}</span></li>`).join('')
      + (o.gifts || []).map(g => `<li class="gift-li"><span>🎁 ${g.qty}× ${tx(g.name)}</span><span>${t('free')}</span></li>`).join('');
    let actions = '';
    if (o.status === 'pending') actions = `<button class="act-accept" data-act="preparing" data-id="${o.id}"><i data-lucide="circle-check"></i>${t('accept')}</button><button class="act-reject" data-act="cancelled" data-id="${o.id}"><i data-lucide="circle-x"></i>${t('reject')}</button>`;
    else if (o.status === 'preparing') actions = `<button class="act-deliver" data-act="delivered" data-id="${o.id}"><i data-lucide="check"></i>${t('mark_delivered')}</button><button class="act-reject" data-act="cancelled" data-id="${o.id}">${t('cancel_order')}</button>`;
    return `
      <article class="staff-order ${o.status === 'pending' ? 'is-new' : ''}">
        <div class="so-head"><div><strong>#${o.number}</strong><div class="mini-note">${escapeHtml(ago(o.createdAtMs))} · ${escapeHtml(fmtDate(o.createdAtMs))}</div></div><span class="status-chip s-${o.status}">${t('status_' + o.status)}</span></div>
        <div class="so-meta"><span class="type-${o.type}">${o.type === 'delivery' ? t('type_delivery') : t('type_pickup')}</span>${o.zone ? `<span>${tx(o.zone.name)}</span>` : ''}${o.level ? `<span>${tx(o.level.name)}</span>` : ''}</div>
        <div class="so-customer"><strong>${escapeHtml(o.customer?.name || '')}</strong><a href="tel:${escapeHtml(o.customer?.phone || '')}" dir="ltr">${escapeHtml(o.customer?.phone || '')}</a>${o.address ? `<span>${escapeHtml(o.address)}</span>` : ''}</div>
        ${o.notes ? `<div class="so-notes">${escapeHtml(o.notes)}</div>` : ''}
        <ul class="so-items">${items}</ul>
        <div class="so-totals">
          ${line(t('subtotal'), money(o.subtotal))}
          ${o.invoiceDiscount ? line(t('invoice_discount'), '−' + money(o.invoiceDiscount)) : ''}
          ${o.levelDiscount ? line(t('level_discount', { level: tField(o.level?.name) }), '−' + money(o.levelDiscount)) : ''}
          ${o.type === 'delivery' ? line(t('delivery_fee'), money(o.deliveryFee || 0)) : ''}
          ${o.deliveryDiscount ? line(t('delivery_discount'), '−' + money(o.deliveryDiscount)) : ''}
          ${o.tax ? line(t('tax'), money(o.tax)) : ''}
          <div class="grand"><span>${t('total')}</span><span>${money(o.total)}</span></div>
        </div>
        <div class="so-actions">${actions}<button class="act-print" data-print="${o.id}" title="${t('print')}"><i data-lucide="printer"></i></button></div>
      </article>`;
  }

  function draw() {
    const all = [...orders.values()];
    const pending = all.filter(o => o.status === 'pending');
    setAlarm(!!audio && pending.length > 0);
    $('tabs').innerHTML = TABS.map(([k, label, fn]) => { const n = all.filter(fn).length; return `<button class="${tab === k ? 'active' : ''}" data-tab="${k}">${t(label)}<span class="count ${k === 'new' && n ? 'alert' : ''}">${n}</span></button>`; }).join('');
    $('tabs').querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
    const fn = TABS.find(x => x[0] === tab)[2];
    const list = all.filter(fn).sort((a, b) => tab === 'new' || tab === 'preparing' ? a.createdAtMs - b.createdAtMs : b.createdAtMs - a.createdAtMs);
    $('grid').innerHTML = list.length ? list.map(orderCard).join('') : `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="receipt-text"></i><p>${t('no_orders_here')}</p></div>`;
    $('grid').querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b)));
    $('grid').querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printReceipt(orders.get(b.dataset.print), data)));
    renderIcons();
  }

  async function act(btn) {
    const status = btn.dataset.act, id = btn.dataset.id;
    const o = orders.get(id);
    if (status === 'cancelled' && !confirm(o.status === 'pending' ? t('confirm_reject') : t('confirm_cancel'))) return;
    btn.closest('.so-actions').querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await api('/api/orders/status', { method: 'POST', token: await StaffAuth.token(), body: { orderId: id, status } });
      // Optimistic: stop the ring immediately; the live listener confirms.
      orders.set(id, { ...o, status });
      draw();
      toast(t('status_updated'));
    } catch (e) {
      console.error(e);
      if (e.status === 401) { toast(t('account_disabled')); setTimeout(async () => { await StaffAuth.signOut(); location.href = '/cashier/login'; }, 1500); return; }
      toast(t('action_failed'));
      draw();
    }
  }

  function setConn(ok) { $('conn').classList.toggle('off', !ok); }
  window.addEventListener('offline', () => setConn(false));
  window.addEventListener('online', () => setConn(true));

  const unsubs = {};
  let currentDay = dayKey(Date.now());
  try {
    const { m, db } = await FB.firestore('staff');
    const col = m.collection(db, 'orders');
    const listen = (key, q) => unsubs[key] = m.onSnapshot(q, { includeMetadataChanges: true }, snap => {
      setConn(!snap.metadata.fromCache);
      sources[key] = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
      merge();
    }, err => {
      console.error(err);
      setConn(false);
      if (err.code === 'permission-denied') { toast(t('account_disabled')); setTimeout(async () => { await StaffAuth.signOut(); location.href = '/cashier/login'; }, 2000); }
    });
    listen('active', m.query(col, m.where('branchId', '==', branchId), m.where('status', 'in', ['pending', 'preparing'])));
    const listenToday = () => listen('today', m.query(col, m.where('branchId', '==', branchId), m.where('day', '==', currentDay)));
    listenToday();
    // Day rollover (in the restaurant's time zone): follow the new day.
    setInterval(() => {
      const d = dayKey(Date.now());
      if (d !== currentDay) { currentDay = d; if (unsubs.today) unsubs.today(); sources.today = new Map(); listenToday(); }
    }, 60000);
  } catch (e) {
    console.error(e);
    showFatal(t('load_error'));
  }
  setInterval(draw, 60000); // refresh "x min ago" labels and day rollover
  draw();
  renderIcons();
})();
