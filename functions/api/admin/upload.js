/* POST /api/admin/upload (raw image body, Content-Type image/*) -> {url}.
   Images are compressed in the browser before upload. */
import { json, fail, handle, authUser, isAdmin } from '../../_lib/http.js';

const TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];

export const onRequestPost = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!TYPES.includes(type)) return fail(400, 'unsupported_type');
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return fail(400, 'empty');
  if (buf.byteLength > 1500000) return fail(413, 'image_too_large');
  const id = Date.now().toString(36) + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await env.STORE.put('img:' + id, buf, { metadata: { type } });
  return json({ url: '/img/' + id });
});
