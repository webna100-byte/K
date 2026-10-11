/* ===================== Home ===================== */
boot('home', async (d) => {
  const s = d.settings;
  const hp = s.homepage || {};
  const hero = hp.hero || {}, serve = hp.categories || {}, fav = hp.featured || {}, cta = hp.cta || {};
  const setText = (id, v) => { const el = document.getElementById(id); el.textContent = v; el.classList.toggle('hidden', !v); };

  setText('heroEyebrow', tField(hero.eyebrow));
  document.getElementById('heroTitle').textContent = tField(hero.title) || tField(s.restaurantName);
  setText('heroText', tField(hero.text));
  if (hero.image) document.getElementById('homeHero').style.setProperty('--hero-image', `url("${hero.image}")`);
  setText('serveEyebrow', tField(serve.eyebrow));
  setText('serveTitle', tField(serve.title));
  setText('favoritesEyebrow', tField(fav.eyebrow));
  setText('favoritesTitle', tField(fav.title));
  setText('ctaEyebrow', tField(cta.eyebrow));
  setText('ctaTitle', tField(cta.title));

  const target = Store.isMultiBranch() && !Store.getSelectedBranch() ? '/branches' : '/menu';
  const heroBtn = document.getElementById('heroBtn');
  heroBtn.textContent = tField(hero.button) || t('go_to_menu');
  heroBtn.href = target;
  const bottom = document.getElementById('bottomOrder');
  bottom.textContent = tField(cta.button) || t('go_to_menu');
  bottom.href = target;

  const allCats = sortByOrder(d.categories);
  const cats = Array.isArray(serve.selectedIds) ? serve.selectedIds.map(id => allCats.find(c => c.id === id)).filter(Boolean) : allCats;
  document.getElementById('homeCategories').innerHTML = cats.map(c =>
    `<a class="home-category" href="${target}${target === '/menu' ? '#cat-' + c.id : ''}"><img src="${escapeHtml(c.image || PLACEHOLDER_IMG)}" alt="" loading="lazy"><strong>${tx(c.name)}</strong></a>`).join('');
  document.getElementById('homeCatsSection').classList.toggle('hidden', !cats.length);

  const allProducts = sortByOrder(d.products);
  const products = Array.isArray(fav.selectedIds) ? fav.selectedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) : allProducts.slice(0, 4);
  document.getElementById('featuredProducts').innerHTML = products.map(p => `
    <a class="product-card" href="${target}">
      <div class="product-image-wrap"><img src="${escapeHtml(p.image || PLACEHOLDER_IMG)}" alt="" loading="lazy"></div>
      <div class="product-info"><h3>${tx(p.name)}</h3><p>${tx(p.description)}</p>
        <div class="product-price"><span>${fmtMoney(Pricing.productBasePrice(p, decimals()))}</span></div>
        <span class="product-add-btn">${tx(fav.button) || t('go_to_menu')}</span>
      </div>
    </a>`).join('');
  document.getElementById('homeFavSection').classList.toggle('hidden', !products.length);

  /* Sign-in card (signed out) or points summary (signed in). */
  const box = document.getElementById('homeAccount');
  const login = hp.login || {};
  const loyaltyOn = d.loyalty && d.loyalty.enabled !== false;
  function renderSignedOut() {
    box.innerHTML = `
      <div class="account-card">
        <div class="account-text">
          <h2>${tx(login.title) || t('menu_login')}</h2>
          ${tField(login.text) ? `<p>${tx(login.text)}</p>` : ''}
        </div>
        ${googleButtonHtml(tField(login.button) || t('menu_login'), 'homeGoogleBtn')}
      </div>`;
    document.getElementById('homeGoogleBtn').addEventListener('click', e => doGoogleSignIn(e.currentTarget, '/'));
  }
  async function renderSignedIn(user) {
    const first = (user.displayName || '').split(' ')[0];
    box.innerHTML = `<div class="account-card signed-in"><div class="account-text"><h2>${escapeHtml(t('hello', { name: first }))}</h2><p class="mini-note">${t('loading')}</p></div></div>`;
    if (!loyaltyOn) { box.querySelector('.mini-note').remove(); return; }
    try {
      const me = await Auth.profile();
      const level = Pricing.levelFor(d.loyalty, me.lifetimePoints);
      box.innerHTML = `
        <div class="account-card signed-in">
          <div class="account-text">
            <h2>${escapeHtml(t('hello', { name: first }))}</h2>
            <p>${level ? `${tx(level.name)} · ${escapeHtml(t('permanent_discount', { p: level.discountPercent }))}` : t('no_level_yet')}</p>
          </div>
          <div class="account-stats">
            <a href="/gifts" class="stat"><strong>${fmtNumber(me.points)}</strong><span>${t('available_points')}</span></a>
            <a href="/levels" class="stat"><strong>${level ? tx(level.name) : '—'}</strong><span>${t('current_level')}</span></a>
          </div>
        </div>`;
    } catch (e) { console.error(e); }
  }
  if (Auth.hint()) box.innerHTML = '<div class="account-card skeleton"></div>'; else renderSignedOut();
  Auth.ready.then(user => { user ? renderSignedIn(user) : renderSignedOut(); renderIcons(); });
}, { colors: 'homepage' });
