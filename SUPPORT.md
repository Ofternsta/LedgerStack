# Support email — support@ledgerstack.org

The app uses **support@ledgerstack.org** (see `lib/support.ts`). This guide covers **receiving** mail in your Outlook inbox and **sending** so recipients see **From: support@ledgerstack.org**.

## Your setup (typical)

| Piece | Example |
|--------|---------|
| Public address | `support@ledgerstack.org` |
| Where mail lands | `ledgerstack.inbox@outlook.com` |
| Inbound forwarding | ImprovMX (or Cloudflare Email Routing) MX on **ledgerstack.org** |

ImprovMX (and similar forwarders) only **receive** mail. They do **not** send outbound mail as `@ledgerstack.org`. You must configure **sending** separately (below).

---

## Part 1 — Receive mail (already done if forwarding works)

1. **ImprovMX** (or Cloudflare Email Routing): alias `support` → `ledgerstack.inbox@outlook.com`
2. **Vercel DNS** for `ledgerstack.org`: MX records from ImprovMX (verified in their dashboard)
3. Test: send from Gmail to `support@ledgerstack.org` → should appear in Outlook

---

## Part 2 — Send mail **as** support@ledgerstack.org (recommended)

For replies that show **From: support@ledgerstack.org** (not your personal Outlook address) and avoid spam, use **authenticated SMTP** on your domain with **DKIM**.

### Option A — Resend + Outlook (recommended, low cost)

