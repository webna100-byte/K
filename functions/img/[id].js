/* GET /img/:id -> image uploaded from the admin panel, stored in KV and
   served with a long immutable cache (ids are never reused). */
export async function onRequestGet({ params, env, request, waitUntil }) {
  const id = String(params.id || '');
  if (!/^[a-z0-9_-]{6,80}$/i.test(id)) return new Response('not found', { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const { value, metadata } = await env.STORE.getWithMetadata('img:' + id, 'arrayBuffer');
  if (!value) return new Response('not found', { status: 404 });
  const res = new Response(value, {
    headers: {
      'Content-Type': (metadata && metadata.type) || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
