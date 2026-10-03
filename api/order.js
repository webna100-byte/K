/* Transactional order email via the restaurant's own Brevo account.
   Required Vercel environment variables:
     BREVO_API_KEY       - the restaurant owner's Brevo API key
     BREVO_SENDER_EMAIL  - a verified sender email in that Brevo account
     BREVO_SENDER_NAME   - optional sender name

   The destination address is read from the site's data.json instead of the
   browser request, so visitors cannot use this endpoint to send arbitrary
   emails through the restaurant's Brevo account.
*/
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Restaurant Orders';
  if (!apiKey || !senderEmail) return res.status(500).json({ error: 'email service not configured' });

  let siteData;
  try {
    siteData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data.json'), 'utf8'));
  } catch (err) {
    console.error('Could not read data.json:', err);
    return res.status(500).json({ error: 'site data unavailable' });
  }

  const to = String(siteData?.settings?.restaurantEmail || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'restaurant email is not configured' });

  const body = req.body || {};
  const subject = String(body.subject || 'New restaurant order').trim().slice(0, 200);
  const text = String(body.text || '').slice(0, 20000);
  const html = String(body.html || '').slice(0, 30000);
  if (!text) return res.status(400).json({ error: 'invalid order email' });

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || undefined
      })
    });
    if (!brevoRes.ok) {
      const details = await brevoRes.text();
      console.error('Brevo send failed:', brevoRes.status, details);
      return res.status(502).json({ error: 'email send failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Order email error:', err);
    return res.status(500).json({ error: 'server error' });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '1mb' } } };
