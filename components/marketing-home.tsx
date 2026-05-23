import Link from 'next/link'
import { BILLING_PLANS } from '@/lib/stripe-config'

const FEATURES = [
  {
    title: 'Claim workflow',
    description:
      'Track every job through Inspection → Documentation → Estimate → Approved → In Progress → Completed.',
    icon: '📊',
  },
  {
    title: 'Evidence vault',
    description:
      'Upload photos, PDFs, and videos from the field. OCR and AI categorize and summarize automatically.',
    icon: '📁',
  },
  {
    title: 'AI claim assistant',
    description:
      'Generate timelines and summaries from your evidence so adjusters and clients stay aligned.',
    icon: '✨',
  },
  {
    title: 'Team & clients',
    description:
      'Invite workers with org codes, grant clients view-only access per project, and keep internal chat private.',
    icon: '👥',
  },
]

const STEPS = [
  {
    step: '1',
    title: 'Create your company',
    body: 'Sign up as an admin, pick a plan, and verify your email.',
  },
  {
    step: '2',
    title: 'Open a project',
    body: 'Add the customer, address, and a claim — evidence uploads attach to the claim.',
  },
  {
    step: '3',
    title: 'Document & close',
    body: 'Move the claim through stages, export reports, and share with clients when ready.',
  },
]

export function MarketingHome() {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
            <span aria-hidden className="mr-1.5">
              📋
            </span>
            LedgerStack
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-gray-900">
              How it works
            </a>
            <a href="#pricing" className="hover:text-gray-900">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 px-3 py-2 min-h-[44px] inline-flex items-center"
            >
              Sign in
            </Link>
            <Link
              href="/login?signup=admin"
              className="text-sm font-medium bg-black text-white px-4 py-2.5 rounded-xl min-h-[44px] inline-flex items-center"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
            <p className="text-sm font-semibold text-blue-700 mb-4">
              Built for restoration &amp; insurance contractors
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl">
              Claims, evidence, and teams — in one stack.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl">
              LedgerStack helps your company organize projects, document damage,
              track claim status, and collaborate with workers and clients without
              scattered folders or email threads.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?signup=admin"
                className="inline-flex justify-center items-center bg-black text-white font-medium px-8 py-4 rounded-xl text-lg min-h-[52px]"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center items-center border-2 border-gray-300 text-gray-900 font-medium px-8 py-4 rounded-xl text-lg min-h-[52px]"
              >
                Sign in to your account
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              {BILLING_PLANS.trial.days}-day trial · Card required · Plans from $
              {BILLING_PLANS.starter.price}/mo
            </p>
          </div>
        </section>

        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 scroll-mt-20"
        >
          <h2 className="text-3xl font-bold tracking-tight">
            Everything on the job, organized
          </h2>
          <p className="mt-3 text-gray-600 text-lg max-w-2xl">
            Replace spreadsheets and text threads with a system your field crew
            and office staff can actually use on mobile.
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm"
              >
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-4 font-bold text-lg">{f.title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">{f.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="how-it-works"
          className="bg-gray-50 border-y border-gray-100 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-10 grid md:grid-cols-3 gap-8">
              {STEPS.map((s) => (
                <li key={s.step}>
                  <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-black text-white font-bold text-sm">
                    {s.step}
                  </span>
                  <h3 className="mt-4 font-bold text-lg">{s.title}</h3>
                  <p className="mt-2 text-gray-600 leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="pricing"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 scroll-mt-20"
        >
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-gray-600 text-lg">
            Choose a plan when you create your company account.
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(
              [
                ['trial', BILLING_PLANS.trial],
                ['starter', BILLING_PLANS.starter],
                ['professional', BILLING_PLANS.professional],
                ['enterprise', BILLING_PLANS.enterprise],
              ] as const
            ).map(([id, plan]) => (
              <li
                key={id}
                className={`border rounded-2xl p-5 flex flex-col ${
                  id === 'professional'
                    ? 'border-black ring-2 ring-black shadow-md'
                    : 'border-gray-200'
                }`}
              >
                {id === 'professional' && (
                  <span className="text-xs font-semibold text-white bg-black self-start px-2 py-0.5 rounded mb-2">
                    Popular
                  </span>
                )}
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {plan.price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      ${plan.price}
                      <span className="text-base font-normal text-gray-500">
                        /mo
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-3 text-sm text-gray-600 flex-1">
                  {id === 'trial'
                    ? `${plan.days}-day trial with payment method`
                    : 'projects' in plan && plan.projects === -1
                      ? 'Unlimited projects'
                      : `${plan.projects} projects`}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link
              href="/login?signup=admin"
              className="inline-flex bg-black text-white font-medium px-8 py-4 rounded-xl min-h-[52px] items-center"
            >
              Create company account
            </Link>
          </div>
        </section>

        <section className="bg-neutral-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to stack your paperwork?
            </h2>
            <p className="mt-4 text-neutral-300 text-lg max-w-xl mx-auto">
              Join contractors who keep claims, photos, and status in one place.
            </p>
            <Link
              href="/login?signup=admin"
              className="mt-8 inline-flex bg-white text-black font-medium px-8 py-4 rounded-xl min-h-[52px] items-center"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>
            <span aria-hidden>📋</span> LedgerStack
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-gray-900">
              Sign in
            </Link>
            <Link href="/login?signup=admin" className="hover:text-gray-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
