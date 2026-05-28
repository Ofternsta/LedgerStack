# SEO — LedgerStack in search engines

The app ships with metadata, `robots.txt`, `sitemap.xml`, and structured data so Google can index **https://ledgerstack.org**.

Indexing is not instant. After deploy, complete the steps below.

## 1. Production URL

On Vercel, set:

```env
NEXT_PUBLIC_APP_URL=https://ledgerstack.org
```

Redeploy. Confirm:

- https://ledgerstack.org/robots.txt (should be plain text, not the login page)
- https://ledgerstack.org/sitemap.xml (should be XML, not the login page)

## 2. Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add property **URL prefix**: `https://ledgerstack.org`
3. Verify ownership (HTML tag method):
   - Copy the `content="..."` value from Google.
   - Add to Vercel: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<that value>`
   - Redeploy.
4. **Sitemaps** → submit: `https://ledgerstack.org/sitemap.xml`
5. **URL inspection** → enter `https://ledgerstack.org/` → **Request indexing**.

Repeat for Bing: [Bing Webmaster Tools](https://www.bing.com/webmasters).

## 3. Optional but helpful

- Link to **https://ledgerstack.org** from your company site, email signature, or social profiles.
- Add a **1200×630** social image at `app/opengraph-image.png` (better previews than the square icon).
- Keep the homepage public (logged-out visitors see marketing; crawlers do not need accounts).

## What is indexed

| URL | Indexed |
|-----|---------|
| `/` (homepage) | Yes |
| `/login` | Yes |
| `/projects`, `/project/*`, app settings | No (`noindex` / `robots` disallow) |

## Brand query

Searching **LedgerStack** or **ledgerstack.org** should improve once Google processes the sitemap (often a few days; new sites can take longer).
