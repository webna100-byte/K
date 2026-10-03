/* ===================== Shared UI: header, footer, helpers ===================== */

/* The lucide <script> is loaded with `defer`, so on first page load it can still
   be pending when our own (non-deferred) scripts run. Fall back to DOMContentLoaded
   in that case; after initial load lucide is always available already. */
/* Removes the full-screen loading overlay (white background + logo) that's
   inlined at the top of every page's <body>. Called once the page's real
   content is fully built, so the swap from splash -> real page is instant
   with nothing wrongly-colored ever visible in between. Safe to call even
   if the overlay isn't present. */
function hideSplash() {
  const el = document.getElementById('appSplash');
  if (el) el.remove();
}

function renderIcons() {
  if (window.lucide) {
    lucide.createIcons();
  } else {
    window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); }, { once: true });
  }
}

function fmtPrice(n) {
  n = Number(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtMoney(n) {
  return `${fmtPrice(n)} ${getCurrency().symbol}`;
}

function applyPageColors(pageKey) {
  const colors = Store.get().settings.colors[pageKey];
  if (!colors) return;
  const el = document.body;
  if (colors.type === 'gradient') {
    el.style.setProperty('--page-bg', `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`);
  } else {
    el.style.setProperty('--page-bg', colors.color1);
  }
}

function applySecondaryColor() {
  const colors = Store.get().settings.colors.secondary;
  if (!colors) return;
  const value = colors.type === 'gradient'
    ? `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`
    : colors.color1;
  document.documentElement.style.setProperty('--secondary-bg', value);
  document.documentElement.style.setProperty('--button-bg', value);
}

function applyHeaderColor() {
  const colors = Store.get().settings.colors.header;
  if (!colors) return;
  const value = colors.type === 'gradient'
    ? `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`
    : colors.color1;
  document.documentElement.style.setProperty('--header-bg', value);
}

function renderHeader({ showBack = false, backHref = null, showCart = true } = {}) {
  const settings = Store.get().settings;
  const header = document.getElementById('site-header');
  if (!header) return;
  applySecondaryColor();
  applyHeaderColor();
  const lang = 'en';
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-side header-start">
        ${showBack ? `<button id="backBtn" class="icon-btn back-btn" aria-label="${t('back')}"><i data-lucide="${lang === 'ar' ? 'chevron-right' : 'chevron-left'}"></i></button>` : ''}
      </div>
      <div class="header-logo">
        <a href="index.html">
          ${settings.logo ? `<img src="${settings.logo}" alt="logo">` : `<span class="logo-text">${tField(settings.restaurantName)}</span>`}
        </a>
      </div>
      <div class="header-side header-end">
        ${showCart ? `<a href="cart.html" class="icon-btn cart-btn" aria-label="${t('cart')}">
          <i data-lucide="shopping-cart"></i>
          <span id="cartCount" class="cart-count">${Store.cartCount()}</span>
        </a>` : ''}
      </div>
    </div>
  `;

  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', () => {
    if (backHref) location.href = backHref;
    else history.back();
  });
  renderIcons();
}

function normalizeExternalUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  return 'https://' + raw.replace(/^\/+/, '');
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  const settings = Store.get().settings || {};
  const social = settings.socialLinks || {};
  const contact = [];
  if (settings.phone) contact.push(`<a class="footer-contact-item" href="tel:${escapeHtml(settings.phone)}"><i data-lucide="phone"></i><span>${escapeHtml(settings.phone)}</span></a>`);
  if (settings.footerEmail) contact.push(`<a class="footer-contact-item" href="mailto:${escapeHtml(settings.footerEmail)}"><i data-lucide="mail"></i><span>${escapeHtml(settings.footerEmail)}</span></a>`);
  if (settings.address) contact.push(`<div class="footer-contact-item"><i data-lucide="map-pin"></i><span>${escapeHtml(settings.address)}</span></div>`);
  const socialIcons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9c0-.67.33-1 1-1Z"></path></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M15.5 3c.4 2.1 1.6 3.5 3.5 4.1v3.2c-1.3-.1-2.5-.5-3.5-1.2v6.4a5.5 5.5 0 1 1-4.8-5.45v3.25a2.3 2.3 0 1 0 1.6 2.2V3h3.2Z"></path></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.5 3.9-6.5 3.9Z"></path></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.6h1.73L8.3 4.28H6.44L17.8 19.6Z"></path></svg>'
  };
  const socialMap = [
    ['instagram','instagram'],['facebook','facebook'],['tiktok','tiktok'],['youtube','youtube'],['x','x']
  ];
  const socialHtml = socialMap
    .map(([key, icon]) => [key, icon, normalizeExternalUrl(social[key])])
    .filter(([, , url]) => url)
    .map(([key, icon, url]) => `<a class="footer-social" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${key}">${socialIcons[icon]}</a>`)
    .join('');
  const name = tField(settings.restaurantName) || 'Restaurant';
  const copyrightName = escapeHtml(name);
  footer.innerHTML = `
    <div class="footer-inner">
      ${contact.length || socialHtml ? '<div class="footer-contact-divider"></div>' : ''}
      ${contact.length ? `<div class="footer-contact">${contact.join('')}</div>` : ''}
      ${socialHtml ? `<div class="footer-socials">${socialHtml}</div>` : ''}
      <button id="footerAdminBtn" class="footer-admin-btn"><span class="footer-name">${copyrightName}</span></button>
      <div class="footer-copyright">© 2026 ${copyrightName}. All rights reserved.</div>
    </div>
  `;
  document.getElementById('footerAdminBtn').addEventListener('click', () => { location.href = 'admin/login.html'; });
  renderIcons();
}

function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = Store.cartCount();
}

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* Downscales and re-compresses the image before it's stored, so raw phone
   photos (often several MB each) don't blow past the localStorage quota -
   which on some mobile browsers is as tight as ~5MB shared by everything
   the site stores - and get silently dropped. Re-encodes as JPEG (except
   formats likely to carry transparency, kept as PNG) and, if still too
   large, keeps shrinking quality/dimensions until it fits a safe budget,
   so five uploads reliably fit even on a constrained quota. */
function fileToDataURL(file, maxDim = 900, quality = 0.8) {
  const targetBytes = 220 * 1024; // ~220KB budget per image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const preserveAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';

        function renderAt(dim, q) {
          const scale = Math.min(1, dim / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          return canvas.toDataURL(preserveAlpha ? 'image/png' : 'image/jpeg', q);
        }

        let dim = maxDim;
        let q = quality;
        let result = renderAt(dim, q);
        let attempts = 0;
        while (result.length * 0.75 > targetBytes && attempts < 8) {
          if (!preserveAlpha && q > 0.4) {
            q -= 0.15;
          } else {
            dim = Math.round(dim * 0.75);
          }
          result = renderAt(dim, q);
          attempts++;
        }
        resolve(result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
