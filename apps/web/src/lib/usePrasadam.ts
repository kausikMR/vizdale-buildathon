import { useCallback, useEffect, useState } from 'react'

import { apiRequest } from './api'
import type { PrasadamItem } from './types'

export function usePrasadam(userId: string) {
  const [items, setItems] = useState<PrasadamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await apiRequest<PrasadamItem[]>('/prasadam', userId))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Prasadam availability could not be loaded. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, error, reload }
}
