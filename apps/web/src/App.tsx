import { useState } from 'react'

const SWATCHES = [
  { name: 'primary', bg: 'bg-primary', fg: 'text-primary-foreground' },
  { name: 'secondary', bg: 'bg-secondary', fg: 'text-secondary-foreground' },
  { name: 'accent', bg: 'bg-accent', fg: 'text-accent-foreground' },
  { name: 'muted', bg: 'bg-muted', fg: 'text-muted-foreground' },
  { name: 'destructive', bg: 'bg-destructive', fg: 'text-destructive-foreground' },
] as const

const CHARTS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']

// Placeholder screen: exists to prove the theme tokens resolve.
// Replace wholesale with the first real Temple CRM view.
function App() {
  const [dark, setDark] = useState(false)

  // The dark variant is `&:is(.dark *)`, so the class must sit on an ancestor
  // of everything it styles — documentElement, not a wrapper inside the tree.
  const toggleDark = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-6 text-sidebar-foreground md:block">
        <div className="font-serif text-lg font-bold">Temple CRM</div>
        <nav className="mt-6 space-y-1 text-sm">
          <div className="rounded-md bg-sidebar-primary px-3 py-2 text-sidebar-primary-foreground">
            Theme check
          </div>
          <div className="rounded-md px-3 py-2 text-muted-foreground">Devotees</div>
          <div className="rounded-md px-3 py-2 text-muted-foreground">Donations</div>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Theme tokens</h1>
          <button
            type="button"
            onClick={toggleDark}
            className="rounded-md border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-xs"
          >
            {dark ? 'Light' : 'Dark'} mode
          </button>
        </div>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Every swatch below is driven by a <span className="font-mono">--color-*</span> token
          mapped in <span className="font-mono">index.css</span>. If these render flat or
          unstyled, the <span className="font-mono">@theme inline</span> block is not resolving.
        </p>

        <section className="mt-8 rounded-lg border bg-card p-6 text-card-foreground shadow-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Semantic
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {SWATCHES.map((s) => (
              <div
                key={s.name}
                className={`${s.bg} ${s.fg} rounded-md px-4 py-3 text-sm font-medium shadow-sm`}
              >
                {s.name}
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chart
          </h2>
          <div className="mt-4 flex gap-2">
            {CHARTS.map((c) => (
              <div key={c} className={`${c} h-12 w-12 rounded-md`} />
            ))}
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Type &amp; input
          </h2>
          <div className="mt-4 space-y-3">
            <p className="font-sans">Montserrat — sans, body copy</p>
            <p className="font-serif">Merriweather — serif, headings</p>
            <p className="font-mono">Ubuntu Mono — mono, numerals 0123456789</p>
            <input
              className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Focus me to check the ring token"
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
