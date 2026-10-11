/* POST /api/auth/admin {password} -> Firebase custom token with role=admin.
   The password is the ADMIN_PASSWORD secret in Cloudflare settings. */
import { json, fail, handle, readJson, loginGuard } from '../../_lib/http.js';
import { createCustomToken, safeEqual } from '../../_lib/google.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const guard = await loginGuard(request, 'admin-login');
  if (guard.blocked) return fail(429, 'too_many_attempts');
  const { password } = await readJson(request, 2000);
  if (!env.ADMIN_PASSWORD) return fail(500, 'admin_password_not_configured');
  if (!password || !safeEqual(password, env.ADMIN_PASSWORD)) { await guard.fail(); return fail(401, 'invalid_login'); }
  const token = await createCustomToken(env, 'staff_admin', { role: 'admin' });
  return json({ token });
});
