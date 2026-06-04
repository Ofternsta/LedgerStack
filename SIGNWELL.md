# SignWell e-signatures (LedgerStack)

LedgerStack uses [SignWell](https://www.signwell.com/api/) for legally binding typed e-signatures on PDFs shared with clients.

## Setup

1. Create a SignWell account and generate an API key (**Settings → API**).
2. Add to Vercel / `.env.local`:

```env
SIGNWELL_API_KEY=your_api_key
# Use true while testing (watermarked, non-binding). Set false in production.
SIGNWELL_TEST_MODE=true
```

3. Run the database migration in Supabase SQL Editor:

```
supabase/signature-requests.sql
```

4. Register a webhook in SignWell (**Settings → Webhooks**). Use the **apex** URL (not `www`):

```
https://ledgerstack.org/api/webhooks/signwell
```

Opening that link in a browser should return JSON (`ok: true`). SignWell delivers events via **POST**; a blank browser visit is only a health check.

Subscribe at least to: `document_viewed`, `document_completed`, `document_declined`, `document_expired`.

5. Ensure transactional email works (`RESEND_API_KEY`) so clients and admins receive signature emails.

## Product flow

- **Admin** (Professional+ with client portal): Project → Client access → **Request signature** → pick a PDF.
- **Client**: Sees pending items on Projects and the project page; receives email + in-app notification; opens **Sign now** → SignWell embedded iframe (typed signature).
- **After signing**: Signed PDF stored in project files under category **Signed documents**; admin emailed and notified.

## Plans

E-signatures require the **client portal** entitlement (Professional or Enterprise).

## Free tier

SignWell offers **25 API documents/month free**, then pay-as-you-go. Use `SIGNWELL_TEST_MODE=true` for unlimited non-binding test documents during development.
