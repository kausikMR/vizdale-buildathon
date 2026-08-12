import { ArrowIcon } from '../icons'
import { Card } from '../ui'
import { AvailabilityBadge } from './AvailabilityBadge'
import { PrasadamImage } from './PrasadamImage'
import type { PrasadamItem } from '../../lib/types'

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function PrasadamCard({
  item,
  onSelect,
}: {
  item: PrasadamItem
  onSelect: (itemId: string) => void
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <a
        aria-label={`View details for ${item.name}`}
        className="block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`/prasadam/${item.id}`}
        onClick={(event) => {
          event.preventDefault()
          onSelect(item.id)
        }}
      >
        <PrasadamImage className="aspect-[4/3] w-full transition duration-300 hover:scale-[1.02]" name={item.name} />
      </a>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-lg font-bold leading-snug">{item.name}</h2>
          <AvailabilityBadge item={item} />
        </div>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
          {item.description || 'Temple prasadam prepared with care for devotees.'}
        </p>
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Informational value</p>
              <p className="mt-0.5 text-lg font-bold">{formatPrice(item.displayPrice)}</p>
            </div>
            <p className={`text-right text-xs font-semibold ${item.stock === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {item.stock === 0 ? 'Currently unavailable' : 'Available at the temple counter'}
            </p>
          </div>
          <a
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={`/prasadam/${item.id}`}
            onClick={(event) => {
              event.preventDefault()
              onSelect(item.id)
            }}
          >
            View details <ArrowIcon className="size-4" />
          </a>
        </div>
      </div>
    </Card>
  )
}
