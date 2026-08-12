import { useMemo, useState } from 'react'

import { AlertIcon, BoxesIcon, CheckIcon, PlusIcon, SearchIcon } from '../components/icons'
import { InventoryList } from '../components/prasadam/InventoryList'
import { MetricCard } from '../components/prasadam/MetricCard'
import { PrasadamItemForm } from '../components/prasadam/PrasadamItemForm'
import { StockAdjustmentForm } from '../components/prasadam/StockAdjustmentForm'
import {
  Button,
  Card,
  ErrorNote,
  Input,
  Loading,
  PageHeader,
  Select,
  SuccessNote,
} from '../components/ui'
import { apiRequest } from '../lib/api'
import type { PrasadamInput, PrasadamItem, StockAdjustmentInput } from '../lib/types'
import { usePrasadam } from '../lib/usePrasadam'

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; item: PrasadamItem }
  | { mode: 'adjust'; item: PrasadamItem }
  | null

export function AdminInventoryPage({ userId }: { userId: string }) {
  const { items, loading, error, reload } = usePrasadam(userId)
  const [editor, setEditor] = useState<EditorState>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'low'>('all')
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const summary = useMemo(
    () => ({
      active: items.filter((item) => item.active).length,
      low: items.filter((item) => item.active && item.lowStock && item.stock > 0).length,
      out: items.filter((item) => item.active && item.stock === 0).length,
    }),
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery)
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && item.active) ||
        (status === 'inactive' && !item.active) ||
        (status === 'low' && item.active && item.lowStock)
      return matchesQuery && matchesStatus
    })
  }, [items, query, status])

  function openEditor(nextEditor: EditorState) {
    setMutationError(null)
    setSuccess(null)
    setEditor(nextEditor)
    window.requestAnimationFrame(() => {
      document.getElementById('inventory-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function saveItem(input: PrasadamInput) {
    setPending(true)
    setMutationError(null)
    try {
      if (editor?.mode === 'edit') {
        await apiRequest<PrasadamItem>(`/prasadam/${editor.item.id}`, userId, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
        setSuccess(`${input.name} was updated.`)
      } else {
        await apiRequest<PrasadamItem>('/prasadam', userId, {
          method: 'POST',
          body: JSON.stringify(input),
        })
        setSuccess(`${input.name} was added to inventory.`)
      }
      setEditor(null)
      await reload()
    } catch (requestError) {
      setMutationError(requestError instanceof Error ? requestError.message : 'The item could not be saved.')
    } finally {
      setPending(false)
    }
  }

  async function adjustStock(input: StockAdjustmentInput) {
    if (editor?.mode !== 'adjust') return
    setPending(true)
    setMutationError(null)
    try {
      await apiRequest<PrasadamItem>(`/prasadam/${editor.item.id}/adjust`, userId, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setSuccess(`Stock for ${editor.item.name} was updated.`)
      setEditor(null)
      await reload()
    } catch (requestError) {
      setMutationError(
        requestError instanceof Error ? requestError.message : 'Stock could not be updated.',
      )
    } finally {
      setPending(false)
    }
  }

  async function toggleActive(item: PrasadamItem) {
    setPendingId(item.id)
    setMutationError(null)
    setSuccess(null)
    try {
      await apiRequest<PrasadamItem>(`/prasadam/${item.id}`, userId, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      })
      setSuccess(`${item.name} is now ${item.active ? 'hidden from devotees' : 'visible to devotees'}.`)
      await reload()
    } catch (requestError) {
      setMutationError(
        requestError instanceof Error ? requestError.message : 'The item status could not be changed.',
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          subtitle="Monitor availability, keep thresholds current, and record every stock change."
          title="Prasadam inventory"
        />
        <Button className="shrink-0" onClick={() => openEditor({ mode: 'create' })}>
          <PlusIcon className="mr-2 size-4" /> Add item
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          hint="Visible to devotees"
          icon={<CheckIcon className="size-5" />}
          label="Active items"
          value={summary.active}
        />
        <MetricCard
          hint="At or below threshold"
          icon={<AlertIcon className="size-5" />}
          label="Low stock"
          value={summary.low}
        />
        <MetricCard
          hint="Needs replenishment"
          icon={<BoxesIcon className="size-5" />}
          label="Out of stock"
          value={summary.out}
        />
      </div>

      {editor && (
        <Card className="scroll-mt-4 p-5 sm:p-6" id="inventory-editor">
          <div className="mb-5 border-b border-border pb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Inventory action</p>
            <h2 className="mt-1 text-lg font-semibold">
              {editor.mode === 'create'
                ? 'Add prasadam item'
                : editor.mode === 'edit'
                  ? `Edit ${editor.item.name}`
                  : `Adjust ${editor.item.name}`}
            </h2>
          </div>
          {editor.mode === 'adjust' ? (
            <StockAdjustmentForm
              error={mutationError}
              item={editor.item}
              onCancel={() => setEditor(null)}
              onSubmit={adjustStock}
              pending={pending}
            />
          ) : (
            <PrasadamItemForm
              error={mutationError}
              item={editor.mode === 'edit' ? editor.item : undefined}
              onCancel={() => setEditor(null)}
              onSubmit={saveItem}
              pending={pending}
            />
          )}
        </Card>
      )}

      <SuccessNote message={success} />
      {!editor && <ErrorNote message={mutationError} />}
      <ErrorNote message={error} />

      <section aria-labelledby="inventory-list-heading" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold" id="inventory-list-heading">All items</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredItems.length} of {items.length} items shown
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,18rem)_10rem]">
            <div className="relative">
              <label className="sr-only" htmlFor="inventory-search">Search inventory</label>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="inventory-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search inventory"
                type="search"
                value={query}
              />
            </div>
            <label className="sr-only" htmlFor="inventory-status">Filter by status</label>
            <Select
              id="inventory-status"
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low">Low stock</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Loading label="Loading inventory…" />
        ) : (
          <InventoryList
            items={filteredItems}
            onAdjust={(item) => openEditor({ mode: 'adjust', item })}
            onEdit={(item) => openEditor({ mode: 'edit', item })}
            onToggleActive={(item) => void toggleActive(item)}
            pendingId={pendingId}
          />
        )}
        {error && (
          <Button onClick={() => void reload()} variant="secondary">Try again</Button>
        )}
      </section>
    </div>
  )
}
