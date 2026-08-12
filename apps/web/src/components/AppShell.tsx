import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

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

function DarkToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  // The dark variant is `&:is(.dark *)`, so the class must sit on an ancestor
  // of everything it styles — documentElement, not a wrapper inside the tree.
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}

export function AppShell() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  // Admin entries are filtered out entirely rather than disabled, so the admin
  // area leaves no trace in a devotee's navigation.
  const items = NAV.filter((item) => !item.adminOnly || isAdmin)

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <p className="bg-secondary px-4 py-1.5 text-center text-xs text-secondary-foreground">
        Demo build — sign-in is simulated and no credentials are checked.
      </p>

      <header className="border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-serif text-lg font-bold">Temple CRM</span>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">{user?.name} · </span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium',
                  isAdmin
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isAdmin ? 'Admin' : 'Devotee'}
              </span>
            </span>
            <DarkToggle />
            <Button type="button" variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut aria-hidden />
            </Button>
          </div>
        </div>

        <nav aria-label="Main" className="mx-auto max-w-5xl px-4">
          <ul className="flex flex-wrap gap-1 pb-2">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'inline-block rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
