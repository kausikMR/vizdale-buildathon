import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button, DiyaCorner, LotusMark, SwirlDivider } from './ui'

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

/** Circular initial avatar in the header — no photo store, so a lettermark stands in. */
function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
      style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
    >
      {initial}
    </span>
  )
}

export function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const nav = isAdmin ? adminNav : devoteeNav

  return (
    <div className="min-h-screen bg-background">
      {/* Honesty banner — the brief asks that simulated sign-in be labelled. */}
      <p className="bg-banner px-4 py-1.5 text-center text-xs font-semibold text-banner-foreground">
        🔔 Demo build — simulated sign-in, no payments taken
      </p>

      <header className="relative bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-1.5 font-serif text-lg font-bold text-primary">
            <LotusMark className="h-6 w-6" />
            <span className="text-foreground">Temple CRM</span>
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
                           ? 'bg-card text-primary shadow-sm ring-1 ring-border'
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
            <Avatar name={user?.name ?? ''} />
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
            edge of a temple threshold instead. Shimmers slowly, like lamplight. */}
        <div
          className="rule-shimmer h-[3px]"
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--primary), var(--accent), var(--primary), var(--accent), var(--primary))',
          }}
        />
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="relative mt-8 overflow-hidden py-10">
        <DiyaCorner className="pointer-events-none absolute -bottom-2 -left-2 h-24 w-24 opacity-70 sm:h-28 sm:w-28" />
        <DiyaCorner
          flip
          className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 opacity-70 sm:h-28 sm:w-28"
        />
        <div className="mx-auto max-w-xs text-center">
          <SwirlDivider className="mx-auto h-3 w-32" />
          <p className="mt-2 font-serif text-sm italic text-muted-foreground">
            May your journey be blessed
          </p>
        </div>
      </footer>
    </div>
  )
}
