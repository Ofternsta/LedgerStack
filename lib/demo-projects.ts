/** Seed/demo customers to hide and remove for a fresh start */
export const DEMO_PROJECT_NAMES = [
  'John Smith',
  'Jake Gipson',
  'Jake Smith',
] as const

export function isDemoProject(customerName: string) {
  return (DEMO_PROJECT_NAMES as readonly string[]).includes(customerName)
}
