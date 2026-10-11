/* GET  /api/admin/config -> current config straight from KV (no cache).
   PUT  /api/admin/config {config, baseVersion} -> save.
   The save is rejected when baseVersion doesn't match the stored version,
   so an admin tab holding stale (or failed-to-load) data can never
   overwrite the restaurant's real data. */
import { json, fail, handle, readJson, authUser, isAdmin, loadConfig, purgeSiteCache } from '../../_lib/http.js';

export const onRequestGet = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  return json({ config: await loadConfig(env) });
});

export const onRequestPut = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  const body = await readJson(request, 3000000);
  const config = body.config;
  if (!config || typeof config !== 'object' || !config.settings || !Array.isArray(config.products) || !Array.isArray(config.branches) || !Array.isArray(config.categories)) {
    return fail(400, 'invalid_config');
  }
  if (JSON.stringify(config).includes('data:image/')) return fail(400, 'inline_images_not_allowed');
  const current = await loadConfig(env);
  const currentVersion = current ? Number(current.version) || 0 : 0;
  if ((Number(body.baseVersion) || 0) !== currentVersion) return fail(409, 'version_conflict', { version: currentVersion });
  config.version = currentVersion + 1;
  config.updatedAt = Date.now();
  await env.STORE.put('config', JSON.stringify(config));
  await purgeSiteCache();
  return json({ ok: true, version: config.version });
});
