import Image from 'next/image'
import Link from 'next/link'

/** Native pixels of public/logo.png — keep in sync if the asset is replaced. */
const LOGO_WIDTH = 1254
const LOGO_HEIGHT = 1254

type BrandLogoProps = {
  href?: string
  size?: 'sm' | 'md' | 'lg' | 'hero' | 'hero-xl'
  showWordmark?: boolean
  className?: string
}

/** hero-xl = 3× default hero (120 → 360) for marketing headline */
const heights = { sm: 32, md: 40, lg: 56, hero: 120, 'hero-xl': 360 } as const

export function BrandLogo({
  href = '/',
  size = 'md',
  showWordmark = false,
  className = '',
}: BrandLogoProps) {
  const h = heights[size]
  const isPriority = size === 'hero' || size === 'hero-xl' || size === 'lg'

  const img = (
    <Image
      src="/logo.png"
      alt="LedgerStack"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      quality={95}
      priority={isPriority}
      sizes={`${h}px`}
      className={`h-auto w-auto max-w-full object-contain ${className}`}
      style={{ height: h, width: 'auto' }}
    />
  )

  if (!href) {
    return showWordmark ? (
      <div className="flex flex-col items-center gap-2">{img}</div>
    ) : (
      img
    )
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 shrink-0 ${className}`}
    >
      {img}
      {showWordmark && (
        <span className="font-bold text-lg tracking-tight">
          <span className="text-white">Ledger</span>
          <span className="brand-gradient-text">Stack</span>
        </span>
      )}
    </Link>
  )
}
