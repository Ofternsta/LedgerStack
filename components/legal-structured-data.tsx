import { breadcrumbStructuredData } from '@/lib/site-seo'

type LegalStructuredDataProps = {
  pageName: string
  path: string
}

export function LegalStructuredData({ pageName, path }: LegalStructuredDataProps) {
  const data = breadcrumbStructuredData([
    { name: 'Home', path: '/' },
    { name: pageName, path },
  ])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
