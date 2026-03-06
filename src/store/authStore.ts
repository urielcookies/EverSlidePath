import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import type { SessionUser } from '../server/session'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  user: SessionUser | null
  status: AuthStatus
}

export const authStore = new Store<AuthState>({
  user: null,
  status: 'loading',
})

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector)
}

export function setAuthUser(user: SessionUser): void {
  authStore.setState((prev) => ({ ...prev, user, status: 'authenticated' }))
}

export function clearAuthUser(): void {
  authStore.setState((prev) => ({ ...prev, user: null, status: 'unauthenticated' }))
}

export function setAuthLoading(): void {
  authStore.setState((prev) => ({ ...prev, status: 'loading' }))
}
