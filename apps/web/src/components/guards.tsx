import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  )
}

/** Blocks unauthenticated access and remembers where the user was heading. */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state === 'loading') return <Loading />
  if (state === 'anonymous') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/**
 * AUTH-02, client half. A devotee who types /admin is sent to their own home
 * rather than shown a forbidden page — the admin area should not appear to
 * exist. The server enforces this independently.
 */
export function RequireAdmin() {
  const { state, isAdmin } = useAuth()

  if (state === 'loading') return <Loading />
  if (state === 'anonymous') return <Navigate to="/signin" replace />
  if (!isAdmin) return <Navigate to="/home" replace />
  return <Outlet />
}

/** Keeps signed-in users off the sign-in and register screens. */
export function RedirectIfSignedIn() {
  const { state, isAdmin } = useAuth()

  if (state === 'loading') return <Loading />
  if (state === 'authenticated') return <Navigate to={isAdmin ? '/admin' : '/home'} replace />
  return <Outlet />
}

/** Role routing: admins land on the internal dashboard, devotees on the public side. */
export function HomeRedirect() {
  const { state, isAdmin } = useAuth()

  if (state === 'loading') return <Loading />
  if (state === 'anonymous') return <Navigate to="/signin" replace />
  return <Navigate to={isAdmin ? '/admin' : '/home'} replace />
}
