# SignWell e-signatures (LedgerStack)

LedgerStack uses [SignWell](https://www.signwell.com/api/) for legally binding typed e-signatures on project files shared with clients.

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

4. **Register the webhook via API** (SignWell does not always show a Webhooks page in the dashboard). From a terminal, with your API key:

```bash
curl -X POST "https://www.signwell.com/api/v1/hooks" \
  -H "X-Api-Key: YOUR_SIGNWELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"callback_url\":\"https://ledgerstack.org/api/webhooks/signwell\"}"
```

List existing hooks:

```bash
curl "https://www.signwell.com/api/v1/hooks" \
  -H "X-Api-Key: YOUR_SIGNWELL_API_KEY"
```

SignWell posts **all** document lifecycle events to that URL (there is no per-event checkbox in the API). LedgerStack handles `document_viewed`, `document_completed`, `document_declined`, and `document_expired`.

Your LedgerStack endpoint health check (browser GET):

```
https://ledgerstack.org/api/webhooks/signwell
```

Should return JSON: `{"ok":true,"service":"ledgerstack-signwell-webhook",...}`

5. Ensure transactional email works (`RESEND_API_KEY`) so clients and admins receive signature emails.

## Product flow

- **Admin** (Professional+ with client portal): Project → Client access → **Request signature** → pick a PDF.
- **Client**: Sees pending items on Projects and the project page; receives email + in-app notification; opens **Sign now** → SignWell embedded iframe (typed signature).
- **After signing**: Signed PDF stored in project files under category **Signed documents**; admin emailed and notified.

## Plans

E-signatures require the **client portal** entitlement (Professional or Enterprise).

## Troubleshooting

### `SignWell request failed (400)` or similar

After deploy, LedgerStack shows SignWell’s **detailed error** (not just the status code). Common causes:

1. **`SIGNWELL_TEST_MODE`** — In Vercel, set `SIGNWELL_TEST_MODE=true` while testing. Production signatures without a paid SignWell API plan return **402**, not 400.
2. **API key** — Use the key from SignWell → Settings → API (paste exactly, no extra quotes). Rotate if it was exposed.
3. **Requester email** — `custom_requester_email` is your admin’s email. It should be a real address on your SignWell account.
4. **Embedded signing plan** — Some SignWell API tiers require **Standard** for embedded signing. If create succeeds but no signing URL, upgrade SignWell or contact their support.
5. **File type** — Must match [SignWell-supported formats](https://developers.signwell.com/reference/createdocument) (PDF, Word, images, etc.).

LedgerStack uploads files to SignWell as **base64** (not a Supabase URL), so SignWell does not need public access to your storage bucket.

Check Vercel **Functions** logs for `[signwell api]` or `[signwell create document]` with the full SignWell message.

SignWell offers **25 API documents/month free**, then pay-as-you-go. Use `SIGNWELL_TEST_MODE=true` for unlimited non-binding test documents during development.
