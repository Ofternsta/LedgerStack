import { marketingStructuredData } from '@/lib/site-seo'

export function MarketingStructuredData() {
  const graphs = marketingStructuredData()

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphs) }}
    />
  )
}
