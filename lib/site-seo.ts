import type { Metadata } from 'next'
import { BILLING_PLANS, billingAppUrl } from '@/lib/stripe-config'

export const SITE_NAME = 'LedgerStack'

/** Short brand line — UI, app shell */
export const SITE_TAGLINE =
  'Field jobs, clients, and crew — one stack'

/** Primary SERP title for the homepage */
export const SITE_SERP_TITLE =
  'LedgerStack — Contractor Project Management Software'

/** Meta description (~155 chars) for search snippets */
export const SITE_DESCRIPTION =
  'LedgerStack helps contractors organize jobs, field photos, documents, and client updates in one place. Crew coordination, AI summaries, calendar, and client portal. Plans from $20/month.'

export const SITE_KEYWORDS = [
  'LedgerStack',
  'Ledger Stack',
  'ledgerstack',
  'ledgerstack.org',
  'contractor project management',
  'contractor project management software',
  'field contractor software',
  'construction job documentation',
  'job site documentation',
  'contractor client portal',
  'crew coordination app',
  'contractor workflow software',
  'field documentation app',
  'contractor photo management',
  'construction project software',
  'small contractor software',
]

export const MARKETING_FAQ = [
  {
    question: 'What is LedgerStack?',
    answer:
      'LedgerStack is web-based project management software for contractors. It organizes jobs, field photos, documents, timelines, crew access, and client sharing in one place — built for work that happens on site, not just in the office.',
  },
  {
    question: 'Who is LedgerStack for?',
    answer:
      'LedgerStack is built for contractors and trade businesses — solo operators on Starter, growing crews on Professional, and larger organizations on Enterprise. Workers get project access; clients can view shared files and status on eligible plans.',
  },
  {
    question: 'Does LedgerStack work on mobile?',
    answer:
      'Yes. LedgerStack is a responsive web app you can use from phones and tablets in the field to upload photos, update job status, and coordinate with your team.',
  },
  {
    question: 'How much does LedgerStack cost?',
    answer:
      'Plans start at $20/month for Starter (solo contractors), $70/month for Professional (team and client portal), and $150/month for Enterprise (unlimited scale). A 7-day trial is available when you sign up.',
  },
  {
    question: 'Can I share documents with clients?',
    answer:
      'Yes. On Professional and Enterprise plans, you can grant clients view-only access to selected project files and keep them aligned on job status without giving them full account access.',
  },
] as const

export function siteUrl(): string {
  return billingAppUrl()
}

export function absoluteUrl(path = '/'): string {
  const base = siteUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

export function defaultOgImage() {
  return {
    url: absoluteUrl('/logo.png'),
    width: 512,
    height: 512,
    alt: `${SITE_NAME} — contractor project management`,
  } as const
}

type PageMetadataInput = {
  /** Page title (template adds “| LedgerStack” unless useFullTitle) */
  title: string
  description: string
  path: string
  /** Homepage-style absolute title without template suffix */
  useFullTitle?: boolean
  index?: boolean
}

/** Consistent canonical, Open Graph, and Twitter metadata for public pages */
export function createPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path)
  const index = input.index !== false
  const ogImage = defaultOgImage()
  const title = input.useFullTitle
    ? { absolute: input.title }
    : input.title

  return {
    title,
    description: input.description,
    alternates: { canonical },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: canonical,
      siteName: SITE_NAME,
      title: input.useFullTitle ? input.title : `${input.title} | ${SITE_NAME}`,
      description: input.description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.useFullTitle ? input.title : `${input.title} | ${SITE_NAME}`,
      description: input.description,
      images: [ogImage.url],
    },
  }
}

/** Default metadata for the marketing site root layout */
export function rootSiteMetadata(): Metadata {
  const url = siteUrl()

  return {
    metadataBase: new URL(url),
    title: {
      default: SITE_SERP_TITLE,
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
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: SITE_NAME,
      title: SITE_SERP_TITLE,
      description: SITE_DESCRIPTION,
      images: [defaultOgImage()],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_SERP_TITLE,
      description: SITE_DESCRIPTION,
      images: [defaultOgImage().url],
    },
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  }
}

function planOffers() {
  const url = siteUrl()
  return (
    [
      ['starter', BILLING_PLANS.starter],
      ['professional', BILLING_PLANS.professional],
      ['enterprise', BILLING_PLANS.enterprise],
    ] as const
  ).map(([key, plan]) => ({
    '@type': 'Offer' as const,
    name: plan.name,
    price: String(plan.price),
    priceCurrency: 'USD',
    url: `${url}/login?signup=admin`,
    description: `${plan.name} plan for LedgerStack contractor project management`,
    availability: 'https://schema.org/InStock',
  }))
}

export function marketingStructuredData() {
  const url = siteUrl()
  const orgId = `${url}/#organization`
  const websiteId = `${url}/#website`
  const appId = `${url}/#software`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: SITE_NAME,
        alternateName: ['Ledger Stack', 'ledgerstack'],
        url,
        logo: absoluteUrl('/icon.png'),
        description: SITE_DESCRIPTION,
        email: 'support@ledgerstack.org',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@ledgerstack.org',
          availableLanguage: 'English',
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: SITE_NAME,
        alternateName: ['Ledger Stack'],
        url,
        description: SITE_DESCRIPTION,
        publisher: { '@id': orgId },
        inLanguage: 'en-US',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': appId,
        name: SITE_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url,
        description: SITE_DESCRIPTION,
        offers: planOffers(),
        provider: { '@id': orgId },
        isAccessibleForFree: false,
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}/#faq`,
        mainEntity: MARKETING_FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  }
}

export function breadcrumbStructuredData(
  items: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
