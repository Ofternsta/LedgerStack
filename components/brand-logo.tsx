import Image from 'next/image'
import Link from 'next/link'

const LOGO_ASSETS = {
  full: { src: '/logo.png', width: 1254, height: 1254 },
  icon: { src: '/logo-icon.png', width: 1024, height: 734 },
} as const

type BrandLogoProps = {
  href?: string
  size?: 'sm' | 'md' | 'lg' | 'cta' | 'hero' | 'hero-xl'
  /** full = logo with wordmark; icon = book only */
  variant?: keyof typeof LOGO_ASSETS
  showWordmark?: boolean
  className?: string
  /** Only set true for the single above-the-fold LCP image. */
  priority?: boolean
}

const heights = {
  sm: 32,
  md: 40,
  lg: 56,
  /** 3× lg — “Ready to stack your paperwork?” section */
  cta: 168,
  hero: 120,
  'hero-xl': 360,
} as const

export function BrandLogo({
  href = '/',
  size = 'md',
  variant = 'full',
  showWordmark = false,
  className = '',
  priority = false,
}: BrandLogoProps) {
  const h = heights[size]
  const asset = LOGO_ASSETS[variant]
  const heroQuality = size === 'hero-xl' ? 85 : 90

  const img = (
    <Image
      src={asset.src}
      alt="LedgerStack"
      width={asset.width}
      height={asset.height}
      quality={priority ? heroQuality : 85}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      sizes={
        size === 'hero-xl'
          ? '(max-width: 1024px) 0px, 360px'
          : size === 'hero'
            ? '120px'
            : `${h}px`
      }
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
