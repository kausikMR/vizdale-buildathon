import { useCallback, useEffect, useState } from 'react'
import { api, messageFor } from './api'

/**
 * Minimal fetch-on-mount hook with a `reload` for the "everything updates
 * immediately" requirement: after a successful mutation, call `reload()` on the
 * lists that should change.
 *
 * Pass `path = null` to skip the request (e.g. while an id is still unknown).
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(path !== null)

  const load = useCallback(async () => {
    if (path === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await api.get<T>(path))
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void load()
  }, [load])

  return { data, error, loading, reload: load }
}

/**
 * Wraps a mutation with pending + error state and guards against duplicate
 * submits (non-functional requirement: "protected from duplicate submit").
 * The returned `run` resolves to the result, or null if it failed.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      if (pending) return null
      setPending(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (err) {
        setError(messageFor(err))
        return null
      } finally {
        setPending(false)
      }
    },
    [fn, pending],
  )

  return { run, pending, error, clearError: () => setError(null) }
}
