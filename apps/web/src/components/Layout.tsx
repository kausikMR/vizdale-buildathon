import type { ReactNode } from 'react'

import { LotusIcon } from './icons'
import { Select } from './ui'
import type { DemoUser } from '../lib/types'

export type AppPage = 'prasadam' | 'inventory'

export function Layout({
  user,
  users,
  page,
  onPageChange,
  onUserChange,
  children,
}: {
  user: DemoUser
  users: DemoUser[]
  page: AppPage
  onPageChange: (page: AppPage) => void
  onUserChange: (user: DemoUser) => void
  children: ReactNode
}) {
  const navItem = (target: AppPage, label: string) => (
    <button
      className={`min-h-11 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        page === target
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      onClick={() => onPageChange(target)}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <button
            className="flex min-h-11 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => onPageChange('prasadam')}
            type="button"
          >
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <LotusIcon className="size-7" />
            </span>
            <span>
              <span className="block font-serif text-base font-bold leading-tight">Divya Seva</span>
              <span className="block text-xs text-muted-foreground">Temple services</span>
            </span>
          </button>

          <nav aria-label="Main" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            {navItem('prasadam', 'Prasadam')}
            {user.role === 'admin' && navItem('inventory', 'Inventory')}
          </nav>

          <div className="ml-auto min-w-44">
            <label className="sr-only" htmlFor="demo-user">
              Simulated sign-in account
            </label>
            <Select
              aria-label="Simulated sign-in account"
              className="min-h-10 py-0"
              id="demo-user"
              onChange={(event) => {
                const nextUser = users.find((candidate) => candidate.id === event.target.value)
                if (nextUser) onUserChange(nextUser)
              }}
              value={user.id}
            >
              {users.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} · {candidate.role}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-accent/20">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium text-accent-foreground">
          Demo mode · Sign-in is simulated · Prices are informational only · No payment is collected
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
