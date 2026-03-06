import { getStoredToken } from './lib/authClient'

/**
 * Patches window.fetch once to inject the stored Bearer token into every
 * same-origin request. TanStack Start server function calls all go through
 * fetch, so this covers all server functions without modifying each one.
 *
 * Call installAuthFetchInterceptor() once in __root.tsx beforeLoad.
 */
export function installAuthFetchInterceptor(): void {
  if (typeof window === 'undefined') return
  // Guard against double-install
  if ((window as any).__espAuthInterceptorInstalled) return
  ;(window as any).__espAuthInterceptorInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url

    const isSameOrigin =
      url.startsWith('/') || url.startsWith(window.location.origin)

    if (isSameOrigin) {
      const token = getStoredToken()
      if (token) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return originalFetch(input, { ...init, headers })
      }
    }

    return originalFetch(input, init)
  }
}
