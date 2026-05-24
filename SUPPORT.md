# Support email — support@ledgerstack.org

The app uses **support@ledgerstack.org** (see `lib/support.ts`). Receiving mail requires DNS on **ledgerstack.org** (your production domain).

## Recommended: Cloudflare Email Routing (free forwarding)

Use this if **ledgerstack.org** DNS is on Cloudflare (common when the domain points to Vercel).

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **ledgerstack.org** → **Email** → **Email Routing**.
2. Turn on **Email Routing**.
3. **Destination addresses** → add your personal Gmail (or other inbox) and verify it.
4. **Routing rules** → **Create address** → Custom address: `support` → send to your verified inbox.
5. Cloudflare adds **MX** (and related) records automatically.

### Send replies as support@ (optional)

In Gmail: **Settings** → **Accounts** → **Send mail as** → add `support@ledgerstack.org` using SMTP details from Cloudflare Email Routing docs.

## Alternative: Google Workspace

For a dedicated inbox (not just forwarding):

1. Sign up at [Google Workspace](https://workspace.google.com) with domain **ledgerstack.org**.
2. Verify domain (TXT record).
3. Create user **support@ledgerstack.org**.
4. Add Google **MX** records and enable **DKIM** in the admin console.

## After mail works

1. Email **support@ledgerstack.org** from an external account and confirm delivery.
2. Reply once and check it does not land in spam.
3. The site footer and app pages link to this address via `mailto:`.

## Change the address later

Update `SUPPORT_EMAIL` in `lib/support.ts` and redeploy.
