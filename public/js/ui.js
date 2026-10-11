/* ===================== Shared UI ===================== */

function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const tx = (field) => escapeHtml(tField(field));

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f1f2f4"/><path d="M170 170l30-36 22 26 16-18 32 28z" fill="#d5d8dd"/><circle cx="180" cy="120" r="12" fill="#d5d8dd"/></svg>'
);

function hideSplash() { const el = document.getElementById('appSplash'); if (el) el.remove(); }

function renderIcons() {
  if (window.lucide) lucide.createIcons();
  else window.addEventListener('load', () => { if (window.lucide) lucide.createIcons(); }, { once: true });
}

function decimals() { return Pricing.currencyDecimals((Store.data && Store.data.settings.currency) || 'USD'); }

function fmtPrice(n) {
  const dec = decimals();
  n = Pricing.round(n, dec);
  return Number.isInteger(n) ? String(n) : n.toFixed(dec);
}

function fmtMoney(n) {
  const c = getCurrency();
  const sym = getLang() === 'ar' ? c.symbol : c.symbolEn;
  return getLang() === 'ar' ? `${fmtPrice(n)} ${sym}` : `${sym} ${fmtPrice(n)}`.replace(/^(\$|€|£|₪|₺|₹|C\$|A\$) /, '$1');
}

function fmtDate(ms) {
  try {
    return new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: (Store.data && Store.data.settings.timezone) || undefined }).format(new Date(ms));
  } catch (e) { return new Date(ms).toLocaleString(); }
}

function fmtNumber(n) { return new Intl.NumberFormat('en-US').format(n); }

function colorValue(c) {
  if (!c) return '';
  return c.type === 'gradient' ? `linear-gradient(${c.angle || 135}deg, ${c.color1}, ${c.color2})` : c.color1;
}

function applyTheme(pageKey) {
  const colors = (Store.data && Store.data.settings.colors) || {};
  const root = document.documentElement.style;
  if (colors.secondary) {
    root.setProperty('--secondary-bg', colorValue(colors.secondary));
    root.setProperty('--button-bg', colorValue(colors.secondary));
    root.setProperty('--accent', colors.secondary.color1);
    root.setProperty('--accent-2', colors.secondary.type === 'gradient' ? colors.secondary.color2 : colors.secondary.color1);
  }
  if (colors.header) root.setProperty('--header-bg', colorValue(colors.header));
  if (pageKey && colors[pageKey]) document.body.style.setProperty('--page-bg', colorValue(colors[pageKey]));
}

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  const n = Store.cartCount();
  el.textContent = n;
  el.classList.toggle('hidden', !n);
}

function loginUrl(next) {
  return '/login?next=' + encodeURIComponent(next || (location.pathname + location.search));
}

