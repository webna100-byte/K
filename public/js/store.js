/* ===================== Data Layer =====================
   The restaurant config comes from /api/site (Cloudflare KV, edge cached).
   The last good copy is kept in localStorage so the site opens instantly
   and still works on a flaky connection. There is NO built-in demo data:
   if nothing can be loaded the page shows a retry screen instead of ever
   displaying another restaurant's name or menu.
========================================================= */

function uid(prefix) {
  return (prefix ? prefix + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CURRENCIES = [
  { code: 'KWD', symbol: 'د.ك', symbolEn: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'SAR', symbol: 'ر.س', symbolEn: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', symbolEn: 'AED', name: 'UAE Dirham' },
  { code: 'QAR', symbol: 'ر.ق', symbolEn: 'QAR', name: 'Qatari Riyal' },
  { code: 'BHD', symbol: 'د.ب', symbolEn: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع', symbolEn: 'OMR', name: 'Omani Rial' },
  { code: 'JOD', symbol: 'د.أ', symbolEn: 'JOD', name: 'Jordanian Dinar' },
  { code: 'EGP', symbol: 'ج.م', symbolEn: 'EGP', name: 'Egyptian Pound' },
  { code: 'ILS', symbol: '₪', symbolEn: '₪', name: 'Israeli Shekel' },
  { code: 'MAD', symbol: 'د.م', symbolEn: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TRY', symbol: '₺', symbolEn: '₺', name: 'Turkish Lira' },
  { code: 'USD', symbol: '$', symbolEn: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', symbolEn: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', symbolEn: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', symbolEn: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', symbolEn: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', symbolEn: '₹', name: 'Indian Rupee' }
];

function getCurrency() {
  const code = (Store.data && Store.data.settings.currency) || 'USD';
  return CURRENCIES.find(c => c.code === code) || CURRENCIES.find(c => c.code === 'USD');
}

function sortByOrder(list) {
  return [...(list || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

const CACHE_KEY = 'site_cache_v2';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
}
function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    if (payload.config && payload.config.settings) localStorage.setItem('site_logo', payload.config.settings.logo || '');
  } catch (e) { /* quota or blocked storage: the site still works */ }
}

async function fetchSite(timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/site', { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('site ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const Store = {
  data: null,           // restaurant config
  notifications: [],
  firebase: null,       // public Firebase web config

  _apply(payload) {
    this.data = payload.config;
    this.notifications = payload.notifications || [];
    this.firebase = payload.firebase || null;
  },

  get() { return this.data; },

  /* Network first (fresh prices), cached copy if the network is slow or
     down, retry screen only when neither exists. */
  async load({ fresh = false } = {}) {
    const cached = readCache();
    const timeout = cached && !fresh ? 2500 : 12000;
    for (let attempt = 0; ; attempt++) {
      try {
        const payload = await fetchSite(timeout);
        writeCache(payload);
        this._apply(payload);
        return this.data;
      } catch (e) {
        if (cached && cached.config && !fresh) {
          this._apply(cached);
          // keep refreshing quietly so the next page view is current
          fetchSite(15000).then(writeCache).catch(() => {});
          return this.data;
        }
        if (attempt >= 1) throw e;
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  },

  // ---- Cart (per branch, survives reloads) ----
  _cartKey() { return 'cart_' + (this.getSelectedBranch() || 'default'); },
  getCart() {
    try { return JSON.parse(localStorage.getItem(this._cartKey()) || '[]'); } catch (e) { return []; }
  },
  saveCart(cart) {
    try { localStorage.setItem(this._cartKey(), JSON.stringify(cart)); } catch (e) { /* ignore */ }
  },
  cartCount() {
    return this.getCart().reduce((s, i) => s + i.qty, 0) + this.getGiftCart().reduce((s, g) => s + g.qty, 0);
  },

  /* ---- Gift cart: sessionStorage on purpose. It disappears when the
     browsing session ends, and nothing is deducted until the server
     accepts the order, so abandoned gifts never cost or "freeze" points. */
  getGiftCart() {
    try { return JSON.parse(sessionStorage.getItem('gift_cart') || '[]'); } catch (e) { return []; }
  },
  saveGiftCart(list) {
    try { sessionStorage.setItem('gift_cart', JSON.stringify(list.filter(g => g.qty > 0))); } catch (e) { /* ignore */ }
  },
  clearGiftCart() {
    try { sessionStorage.removeItem('gift_cart'); } catch (e) { /* ignore */ }
  },
  giftCartPoints() {
    const loyalty = (this.data && this.data.loyalty) || {};
    return this.getGiftCart().reduce((s, g) => {
      const found = Pricing.findGift(loyalty, g.giftId);
      return s + (found ? (Number(found.tier.points) || 0) * g.qty : 0);
    }, 0);
  },

  // ---- Selected branch ----
  getSelectedBranch() {
    try {
      const id = localStorage.getItem('selected_branch');
      if (id && this.data && !this.data.branches.some(b => b.id === id)) return null;
      return id;
    } catch (e) { return null; }
  },
  setSelectedBranch(id) {
    try { localStorage.setItem('selected_branch', id); } catch (e) { /* ignore */ }
  },
  /* For single-branch restaurants the branch is implicit. */
  ensureBranch() {
    const d = this.data;
    if (!d || !d.branches.length) return null;
    const multi = d.settings.multiBranch && d.branches.length > 1;
    if (!multi && !this.getSelectedBranch()) this.setSelectedBranch(d.branches[0].id);
    return this.getSelectedBranch();
  },
  isMultiBranch() {
    const d = this.data;
    return !!(d && d.settings.multiBranch && d.branches.length > 1);
  }
};
