# Premium Restaurant Ordering System

English-only static restaurant website with menu, branches, cart, checkout, admin customization, and transactional order email.

## Email setup
Each restaurant uses its own Brevo account. Put these values in the restaurant's Vercel project Environment Variables (never in public files): `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optional `BREVO_SENDER_NAME`. The destination order email is configured from the Admin Panel.

## Admin data sync
The admin panel stores public menu/site data in `data.json` through `/api/menu`, which commits changes to GitHub. Required variables: `ADMIN_SECRET`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`; optional `GITHUB_BRANCH`, `GITHUB_PATH`.

No database, WhatsApp, or card payment integration is included.
