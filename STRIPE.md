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

Marketing copy for each paid plan lives in `lib/plan-entitlements.ts` (`PLAN_FEATURE_COPY`, `PLAN_STRIPE_DESCRIPTIONS`). Each Checkout session updates the linked Stripe **Product** name and description to match the website before opening payment.

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
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (`pk_test_...` or live) |
| `STRIPE_CHECKOUT_DISPLAY_NAME` | Optional. Name at top of Checkout (default: `LedgerStack`) |
| `STRIPE_STATEMENT_DESCRIPTOR` | Optional. Text on card statements for subscriptions (default: `LedgerStack`, max 22 chars) |
| `STRIPE_STATEMENT_DESCRIPTOR_SUFFIX` | Optional. Suffix on card charges from Checkout (default: `LEDGERSTACK`) |

Never commit secret keys. Add them only in `.env.local` and Vercel.

Checkout shows **LedgerStack** at the top via `branding_settings.display_name` (not your personal Stripe account name). Override with `STRIPE_CHECKOUT_DISPLAY_NAME` if needed.

### Card statement (“who charged me?”)

Customers should see **LedgerStack**, not your personal name or an old domain (e.g. `PA-OFTERNSTA.ITCH.IO`).

1. **In this app** — Each checkout updates your Stripe **Products** to use `LedgerStack` as the statement descriptor for subscription renewals.
2. **In Stripe Dashboard (required once per account)** — [Settings → Business](https://dashboard.stripe.com/settings/business-details):
   - **Business name** (public): `LedgerStack`
   - **Statement descriptor** (customer-facing): `LEDGERSTACK` or `LedgerStack` (5–22 characters, letters/numbers)
   - Remove personal names from the public business profile if they appear on receipts.
3. Use the same settings in **Live** and **Test** mode if you use both.

After changing Dashboard settings, run a new test checkout. Existing subscriptions pick up the product descriptor on the **next** invoice.

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
3. The amber “Stripe is not configured” banner should be **gone** when the secret key, **publishable key**, and all three price IDs are set.
4. Choose **Starter** → **Pay with card** (opens `/checkout` with embedded Stripe card form).
5. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.
6. After payment, you return to Billing with plan **active** (webhook may take a few seconds).

**Manage card:** use **Manage card & billing (Stripe)** on the Billing page (Stripe Customer Portal).

In Stripe Dashboard → **Customers** / **Subscriptions**, confirm the customer was created with metadata `organization_id`.

## 8. Go live (real card payments)

Test keys (`sk_test_`, `pk_test_`, test `price_...`, test `whsec_...`) **do not work** for real charges. You must create a parallel setup in **Live mode**.

### A. Activate your Stripe account

1. [dashboard.stripe.com](https://dashboard.stripe.com) → complete **Activate account** (business info, owner identity, bank for payouts).
2. Wait until Stripe shows your account can accept **live** payments (no “restricted” banner).

### B. Create live products (Live mode ON)

Toggle **Live** (top-right of Dashboard — not “Test mode”).

1. **Product catalog → Add product** — create the same three plans (Starter $20/mo, Professional $70/mo, Enterprise $150/mo).
2. Each must be **Recurring → Monthly**.
3. Copy each **live** Price ID (`price_...`) — they will be **different** from test price IDs.

### C. Live API keys

Still in **Live** mode: **Developers → API keys**

| Vercel variable (Production only) | Copy |
|-----------------------------------|------|
| `STRIPE_SECRET_KEY` | **Secret** key `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Publishable** key `pk_live_...` |

Do **not** use `sk_test_` or `pk_test_` on Production.

### D. Live webhook

Still in **Live** mode: **Developers → Webhooks → Add endpoint**

1. **URL:** `https://ledgerstack.org/api/billing/webhook`
2. **Events:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Save → open the endpoint → **Signing secret** → copy `whsec_...` (live secret is different from test CLI or test endpoint).

### E. Customer portal (live)

**Settings → Billing → Customer portal** — enable while in **Live** mode (test portal settings do not apply to live customers).

### F. Vercel Production environment

**Project → Settings → Environment variables** — edit **Production** only:

| Variable | Live value |
|----------|------------|
| `NEXT_PUBLIC_APP_URL` | `https://ledgerstack.org` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | live endpoint `whsec_...` |
| `STRIPE_PRICE_STARTER` | live `price_...` |
| `STRIPE_PRICE_PROFESSIONAL` | live `price_...` |
| `STRIPE_PRICE_ENTERPRISE` | live `price_...` |

Leave **Preview/Development** on test keys if you still want local test checkout.

**Redeploy Production** after saving (Deployments → ⋯ → Redeploy).

### G. Verify live (small real charge)

1. Open `https://ledgerstack.org` → admin → **Billing**.
2. No “Stripe is not configured” banner.
3. **Pay with card** on the cheapest plan — use a **real** card (you will be charged).
4. Confirm in Stripe **Live** → **Payments** and **Subscriptions**.
5. Confirm app shows plan **active** (webhook; check Vercel logs for `/api/billing/webhook` if delayed).
6. Optional: refund the test payment in Stripe Dashboard.

### What does not carry over from test

- Test customers, subscriptions, and checkout sessions
- Test `price_...` IDs and test `whsec_...`
- Subscriptions already in Supabase from test checkouts (admins may need to subscribe again on live, or you update `subscriptions` manually)

### Keep test mode for development

Keep test keys in `.env.local` and Vercel **Preview** so you can still use `4242 4242 4242 4242` locally without charging real cards.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Banner “Stripe is not configured” | Set secret key, publishable key, and all three price IDs; redeploy |
| Checkout works but plan stays trial | Check webhook secret, endpoint URL, and Vercel logs for `/api/billing/webhook` |
| Webhook 401 / redirect to login | Deploy latest code (webhook path is public in middleware) |
| Webhook 500 | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set on Vercel |
