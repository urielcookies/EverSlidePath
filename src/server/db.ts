import { getWorkerEnv } from './workerEnv'

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

/**
 * Returns the D1 binding if running inside a Cloudflare Worker, null otherwise.
 */
export function getDB(): D1Database | null {
  return getWorkerEnv()?.DB ?? null
}
