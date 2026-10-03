/* ===================== Data Layer =====================
   Single source of truth for all menu data. No traditional database:
   the data lives as a plain JSON file (data.json) committed to the site's
   GitHub repo and served statically, so it's shared across every device.
   The admin panel's cart and "which branch did the visitor pick" state
   stay in localStorage, since those are naturally per-device/per-visitor.
========================================================= */

function uid(prefix) {
  return (prefix ? prefix + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: { en: 'US Dollar' } },
  { code: 'CAD', symbol: 'C$', name: { en: 'Canadian Dollar' } },
  { code: 'AUD', symbol: 'A$', name: { en: 'Australian Dollar' } },
  { code: 'GBP', symbol: '£', name: { en: 'British Pound' } },
  { code: 'EUR', symbol: '€', name: { en: 'Euro' } },
  { code: 'CHF', symbol: 'CHF', name: { en: 'Swiss Franc' } },
  { code: 'TRY', symbol: '₺', name: { en: 'Turkish Lira' } },
  { code: 'INR', symbol: '₹', name: { en: 'Indian Rupee' } },
  { code: 'AED', symbol: 'AED', name: { en: 'UAE Dirham' } },
  { code: 'SAR', symbol: 'SAR', name: { en: 'Saudi Riyal' } },
  { code: 'QAR', symbol: 'QAR', name: { en: 'Qatari Riyal' } },
  { code: 'KWD', symbol: 'KWD', name: { en: 'Kuwaiti Dinar' } },
  { code: 'JOD', symbol: 'JOD', name: { en: 'Jordanian Dinar' } },
  { code: 'ILS', symbol: '₪', name: { en: 'Israeli Shekel' } },
  { code: 'EGP', symbol: 'EGP', name: { en: 'Egyptian Pound' } },
  { code: 'MAD', symbol: 'MAD', name: { en: 'Moroccan Dirham' } },
  { code: 'ZAR', symbol: 'R', name: { en: 'South African Rand' } },
  { code: 'MXN', symbol: 'MX$', name: { en: 'Mexican Peso' } },
  { code: 'BRL', symbol: 'R$', name: { en: 'Brazilian Real' } },
  { code: 'SGD', symbol: 'S$', name: { en: 'Singapore Dollar' } },
  { code: 'NZD', symbol: 'NZ$', name: { en: 'New Zealand Dollar' } },
  { code: 'JPY', symbol: '¥', name: { en: 'Japanese Yen' } }
];

