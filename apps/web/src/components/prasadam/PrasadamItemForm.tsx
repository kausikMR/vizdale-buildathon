import { useEffect, useState, type FormEvent } from 'react'

import { Button, ErrorNote, Field, Input, Textarea } from '../ui'
import type { PrasadamInput, PrasadamItem } from '../../lib/types'

interface FormState {
  name: string
  description: string
  displayPrice: string
  stock: string
  reorderLevel: string
  active: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  displayPrice: '0.00',
  stock: '0',
  reorderLevel: '0',
  active: true,
}

export function PrasadamItemForm({
  item,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  item?: PrasadamItem
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: PrasadamInput) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    setForm(
      item
        ? {
            name: item.name,
            description: item.description,
            displayPrice: item.displayPrice,
            stock: String(item.stock),
            reorderLevel: String(item.reorderLevel),
            active: item.active,
          }
        : emptyForm,
    )
    setFieldError(null)
  }, [item])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) {
      setFieldError('Enter a name for the prasadam item.')
      return
    }
    setFieldError(null)
    await onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      displayPrice: form.displayPrice,
      ...(item ? {} : { stock: Number(form.stock) }),
      reorderLevel: Number(form.reorderLevel),
      active: form.active,
    })
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={fieldError ?? undefined} htmlFor="item-name" label="Item name">
          <Input
            aria-describedby={fieldError ? 'item-name-error' : undefined}
            aria-invalid={Boolean(fieldError)}
            autoFocus
            id="item-name"
            maxLength={160}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            value={form.name}
          />
        </Field>
        <Field
          hint="Informational only — no payment is collected."
          htmlFor="display-price"
          label="Display price (₹)"
        >
          <Input
            id="display-price"
            inputMode="decimal"
            min="0"
            onChange={(event) => setForm({ ...form, displayPrice: event.target.value })}
            step="0.01"
            type="number"
            value={form.displayPrice}
          />
        </Field>
      </div>

      <Field htmlFor="item-description" label="Description">
        <Textarea
          id="item-description"
          maxLength={2000}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          value={form.description}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {!item && (
          <Field
            hint="Later changes must use Adjust stock to keep the audit complete."
            htmlFor="initial-stock"
            label="Initial stock"
          >
            <Input
              id="initial-stock"
              inputMode="numeric"
              min="0"
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              step="1"
              type="number"
              value={form.stock}
            />
          </Field>
        )}
        <Field
          hint="The item is marked low stock at or below this number."
          htmlFor="reorder-level"
          label="Low-stock threshold"
        >
          <Input
            id="reorder-level"
            inputMode="numeric"
            min="0"
            onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })}
            step="1"
            type="number"
            value={form.reorderLevel}
          />
        </Field>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium">
        <input
          checked={form.active}
          className="size-4 accent-primary"
          onChange={(event) => setForm({ ...form, active: event.target.checked })}
          type="checkbox"
        />
        Show this item to devotees
      </label>

      <ErrorNote message={error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={pending} onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? 'Saving…' : item ? 'Save changes' : 'Create item'}
        </Button>
      </div>
    </form>
  )
}