/* ---------- Header ---------- */
function renderHeader() {
  const s = Store.data.settings;
  const header = document.getElementById('site-header');
  if (!header) return;
  const logo = s.logo ? `<img src="${escapeHtml(s.logo)}" alt="${tx(s.restaurantName)}">` : `<span class="logo-text">${tx(s.restaurantName)}</span>`;
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-side header-start">
        <button class="icon-btn" id="menuBtn" aria-label="${t('menu')}" aria-expanded="false"><i data-lucide="menu"></i></button>
      </div>
      <a class="header-logo" href="/">${logo}</a>
      <div class="header-side header-end">
        <button class="lang-toggle" id="langBtn" aria-label="${t('lang_switch_full')}">${t('lang_switch')}</button>
        <a href="/cart" class="icon-btn cart-btn" aria-label="${t('cart')}"><i data-lucide="shopping-bag"></i><span id="cartCount" class="cart-count"></span></a>
      </div>
    </div>`;
  document.getElementById('langBtn').addEventListener('click', () => {
    setLang(getLang() === 'ar' ? 'en' : 'ar');
    location.reload();
  });
  document.getElementById('menuBtn').addEventListener('click', openDrawer);
  updateCartCount();
}

/* ---------- Hamburger drawer: sign in/out, privacy, returns ---------- */
function renderDrawer() {
  let el = document.getElementById('drawer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'drawer';
    el.className = 'drawer';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closeDrawer(); });
  }
  const s = Store.data.settings;
  const signedIn = Auth.resolved ? !!Auth.user : Auth.hint();
  const user = Auth.user;
  el.innerHTML = `
    <aside class="drawer-panel" role="dialog" aria-label="${t('menu')}">
      <div class="drawer-head">
        ${s.logo ? `<img src="${escapeHtml(s.logo)}" alt="">` : ''}
        <div>
          <strong>${tx(s.restaurantName)}</strong>
          ${user ? `<span>${escapeHtml(user.displayName || user.email || '')}</span>` : ''}
        </div>
        <button class="icon-btn drawer-close" id="drawerClose" aria-label="${t('close')}"><i data-lucide="x"></i></button>
      </div>
      <nav class="drawer-links">
        ${signedIn
          ? `<button class="drawer-link" id="drawerLogout"><i data-lucide="log-out"></i><span>${t('menu_logout')}</span></button>`
          : `<a class="drawer-link" href="${loginUrl('/')}"><i data-lucide="log-in"></i><span>${t('menu_login')}</span></a>`}
        <a class="drawer-link" href="/privacy"><i data-lucide="shield-check"></i><span>${tField(Store.data.pages?.privacy?.title) || t('menu_privacy')}</span></a>
        <a class="drawer-link" href="/returns"><i data-lucide="refresh-ccw"></i><span>${tField(Store.data.pages?.returns?.title) || t('menu_returns')}</span></a>
      </nav>
    </aside>`;
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  const out = document.getElementById('drawerLogout');
  if (out) out.addEventListener('click', async () => {
    if (!confirm(t('logout_confirm'))) return;
    await Auth.signOut();
    toast(t('logged_out'));
    setTimeout(() => location.reload(), 500);
  });
  renderIcons();
}

function openDrawer() {
  renderDrawer();
  const el = document.getElementById('drawer');
  requestAnimationFrame(() => el.classList.add('open'));
  el.setAttribute('aria-hidden', 'false');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
}

function closeDrawer() {
  const el = document.getElementById('drawer');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  const b = document.getElementById('menuBtn');
  if (b) b.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
}

/* ---------- Bottom navigation (5 tabs, home in the middle) ---------- */
function unreadNotifications() {
  let seen = 0;
  try { seen = Number(localStorage.getItem('notif_seen') || 0); } catch (e) { /* ignore */ }
  return (Store.notifications || []).filter(n => n.at > seen).length;
}

function renderBottomNav(active) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const items = [
    ['levels', '/levels', 'award', 'nav_levels'],
    ['gifts', '/gifts', 'gift', 'nav_gifts'],
    ['home', '/', 'house', 'nav_home'],
    ['notifications', '/notifications', 'bell', 'nav_notifications'],
    ['orders', '/orders', 'receipt-text', 'nav_orders']
  ];
  const unread = unreadNotifications();
  nav.className = 'bottom-nav';
  nav.innerHTML = items.map(([key, href, icon, label]) => `
    <a href="${href}" class="bn-item ${key === 'home' ? 'bn-home' : ''} ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>
      <span class="bn-icon"><i data-lucide="${icon}"></i>${key === 'notifications' && unread ? `<span class="bn-dot">${unread > 9 ? '9+' : unread}</span>` : ''}</span>
      <span class="bn-label">${t(label)}</span>
    </a>`).join('');
}

/* ---------- Footer ---------- */
function normalizeExternalUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  return 'https://' + raw.replace(/^\/+/, '');
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  const s = Store.data.settings || {};
  const social = s.socialLinks || {};
  const contact = [];
  if (s.phone) contact.push(`<a class="footer-contact-item" href="tel:${escapeHtml(s.phone)}"><i data-lucide="phone"></i><span dir="ltr">${escapeHtml(s.phone)}</span></a>`);
  if (s.footerEmail) contact.push(`<a class="footer-contact-item" href="mailto:${escapeHtml(s.footerEmail)}"><i data-lucide="mail"></i><span>${escapeHtml(s.footerEmail)}</span></a>`);
  if (tField(s.address)) contact.push(`<div class="footer-contact-item"><i data-lucide="map-pin"></i><span>${tx(s.address)}</span></div>`);
  const icons = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9c0-.67.33-1 1-1Z"></path></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 3c.4 2.1 1.6 3.5 3.5 4.1v3.2c-1.3-.1-2.5-.5-3.5-1.2v6.4a5.5 5.5 0 1 1-4.8-5.45v3.25a2.3 2.3 0 1 0 1.6 2.2V3h3.2Z"></path></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.5 3.9-6.5 3.9Z"></path></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.6h1.73L8.3 4.28H6.44L17.8 19.6Z"></path></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c3 0 5.2 2.3 5.2 5.3v2.4c.5.2 1.1.1 1.6-.1.6-.2 1.2.5.7 1-.6.6-1.7.9-2.4 1.2.6 1.9 2 3.2 3.9 3.8.5.1.5.8 0 1-1 .4-2 .4-2.4.9-.2.4-.1 1-.6 1.1-.8.1-1.7-.4-3 .2-1 .4-1.8 1.4-3 1.4s-2-1-3-1.4c-1.3-.6-2.2-.1-3-.2-.5-.1-.4-.7-.6-1.1-.4-.5-1.4-.5-2.4-.9-.5-.2-.5-.9 0-1 1.9-.6 3.3-1.9 3.9-3.8-.7-.3-1.8-.6-2.4-1.2-.5-.5.1-1.2.7-1 .5.2 1.1.3 1.6.1V7.8c0-3 2.2-5.3 5.2-5.3Z"/></svg>'
  };
  const socialHtml = ['instagram', 'snapchat', 'tiktok', 'facebook', 'x', 'youtube']
    .map(k => [k, normalizeExternalUrl(social[k])]).filter(([, u]) => u)
    .map(([k, u]) => `<a class="footer-social" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" aria-label="${k}">${icons[k]}</a>`).join('');
  const name = tx(s.restaurantName);
  footer.innerHTML = `
    <div class="footer-inner">
      ${contact.length ? `<div class="footer-contact">${contact.join('')}</div>` : ''}
      ${socialHtml ? `<div class="footer-socials">${socialHtml}</div>` : ''}
      <div class="footer-links"><a href="/privacy">${tField(Store.data.pages?.privacy?.title) || t('menu_privacy')}</a><span>·</span><a href="/returns">${tField(Store.data.pages?.returns?.title) || t('menu_returns')}</a></div>
      <div class="footer-copyright">© ${new Date().getFullYear()} ${name}. ${t('all_rights')}</div>
    </div>`;
}

