import type { Metadata } from 'next'
import { billingAppUrl } from '@/lib/stripe-config'

export const SITE_NAME = 'LedgerStack'
export const SITE_TAGLINE =
  'Reports & documents for restoration contractors'
export const SITE_DESCRIPTION =
  'LedgerStack helps restoration and insurance contractors organize projects, track report status, upload field documents with AI, and collaborate with workers and clients.'

export const SITE_KEYWORDS = [
  'LedgerStack',
  'Ledger Stack',
  'ledgerstack',
  'ledgerstack.org',
  'restoration contractor software',
  'insurance restoration software',
  'property damage documentation',
  'restoration project management',
  'contractor report workflow',
  'field documentation app',
]

export function siteUrl(): string {
  return billingAppUrl()
}

export function absoluteUrl(path = '/'): string {
  const base = siteUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

/** Default metadata for the marketing site (homepage + root). */
export function rootSiteMetadata(): Metadata {
  const url = siteUrl()
  const title = `${SITE_NAME} — ${SITE_TAGLINE}`

  return {
    metadataBase: new URL(url),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME, url }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'Business',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: SITE_NAME,
      title,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: '/icon.png',
          width: 512,
          height: 512,
          alt: `${SITE_NAME} logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
      images: ['/icon.png'],
    },
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  }
}

export function marketingStructuredData() {
  const url = siteUrl()

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      alternateName: ['Ledger Stack', 'ledgerstack'],
      url,
      logo: absoluteUrl('/icon.png'),
      description: SITE_DESCRIPTION,
      email: 'support@ledgerstack.org',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: ['Ledger Stack'],
      url,
      description: SITE_DESCRIPTION,
      publisher: { '@type': 'Organization', name: SITE_NAME, url },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url,
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '20',
        priceCurrency: 'USD',
        description: 'Plans from Starter at $20/month',
      },
    },
  ]
}
