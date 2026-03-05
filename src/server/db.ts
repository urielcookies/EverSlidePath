/**
 * db.ts — D1 binding accessor
 *
 * @cloudflare/vite-plugin v1.x makes Worker bindings available via the
 * `cloudflare:env` virtual module in both `wrangler dev` and production.
 * Falls back gracefully to null outside Cloudflare (local Vite dev server).
 */

// Minimal D1 interfaces — avoids requiring @cloudflare/workers-types globally
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  run<T = unknown>(): Promise<D1Result<T>>
  all<T = unknown>(): Promise<D1Result<T>>
  first<T = unknown>(colName?: string): Promise<T | null>
}

export interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  error?: string
  meta?: object
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<{ count: number; duration: number }>
}

interface CloudflareEnv {
  DB: D1Database
}

/**
 * Returns the D1 binding if running inside a Cloudflare Worker, null otherwise.
 * Safe to call during SSR in local dev — just returns null and server functions
 * skip DB operations transparently.
 */
export async function getDB(): Promise<D1Database | null> {
  try {
    // `cloudflare:env` virtual module — provided by @cloudflare/vite-plugin v1.x
    const env = (await import('cloudflare:env')) as CloudflareEnv
    return env?.DB ?? null
  } catch {
    // Running in Vite dev server without wrangler (no Cloudflare context)
    return null
  }
}
