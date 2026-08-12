# Temple CRM — Design Style Guide

How every screen should look and behave, so six screens built by different people
read as one product. Pair this with [`CONTRACT.md`](CONTRACT.md) for the data side.

Tokens live in [`apps/web/src/index.css`](apps/web/src/index.css).
Primitives live in [`apps/web/src/components/ui.tsx`](apps/web/src/components/ui.tsx).

---

## 1. The one rule

**Never hard-code a colour, font, radius or shadow.** Use the token utilities.
`bg-primary`, not `bg-orange-500`. `text-muted-foreground`, not `text-gray-500`.

Everything is defined twice — light and dark — so a hard-coded hex is invisible in
one theme and wrong in the other. If a token you need doesn't exist, add it to
`index.css` rather than reaching for a palette colour.

---

## 2. Colour tokens

The palette is a warm terracotta/saffron set, chosen to suit a temple context.

| Token | Utility | Use for |
|---|---|---|
| `background` / `foreground` | `bg-background` `text-foreground` | page canvas and body text |
| `card` / `card-foreground` | `bg-card` `text-card-foreground` | every raised surface, list row, panel |
| `primary` / `primary-foreground` | `bg-primary` `text-primary-foreground` | main action per screen, confirmed state |
| `secondary` / `secondary-foreground` | `bg-secondary` | secondary buttons, active nav item |
| `muted` / `muted-foreground` | `bg-muted` `text-muted-foreground` | hints, captions, disabled/neutral states |
| `accent` / `accent-foreground` | `bg-accent` | highlights, the demo banner, "ready" state |
| `destructive` / `destructive-foreground` | `text-destructive` | errors, cancel, out-of-stock |
| `border` / `input` | `border-border` | all borders and field outlines |
| `ring` | `outline-ring` | focus rings — never remove |
| `chart-1…5` | — | dashboard charts, in that order |
| `sidebar-*` | — | reserved for an admin sidebar if one appears |

**One primary action per screen.** If two buttons are both `bg-primary`, neither reads
as the thing to do next.

### Dark mode

Applied by putting `.dark` on `<html>` (`@custom-variant dark`). Token values swap
automatically — you do not write `dark:` variants for colours. There is currently no
toggle wired up; add one only if time allows, it is not a graded requirement.

---

## 3. Typography

| Token | Family | Use for |
|---|---|---|
| `font-serif` | Merriweather | page titles, event names — the temple voice |
| `font-sans` | Montserrat | everything else (default on `body`) |
| `font-mono` | Ubuntu Mono | booking and order references (`DSN-01001`) |

References in mono matter: they get read aloud and typed at a counter, so the digits
need to be unambiguous.

Scale — keep to these, don't invent sizes:

| Role | Classes |
|---|---|
| Page title | `font-serif text-2xl font-bold tracking-tight sm:text-3xl` |
| Section heading | `text-lg font-semibold` |
| Body | `text-sm` (default) |
| Caption / hint | `text-xs text-muted-foreground` |

Always ship a real `<h1>` per screen — `PageHeader` handles it.

---

## 4. Shape and depth

`--radius: 0.625rem`. Use `rounded-md` for controls, `rounded-lg` for cards,
`rounded-full` for status pills only.

Shadows: `shadow-sm` for cards, `shadow-md` for popovers/modals. Nothing heavier —
`shadow-xl` and above exist in the tokens but this UI shouldn't need them.

Spacing is the default 4px scale. Page padding `px-4`, content width `max-w-6xl`,
gaps `gap-3` or `gap-4`. Vertical rhythm between sections: `space-y-6`.

---

## 5. Primitives

Import from `../components/ui`. Build screens out of these before writing new markup.

| Component | Props | Notes |
|---|---|---|
| `<PageHeader>` | `title`, `subtitle?` | renders the `<h1>`; one per screen |
| `<Card>` | `className?` | the default surface |
| `<Button>` | `variant`: `primary` \| `secondary` \| `ghost` \| `destructive` | 44px min height, focus ring built in |
| `<StatusBadge>` | `status` | see §7 — label always carries the meaning |
| `<ErrorNote>` | `message` | `role="alert"`; renders nothing when `null` |
| `<Loading>` | `label?` | `role="status"` |
| `<EmptyState>` | `title`, `hint?` | every list needs one |
| `<Placeholder>` | `screen`, `owner` | marks a screen another lane owns; delete when real |