function getCurrency() {
  const code = Store.get().settings.currency || 'USD';
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

function sortByOrder(list) {
  return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/* A "single choice - different prices" group (e.g. Size) makes each option
   an absolute price rather than an add-on: when present, the first option
   (in its own order) IS the product's price, and the top-level price field
   is unused. rawBasePrice()/productBasePrice() resolve that for every
   place in the app that shows or calculates a product's price. */
function pricingGroup(product) {
  return (product.optionGroups || []).find(g => g.type === 'single_price' && g.options && g.options.length);
}

function rawBasePrice(product) {
  const pg = pricingGroup(product);
  if (pg) return Number(pg.options[0].priceDelta) || 0;
  return product.price;
}

/* "Single choice - different prices" options used to be add-ons layered on
   top of the product's price; they are now absolute prices in their own
   right (see pricingGroup()). This folds the old base price into each such
   option so already-configured products keep charging the same totals. */
function absorbPricingGroupBase(products) {
  products.forEach(p => {
    const pg = (p.optionGroups || []).find(g => g.type === 'single_price' && g.options && g.options.length);
    if (pg) {
      const base = Number(p.price) || 0;
      pg.options.forEach(o => { o.priceDelta = (Number(o.priceDelta) || 0) + base; });
    }
  });
}

function productBasePrice(product) {
  const base = rawBasePrice(product);
  if (product.discountPercent > 0) {
    return Math.floor(base * (1 - product.discountPercent / 100));
  }
  return base;
}

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e9ecef"/><text x="50%" y="50%" font-size="20" fill="#adb5bd" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">No Image</text></svg>'
);

function defaultData() {
  const img = (bg, emoji) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" font-size="72" fill="#fff" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`);
  const logo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" rx="60" fill="#1f2937"/><text x="50%" y="54%" font-size="88" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="Arial">UT</text></svg>');
  const burger=img('#f4a261','🍔'), pizza=img('#e76f51','🍕'), drinks=img('#2a9d8f','🥤'), dessert=img('#e9c46a','🍰'), salad=img('#6a994e','🥗'), branch=img('#264653','📍');
  const slider1='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="100%" height="100%" fill="#1f2937"/><text x="50%" y="50%" font-size="72" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="Arial">Welcome</text></svg>');
  const slider2='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="100%" height="100%" fill="#e76f51"/><text x="50%" y="50%" font-size="72" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="Arial">Fresh &amp; Tasty</text></svg>');
  const categories=[{id:'cat_burgers',name:{ar:'',en:'Burgers'},image:burger,branchIds:[],order:0},{id:'cat_pizza',name:{ar:'',en:'Pizza'},image:pizza,branchIds:[],order:1},{id:'cat_drinks',name:{ar:'',en:'Drinks'},image:drinks,branchIds:[],order:2},{id:'cat_desserts',name:{ar:'',en:'Desserts'},image:dessert,branchIds:[],order:3},{id:'cat_salads',name:{ar:'',en:'Salads'},image:salad,branchIds:[],order:4}];
  const mk=(id,cid,name,description,price,image,order)=>({id,categoryId:cid,image,price,discountPercent:0,branchIds:[],order,name:{ar:'',en:name},description:{ar:'',en:description},optionGroups:[]});
  const products=[mk('prod_burger','cat_burgers','Classic Burger','Grilled beef patty, lettuce, tomato and house sauce',9.5,burger,0),mk('prod_chicken','cat_burgers','Crispy Chicken Burger','Crispy chicken, lettuce, pickles and signature sauce',10.5,burger,1),mk('prod_double','cat_burgers','Double Cheese Burger','Two beef patties with cheddar and house sauce',12.5,burger,2),mk('prod_margherita','cat_pizza','Margherita Pizza','Tomato sauce, mozzarella and fresh basil',11,pizza,3),mk('prod_pepperoni','cat_pizza','Pepperoni Pizza','Mozzarella, tomato sauce and pepperoni',13,pizza,4),mk('prod_veggie','cat_pizza','Garden Veggie Pizza','Fresh vegetables, mozzarella and tomato sauce',12.5,pizza,5),mk('prod_cola','cat_drinks','Cola','Chilled soft drink',2.5,drinks,6),mk('prod_lemonade','cat_drinks','Fresh Lemonade','Freshly squeezed lemonade',4,drinks,7),mk('prod_water','cat_drinks','Bottled Water','Cold bottled water',1.5,drinks,8),mk('prod_cheesecake','cat_desserts','Cheesecake','Creamy cheesecake with a buttery crust',6,dessert,9),mk('prod_brownie','cat_desserts','Chocolate Brownie','Warm chocolate brownie',5.5,dessert,10),mk('prod_salad','cat_salads','House Salad','Crisp greens, tomato, cucumber and house dressing',7.5,salad,11)];
  return {schemaVersion:6,settings:{lang:'en',restaurantName:{ar:'',en:'Urban Table'},logo,restaurantEmail:'',minimumOrder:15,freeDeliveryThreshold:30,taxRate:0,currency:'USD',multiBranch:true,phone:'',footerEmail:'',address:'',socialLinks:{facebook:'',instagram:'',tiktok:'',x:'',youtube:''},homepage:{hero:{eyebrow:'Fresh. Fast. Made for you.',title:'Urban Table',text:'Order your favorites online for pickup or delivery.',button:'View Menu'},categories:{eyebrow:'What we serve',title:'Made to crave',selectedIds:categories.map(c=>c.id)},featured:{eyebrow:'Customer favorites',title:'Popular picks',button:'Order Now',selectedIds:products.slice(0,4).map(p=>p.id)},cta:{eyebrow:'Hungry?',title:'Your next favorite meal is one click away.',button:'Start Your Order'}},slider:{images:[slider1,slider2],intervalSeconds:4},colors:{branches:{type:'solid',color1:'#ffffff',color2:'#ffffff',angle:135},menu:{type:'solid',color1:'#ffffff',color2:'#ffffff',angle:135},checkout:{type:'solid',color1:'#ffffff',color2:'#ffffff',angle:135},secondary:{type:'gradient',color1:'#8f0000',color2:'#ff4d4d',angle:135},header:{type:'solid',color1:'#ffffff',color2:'#ffffff',angle:135}}},branches:[{id:'branch_main',name:{ar:'',en:'Main Location'},image:branch,pickupEnabled:true,deliveryEnabled:true,deliveryZones:[{id:'zone_branch_main_standard',name:{ar:'',en:'Standard Delivery'},price:4.5},{id:'zone_branch_main_extended',name:{ar:'',en:'Extended Area'},price:7.5}]},{id:'branch_downtown',name:{ar:'',en:'Downtown Location'},image:branch,pickupEnabled:true,deliveryEnabled:true,deliveryZones:[{id:'zone_branch_downtown_standard',name:{ar:'',en:'Standard Delivery'},price:4.5},{id:'zone_branch_downtown_extended',name:{ar:'',en:'Extended Area'},price:7.5}]}],categories,products};
}

