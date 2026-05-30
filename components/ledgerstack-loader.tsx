import Image from 'next/image'

type LedgerStackLoaderProps = {
  /** sm = inline pages; md = route loading; lg = full screen */
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = {
  sm: { box: 'w-16 h-12', img: 64, h: 48 },
  md: { box: 'w-24 h-[4.5rem]', img: 96, h: 72 },
  lg: { box: 'w-32 h-24', img: 128, h: 96 },
} as const

/** Brand loader — arrow rises from bottom of logo and loops. */
export function LedgerStackLoader({
  size = 'md',
  label = 'Loading',
  className = '',
}: LedgerStackLoaderProps) {
  const s = sizes[size]

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={`ledgerstack-loader ${s.box}`}>
        <Image
          src="/logo-icon.png"
          alt=""
          width={1024}
          height={734}
          className="ledgerstack-loader__logo h-full w-auto object-contain"
          priority
        />
        <span className="ledgerstack-loader__arrow" aria-hidden />
      </div>
      {label ? (
        <p className="text-sm text-muted font-medium animate-pulse">{label}</p>
      ) : null}
    </div>
  )
}
