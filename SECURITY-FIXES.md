# Security fixes — step-by-step for ledgerstack.org

This guide walks you through closing the main vulnerabilities. Do the steps **in order**.

---

## What we fixed in code (already in the repo)

| Fix | What it does |
|-----|----------------|
| **Removed `/api/clear-demo`** | No one on the internet can trigger a service-role data wipe |
| **`complete-signup` blocks `admin`** | You cannot create a free company admin via `signUp` metadata |
| **`/api/extract` and `/api/summarize` require login** | Random visitors cannot burn your Groq API budget |
| **Evidence edit/delete** | Only the real **organization admin** (not `profiles.role` hack) |
| **`security-hardening.sql`** | Stops billing bypass + invite-code leak + role self-escalation |

You still must **run the SQL** and **redeploy** for production to be protected.

---

## Step 1 — Run SQL in Supabase (about 5 minutes)

This is the most important step for **billing bypass** and **invite codes**.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your LedgerStack project.
2. Go to **SQL Editor** → **New query**.
3. Open this file in your project: `supabase/security-hardening.sql`
4. Copy the **entire file** and paste it into the SQL Editor.
5. Click **Run**.

You should see **Success**. If you get an error about a missing function `is_org_admin`, run `supabase/roles-and-orgs.sql` first (it defines that helper), then run `security-hardening.sql` again.

### Quick check (optional)

Run this in SQL Editor:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'subscriptions';
```

You should **not** see a policy named `org admin manage subscription`. You **should** see read-only policies for admins/members.

---

## Step 2 — Confirm you never ran “open anon” SQL (2 minutes)

In SQL Editor, run:

```sql
SELECT policyname, roles
FROM pg_policies
WHERE tablename IN ('projects', 'claims')
  AND roles::text LIKE '%anon%';
```

- **If you get zero rows:** good.
- **If you see policies like `anon select projects`:** `security-hardening.sql` (step 1) already drops them. Run step 1 again if needed.

**Never run** `supabase/anon-app-permissions.sql` on production. It allows anyone with your public anon key to read/write all projects.

---

## Step 3 — Deploy to Vercel (about 3 minutes)

1. Commit and push your code (or let Cursor/your usual flow deploy).
2. Wait for the Vercel build to finish green.
3. Verify the dangerous route is gone:
   - Open `https://ledgerstack.org/api/clear-demo` in a browser.
   - You should get **404 Not Found** (not JSON saying “removed”).

---

## Step 4 — Test the fixes (10 minutes)

Use a **private/incognito** window where you are **not** logged in.

### Test A — Demo wipe is gone

```text
POST https://ledgerstack.org/api/clear-demo
```

Expected: **404** (route removed).

### Test B — AI routes need login

Try `POST https://ledgerstack.org/api/summarize` with body `{"text":"hello"}` (no cookies).

Expected: **401 Unauthorized**.

### Test C — Billing bypass (after Step 1 SQL)

1. Log in as a normal **company admin** (your real account).
2. Open browser DevTools → Console.
3. If you use Supabase client in console, try updating subscription to enterprise.

Expected: **permission denied** or RLS error — admins can **read** subscription, not **write** it.

Paid plans should only change after **Stripe checkout** or the **webhook**.

### Test D — Worker cannot become admin via profile

1. Log in as an **approved worker** (test account).
2. In Supabase Table Editor → `profiles`, try changing that user’s `role` to `admin` from the app (if you have a UI), or via API.

Expected: update **fails** or role stays `worker`.

### Test E — Admin signup path still works

1. Incognito → `/login?signup=admin`
2. Complete **Stripe/trial** flow as designed.

Expected: account still created via **register-admin / webhook**, not via fake metadata admin.

---

## Step 5 — Supabase Auth settings (recommended)

In Supabase → **Authentication** → **Providers** → **Email**:

- Turn **ON** “Confirm email” (if not already).
- Use a strong minimum password (Supabase → Auth → Policies), e.g. 10+ characters.

This reduces fake signups and the “create admin before verify” risk.

---

## Step 6 — Environment / owner hygiene

On **Vercel** → Project → **Settings** → **Environment Variables**:

| Variable | Notes |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never in client code |
| `PLATFORM_OWNER_EMAIL` | Your email for `/settings/users` — use MFA on that Google/account |
| `STRIPE_WEBHOOK_SECRET` | Must match Stripe dashboard webhook |

---

## What is still worth doing later (not blocking)

| Item | Why |
|------|-----|
| **Rate limits** on `/api/auth/*` and `/api/invite/validate` | Stops email probing and invite brute force (Vercel Firewall or Upstash) |
| **Rotate demo cleanup** | Use `supabase/clear-demo-projects.sql` manually in SQL Editor instead of any HTTP route |
| **Shorter password retention** in `pending_admin_signups` | Less risk if DB is leaked |

---

## If something breaks after Step 1

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| App cannot read plan features | `plan-usage.sql` not run | Run `supabase/plan-usage.sql` |
| Worker cannot see anything | Missing `org members read subscription` | Re-run `security-hardening.sql` |
| Admin cannot open billing | Expected — subscription writes are server-only | Billing UI should use `/api/billing` + Stripe, not direct table writes |
| “Become admin” for workers fails | By design unless they use `/api/account/become-admin` then **pay** | They get `status: pending` until checkout |

---

## Summary checklist

- [ ] Ran `supabase/security-hardening.sql` in Supabase
- [ ] Deployed latest code to Vercel
- [ ] `/api/clear-demo` returns 404
- [ ] `/api/summarize` returns 401 when logged out
- [ ] Confirmed no `anon` policies on `projects`/`claims`
- [ ] Email confirmation enabled in Supabase Auth

When all boxes are checked, the **critical** issues from the audit are addressed for production.
