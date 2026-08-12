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

export interface RegisterInput {
  name: string
  mobile?: string
  email?: string
  password: string
}

interface AuthContextValue {
  user: User | null
  state: AuthState
  isAdmin: boolean
  signIn: (credentials: { identifier: string; password: string }) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  signOut: () => Promise<void>
}

interface SessionResponse {
  token: string
  expiresAt: string
  user: User
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Password authentication. The server verifies the password and issues a
 * session token, which is sent as a bearer token on every later request. The
 * password itself is never stored client-side.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AuthState>('loading')

  // Restore the session before guarded routes render, otherwise a refresh on a
  // protected page would bounce to sign-in.
  useEffect(() => {
    if (!getToken()) {
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
        // Expired or revoked; drop it rather than retrying with a dead token.
        if (cancelled) return
        clearToken()
        setState('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const adopt = useCallback((session: SessionResponse) => {
    setToken(session.token)
    setUser(session.user)
    setState('authenticated')
    return session.user
  }, [])

  const signIn = useCallback(
    async (credentials: { identifier: string; password: string }) => {
      return adopt(await api.post<SessionResponse>('/auth/signin', credentials))
    },
    [adopt],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      return adopt(await api.post<SessionResponse>('/users', input))
    },
    [adopt],
  )

  const signOut = useCallback(async () => {
    // Revoke server-side so the token is dead even if a copy was taken; drop it
    // locally regardless, since the user asked to be signed out.
    await api.post('/auth/signout').catch(() => undefined)
    clearToken()
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
