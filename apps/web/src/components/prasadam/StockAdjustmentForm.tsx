import { useState, type FormEvent } from 'react'

import { Button, ErrorNote, Field, Input, Select, Textarea } from '../ui'
import type { PrasadamItem, StockAdjustmentInput } from '../../lib/types'

export function StockAdjustmentForm({
  item,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  item: PrasadamItem
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: StockAdjustmentInput) => Promise<void>
}) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(quantity)
    if (!Number.isInteger(amount) || amount < 1) {
      setFieldError('Enter a whole quantity of one or more.')
      return
    }
    if (!reason.trim()) {
      setFieldError('Enter a reason for this stock adjustment.')
      return
    }
    setFieldError(null)
    await onSubmit({
      delta: direction === 'add' ? amount : -amount,
      reason: reason.trim(),
    })
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)}>
      <div className="rounded-md bg-muted p-4">
        <p className="text-xs text-muted-foreground">Current stock</p>
        <p className="mt-1 font-serif text-2xl font-bold">{item.stock}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="adjustment-direction" label="Adjustment">
          <Select
            id="adjustment-direction"
            onChange={(event) => setDirection(event.target.value as 'add' | 'remove')}
            value={direction}
          >
            <option value="add">Add stock</option>
            <option value="remove">Remove stock</option>
          </Select>
        </Field>
        <Field error={fieldError ?? undefined} htmlFor="adjustment-quantity" label="Quantity">
          <Input
            aria-describedby={fieldError ? 'adjustment-quantity-error' : undefined}
            id="adjustment-quantity"
            inputMode="numeric"
            min="1"
            onChange={(event) => setQuantity(event.target.value)}
            step="1"
            type="number"
            value={quantity}
          />
        </Field>
      </div>
      <Field htmlFor="adjustment-reason" label="Reason">
        <Textarea
          id="adjustment-reason"
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example: New delivery received"
          value={reason}
        />
      </Field>
      <ErrorNote message={error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={pending} onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? 'Updating…' : 'Update stock'}
        </Button>
      </div>
    </form>
  )
}
