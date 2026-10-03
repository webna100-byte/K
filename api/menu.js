/* ===================== /api/menu =====================
   GET  -> only checks the x-admin-secret header, used by the login page to
           verify a password without exposing any real data.
   POST -> receives the full menu data JSON from the admin panel and commits
           it to data.json in the GitHub repo via the GitHub Contents API.
           Vercel is connected to that repo and auto-redeploys on push, so
           the public data.json file updates for every device within
           roughly 30-60 seconds.

   Required environment variables (set in the Vercel project settings, NOT
   in this file or in git):
     ADMIN_SECRET   - the password the admin panel checks against
     GITHUB_TOKEN   - a GitHub token with "contents: write" access to the repo
     GITHUB_OWNER   - the GitHub username or org that owns the repo
     GITHUB_REPO    - the repo name
     GITHUB_BRANCH  - optional, defaults to "main"
     GITHUB_PATH    - optional, defaults to "data.json"
======================================================= */

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret'] || '';

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    // Login page just needs to know the secret is correct.
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = process.env.GITHUB_PATH || 'data.json';

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'invalid body' });
    return;
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'qrresto-admin',
    Accept: 'application/vnd.github+json'
  };

  try {
    // 1) Get the current file's sha (required by GitHub to update a file).
    const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders });
    if (!getRes.ok) {
  const errText = await getRes.text();
  console.error('GitHub read failed:', getRes.status, errText);
  res.status(502).json({
    error: 'github read failed',
    status: getRes.status,
    details: errText
  });
  return;
}
    const getData = await getRes.json();

    // 2) Commit the new content.
    const content = Buffer.from(JSON.stringify(body, null, 2), 'utf-8').toString('base64');
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'تحديث بيانات المنيو من لوحة التحكم',
        content,
        sha: getData.sha,
        branch
      })
    });

    if (!putRes.ok) {
  const errText = await putRes.text();
  console.error('GitHub write failed:', putRes.status, errText);
  res.status(502).json({
    error: 'github write failed',
    status: putRes.status,
    details: errText
  });
  return;
}

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('menu save error:', e);
    res.status(500).json({ error: 'server error' });
  }
};

// Menu data can include several base64 product images, so raise the default
// body size limit a bit.
module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }
  }
};