function migrateData(data) {
  const colors = data.settings.colors;
  if (!colors.secondary) {
    colors.secondary = { type: 'gradient', color1: '#8f0000', color2: '#ff4d4d', angle: 135 };
  }
  if (!colors.header) {
    colors.header = { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 135 };
  }
  // Current product defaults: white page backgrounds and a red gradient for buttons.
  ['branches','menu','checkout'].forEach(key => {
    if (!colors[key] || (colors[key].color1 === '#f4a261' || colors[key].color1 === '#264653' || colors[key].color1 === '#e76f51')) {
      colors[key] = { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 135 };
    }
  });
  if (!colors.secondary || colors.secondary.color1 === '#1f2937' || colors.secondary.color1 === '#37474f') {
    colors.secondary = { type: 'gradient', color1: '#8f0000', color2: '#ff4d4d', angle: 135 };
  }
  if (!data.settings.currency) data.settings.currency = 'USD';
  if (typeof data.settings.minimumOrder !== 'number') data.settings.minimumOrder = 15;
  if (typeof data.settings.freeDeliveryThreshold !== 'number') data.settings.freeDeliveryThreshold = 30;
  if (typeof data.settings.taxRate !== 'number') data.settings.taxRate = 0;
  if (typeof data.settings.restaurantEmail !== 'string') data.settings.restaurantEmail = '';
  if (typeof data.settings.phone !== 'string') data.settings.phone = '';
  if (typeof data.settings.footerEmail !== 'string') data.settings.footerEmail = '';
  if (typeof data.settings.address !== 'string') data.settings.address = '';
  if (!data.settings.socialLinks || typeof data.settings.socialLinks !== 'object') data.settings.socialLinks = {facebook:'',instagram:'',tiktok:'',x:'',youtube:''};
  if (!data.settings.homepage || typeof data.settings.homepage !== 'object') data.settings.homepage = {};
  const hp = data.settings.homepage;
  if (!hp.hero || typeof hp.hero !== 'object') hp.hero = {};
  if (!hp.categories || typeof hp.categories !== 'object') hp.categories = {};
  if (!hp.featured || typeof hp.featured !== 'object') hp.featured = {};
  if (!hp.cta || typeof hp.cta !== 'object') hp.cta = {};
  const defaults = defaultData().settings.homepage;
  ['hero','categories','featured','cta'].forEach(section => Object.keys(defaults[section]).forEach(k => {
    if (k === 'selectedIds') {
      if (!Array.isArray(hp[section][k])) hp[section][k] = defaults[section][k].slice();
    } else if (typeof hp[section][k] !== 'string') hp[section][k] = defaults[section][k];
  }));
  data.settings.lang = 'en';
  const legacyZones = Array.isArray(data.settings.deliveryZones) ? data.settings.deliveryZones : [];
  delete data.settings.deliveryZones;
  delete data.settings.deliveryFee;
  data.branches.forEach(b => {
    if (typeof b.pickupEnabled !== 'boolean' && typeof b.deliveryEnabled !== 'boolean') { b.pickupEnabled = true; b.deliveryEnabled = true; }
    else { if (typeof b.pickupEnabled !== 'boolean') b.pickupEnabled = true; if (typeof b.deliveryEnabled !== 'boolean') b.deliveryEnabled = true; }
    delete b.whatsappNumber;
    if (b.deliveryEnabled === false) {
      delete b.deliveryZones;
    } else if (!Array.isArray(b.deliveryZones)) {
      b.deliveryZones = legacyZones.map((z, i) => ({ ...z, id: `${b.id}_zone_${i + 1}` }));
    }
  });
  data.categories.forEach((c, i) => {
    if (!Array.isArray(c.branchIds)) c.branchIds = [];
    if (typeof c.order !== 'number') c.order = i;
  });
  data.products.forEach((p, i) => {
    if (!Array.isArray(p.branchIds)) p.branchIds = [];
    if (typeof p.discountPercent !== 'number') p.discountPercent = 0;
    if (typeof p.order !== 'number') p.order = i;
  });
  return data;
}

