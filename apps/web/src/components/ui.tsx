import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { templeImages } from '../lib/images'

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

const WARM_GRADIENT = 'linear-gradient(135deg, var(--accent), var(--primary))'

export function Button({ variant = 'primary', className = '', style, ...props }: ButtonProps) {
  const variants = {
    // The main call-to-action gets the marigold-to-vermilion gradient that
    // carries through the rest of the temple theme; other variants stay flat
    // so they read as secondary/neutral/destructive by weight, not just hue.
    primary: 'text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-px',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  }
  return (
    <button
      {...props}
      style={variant === 'primary' ? { backgroundImage: WARM_GRADIENT, ...style } : style}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold
        transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
    />
  )
}

/** Same gradient treatment as the primary Button, for a same-styled <Link>. */
export function GradientLink({
  children,
  className = '',
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      style={{ backgroundImage: WARM_GRADIENT }}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-sm
        font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-px hover:shadow-md
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
    >
      {children}
    </Link>
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

/**
 * A wide gopuram skyline: three towers of varying height, tiled once as a
 * silhouette band. Used as a low-opacity ground line under a hero, never
 * behind body text — it is atmosphere, not a heading.
 */
export function TempleSkyline({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 90"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={`text-primary ${className}`}
      fill="currentColor"
    >
      {[
        { x: 10, w: 70, h: 46 },
        { x: 100, w: 90, h: 66 },
        { x: 210, w: 70, h: 50 },
        { x: 300, w: 90, h: 72 },
      ].map((tower, i) => {
        const top = 90 - tower.h
        const tiers = 3
        return (
          <g key={i}>
            {Array.from({ length: tiers }, (_, t) => {
              const shrink = t * (tower.w * 0.12)
              return (
                <rect
                  key={t}
                  x={tower.x + shrink / 2}
                  y={top + t * ((tower.h - 14) / tiers)}
                  width={tower.w - shrink}
                  height={(tower.h - 14) / tiers + 4}
                />
              )
            })}
            <path
              d={`M ${tower.x + tower.w * 0.3} ${top} L ${tower.x + tower.w / 2} ${top - 14} L ${
                tower.x + tower.w * 0.7
              } ${top}`}
            />
            <circle cx={tower.x + tower.w / 2} cy={top - 17} r="2.6" />
          </g>
        )
      })}
      <rect x="0" y="82" width="400" height="8" />
    </svg>
  )
}

/**
 * Loose marigold petals drifting down a hero section. Purely decorative and
 * inert (aria-hidden, pointer-events-none); freezes to nothing under
 * prefers-reduced-motion via the .petal rule in index.css. Position, timing
 * and color are randomised once per mount via inline custom properties so the
 * CSS keyframe stays generic.
 */
export function FloatingPetals({ count = 10 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: `${Math.round((i / count) * 100 + (((i * 37) % 10) - 5))}%`,
        delay: `${(i * 1.3) % 12}s`,
        duration: `${11 + ((i * 5) % 8)}s`,
        drift: `${((i % 2 === 0 ? 1 : -1) * (20 + (i * 7) % 30))}px`,
        color: i % 3 === 0 ? 'var(--primary)' : 'var(--accent)',
      })),
    [count],
  )

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={
            {
              '--x': p.x,
              '--delay': p.delay,
              '--duration': p.duration,
              '--drift': p.drift,
              '--petal-color': p.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** A lotus outline — the wordmark's companion glyph, and a card/section watermark. */
export function LotusIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M12 21c-4-1.4-6-4.6-6-8 3 0 5 1.6 6 4 1-2.4 3-4 6-4 0 3.4-2 6.6-6 8Z" />
      <path d="M12 17c-2.6-1-4-3.2-4-6 2.4 0 4 1.2 4 3.4 0-2.2 1.6-3.4 4-3.4 0 2.8-1.4 5-4 6Z" />
      <path d="M12 13c-1.6-.8-2.4-2.2-2.4-4 1.6 0 2.4.9 2.4 2.4 0-1.5.8-2.4 2.4-2.4 0 1.8-.8 3.2-2.4 4Z" />
    </svg>
  )
}

