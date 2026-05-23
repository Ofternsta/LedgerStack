# Stripe setup for LedgerStack

Billing lives at **Settings → Billing** (`/settings/billing`). Admins pick a plan; paid plans open **Stripe Checkout**. Subscription status is stored in Supabase `subscriptions` and updated by the **webhook**.

## 1. Stripe Dashboard

1. Create or open your account at [dashboard.stripe.com](https://dashboard.stripe.com).
2. Start in **Test mode** (toggle top-right) until you are ready for live charges.

## 2. Products and prices

Create **three recurring products** (monthly). Suggested names (match the app):

| App plan       | Suggested price | Env variable                 |
|----------------|-----------------|------------------------------|
| Starter        | $20/month       | `STRIPE_PRICE_STARTER`       |
| Professional   | $70/month       | `STRIPE_PRICE_PROFESSIONAL`  |
| Enterprise     | $150/month      | `STRIPE_PRICE_ENTERPRISE`    |

For each product:

1. **Product catalog → Add product**
2. Pricing: **Recurring**, **Monthly**
3. After saving, open the **Price** and copy the **Price ID** (`price_...`).

Trial is free in-app only — no Stripe price needed.

## 3. API keys

**Developers → API keys**

| Variable              | Where to copy                          |
|-----------------------|----------------------------------------|
| `STRIPE_SECRET_KEY`   | Secret key (`sk_test_...` or live)     |
| `STRIPE_CHECKOUT_DISPLAY_NAME` | Optional. Name at top of Checkout (default: `OfternOS`) |

Never commit secret keys. Add them only in `.env.local` and Vercel.

Checkout shows **OfternOS** (not your personal Stripe account name) via `branding_settings.display_name`. To change it, set `STRIPE_CHECKOUT_DISPLAY_NAME` on Vercel or update the default in `lib/stripe-config.ts`.

## 4. Webhook

Stripe must notify your app when checkout completes or a subscription changes.

### Production (Vercel)

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://ledgerstack.org/api/billing/webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Create the endpoint and copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` (`whsec_...`).

Add `STRIPE_WEBHOOK_SECRET` in **Vercel → Project → Settings → Environment Variables**, then redeploy.

### Local testing

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the `whsec_...` from the CLI into `.env.local` as `STRIPE_WEBHOOK_SECRET`. Run `npm run dev` in another terminal.

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
SUPABASE_SERVICE_ROLE_KEY=...   # required for webhook DB updates
```

On **Vercel**, set the same variables for **Production** (use live Stripe keys and `NEXT_PUBLIC_APP_URL=https://ledgerstack.org` when going live).

## 6. Supabase

Run `supabase/platform-security.sql` if you have not already (creates `subscriptions` table).

## 7. Verify

1. Sign in as an **admin**.
2. Open **Settings → Billing**.
3. The amber “Stripe is not configured” banner should be **gone** when all price IDs and `STRIPE_SECRET_KEY` are set.
4. Choose **Starter** (test card `4242 4242 4242 4242`, any future expiry, any CVC).
5. After redirect, plan should show **active** (webhook may take a few seconds).

In Stripe Dashboard → **Customers** / **Subscriptions**, confirm the customer was created with metadata `organization_id`.

## 8. Go live

1. Complete Stripe account activation (business details, bank).
2. Switch Dashboard to **Live mode**.
3. Recreate products/prices in live mode (new `price_...` IDs).
4. Create a **live** webhook pointing to `https://ledgerstack.org/api/billing/webhook`.
5. Update Vercel env vars with `sk_live_...`, live `whsec_...`, and live price IDs.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Banner “Stripe is not configured” | Set secret key + all three price IDs; redeploy |
| Checkout works but plan stays trial | Check webhook secret, endpoint URL, and Vercel logs for `/api/billing/webhook` |
| Webhook 401 / redirect to login | Deploy latest code (webhook path is public in middleware) |
| Webhook 500 | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set on Vercel |