const Store = {
  _cache: null,

  /* Data now lives in a shared /data.json file (committed to GitHub, served
     statically by Vercel) instead of localStorage, so every device/browser
     sees the same menu. Every page must `await Store.ready` before calling
     Store.get() for the first time. */
  load() {
    return this._cache || (this._cache = defaultData());
  },

  save() {
    // Optimistic: keep working on the in-memory cache immediately, and
    // push the update to the server in the background.
    this._syncToServer();
  },

  _syncToServer() {
    const secret = this.getAdminSecret();
    fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(this._cache)
    }).then(res => {
      if (!res.ok) {
        window.dispatchEvent(new CustomEvent('qrresto:sync-error', {
          detail: res.status === 401 ? 'session_expired' : 'sync_failed'
        }));
      }
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('qrresto:sync-error', { detail: 'sync_failed' }));
    });
  },

  get() {
    return this.load();
  },

  reset() {
    this._cache = defaultData();
    this.save();
    return this._cache;
  },

  // ---- Cart (kept separate for simplicity, scoped per branch so switching
  //      branches never mixes carts together) ----
  _cartKey() {
    return 'qrresto_cart_' + (this.getSelectedBranch() || 'default');
  },
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this._cartKey()) || '[]');
    } catch (e) { return []; }
  },
  saveCart(cart) {
    localStorage.setItem(this._cartKey(), JSON.stringify(cart));
  },
  cartCount() {
    return this.getCart().reduce((sum, item) => sum + item.qty, 0);
  },

  // ---- Selected branch ----
  getSelectedBranch() {
    return localStorage.getItem('qrresto_branch') || null;
  },
  setSelectedBranch(id) {
    localStorage.setItem('qrresto_branch', id);
  },

  // ---- Admin session ----
  // A single secret (set on the server as the ADMIN_SECRET env var) replaces
  // the old username/password pair, which used to be stored inside the
  // public data file — that would have exposed the login to anyone who
  // opened /data.json directly.
  isAdminLoggedIn() {
    return !!sessionStorage.getItem('qrresto_admin_secret');
  },
  getAdminSecret() {
    return sessionStorage.getItem('qrresto_admin_secret') || '';
  },
  setAdminSecret(secret) {
    sessionStorage.setItem('qrresto_admin_secret', secret);
  },
  logout() {
    sessionStorage.removeItem('qrresto_admin_secret');
  }
};

/* Fetch the shared menu data once per page load. Every page's script must
   `await Store.ready` before the first Store.get() call. */
Store.ready = (async () => {
  try {
    const res = await fetch('/data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('data.json fetch failed: ' + res.status);
    Store._cache = migrateData(await res.json());
  } catch (e) {
    console.error('Falling back to built-in default data:', e);
    Store._cache = defaultData();
  }
})();