`<Layout>` provides the header, role-aware nav and the "simulated sign-in, no payments
taken" banner. Screens render inside its `<Outlet>` and should not repeat the banner.

---

## 6. Layout and responsiveness

**Hard requirement: the demo journey completes at 360px with no horizontal scroll.**
This is a graded acceptance check, so build mobile-first and widen with `sm:`/`lg:`.

- Page shell: `mx-auto max-w-6xl px-4 py-6`
- Cards stack on mobile: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Tables don't fit at 360px.** Either wrap in `overflow-x-auto`, or — better for
  admin lists — render a card per row below `sm:` and a table from `sm:` up.
- Never set a fixed pixel width on anything full-width. `max-w-*` + `w-full`.
- Long references and names: `break-words`, or `truncate` with a `title` attribute.

---

## 7. Status, never colour-only

Colour alone must never carry meaning. `StatusBadge` always prints the word, so it
survives greyscale and colour-blindness.

| Status | Tone | Reads as |
|---|---|---|
| `published`, `confirmed` | primary tint | active, good |
| `ready` | accent tint | needs staff attention |
| `fulfilled`, `completed`, `draft` | muted | done or not yet live |
| `cancelled` | destructive tint | stopped |

Same for capacity and stock: pair the colour with text — "3 places left", "Out of
stock" — never a bare red dot.

---

## 8. Forms and feedback

The brief grades error recovery: **invalid input must be correctable without losing
the rest of the form.** So never clear a form on failure, and never unmount it behind
a full-page error.

- Every input has a real `<label>`; placeholders are not labels.
- Errors render inline next to the field, plus an `<ErrorNote>` at the form level.
- **Show the API's message verbatim.** `CONTRACT.md` guarantees it is already
  devotee-facing and actionable ("Only 3 places left — reduce to 3 or choose another
  slot"). Rewriting it loses the specifics.
- Disable submit while pending and label the state: "Confirming…". `useMutation`
  already blocks re-entry, which covers the duplicate-submit requirement.
- Success is a state change, not a toast that vanishes: show the reference on screen
  and link to My Bookings.
- Numbers use `<input type="number" inputMode="numeric" min={1} max={6}>`, and the
  max still gets validated server-side.

---

## 9. Accessibility checklist

Non-negotiable per the brief §7, and quick to get right if done as you build:

- Interactive elements are `<button>`/`<a>`, never a clickable `<div>`.
- Touch targets ≥ 44px — `min-h-11` is on `Button` already.
- **Never remove the focus ring.** `focus-visible:outline-2 outline-offset-2 outline-ring`.
- Errors `role="alert"`, loading `role="status"` — both live regions.
- Nav landmarks: `<nav aria-label="Main">`, one `<h1>` per page, `<main>` wrapper.
- Icons that convey meaning need `aria-label`; decorative ones `aria-hidden`.
- Tab through the full booking journey once before calling a screen done.

---

## 10. Copy and translation

Labels are "structured for later translation" (§7): keep user-facing strings as plain
text in JSX, never assembled from fragments inside logic, and never interpolated into
conditionals mid-sentence. One string per message.

Tone: plain, warm, specific. Say what happened and what to do next — "This slot just
filled up. Please choose another slot for your darshan." Not "Error: capacity exceeded."

Always label the simulation. Sign-in says it is simulated; any price shows
"Informational only — no payment is collected" (Rule 7).

---

## 11. Do / Don't

| Do | Don't |
|---|---|
| `bg-card`, `text-muted-foreground` | `bg-white`, `text-gray-500` |
| One `bg-primary` action per screen | Three primary buttons competing |
| Card list on mobile, table on `sm:` up | A 7-column table at 360px |
| Render the API's error message | Replace it with "Something went wrong" |
| Word + colour for status | A coloured dot alone |
| Derived fields from the API (`remaining`, `lowStock`) | Recomputing business rules in a component |

---

## 12. Known gap

The theme requests Montserrat, Merriweather and Ubuntu Mono. Confirm they are loaded
in `apps/web/index.html` before the demo — without the `<link>` tags the whole UI
silently falls back to the system sans-serif and loses the serif/mono distinction
this guide relies on.
