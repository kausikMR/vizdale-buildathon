import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from './ui'
import { useAuth } from '../lib/auth'

interface NavItem {
  to: string
  label: string
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/home', label: 'Home' },
  { to: '/admin', label: 'Dashboard', adminOnly: true },
  { to: '/admin/devotees', label: 'Devotees', adminOnly: true },
  { to: '/profile', label: 'Profile' },
]

/**
 * Header, role-aware nav and the simulation banner. Screens render inside the
 * Outlet and should not repeat the banner.
 */
export function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  // Admin entries are filtered out rather than disabled, so the admin area
  // leaves no trace in a devotee's navigation. The server enforces the same
  // rule independently — this is only the cosmetic half.
  const items = NAV.filter((item) => !item.adminOnly || isAdmin)

  const handleSignOut = () => {
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <p className="bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground">
        Demo build — sign-in is simulated and no payment is collected.
      </p>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-serif text-lg font-bold">Temple CRM</span>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">{user?.name} · </span>
              {isAdmin ? 'Administrator' : 'Devotee'}
            </span>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>

        <nav aria-label="Main" className="mx-auto max-w-6xl px-4">
          <ul className="flex flex-wrap gap-1 pb-2">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `inline-block rounded-md px-3 py-1.5 text-sm font-medium transition
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                       isActive
                         ? 'bg-secondary text-secondary-foreground'
                         : 'text-muted-foreground hover:bg-muted'
                     }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
