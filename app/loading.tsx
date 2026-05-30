import { LedgerStackLoader } from '@/components/ledgerstack-loader'

export default function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background safe-top safe-bottom">
      <LedgerStackLoader size="lg" label="Loading LedgerStack…" />
    </div>
  )
}
