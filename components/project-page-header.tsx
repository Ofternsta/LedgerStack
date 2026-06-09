import Link from 'next/link'

type ProjectPageHeaderProps = {
  title: string
  location: string
  backHref?: string
  backLabel?: string
}

/** Project title block at the top of the page (scrolls with content). */
export function ProjectPageHeader({
  title,
  location,
  backHref = '/projects',
  backLabel = 'Projects',
}: ProjectPageHeaderProps) {
  return (
    <header className="border-b border-border bg-background safe-top shrink-0 w-full">
      <div className="safe-x px-4 sm:px-6 lg:px-8 py-3 w-full max-w-[1600px] mx-auto">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-brand-bright font-medium mb-2 min-h-[40px]"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted mt-1 leading-snug">{location}</p>
      </div>
    </header>
  )
}