1. Sign up at [resend.com](https://resend.com) and add domain **ledgerstack.org**.
2. In Resend → **Domains** → add the **DKIM** (and optional SPF) DNS records Resend gives you to **Vercel DNS** for `ledgerstack.org`. Wait until Resend shows **Verified**.
3. In Resend → **API Keys** → create a key (used as SMTP password).
4. In **Outlook on the web** ([outlook.com](https://outlook.com)) as `ledgerstack.inbox@outlook.com`:
   - **Settings** (gear) → **Mail** → **Sync email accounts** (or **Accounts** → **Email accounts**)
   - Or: **Settings** → **Account** → **Aliases** / **Manage how I send email**
   - Add **Send mail from another address** / **Add send-only address**:
     - **Email:** `support@ledgerstack.org`
     - **Display name:** `LedgerStack Support` (or your company name)
   - If Outlook asks for **SMTP** (advanced):
     - **Server:** `smtp.resend.com`
     - **Port:** `465` (SSL) or `587` (STARTTLS)
     - **Username:** `resend`
     - **Password:** your Resend API key
     - **From / login:** `support@ledgerstack.org`
5. Resend may send a **verification** email to `support@ledgerstack.org` → it forwards to your Outlook inbox → click the link.
6. When composing in Outlook, choose **From:** `support@ledgerstack.org`.

**Note:** Classic Outlook desktop (Windows/Mac) uses similar steps under **File → Account Settings → Account Settings → Email → New → Manual setup → SMTP**.

### Option B — Microsoft 365 on ledgerstack.org (paid, full mailbox)

1. [Microsoft 365](https://www.microsoft.com/microsoft-365/business) → add domain **ledgerstack.org**.
2. Create mailbox **support@ledgerstack.org** (real inbox, not just forward).
3. Add Microsoft **MX** records in Vercel DNS (replace or coordinate with ImprovMX — usually you use either forward *or* M365 MX, not both for the same address).
4. Sign in to Outlook as `support@ledgerstack.org` or add that mailbox to your Outlook app.

Best if you want calendar, Teams, and one dedicated support inbox without forwarding.

### Option C — Outlook “Send as” only (quick test, often unreliable)

1. Outlook → **Settings** → add **support@ledgerstack.org** as a **send-from** alias.
2. Verify using the email that arrives via ImprovMX forward.
3. Send a test to Gmail and check headers.

Many providers show **via outlook.com** or mark mail as spam because **SPF/DKIM** for `ledgerstack.org` do not authorize Microsoft’s servers. Use Option A or B for production.

---

## DNS checklist (sending + receiving)

| Record | Purpose |
|--------|---------|
| **MX** (ImprovMX) | Inbound → your Outlook inbox |
| **DKIM** (Resend or M365) | Outbound signing — fewer spam flags |
| **SPF** (TXT) | Lists servers allowed to send as `@ledgerstack.org` |

If you use **both** ImprovMX (inbound) and Resend (outbound), keep ImprovMX MX for receiving and add Resend’s **DKIM/SPF** TXT records for sending. Resend’s docs show the exact values.

Do **not** duplicate conflicting SPF records; merge into one SPF TXT if your DNS host allows only one (Resend docs explain this).

---

## “Show From” or “From” is greyed out (Outlook.com)

Outlook disables **From** until you add `support@ledgerstack.org` to your **Microsoft account** (not only ImprovMX forwarding). Do these in order:

### Step 1 — Add the address as a Microsoft alias

1. Open **[account.live.com/names/Manage](https://account.live.com/names/Manage)** while signed in as `ledgerstack.inbox@outlook.com`.
2. Under **Account aliases**, click **Add email**.
3. Choose **Add an existing email address as a Microsoft account alias** (not “create new @outlook.com”).
4. Enter **`support@ledgerstack.org`** → **Add alias**.
5. Microsoft sends a verification email to `support@ledgerstack.org` → it should arrive in your Outlook inbox (via ImprovMX) → **click the verification link**.

Wait until the alias appears on the Manage page. If add fails, the address may already be tied to another Microsoft account.

### Step 2 — Turn on the From line in compose

1. Open **[Outlook mail settings → Message handling](https://outlook.live.com/mail/0/options/mail/messageContent)** (or **Settings → Mail → Compose and reply**).
2. Enable **Always show From** (wording may be **Show From** under message format).
3. Save.

### Step 3 — Use From when sending

1. **New message** in [Outlook on the web](https://outlook.live.com).
2. If you do not see **From**, open the **⋯** or **Options** menu in the compose toolbar → **Show From**.
3. Click the **From** dropdown → pick **`support@ledgerstack.org`**, or **Other email address** and type `support@ledgerstack.org`.

**From stays greyed?**

| Cause | Fix |
|--------|-----|
| Alias not verified | Finish Step 1; check spam in Outlook for Microsoft mail |
| “Always show From” off | Step 2 |
| Outlook desktop / phone app | Try **Outlook on the web** first; apps lag behind alias setup |
| Only forwarding, no alias | ImprovMX does not enable From by itself — Step 1 is required |
| Microsoft blocks send for custom domain | Use **Option A (Resend SMTP)** below — sends with proper DKIM even when From UI fails |

### Step 4 — If it still will not send (recommended fallback)

Set up **Resend SMTP** (Option A above). Some Outlook accounts never allow a clean **From** for a custom domain without SMTP. You can still send as `support@ledgerstack.org` via:

- **Resend dashboard** → send test email, or  
- **Outlook** after adding an account that uses `smtp.resend.com` (see Option A), or  
- **Gmail** → Settings → Send mail as → `support@ledgerstack.org` + Resend SMTP (often easier than Outlook)

---

## Test sending

1. From Outlook, **From:** `support@ledgerstack.org` → send to a personal Gmail you control.
2. In Gmail, open the message → **Show original**:
   - **From** should be `support@ledgerstack.org`
   - Look for **DKIM: pass** and **SPF: pass**
3. If it lands in spam, wait for DKIM to propagate (up to 48h) or fix DNS in Resend dashboard.

---

## Site / app links

Footer and pages use `mailto:support@ledgerstack.org` via `lib/support.ts`. No code change is required for Outlook sending.

To change the public address later, update `SUPPORT_EMAIL` in `lib/support.ts` and redeploy.

---

## Quick reference

| Goal | What to use |
|------|-------------|
| Mail arrives in Outlook | ImprovMX → `ledgerstack.inbox@outlook.com` |
| Send as `support@ledgerstack.org` | Resend SMTP + DKIM in Vercel DNS, or Microsoft 365 mailbox |
| Avoid “via outlook.com” / spam | Do **not** rely on personal Outlook “send as” alone — use DKIM (Option A or B) |
