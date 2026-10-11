/* Public Firebase web config, read from environment variables so every
   client deployment only differs by its Cloudflare settings, not by code. */
export function firebaseWebConfig(env) {
  return {
    apiKey: env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || (env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.firebaseapp.com` : ''),
    projectId: env.FIREBASE_PROJECT_ID || '',
    appId: env.FIREBASE_APP_ID || '',
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
    vapidKey: env.FIREBASE_VAPID_KEY || '',
    // local development only: tells the browser to use the emulators
    emulators: env.FIRESTORE_EMULATOR_HOST ? { firestore: env.FIRESTORE_EMULATOR_HOST, auth: env.FIREBASE_AUTH_EMULATOR_HOST || '' } : undefined
  };
}
