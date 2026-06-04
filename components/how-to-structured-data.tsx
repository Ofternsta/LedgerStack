import { breadcrumbStructuredData } from '@/lib/site-seo'

export function HowToStructuredData() {
  const data = breadcrumbStructuredData([
    { name: 'Home', path: '/' },
    { name: 'How to use LedgerStack', path: '/how-to' },
  ])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
