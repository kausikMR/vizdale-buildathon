import { ArrowIcon, CheckIcon } from '../components/icons'
import { AvailabilityBadge } from '../components/prasadam/AvailabilityBadge'
import { PrasadamImage } from '../components/prasadam/PrasadamImage'
import { Button, Card, ErrorNote, Loading } from '../components/ui'
import { usePrasadam } from '../lib/usePrasadam'

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function PrasadamDetailPage({
  itemId,
  userId,
  onBack,
}: {
  itemId: string
  userId: string
  onBack: () => void
}) {
  const { items, loading, error, reload } = usePrasadam(userId)
  const item = items.find((candidate) => candidate.id === itemId)

  if (loading) return <Loading label="Loading prasadam details…" />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" onClick={onBack} type="button">
          <ArrowIcon className="size-4 rotate-180" /> Back to prasadam
        </button>
        <ErrorNote message={error} />
        <Button onClick={() => void reload()} variant="secondary">Try again</Button>
      </div>
    )
  }

  if (!item) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center sm:p-12">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Offering not found</p>
        <h1 className="mt-3 font-serif text-2xl font-bold">This prasadam is not available</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          It may be inactive or the link may no longer be valid. Browse today’s available temple offerings instead.
        </p>
        <Button className="mt-6" onClick={onBack}>Back to prasadam</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={onBack}
        type="button"
      >
        <ArrowIcon className="size-4 rotate-180" /> Back to all prasadam
      </button>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <PrasadamImage className="aspect-square h-full w-full" name={item.name} />
          <div className="flex flex-col p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Temple offering</p>
                <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{item.name}</h1>
              </div>
              <AvailabilityBadge item={item} />
            </div>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              {item.description || 'Temple prasadam prepared with care for devotees.'}
            </p>

            <div className="mt-7 rounded-lg bg-secondary p-5">
              <p className="text-xs font-medium text-secondary-foreground">Informational value</p>
              <p className="mt-1 text-3xl font-bold">{formatPrice(item.displayPrice)}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">No payment is collected online.</p>
            </div>

            <div className="mt-7 space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <CheckIcon className="size-5 shrink-0 text-primary" />
                {item.stock === 0 ? 'Currently unavailable' : 'Available at the temple counter'}
              </p>
              <p className="flex items-center gap-3">
                <CheckIcon className="size-5 shrink-0 text-primary" /> Prepared with care for devotees
              </p>
              <p className="flex items-center gap-3">
                <CheckIcon className="size-5 shrink-0 text-primary" /> Collect during temple opening hours
              </p>
            </div>

            <div className="mt-auto pt-8">
              <p className={`text-sm font-semibold ${item.reservable ? 'text-primary' : 'text-destructive'}`}>
                {item.reservable
                  ? 'Please visit the temple counter to collect this offering.'
                  : 'This offering cannot be reserved at the moment.'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
