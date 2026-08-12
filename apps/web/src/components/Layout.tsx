import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from './ui'

const devoteeNav = [
  { to: '/events', label: 'Darshan' },
  { to: '/my-bookings', label: 'My Bookings' },
  { to: '/profile', label: 'Profile' },
]

const adminNav = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/darshan', label: 'Darshan' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/devotees', label: 'Devotees' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/orders', label: 'Orders' },
]

/** Diya (oil lamp) mark — paired with the wordmark, not used anywhere else. */
function DiyaMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-primary" fill="none">
      <path
        d="M12 3.5c.9 1.1 1.3 2 1.3 2.8 0 .9-.6 1.5-1.3 1.5s-1.3-.6-1.3-1.5c0-.8.4-1.7 1.3-2.8Z"
        fill="currentColor"
      />
      <path
        d="M4 13c0-1.2 1-2 2.4-2H9c.7-.9 1.8-1.4 3-1.4s2.3.5 3 1.4h2.6c1.4 0 2.4.8 2.4 2 0 3.6-3.6 6.5-8 6.5s-8-2.9-8-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const nav = isAdmin ? adminNav : devoteeNav

  return (
    <div className="min-h-screen bg-background">
      {/* Honesty banner — the brief asks that simulated sign-in be labelled. */}
      <p className="bg-accent px-4 py-1.5 text-center text-xs font-semibold text-accent-foreground">
        Demo build — simulated sign-in, no payments taken
      </p>

      <header className="relative bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-1.5 font-serif text-lg font-bold">
            <DiyaMark />
            Temple CRM
          </span>

          <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-1">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                         isActive
                           ? 'bg-secondary text-secondary-foreground'
                           : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                       }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-right text-sm">
              <span className="block font-medium leading-tight">{user?.name}</span>
              <span className="block text-xs capitalize text-muted-foreground">
                {isAdmin ? 'Temple staff' : 'Devotee'}
              </span>
            </span>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
        {/* A hairline border reads flat; a soft two-tone rule feels like the
            edge of a temple threshold instead. */}
        <div className="h-[3px] bg-gradient-to-r from-primary via-accent to-primary/40" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