/** Lotus cradling a small flame — the wordmark's icon, used once in the header. */
export function LotusMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M12 12.5c.9 1 1.3 1.9 1.3 2.6 0 .8-.6 1.4-1.3 1.4s-1.3-.6-1.3-1.4c0-.7.4-1.6 1.3-2.6Z"
        fill="var(--primary)"
      />
      <path
        d="M12 20c-3.6-1.2-5.4-4-5.4-7 2.6 0 4.4 1.4 5.4 3.5C13 13.4 14.8 12 17.4 12c0 3-1.8 5.8-5.4 7Z"
        fill="var(--accent)"
        opacity="0.9"
      />
    </svg>
  )
}

/**
 * Ornamental swirl-diamond-swirl divider — the flourish under a hero headline
 * or between a section label and its neighbours. Decorative only.
 */
export function SwirlDivider({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 16"
      aria-hidden="true"
      className={`text-accent ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M4 8 C 20 8, 28 2, 40 8 S 60 8, 68 8" />
      <rect x="76" y="4" width="8" height="8" transform="rotate(45 80 8)" fill="currentColor" stroke="none" />
      <path d="M92 8 C 100 8, 108 2, 120 8 S 140 8, 156 8" />
    </svg>
  )
}

/**
 * A heading flanked by small lotus glyphs, matching the reference's section
 * titles. Purely presentational — the flanking icons are aria-hidden and the
 * text itself remains the real heading.
 */
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center">
      <div className="flex items-center justify-center gap-3">
        <LotusIcon className="h-5 w-5 text-accent" />
        <h2 className="font-serif text-2xl font-bold tracking-tight text-primary sm:text-3xl">{title}</h2>
        <LotusIcon className="h-5 w-5 text-accent" />
      </div>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

/** Circular medallion with a bell — the hero's centrepiece ornament. */
export function BellMedallion({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="47" fill="var(--card)" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 3" />
      <g stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M50 34 C 40 34 36 42 36 52 L 64 52 C 64 42 60 34 50 34 Z" />
        <path d="M33 52 H 67" />
        <path d="M45 58 Q 50 64 55 58" />
        <path d="M50 30 V 26" />
      </g>
      <circle cx="50" cy="61" r="1.6" fill="var(--primary)" />
    </svg>
  )
}

/**
 * A small brass diya standing on a lace-doily rangoli — the page-corner
 * flourish that closes out a devotee page, echoing an offering left at a
 * threshold. Decorative only.
 */
export function DiyaCorner({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 90 90"
      aria-hidden="true"
      className={`${flip ? '-scale-x-100' : ''} ${className}`}
      fill="none"
    >
      <circle cx="45" cy="70" r="30" stroke="var(--accent)" strokeWidth="0.75" strokeDasharray="1.5 3" />
      <circle cx="45" cy="70" r="21" stroke="var(--accent)" strokeWidth="0.75" strokeDasharray="1.5 3" />
      <g stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 62 C 34 62 27 66 27 71 C 27 76 35 79 45 79 C 55 79 63 76 63 71 C 63 66 56 62 45 62 Z" fill="var(--card)" />
        <path d="M45 62 V 50" />
        <path d="M37 50 H 53" />
        <path d="M31 79 V 84 H 59 V 79" />
      </g>
      <path d="M45 46 C 42 41 42 37 45 33 C 48 37 48 41 45 46 Z" fill="var(--accent)" />
    </svg>
  )
}

/**
 * The devotee landing hero: greeting, headline, flourish, and a bell medallion
 * with its own small petal drift. One per app (the front door after sign-in),
 * not a pattern to repeat on every screen.
 */
export function HeroBanner({
  greeting,
  title,
  subtitle,
}: {
  greeting: string
  title: string
  subtitle: string
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-xl border border-border p-6 sm:p-10">
      {/* A real temple photograph anchors the hero, dimmed under the same
          warm gradient used everywhere else so the headline stays legible. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${templeImages.gopuram(1200)})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(100deg, var(--card) 30%, color-mix(in oklch, var(--card) 70%, transparent) 55%, transparent 85%),' +
            'radial-gradient(circle at 10% 90%, color-mix(in oklch, var(--primary) 20%, transparent), transparent 55%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-primary">{greeting} 🙏</p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
          <SwirlDivider className="mx-auto mt-4 h-3 w-32 sm:mx-0" />
        </div>

        <div className="relative h-28 w-28 flex-shrink-0 temple-rise-in">
          <div
            aria-hidden="true"
            className="diya-glow absolute inset-0 rounded-full bg-accent blur-xl"
          />
          <BellMedallion className="relative h-28 w-28" />
        </div>
      </div>
    </div>
  )
}
