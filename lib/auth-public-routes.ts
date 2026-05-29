/** Routes reachable without a Supabase session (admin signup → verify → pay). */
export function isPublicSignupCheckoutPath(pathname: string): boolean {
  return pathname === '/checkout' || pathname.startsWith('/onboarding/')
}

/** SEO / crawlers — must not redirect to login. */
export function isPublicSeoPath(pathname: string): boolean {
  return pathname === '/robots.txt' || pathname === '/sitemap.xml'
}

/** Legal pages — public without login. */
export function isPublicLegalPath(pathname: string): boolean {
  return pathname === '/privacy' || pathname === '/terms'
}
