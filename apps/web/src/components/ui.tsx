import type { ReactNode } from 'react'

/**
 * Small shared primitives so every lane's screens look like one product.
 * All colours come from the theme tokens in index.css — never hard-code a hex.
 */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow
        duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  }
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold
        transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
        disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

/**
 * Status pill. Never colour-only: the label always carries the meaning, so it
 * still reads correctly in greyscale or for colour-blind users.
 */
export function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    published: 'bg-primary/15 text-primary',
    confirmed: 'bg-primary/15 text-primary',
    ready: 'bg-accent/25 text-accent-foreground',
    fulfilled: 'bg-muted text-muted-foreground',
    draft: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/15 text-destructive',
    completed: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        tones[status] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {status}
    </span>
  )
}

/** Inline error region. `role="alert"` so screen readers announce failures. */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-muted-foreground">
      {label}
    </p>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </Card>
  )
}

/** Placeholder for screens another lane owns. Delete when the real screen lands. */
export function Placeholder({ screen, owner }: { screen: string; owner: string }) {
  return (
    <EmptyState title={`${screen} — not built yet`} hint={`This screen belongs to the ${owner}.`} />
  )
}

/**
 * Signature ornament: a single-line gopuram (temple tower) silhouette. Used
 * once, above the sign-in title — the one place in the product that earns a
 * decorative flourish. Pure line art in `currentColor` so it follows the
 * surrounding text color in both themes; purely decorative, hence aria-hidden.
 */
export function TempleArch({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 56"
      aria-hidden="true"
      className={`mx-auto text-primary ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="60" cy="4.5" r="2.2" fill="currentColor" stroke="none" />
      <path d="M60 6.7 V11" />
      <path d="M34 30 C34 17 45 11 60 11 C75 11 86 17 86 30" />
      <path d="M28 30 H92" />
      <path d="M32 30 V50" />
      <path d="M88 30 V50" />
      <path d="M24 50 H96" />
      <circle cx="60" cy="27" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="50" cy="29" r="1" fill="currentColor" stroke="none" />
      <circle cx="70" cy="29" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * Kolam-inspired dot rule: a quiet section divider evoking the dot lattices
 * drawn at a temple threshold. Decorative only — never a substitute for a real
 * heading or landmark.
 */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-2.5 py-1 text-accent ${className}`}
    >
      {[0.4, 0.7, 1, 0.7, 0.4].map((scale, i) => (
        <span
          key={i}
          className="block rounded-full bg-current"
          style={{ width: `${scale * 5}px`, height: `${scale * 5}px`, opacity: 0.5 + scale * 0.3 }}
        />
      ))}
    </div>
  )
}

/**
 * A booking or order reference, styled like a small brass plaque rather than
 * bare text — it is the one thing a devotee needs to remember or hand to
 * staff, so it should look like it matters.
 */
export function ReferencePlaque({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1
        font-mono text-sm font-semibold tracking-wide text-accent-foreground ${className}`}
    >
      {value}
    </span>
  )
}
