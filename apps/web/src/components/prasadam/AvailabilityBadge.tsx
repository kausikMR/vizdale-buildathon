import type { PrasadamItem } from '../../lib/types'

export function AvailabilityBadge({ item }: { item: PrasadamItem }) {
  let label = 'Available'
  let classes = 'bg-primary/15 text-primary'

  if (!item.active) {
    label = 'Inactive'
    classes = 'bg-muted text-muted-foreground'
  } else if (item.stock === 0) {
    label = 'Out of stock'
    classes = 'bg-destructive/15 text-destructive'
  } else if (item.lowStock) {
    label = 'Low stock'
    classes = 'bg-accent/30 text-accent-foreground'
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
