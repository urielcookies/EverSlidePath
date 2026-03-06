import { AsyncLocalStorage } from 'node:async_hooks'

export interface SessionUser {
  id: string
  role: 'instructor' | 'student'
  username: string | null
  display_name: string
  class_code: string | null
}

const sessionStorage = new AsyncLocalStorage<SessionUser | null>()

export function getSession(): SessionUser | null {
  return sessionStorage.getStore() ?? null
}

export function runWithSession<T>(user: SessionUser | null, fn: () => T): T {
  return sessionStorage.run(user, fn)
}
