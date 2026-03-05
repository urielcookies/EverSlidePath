import { AsyncLocalStorage } from 'node:async_hooks'
import type { D1Database } from './db'

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
  delete(key: string): Promise<void>
}

export interface WorkerBindings {
  DB: D1Database
  BUCKET: R2Bucket
  STATIC_ASSETS: unknown
  [key: string]: unknown
}

const storage = new AsyncLocalStorage<WorkerBindings>()

export function getWorkerEnv(): WorkerBindings | undefined {
  return storage.getStore()
}

export function runWithEnv<T>(env: WorkerBindings, fn: () => T): T {
  return storage.run(env, fn)
}
