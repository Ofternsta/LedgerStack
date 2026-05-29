# Legal pages (LedgerStack)

Public URLs (after deploy):

- https://ledgerstack.org/privacy
- https://ledgerstack.org/terms

## Customize operator name

Set in Vercel (or `.env.local`):

```env
NEXT_PUBLIC_LEGAL_OPERATOR_NAME=Your Legal Name or LLC
```

Default is `LedgerStack` if unset.

## Updating policies

1. Edit `components/legal/privacy-content.tsx` or `components/legal/terms-content.tsx`
2. Update `LEGAL_LAST_UPDATED` in `lib/legal-meta.ts`
3. Redeploy

## In-app notices

Short notices live in `lib/legal-notices.ts` and render via `components/legal-notice.tsx`.

Not legal advice — have a lawyer review before relying on these documents for compliance.
