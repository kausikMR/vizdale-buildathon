import { useMemo, useState } from 'react'

import { BowlIcon, CheckIcon, SearchIcon } from '../components/icons'
import { PrasadamCard } from '../components/prasadam/PrasadamCard'
import { Button, Card, EmptyState, ErrorNote, Input, Loading, PageHeader } from '../components/ui'
import { usePrasadam } from '../lib/usePrasadam'

export function PrasadamPage({ userId }: { userId: string }) {
  const { items, loading, error, reload } = usePrasadam(userId)
  const [query, setQuery] = useState('')
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((item) =>
      `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery),
    )
  }, [items, query])

  return (
    <div className="space-y-6">
      <section className="grid items-center gap-6 rounded-lg border border-border bg-secondary p-5 shadow-sm sm:p-8 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
            A blessed offering
          </p>
          <PageHeader
            subtitle="Explore prasadam prepared for devotees and check today’s availability before visiting the counter."
            title="Temple prasadam"
          />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-primary" /> Prepared with care
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-primary" /> No online payment
            </span>
          </div>
        </div>
        <div className="hidden size-32 place-items-center rounded-full bg-card text-primary shadow-sm lg:grid">
          <BowlIcon className="size-16" />
        </div>
      </section>

      <section aria-labelledby="prasadam-list-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold" id="prasadam-list-heading">
              Available offerings
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Availability is updated by temple staff throughout the day.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <label className="sr-only" htmlFor="prasadam-search">
              Search prasadam
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              id="prasadam-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search offerings"
              type="search"
              value={query}
            />
          </div>
        </div>

        <ErrorNote message={error} />
        {error && (
          <Button onClick={() => void reload()} variant="secondary">
            Try again
          </Button>
        )}
        {loading ? (
          <Loading label="Loading prasadam availability…" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            hint={query ? 'Try a different name or clear your search.' : 'Please check again later.'}
            title={query ? 'No offerings match your search' : 'No prasadam is available today'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <PrasadamCard item={item} key={item.id} />
            ))}
          </div>
        )}
      </section>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Collecting prasadam</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Please visit the temple counter during opening hours. Displayed values are informational only.
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary">
          No payment collected online
        </p>
      </Card>
    </div>
  )
}
