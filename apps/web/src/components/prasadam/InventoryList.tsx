import { BoxesIcon, EditIcon } from '../icons'
import { AvailabilityBadge } from './AvailabilityBadge'
import { PrasadamImage } from './PrasadamImage'
import { Button, Card, EmptyState } from '../ui'
import type { PrasadamItem } from '../../lib/types'

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function ItemActions({
  item,
  pending,
  onAdjust,
  onEdit,
  onToggleActive,
}: {
  item: PrasadamItem
  pending: boolean
  onAdjust: (item: PrasadamItem) => void
  onEdit: (item: PrasadamItem) => void
  onToggleActive: (item: PrasadamItem) => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        aria-label={`Edit ${item.name}`}
        className="min-h-9 px-3"
        disabled={pending}
        onClick={() => onEdit(item)}
        variant="ghost"
      >
        <EditIcon className="mr-1.5 size-4" /> Edit
      </Button>
      <Button
        aria-label={`Adjust stock for ${item.name}`}
        className="min-h-9 px-3"
        disabled={pending}
        onClick={() => onAdjust(item)}
        variant="secondary"
      >
        <BoxesIcon className="mr-1.5 size-4" /> Adjust
      </Button>
      <Button
        aria-label={`${item.active ? 'Deactivate' : 'Activate'} ${item.name}`}
        className="min-h-9 px-3"
        disabled={pending}
        onClick={() => onToggleActive(item)}
        variant={item.active ? 'ghost' : 'secondary'}
      >
        {item.active ? 'Deactivate' : 'Activate'}
      </Button>
    </div>
  )
}

export function InventoryList({
  items,
  pendingId,
  onAdjust,
  onEdit,
  onToggleActive,
}: {
  items: PrasadamItem[]
  pendingId: string | null
  onAdjust: (item: PrasadamItem) => void
  onEdit: (item: PrasadamItem) => void
  onToggleActive: (item: PrasadamItem) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        hint="Try changing your filters or create a new prasadam item."
        title="No inventory items found"
      />
    )
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Card className="p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PrasadamImage className="size-12 shrink-0 rounded-md" decorative name={item.name} />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold" title={item.name}>
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{formatPrice(item.displayPrice)}</p>
                </div>
              </div>
              <AvailabilityBadge item={item} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-muted p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">In stock</dt>
                <dd className="mt-0.5 font-bold">{item.stock}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Low at</dt>
                <dd className="mt-0.5 font-bold">{item.reorderLevel}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border pt-3">
              <ItemActions
                item={item}
                onAdjust={onAdjust}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                pending={pendingId === item.id}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">Item</th>
                <th className="px-4 py-3 font-semibold" scope="col">Status</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Stock</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Low at</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Value</th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr className="hover:bg-muted/40" key={item.id}>
                  <td className="max-w-60 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <PrasadamImage className="size-11 shrink-0 rounded-md" decorative name={item.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold" title={item.name}>{item.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground" title={item.description}>
                          {item.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><AvailabilityBadge item={item} /></td>
                  <td className={`px-4 py-4 text-right font-bold ${item.stock === 0 ? 'text-destructive' : ''}`}>
                    {item.stock}
                  </td>
                  <td className="px-4 py-4 text-right text-muted-foreground">{item.reorderLevel}</td>
                  <td className="px-4 py-4 text-right font-medium">{formatPrice(item.displayPrice)}</td>
                  <td className="px-4 py-4">
                    <ItemActions
                      item={item}
                      onAdjust={onAdjust}
                      onEdit={onEdit}
                      onToggleActive={onToggleActive}
                      pending={pendingId === item.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
