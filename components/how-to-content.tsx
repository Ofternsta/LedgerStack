import Link from 'next/link'
import { LegalDocumentLayout } from '@/components/legal-document-layout'
import { GUIDE_PARTS, type GuideSection } from '@/lib/how-to-guide'

function GuideSectionBlock({ section }: { section: GuideSection }) {
  return (
    <section id={section.id} className="scroll-mt-24 space-y-3">
      <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
      {section.paragraphs?.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {section.bullets?.length ? (
        <ul className="list-disc list-inside space-y-1.5 text-sm">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function HowToContent() {
  return (
    <LegalDocumentLayout title="How to use LedgerStack">
      <p>
        A plain-language guide to every major area of the app — who it is for, how
        projects and jobs work, client e-signatures on Professional+, file
        categories (including Signed documents), and what each role can do on
        each plan.
      </p>

      <nav
        aria-label="Guide contents"
        className="rounded-lg border border-border bg-surface p-4 space-y-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          On this page
        </p>
        {GUIDE_PARTS.map((part) => (
          <div key={part.id}>
            <a
              href={`#part-${part.id}`}
              className="text-sm font-semibold text-brand-bright hover:underline"
            >
              {part.title}
            </a>
            <ul className="mt-1 ml-3 space-y-0.5 text-sm border-l border-border pl-3">
              {part.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted hover:text-brand-bright">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {GUIDE_PARTS.map((part) => (
        <div
          key={part.id}
          id={`part-${part.id}`}
          className="scroll-mt-24 pt-8 border-t border-border first:border-t-0 first:pt-0"
        >
          <h2 className="text-xl font-bold text-foreground mb-2">{part.title}</h2>
          {part.intro ? <p className="mb-6 text-foreground/90">{part.intro}</p> : null}
          <div className="space-y-8">
            {part.sections.map((section) => (
              <GuideSectionBlock key={section.id} section={section} />
            ))}
          </div>
        </div>
      ))}

      <p className="pt-8 border-t border-border text-sm text-muted">
        Ready to start?{' '}
        <Link href="/login?signup=admin" className="text-brand-bright hover:underline">
          Create a company account
        </Link>{' '}
        or{' '}
        <Link href="/login" className="text-brand-bright hover:underline">
          sign in
        </Link>
        . See{' '}
        <Link href="/" className="text-brand-bright hover:underline">
          pricing
        </Link>{' '}
        on the homepage.
      </p>
    </LegalDocumentLayout>
  )
}
