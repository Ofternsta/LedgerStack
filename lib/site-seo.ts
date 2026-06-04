import type { Metadata } from 'next'
import { BILLING_PLANS, billingAppUrl } from '@/lib/stripe-config'

export const SITE_NAME = 'LedgerStack'

/** Short brand line — UI, app shell */
export const SITE_TAGLINE =
  'Field jobs, clients, and crew — one stack'

/** Primary SERP title for the homepage */
export const SITE_SERP_TITLE =
  'LedgerStack — Contractor & Restoration Project Management'

/** Meta description (~155 chars) for search snippets */
export const SITE_DESCRIPTION =
  'LedgerStack helps contractors and restoration teams organize jobs, field evidence, and claim workflows in one place. AI, crew tools, client portal, document signatures coming soon.'

/**
 * Full product description for structured data, app listings, and marketing.
 * Based on the restoration/insurance project-management positioning template.
 */
export const SITE_LONG_DESCRIPTION =
  'LedgerStack is a comprehensive project and job management platform designed for contractors, restoration professionals, and insurance-adjacent field teams. It simplifies the organization, documentation, and tracking of damage assessments, job and claim statuses, and repair workflows within a centralized system accessible on mobile devices in the field. It includes automated evidence categorization using OCR and AI, seamless job lifecycle management from inspection through completion, team and client collaboration with secure role-based access, project calendars and messaging, AI-assisted summaries and project-scoped chat, customizable reporting and analytics, and document signatures (coming soon)—helping teams overcome disorganized documentation, inefficient communication, and tracking delays. LedgerStack is ideal for contractors, restoration crews, adjusters, and trade businesses seeking to streamline project workflows, improve crew coordination, enhance client transparency, and increase operational efficiency.'

export const SITE_KEYWORDS = [
  'LedgerStack',
  'Ledger Stack',
  'ledgerstack',
  'ledgerstack.org',
  'contractor project management',
  'contractor project management software',
  'restoration contractor software',
  'restoration project management',
  'insurance claim documentation',
  'damage assessment software',
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
  'document signatures contractor',
  'e-signature restoration',
]

export const MARKETING_FAQ = [
  {
    question: 'What is LedgerStack?',
    answer:
      'LedgerStack is a web-based project and job management platform for contractors, restoration professionals, and insurance-adjacent field teams. It centralizes damage assessments, job documentation, claim-style workflows, crew coordination, and client sharing—with AI categorization, calendars, analytics, and SignWell e-signatures on Professional+ plans—all usable from mobile devices on site.',
  },
  {
    question: 'Who is LedgerStack for?',
    answer:
      'LedgerStack is built for contractors, restoration crews, adjusters, and trade businesses—from solo operators on Starter to larger organizations on Enterprise. Workers get scoped project access; clients can view shared files and status on eligible plans.',
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
  {
    question: 'Does LedgerStack support document signatures?',
    answer:
      'Yes. On Professional and Enterprise plans, admins can request a client signature on a PDF. Clients sign with a typed name through SignWell (embedded in LedgerStack), receive email and in-app notifications, and the signed PDF is stored under Signed documents on the project.',
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
        description: SITE_LONG_DESCRIPTION,
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
        description: SITE_LONG_DESCRIPTION,
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
        description: SITE_LONG_DESCRIPTION,
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
