/* ===================== Firebase (loaded on demand) =====================
   Firebase JS modules are imported from Google's CDN only when needed, so
   simple pages stay light. Two independent app instances:
     - default: customers (Google sign-in only)
     - 'staff': admin / cashier (custom tokens from our API), so a staff
       login on a shared device never replaces a customer's session.
========================================================================= */
const FB_VERSION = '10.12.2';

const FB = {
  _mods: {},
  load(name) {
    if (!this._mods[name]) this._mods[name] = import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-${name}.js`);
    return this._mods[name];
  },
  webConfig() {
    const c = Store.firebase || {};
    if (!c.apiKey || !c.projectId) throw new Error('firebase_not_configured');
    return { apiKey: c.apiKey, authDomain: c.authDomain, projectId: c.projectId, appId: c.appId, messagingSenderId: c.messagingSenderId };
  },
  async app(name) {
    const { initializeApp, getApps } = await this.load('app');
    const appName = name || '[DEFAULT]';
    return getApps().find(a => a.name === appName) || initializeApp(this.webConfig(), name || undefined);
  },
  _emu: {},
  async auth(name) {
    const m = await this.load('auth');
    const auth = m.getAuth(await this.app(name));
    const emu = (Store.firebase || {}).emulators;
    if (emu && emu.auth && !this._emu['a' + name]) { this._emu['a' + name] = 1; m.connectAuthEmulator(auth, 'http://' + emu.auth, { disableWarnings: true }); }
    return { m, auth };
  },
  async firestore(name) {
    const m = await this.load('firestore');
    const db = m.getFirestore(await this.app(name));
    const emu = (Store.firebase || {}).emulators;
    if (emu && emu.firestore && !this._emu['f' + name]) { this._emu['f' + name] = 1; const [h, p] = emu.firestore.split(':'); m.connectFirestoreEmulator(db, h, Number(p)); }
    return { m, db };
  }
};

async function api(path, { method = 'GET', body, token, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  const res = await fetch(path, { method, headers: h, body: raw ? body : (body !== undefined ? JSON.stringify(body) : undefined) });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  if (!res.ok) {
    const err = new Error(data.error || ('http_' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---------- Customer auth ---------- */
const Auth = {
  user: null,
  resolved: false,
  _listeners: [],
  _readyResolve: null,
  ready: null,

  hint() { try { return localStorage.getItem('auth_hint') === '1'; } catch (e) { return false; } },
  _setHint(v) { try { v ? localStorage.setItem('auth_hint', '1') : localStorage.removeItem('auth_hint'); } catch (e) { /* ignore */ } },

  init() {
    if (this.ready) return this.ready;
    this.ready = new Promise(resolve => { this._readyResolve = resolve; });
    (async () => {
      try {
        const { m, auth } = await FB.auth();
        try { await m.getRedirectResult(auth); } catch (e) { console.warn(e); }
        m.onAuthStateChanged(auth, user => {
          this.user = user;
          this.resolved = true;
          this._setHint(!!user);
          if (!user) Store.clearGiftCart();
          if (this._readyResolve) { this._readyResolve(user); this._readyResolve = null; }
          this._listeners.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } });
        });
      } catch (e) {
        console.error('Auth unavailable', e);
        this.user = null;
        this.resolved = true;
        if (this._readyResolve) { this._readyResolve(null); this._readyResolve = null; }
      }
    })();
    return this.ready;
  },

  onChange(fn) { this._listeners.push(fn); },

  async signIn() {
    const { m, auth } = await FB.auth();
    const provider = new m.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return m.signInWithRedirect(auth, provider);
    try {
      return await m.signInWithPopup(auth, provider);
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
        return m.signInWithRedirect(auth, provider);
      }
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return null;
      throw e;
    }
  },

  async signOut() {
    const { m, auth } = await FB.auth();
    Store.clearGiftCart();
    this._setHint(false);
    await m.signOut(auth);
  },

  async token() {
    await this.init();
    return this.user ? this.user.getIdToken() : null;
  },

  _profile: null,
  async profile(force) {
    if (!this.user) return null;
    if (this._profile && !force && this._profile.uid === this.user.uid) return this._profile;
    this._profile = await api('/api/me', { token: await this.token() });
    return this._profile;
  }
};

/* ---------- Staff auth (admin / cashier) ---------- */
const StaffAuth = {
  user: null,
  claims: null,
  async init() {
    const { m, auth } = await FB.auth('staff');
    await new Promise(resolve => {
      const off = m.onAuthStateChanged(auth, async user => {
        this.user = user;
        this.claims = user ? (await user.getIdTokenResult()).claims : null;
        off();
        resolve();
      });
    });
    return this.user;
  },
  async signInWithToken(customToken) {
    const { m, auth } = await FB.auth('staff');
    const cred = await m.signInWithCustomToken(auth, customToken);
    this.user = cred.user;
    this.claims = (await cred.user.getIdTokenResult(true)).claims;
    return this.user;
  },
  async signOut() {
    const { m, auth } = await FB.auth('staff');
    await m.signOut(auth);
    this.user = null; this.claims = null;
  },
  async token() { return this.user ? this.user.getIdToken() : null; },
  role() { return this.claims && this.claims.role; }
};

/* ---------- Push notifications (FCM) ---------- */
const Push = {
  isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  supported() { return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window; },
  state() {
    if (!this.supported()) return this.isIOS() && !this.isStandalone() ? 'ios_install' : 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission === 'granted' && this._saved()) return 'enabled';
    return 'default';
  },
  _saved() { try { return localStorage.getItem('push_token'); } catch (e) { return null; } },

  async _token() {
    const c = FB.webConfig();
    const vapidKey = (Store.firebase || {}).vapidKey;
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js?cfg=' + encodeURIComponent(JSON.stringify(c)));
    await navigator.serviceWorker.ready;
    const m = await FB.load('messaging');
    if (!(await m.isSupported())) throw new Error('unsupported');
    return m.getToken(m.getMessaging(await FB.app()), { vapidKey, serviceWorkerRegistration: reg });
  },

  async _register(token) {
    let prev = null, prevUid = null;
    try { prev = localStorage.getItem('push_lang'); prevUid = localStorage.getItem('push_uid'); } catch (e) { /* ignore */ }
    await api('/api/push/register', { method: 'POST', token: Auth.user ? await Auth.token() : null, body: { token, lang: getLang(), previousLang: prev } });
    try {
      localStorage.setItem('push_token', token);
      localStorage.setItem('push_lang', getLang());
      localStorage.setItem('push_uid', Auth.user ? Auth.user.uid : '');
    } catch (e) { /* ignore */ }
    return prevUid;
  },

  async enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'default';
    await this._register(await this._token());
    return 'enabled';
  },

  /* Quietly keeps the subscription in sync when the language changes or the
     visitor signs in (so order-status pushes reach them). */
  async sync() {
    try {
      if (this.state() !== 'enabled') return;
      const lang = localStorage.getItem('push_lang');
      const pUid = localStorage.getItem('push_uid') || '';
      const nowUid = Auth.user ? Auth.user.uid : '';
      if (lang === getLang() && (pUid === nowUid || !nowUid)) return;
      await this._register(await this._token());
    } catch (e) { console.warn('push sync', e); }
  }
};
