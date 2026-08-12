import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/**
 * Small shared primitives so every lane's screens look like one product.
 * All colours come from the theme tokens in index.css — never hard-code a hex.
 */

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}
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

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-destructive" id={`${htmlFor}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

const controlClasses =
  'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClasses} ${className}`} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClasses} ${className}`} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${controlClasses} min-h-24 resize-y py-3 ${className}`}
    />
  )
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="status"
      className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground"
    >
      {message}
    </p>
  )
}

/** Placeholder for screens another lane owns. Delete when the real screen lands. */
export function Placeholder({ screen, owner }: { screen: string; owner: string }) {
  return (
    <EmptyState title={`${screen} — not built yet`} hint={`This screen belongs to the ${owner}.`} />
  )
}
