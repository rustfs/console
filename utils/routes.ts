/**
 * Route utility functions
 * Unified management of route paths and navigation logic
 */
import { joinURL } from 'ufo'

/**
 * Get application baseURL
 * @returns baseURL path
 */
function getBaseURL(): string {
  // On client side, infer baseURL from window.location
  if (process.client) {
    const pathname = window.location.pathname
    // If path starts with /rustfs/console, extract base path
    const match = pathname.match(/^(\/rustfs\/console)/)
    if (match) {
      return match[1] + '/'
    }
  }

  // Default value
  return '/rustfs/console/'
}

/**
 * Build complete route path (including baseURL)
 * @param path Route path
 * @returns Complete path
 */
export function buildRoute(path: string): string {
  const baseURL = getBaseURL()
  return joinURL(baseURL.replace(/\/$/, ''), path.replace(/^\//, ''))
}

/**
 * Navigate to specified route
 * @param path Route path
 * @param options Navigation options
 */
export async function navigateToRoute(
  path: string,
  options?: { external?: boolean; replace?: boolean }
): Promise<void> {
  const fullPath = buildRoute(path)

  if (options?.external) {
    window.location.href = fullPath
  } else {
    await navigateTo(fullPath, { replace: options?.replace })
  }
}

/**
 * Get login page path
 * @returns Complete login page path
 */
export function getLoginRoute(): string {
  return buildRoute('/auth/login')
}