/* ---------- Page hero (16:9 image right under the header) ---------- */
function pageConfig(key) { return (Store.data.pages && Store.data.pages[key]) || {}; }

function heroHtml(page, { title, text } = {}) {
  const img = page.image ? `style="background-image:url('${escapeHtml(page.image)}')"` : '';
  return `
    <section class="page-hero ${page.image ? '' : 'no-image'}" ${img}><div class="page-hero-shade"></div></section>
    <div class="page-intro">
      <h1>${escapeHtml(title ?? tField(page.title))}</h1>
      ${(text ?? tField(page.text)) ? `<p>${escapeHtml(text ?? tField(page.text))}</p>` : ''}
    </div>`;
}

function googleButtonHtml(label, id = 'googleBtn') {
  return `<button class="btn-google" id="${id}" type="button">
    <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
    <span>${escapeHtml(label)}</span></button>`;
}

async function doGoogleSignIn(btn, next) {
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    const cred = await Auth.signIn();
    if (cred && cred.user) {
      toast(t('logged_in'));
      location.href = next || '/';
      return;
    }
  } catch (e) {
    console.error(e);
    toast(t('sign_in_failed'));
  }
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
}

/* Locked state for Levels / Gifts / My Orders when signed out. */
function lockedHtml(page) {
  return `
    ${heroHtml(page)}
    <div class="locked-card">
      <span class="locked-icon"><i data-lucide="lock-keyhole"></i></span>
      <p>${tx(page.lockedText)}</p>
      <a class="btn-primary btn-inline" href="${loginUrl()}">${tx(page.button) || t('menu_login')}</a>
    </div>`;
}

/* ---------- Boot: every public page goes through here ---------- */
function showFatal(message, retry = true) {
  const splash = document.getElementById('appSplash');
  const html = `<div class="fatal"><p>${escapeHtml(message)}</p>${retry ? `<button class="btn-primary btn-inline" onclick="location.reload()">${t('retry')}</button>` : ''}</div>`;
  if (splash) splash.innerHTML = html; else document.body.innerHTML = html;
}

async function boot(pageKey, render, { colors, needsAuth = false } = {}) {
  try {
    await Store.load({ fresh: pageKey === 'checkout' });
  } catch (e) {
    console.error(e);
    applyDocDir();
    showFatal(t('load_error'));
    return;
  }
  applyDocDir();
  if (!Store.data) { showFatal(t('site_setup'), false); return; }
  applyTheme(colors);
  const s = Store.data.settings;
  document.title = tField(s.restaurantName);
  const touch = document.querySelector('link[rel="apple-touch-icon"]');
  if (s.logo && !touch) { const l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = s.logo; document.head.appendChild(l); }
  renderHeader();
  renderFooter();
  renderBottomNav(pageKey);
  const authReady = Auth.init();
  Auth.onChange(() => { renderDrawerIfOpen(); });
  try {
    if (needsAuth) await authReady;
    await render(Store.data);
  } catch (e) {
    console.error(e);
  }
  renderIcons();
  hideSplash();
  authReady.then(() => Push.sync());
}

function renderDrawerIfOpen() {
  const el = document.getElementById('drawer');
  if (el && el.classList.contains('open')) renderDrawer();
}

/* ---------- Image helpers (admin) ---------- */
function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') { resolve(file); return; }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const tryType = (type, q) => new Promise(r => canvas.toBlob(b => r(b), type, q));
        (async () => {
          let blob = await tryType('image/webp', quality);
          if (!blob || blob.type !== 'image/webp') blob = await tryType(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
          let q = quality;
          while (blob && blob.size > 600 * 1024 && q > 0.45) { q -= 0.12; blob = await tryType(blob.type, q); }
          resolve(blob);
        })();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
