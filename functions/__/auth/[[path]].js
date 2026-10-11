/* Optional same-domain proxy for Firebase Auth's sign-in helper pages.
   When FIREBASE_AUTH_DOMAIN is set to this site's own domain, Google
   sign-in keeps working in Safari/iOS and installed (home-screen) apps,
   which block the cross-site storage the default firebaseapp.com flow
   relies on. See README for the one-time Google Cloud setting. */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const target = `https://${env.FIREBASE_PROJECT_ID}.firebaseapp.com${url.pathname}${url.search}`;
  return fetch(new Request(target, request));
}
