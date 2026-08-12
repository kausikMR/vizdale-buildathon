import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, clearToken, getToken, setToken } from './api'
import type { User } from './types'

type AuthState = 'loading' | 'authenticated' | 'anonymous'

interface ProfileInput {
  name: string
  mobile?: string
  email?: string
}

interface AuthContextValue {
  user: User | null
  state: AuthState
  isAdmin: boolean
  signIn: (identifier: string) => Promise<User>
  register: (input: ProfileInput) => Promise<User>
  updateProfile: (input: ProfileInput) => Promise<User>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Simulated authentication. The server issues an opaque session token with no
 * credential check at all — this stands in for real sign-in, and every surface
 * that exposes it is labelled as simulated.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>('loading')

  // Restore a session from a previous visit before rendering guarded routes,
  // otherwise a refresh on /profile would bounce to sign-in.
  useEffect(() => {
    if (!getToken()) {
      setState('anonymous')
      return
    }
    let cancelled = false
    api<{ user: User }>('/auth/me')
      .then(({ user: me }) => {
        if (cancelled) return
        setUser(me)
        setState('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setState('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const adopt = useCallback((token: string, next: User) => {
    setToken(token)
    setUser(next)
    setState('authenticated')
    return next
  }, [])

  const signIn = useCallback(
    async (identifier: string) => {
      const { token, user: next } = await api<{ token: string; user: User }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      })
      return adopt(token, next)
    },
    [adopt],
  )

  const register = useCallback(
    async (input: ProfileInput) => {
      const { token, user: next } = await api<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return adopt(token, next)
    },
    [adopt],
  )

  const updateProfile = useCallback(async (input: ProfileInput) => {
    const { user: next } = await api<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setUser(next)
    return next
  }, [])

  const signOut = useCallback(async () => {
    // Drop the local session even if the server call fails — the user asked
    // to be signed out, and a stale token is worse than an unreported error.
    await api('/auth/signout', { method: 'POST' }).catch(() => undefined)
    clearToken()
    setUser(null)
    setState('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      state,
      isAdmin: user?.role === 'admin',
      signIn,
      register,
      updateProfile,
      signOut,
    }),
    [user, state, signIn, register, updateProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
