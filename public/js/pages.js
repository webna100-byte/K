/* ===================== Member & content pages =====================
   login · levels · gifts · orders · notifications · privacy · returns
   Every text and background image here is editable from Admin > Pages. */
const PAGE = document.body.dataset.page;
const NAV_KEY = { levels: 'levels', gifts: 'gifts', orders: 'orders', notifications: 'notifications' }[PAGE] || '';

const Pages = {
  /* ---------- Sign in ---------- */
  async login(main, data) {
    const page = pageConfig('login');
    const next = new URLSearchParams(location.search).get('next') || '/';
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
    const user = await Auth.ready;
    if (user) { location.replace(safeNext); return; }
    main.innerHTML = `
      ${heroHtml(page)}
      <div class="locked-card login-card">
        ${googleButtonHtml(tField(page.button) || t('menu_login'))}
        <p class="mini-note"><a href="/privacy">${tField(pageConfig('privacy').title) || t('menu_privacy')}</a></p>
      </div>`;
    document.getElementById('googleBtn').addEventListener('click', e => doGoogleSignIn(e.currentTarget, safeNext));
  },

  /* ---------- Levels ---------- */
  async levels(main, data) {
    const page = pageConfig('levels');
    const user = await Auth.ready;
    if (!user) { main.innerHTML = lockedHtml(page); return; }
    main.innerHTML = heroHtml(page) + `<div class="member-body"><div class="card skeleton tall"></div></div>`;
    const me = await Auth.profile();
    const levels = Pricing.sortedLevels(data.loyalty);
    const lifetime = Number(me.lifetimePoints) || 0;
    const current = Pricing.levelFor(data.loyalty, lifetime);
    const next = levels.find(l => lifetime < (Number(l.points) || 0));
    const prevPoints = current ? Number(current.points) || 0 : 0;
    const overall = next ? Math.min(100, Math.round(((lifetime - prevPoints) / Math.max(1, (Number(next.points) || 0) - prevPoints)) * 100)) : 100;

    const cards = levels.map(l => {
      const need = Number(l.points) || 0;
      const reached = lifetime >= need;
      const isCurrent = current && current.id === l.id;
      const pct = need ? Math.min(100, Math.round(lifetime / need * 100)) : 100;
      const state = isCurrent ? 'current' : reached ? 'achieved' : 'locked';
      const chip = isCurrent ? `<span class="chip chip-accent"><i data-lucide="star"></i>${t('level_current')}</span>`
        : reached ? `<span class="chip chip-ok"><i data-lucide="check"></i>${t('level_achieved')}</span>`
        : `<span class="chip chip-muted"><i data-lucide="lock"></i>${t('level_locked')}</span>`;
      return `
        <article class="level-card is-${state}">
          <div class="level-media"><img src="${escapeHtml(l.image || PLACEHOLDER_IMG)}" alt="" loading="lazy">${chip}</div>
          <div class="level-body">
            <div class="level-title-row"><h3>${tx(l.name)}</h3><span class="level-discount">${escapeHtml(t('permanent_discount', { p: Number(l.discountPercent) || 0 }))}</span></div>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
            <div class="level-meta"><span>${fmtNumber(Math.min(lifetime, need))} / ${fmtNumber(need)} ${t('pts')}</span><span>${reached ? '' : escapeHtml(t('points_needed', { n: fmtNumber(need - lifetime) }))}</span></div>
          </div>
        </article>`;
    }).join('');

    main.querySelector('.member-body').innerHTML = `
      <div class="summary-card">
        <div class="summary-top">
          <div><span class="summary-label">${t('current_level')}</span><strong class="summary-value">${current ? tx(current.name) : t('no_level_yet')}</strong></div>
          <div class="summary-points"><strong>${fmtNumber(lifetime)}</strong><span>${t('lifetime_points')}</span></div>
        </div>
        <div class="progress progress-lg"><span style="width:${overall}%"></span></div>
        <p class="summary-hint">${next ? escapeHtml(t('next_level', { n: fmtNumber((Number(next.points) || 0) - lifetime), level: tField(next.name) })) : t('max_level')}</p>
      </div>
      <div class="levels-list">${cards}</div>`;
  },

  /* ---------- Gifts ---------- */
  async gifts(main, data) {
    const page = pageConfig('gifts');
    const user = await Auth.ready;
    if (!user) { main.innerHTML = lockedHtml(page); return; }
    main.innerHTML = heroHtml(page) + `<div class="member-body"><div class="card skeleton tall"></div></div>`;
    const me = await Auth.profile(true);
    const tiers = [...((data.loyalty && data.loyalty.tiers) || [])].sort((a, b) => (Number(a.points) || 0) - (Number(b.points) || 0));
    const body = main.querySelector('.member-body');

    function render() {
      const cart = Store.getGiftCart();
      const reserved = Store.giftCartPoints();
      const available = Math.max(0, (Number(me.points) || 0) - reserved);
      body.innerHTML = `
        <div class="summary-card points-bar">
          <div class="summary-top">
            <div><span class="summary-label">${t('available_points')}</span><strong class="summary-value">${fmtNumber(available)} <small>${t('pts')}</small></strong></div>
            ${reserved ? `<a class="chip chip-accent" href="/cart"><i data-lucide="shopping-bag"></i>${t('in_cart')}: ${fmtNumber(reserved)}</a>` : ''}
          </div>
          ${reserved ? `<p class="summary-hint">${t('reserved_note')}</p>` : ''}
        </div>
        ${tiers.map(tier => `
          <section class="tier">
            <div class="tier-head"><h2>${escapeHtml(t('tier_title', { n: fmtNumber(tier.points) }))}</h2>${available >= tier.points ? '' : `<span class="chip chip-muted"><i data-lucide="lock"></i>${escapeHtml(t('need_more_points', { n: fmtNumber(tier.points - available) }))}</span>`}</div>
            <div class="gift-grid">
              ${(tier.gifts || []).map(g => {
                const inCart = (cart.find(c => c.giftId === g.id) || {}).qty || 0;
                const can = available >= (Number(tier.points) || 0);
                return `
                <article class="gift-card ${can ? '' : 'is-locked'}">
                  <div class="gift-media"><img src="${escapeHtml(g.image || PLACEHOLDER_IMG)}" alt="" loading="lazy">${inCart ? `<span class="gift-count">×${inCart}</span>` : ''}</div>
                  <div class="gift-body">
                    <h3>${tx(g.name)}</h3>
                    <span class="gift-points">${fmtNumber(tier.points)} ${t('pts')}</span>
                    <div class="gift-actions">
                      ${inCart ? `<button class="qty-btn" data-minus="${escapeHtml(g.id)}" aria-label="-">−</button>` : ''}
                      <button class="btn-gift" data-add="${escapeHtml(g.id)}" ${can ? '' : 'disabled'}>${inCart ? '+' : t('add_gift')}</button>
                    </div>
                  </div>
                </article>`;
              }).join('')}
            </div>
          </section>`).join('')}`;
      body.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.add;
        const found = Pricing.findGift(data.loyalty, id);
        if (!found) return;
        if (Store.giftCartPoints() + Number(found.tier.points) > (Number(me.points) || 0)) { toast(t('insufficient_points')); return; }
        const list = Store.getGiftCart();
        const item = list.find(g => g.giftId === id);
        if (item) item.qty = Math.min(20, item.qty + 1); else list.push({ giftId: id, qty: 1 });
        Store.saveGiftCart(list);
        updateCartCount();
        toast(t('gift_added'));
        render();
      }));
      body.querySelectorAll('[data-minus]').forEach(b => b.addEventListener('click', () => {
        const list = Store.getGiftCart();
        const item = list.find(g => g.giftId === b.dataset.minus);
        if (item) item.qty -= 1;
        Store.saveGiftCart(list);
        updateCartCount();
        render();
      }));
      renderIcons();
    }
    render();
  },

  /* ---------- My orders (live) ---------- */
  async orders(main, data) {
    const page = pageConfig('orders');
    const user = await Auth.ready;
    if (!user) { main.innerHTML = lockedHtml(page); return; }
    main.innerHTML = heroHtml(page) + `<div class="member-body" id="ordersList"><div class="card skeleton tall"></div></div>`;
    const listEl = document.getElementById('ordersList');
    const steps = ['pending', 'preparing', 'delivered'];
    const fmtOrderMoney = (n) => fmtMoney(n);

    function card(o) {
      const cancelled = o.status === 'cancelled';
      const idx = steps.indexOf(o.status);
      const items = (o.items || []).map(i => `${i.qty}× ${tField(i.name)}`).concat((o.gifts || []).map(g => `🎁 ${g.qty}× ${tField(g.name)}`));
      let pointsLine = '';
      if (o.pointsEarned) pointsLine = o.pointsAwarded ? t('points_done', { n: fmtNumber(o.pointsEarned) }) : (!cancelled ? t('points_pending', { n: fmtNumber(o.pointsEarned) }) : '');
      const giftLine = o.giftPoints ? (o.giftRefunded ? t('gift_points_refunded', { n: fmtNumber(o.giftPoints) }) : t('gift_points_used', { n: fmtNumber(o.giftPoints) })) : '';
      return `
        <article class="order-card status-${o.status}">
          <header class="order-head">
            <div><strong>${escapeHtml(t('order_number', { n: o.number }))}</strong><span class="mini-note">${escapeHtml(fmtDate(o.createdAtMs))} · ${o.type === 'delivery' ? t('type_delivery') : t('type_pickup')} · ${tx(o.branchName)}</span></div>
            <span class="status-chip s-${o.status}">${t('status_' + o.status)}</span>
          </header>
          ${cancelled ? '' : `
          <ol class="steps">
            ${steps.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><span class="dot">${i < idx || (i === idx && s === 'delivered') ? '<i data-lucide="check"></i>' : ''}</span><span>${t('status_' + s)}</span></li>`).join('')}
          </ol>`}
          <p class="order-items">${escapeHtml(items.join('، '))}</p>
          <footer class="order-foot">
            <div class="order-points">${pointsLine ? `<span class="${o.pointsAwarded ? 'ok' : ''}"><i data-lucide="sparkles"></i> ${escapeHtml(pointsLine)}</span>` : ''}${giftLine ? `<span><i data-lucide="gift"></i> ${escapeHtml(giftLine)}</span>` : ''}</div>
            <strong>${fmtOrderMoney(o.total)}</strong>
          </footer>
        </article>`;
    }

    try {
      const { m, db } = await FB.firestore();
      const q = m.query(m.collection(db, 'orders'), m.where('uid', '==', user.uid), m.limit(30));
      m.onSnapshot(q, snap => {
        const orders = snap.docs.map(d => d.data()).sort((a, b) => b.createdAtMs - a.createdAtMs);
        listEl.innerHTML = orders.length ? orders.map(card).join('') : `<div class="empty-state"><i data-lucide="receipt-text"></i><p>${tx(page.emptyText) || t('no_orders_here')}</p><a class="btn-primary btn-inline" href="/menu">${t('go_to_menu')}</a></div>`;
        renderIcons();
      }, err => {
        console.error(err);
        listEl.innerHTML = `<div class="empty-state"><p>${t('load_error')}</p></div>`;
      });
    } catch (e) {
      console.error(e);
      listEl.innerHTML = `<div class="empty-state"><p>${t('load_error')}</p></div>`;
    }
  },

  /* ---------- Notifications ---------- */
  async notifications(main, data) {
    const page = pageConfig('notifications');
    const list = Store.notifications || [];
    try { localStorage.setItem('notif_seen', String(Date.now())); } catch (e) { /* ignore */ }
    main.innerHTML = heroHtml(page) + `
      <div class="member-body">
        <div class="push-card" id="pushCard"></div>
        <div class="notif-list">
          ${list.length ? list.map(n => `
            <article class="notif-item">
              ${n.image ? `<img src="${escapeHtml(n.image)}" alt="" loading="lazy">` : `<span class="notif-icon"><i data-lucide="bell"></i></span>`}
              <div>
                <h3>${tx(n.title)}</h3>
                ${tField(n.body) ? `<p>${tx(n.body)}</p>` : ''}
                <span class="mini-note">${escapeHtml(fmtDate(n.at))}</span>
                ${n.link ? `<a class="notif-link" href="${escapeHtml(n.link)}">${t('open')}</a>` : ''}
              </div>
            </article>`).join('') : `<div class="empty-state"><i data-lucide="bell-off"></i><p>${tx(page.emptyText) || ''}</p></div>`}
        </div>
      </div>`;
    renderBottomNav('notifications');
    const pushCard = document.getElementById('pushCard');
    function renderPush() {
      const state = Push.state();
      if (state === 'enabled') {
        pushCard.innerHTML = `<p class="push-ok"><i data-lucide="bell-ring"></i> ${t('push_enabled')}</p>`;
      } else if (state === 'ios_install') {
        pushCard.innerHTML = `<div class="push-ios"><strong><i data-lucide="smartphone"></i> ${t('push_ios_title')}</strong><p>${t('push_ios_steps')}</p></div>`;
      } else if (state === 'unsupported') {
        pushCard.innerHTML = `<p class="mini-note">${t('push_unsupported')}</p>`;
      } else if (state === 'blocked') {
        pushCard.innerHTML = `<p class="mini-note">${t('push_blocked')}</p>`;
      } else {
        pushCard.innerHTML = `<button class="btn-primary" id="enablePush"><i data-lucide="bell-plus"></i> ${tx(page.button) || t('enable_push')}</button>`;
        document.getElementById('enablePush').addEventListener('click', async e => {
          const btn = e.currentTarget;
          btn.disabled = true; btn.classList.add('loading');
          try { await Auth.ready; await Push.enable(); } catch (err) { console.error(err); toast(t('push_failed')); }
          renderPush();
        });
      }
      renderIcons();
    }
    renderPush();
  },

  /* ---------- Policies ---------- */
  content(main, key) {
    const page = pageConfig(key);
    const paragraphs = tField(page.text).split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
    main.innerHTML = `
      <section class="page-hero ${page.image ? '' : 'no-image'}" ${page.image ? `style="background-image:url('${escapeHtml(page.image)}')"` : ''}><div class="page-hero-shade"></div></section>
      <article class="policy card">
        <h1>${tx(page.title)}</h1>
        ${paragraphs}
      </article>`;
  },
  privacy(main) { this.content(main, 'privacy'); },
  returns(main) { this.content(main, 'returns'); }
};

boot(NAV_KEY, async (data) => {
  const main = document.getElementById('main');
  const page = pageConfig(PAGE);
  if (tField(page.title)) document.title = `${tField(page.title)} · ${tField(data.settings.restaurantName)}`;
  await Pages[PAGE](main, data);
});
