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
  $('soundTest').textContent = '🔊 ' + t('test_sound');
  $('soundWarn').textContent = '🔇 ' + t('sound_blocked');

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

  /* ---------- Alarm ----------
     Looping alarm played through the Web Audio API (the loop runs on the
     audio thread, so background-tab timer throttling can't silence it), with
     a looping <audio> element as fallback. Both are unlocked by the tap on
     "Start receiving orders". If the browser still blocks the sound while an
     order is pending, a big tap-to-enable banner is shown. */
  const RATE = 22050;
  function alarmSamples() {
    const n = Math.floor(RATE * 1.6), out = new Float32Array(n);
    const beeps = [[0, 880], [.18, 1175], [.36, 880], [.54, 1175]];
    for (let i = 0; i < n; i++) {
      const tt = i / RATE, b = beeps.find(([at]) => tt >= at && tt < at + .15);
      if (b) { const env = Math.min(1, (tt - b[0]) / .01, (b[0] + .15 - tt) / .01); out[i] = (Math.sin(2 * Math.PI * b[1] * tt) > 0 ? 1 : -1) * .6 * env; }
    }
    return out;
  }
  function alarmWavUrl(samples) {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, samples[i] * 32767, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  let ctx = null, ctxBuffer = null, ctxSource = null, audio = null, ringing = false, started = false, wakeLock = null, testing = false;

  function wantSound() { return ringing || testing; }
  function ctxRunning() { return ctx && ctx.state === 'running'; }
  function startCtx() {
    if (!ctxRunning() || ctxSource) return !!ctxSource;
    ctxSource = ctx.createBufferSource();
    ctxSource.buffer = ctxBuffer; ctxSource.loop = true;
    const g = ctx.createGain(); g.gain.value = 1;
    ctxSource.connect(g).connect(ctx.destination);
    ctxSource.start();
    return true;
  }
  function stopCtx() { if (ctxSource) { try { ctxSource.stop(); } catch (e) { /* already stopped */ } ctxSource = null; } }
  function soundOk() { return !!ctxSource || (audio && !audio.paused); }

  /* Called on every state change and by the watchdog. */
  async function syncSound() {
    if (!started) return;
    if (wantSound()) {
      if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch (e) { /* needs a tap */ } }
      if (!startCtx() && audio && audio.paused) { try { await audio.play(); } catch (e) { console.warn('alarm blocked', e); } }
      else if (ctxSource && audio && !audio.paused) audio.pause();
    } else {
      stopCtx();
      if (audio && !audio.paused) { audio.pause(); audio.currentTime = 0; }
    }
    $('soundWarn').classList.toggle('show', wantSound() && !soundOk());
  }
  function setAlarm(on) {
    $('alarm').classList.toggle('show', on);
    document.title = on ? `🔔 ${t('new_order_alert')}` : t('cashier_panel');
    ringing = on;
    if (on && navigator.vibrate) navigator.vibrate([200, 100, 200]);
    syncSound();
  }
  setInterval(syncSound, 2000);
  async function keepAwake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* not critical */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); syncSound(); } });

  /* Must run inside a tap: unlocks both audio paths for later orders. */
  function unlockAudio() {
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const samples = alarmSamples();
        ctxBuffer = ctx.createBuffer(1, samples.length, RATE);
        ctxBuffer.copyToChannel(samples, 0);
        audio = new Audio(alarmWavUrl(samples));
        audio.loop = true; audio.volume = 1;
        audio.addEventListener('pause', () => { if (wantSound()) setTimeout(syncSound, 300); });
      }
      ctx.resume();
      // A silent blip inside the tap fully unlocks the context on iOS.
      const o = ctx.createBufferSource(); o.buffer = ctx.createBuffer(1, 1, RATE); o.connect(ctx.destination); o.start(0);
      // Same for the <audio> element: start inside the tap, stop right away.
      audio.muted = true; audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; });
    } catch (e) { console.warn('audio unlock', e); }
    started = true;
  }
  $('shiftBtn').addEventListener('click', () => {
    unlockAudio();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    $('shift').remove();
    keepAwake();
    draw();
    setTimeout(syncSound, 400);
  });
  $('soundWarn').addEventListener('click', () => { unlockAudio(); syncSound(); });
  $('soundTest').addEventListener('click', () => {
    unlockAudio();
    testing = true; syncSound();
    toast(t('sound_testing'));
    setTimeout(() => { testing = false; syncSound(); }, 3500);
  });
  const seenPending = new Set();
  let firstSnapshot = true;
  function notifyNew(pending, fromCache) {
    const fresh = pending.filter(o => !seenPending.has(o.id));
    pending.forEach(o => seenPending.add(o.id));
    // Orders already waiting when the screen opens ring, but don't pop a notification.
    if (firstSnapshot) { if (!fromCache) firstSnapshot = false; return; }
    if (!fresh.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(t('new_order_alert'), { body: fresh.map(o => '#' + o.number).join(' · '), tag: 'new-order', renotify: true, requireInteraction: true }); } catch (e) { /* some browsers only allow it from a service worker */ }
  }

  /* ---------- Live data ---------- */
  const orders = new Map();
  const sources = { active: new Map(), recent: new Map() };
  let tab = 'new';
  // Delivered / cancelled orders: today or the last 7 days (to spot a forgotten order).
  const DAY = 86400000;
  const lastDays = n => [...new Set(Array.from({ length: n }, (_, i) => dayKey(Date.now() - i * DAY)))];
  let range = 'today';
  try { if (localStorage.getItem('cashier_range') === 'week') range = 'week'; } catch (e) { /* ignore */ }
  const inRange = o => (range === 'week' ? lastDays(7) : [dayKey(Date.now())]).includes(o.day);
  const TABS = [['new', 'tab_new', o => o.status === 'pending'], ['preparing', 'tab_preparing', o => o.status === 'preparing'], ['done', 'tab_done', o => o.status === 'delivered' && inRange(o)], ['cancelled', 'tab_cancelled', o => o.status === 'cancelled' && inRange(o)]];

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
    setAlarm(pending.length > 0);
    $('tabs').innerHTML = TABS.map(([k, label, fn]) => { const n = all.filter(fn).length; return `<button class="${tab === k ? 'active' : ''}" data-tab="${k}">${t(label)}<span class="count ${k === 'new' && n ? 'alert' : ''}">${n}</span></button>`; }).join('');
    $('tabs').innerHTML += `<span class="range-switch">${['today', 'week'].map(r => `<button class="${range === r ? 'on' : ''}" data-range="${r}">${t('range_' + r)}</button>`).join('')}</span>`;
    $('tabs').querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
    $('tabs').querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => {
      range = b.dataset.range;
      try { localStorage.setItem('cashier_range', range); } catch (e) { /* ignore */ }
      if (tab === 'new' || tab === 'preparing') tab = 'done';
      draw();
    }));
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
      if (key === 'active') notifyNew([...sources.active.values()].filter(o => o.status === 'pending'), snap.metadata.fromCache);
    }, err => {
      console.error(err);
      setConn(false);
      if (err.code === 'permission-denied') { toast(t('account_disabled')); setTimeout(async () => { await StaffAuth.signOut(); location.href = '/cashier/login'; }, 2000); }
    });
    listen('active', m.query(col, m.where('branchId', '==', branchId), m.where('status', 'in', ['pending', 'preparing'])));
    const listenRecent = () => listen('recent', m.query(col, m.where('branchId', '==', branchId), m.where('day', 'in', lastDays(7))));
    listenRecent();
    // Day rollover (in the restaurant's time zone): follow the new 7-day window.
    setInterval(() => {
      const d = dayKey(Date.now());
      if (d !== currentDay) { currentDay = d; if (unsubs.recent) unsubs.recent(); sources.recent = new Map(); listenRecent(); }
    }, 60000);
  } catch (e) {
    console.error(e);
    showFatal(t('load_error'));
  }
  setInterval(draw, 60000); // refresh "x min ago" labels and day rollover
  draw();
  renderIcons();
})();
