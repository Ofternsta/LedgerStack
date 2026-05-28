import { MarketingHome } from '@/components/marketing-home'
import { MarketingStructuredData } from '@/components/marketing-structured-data'

/** Static marketing page; logged-in users are redirected in middleware. */
export const dynamic = 'force-static'

export default function HomePage() {
  return (
    <>
      <MarketingStructuredData />
      <MarketingHome />
    </>
  )
}
