/* PWA manifest built from the restaurant's own name/logo/colors, so
   "Add to Home Screen" (needed for iPhone push notifications) shows the
   client's brand without editing any file. */
import { loadConfig } from './_lib/http.js';

export async function onRequestGet({ env }) {
  let config = null;
  try { config = await loadConfig(env); } catch (e) { /* fall through */ }
  const s = (config && config.settings) || {};
  const lang = s.defaultLang === 'en' ? 'en' : 'ar';
  const name = (s.restaurantName && (s.restaurantName[lang] || s.restaurantName.en || s.restaurantName.ar)) || 'Restaurant';
  const icon = s.logo || '';
  const color = (s.colors && s.colors.secondary && s.colors.secondary.color1) || '#b30000';
  const manifest = {
    name, short_name: name.slice(0, 12), lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
    start_url: '/', scope: '/', display: 'standalone', background_color: '#ffffff', theme_color: color,
    icons: icon ? [{ src: icon, sizes: '192x192', purpose: 'any' }, { src: icon, sizes: '512x512', purpose: 'any' }] : []
  };
  return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' } });
}
