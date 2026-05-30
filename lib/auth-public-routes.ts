/** Routes reachable without a Supabase session (admin signup → verify → pay). */
export function isPublicSignupCheckoutPath(pathname: string): boolean {
  return (
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    pathname.startsWith('/onboarding/')
  )
}

export function isSignupRegisterCheckoutRequest(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  return (
    (pathname === '/checkout' || pathname.startsWith('/checkout/')) &&
    searchParams.get('register') === '1'
  )
}

/** SEO / crawlers — must not redirect to login. */
export function isPublicSeoPath(pathname: string): boolean {
  return pathname === '/robots.txt' || pathname === '/sitemap.xml'
}

/** Legal pages — public without login. */
export function isPublicLegalPath(pathname: string): boolean {
  return pathname === '/privacy' || pathname === '/terms'
}
