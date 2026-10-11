/* POST /api/admin/notify {title:{ar,en}, body:{ar,en}, link?, image?}
   Saves the notification for the in-site list and pushes it to every
   subscribed device in its language.
   DELETE {id} removes one from the in-site list. */
import { json, fail, handle, readJson, authUser, isAdmin, loadConfig, purgeSiteCache } from '../../_lib/http.js';
import { sendToTopic, LANG_TOPICS } from '../../_lib/push.js';

const clean = (v, n) => String(v || '').trim().slice(0, n);

export const onRequestPost = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  const b = await readJson(request, 10000);
  const title = { ar: clean(b.title && b.title.ar, 120), en: clean(b.title && b.title.en, 120) };
  const body = { ar: clean(b.body && b.body.ar, 500), en: clean(b.body && b.body.en, 500) };
  if (!title.ar && !title.en) return fail(400, 'title_required');
  const origin = new URL(request.url).origin;
  let link = clean(b.link, 300);
  if (link && link.startsWith('/')) link = origin + link;
  if (link && !/^https:\/\//.test(link)) link = '';
  const image = clean(b.image, 300);
  const item = { id: 'n' + Date.now().toString(36), title, body, link, image, at: Date.now() };
  const list = (await env.STORE.get('notifications', 'json')) || [];
  list.unshift(item);
  await env.STORE.put('notifications', JSON.stringify(list.slice(0, 30)));
  await purgeSiteCache();

  const config = await loadConfig(env);
  const logo = config && config.settings && config.settings.logo;
  const icon = logo ? (logo.startsWith('/') ? origin + logo : logo) : undefined;
  const results = {};
  for (const lang of ['ar', 'en']) {
    const t = title[lang] || title.ar || title.en;
    const m = body[lang] || body.ar || body.en;
    try {
      await sendToTopic(env, LANG_TOPICS[lang], { title: t, body: m, link: link || origin + '/notifications', icon, image: image ? (image.startsWith('/') ? origin + image : image) : undefined });
      results[lang] = 'sent';
    } catch (e) {
      console.error(e);
      results[lang] = 'failed';
    }
  }
  return json({ ok: true, item, push: results });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  if (!isAdmin(await authUser(request, env))) return fail(401, 'unauthorized');
  const { id } = await readJson(request, 2000);
  const list = (await env.STORE.get('notifications', 'json')) || [];
  await env.STORE.put('notifications', JSON.stringify(list.filter(n => n.id !== id)));
  await purgeSiteCache();
  return json({ ok: true });
});
