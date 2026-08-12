import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, clearUserId, getUserId, setUserId } from './api'
import type { User } from './types'

type AuthState = 'loading' | 'authenticated' | 'anonymous'

export interface RegisterInput {
  name: string
  mobile?: string
  email?: string
}

interface AuthContextValue {
  user: User | null
  state: AuthState
  isAdmin: boolean
  signIn: (choice: { userId?: string; identifier?: string }) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Simulated authentication (CONTRACT.md section 5). There is no password and no
 * token — the chosen account's id is kept locally and sent as x-user-id, and
 * the server resolves the role from it. Every screen that exposes this says so.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>('loading')

  // Restore the chosen account before guarded routes render, otherwise a
  // refresh on a protected page would bounce to sign-in.
  useEffect(() => {
    if (!getUserId()) {
      setState('anonymous')
      return
    }
    let cancelled = false
    api
      .get<{ user: User }>('/me')
      .then(({ user: me }) => {
        if (cancelled) return
        setUser(me)
        setState('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearUserId()
        setState('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const adopt = useCallback((next: User) => {
    setUserId(next.id)
    setUser(next)
    setState('authenticated')
    return next
  }, [])

  const signIn = useCallback(
    async (choice: { userId?: string; identifier?: string }) => {
      const { user: next } = await api.post<{ user: User }>('/auth/signin', choice)
      return adopt(next)
    },
    [adopt],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const { user: next } = await api.post<{ user: User }>('/users', input)
      // Registration signs the new devotee straight in; there is no separate
      // credential step to complete.
      return adopt(next)
    },
    [adopt],
  )

  const signOut = useCallback(() => {
    clearUserId()
    setUser(null)
    setState('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, state, isAdmin: user?.role === 'admin', signIn, register, signOut }),
    [user, state, signIn, register, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
