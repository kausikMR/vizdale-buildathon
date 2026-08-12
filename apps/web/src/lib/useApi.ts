import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: unknown
  reload: () => void
}

/**
 * Reads an endpoint and re-reads on demand. After a successful mutation, call
 * reload() on the lists that should change — that is how "everything updates
 * immediately" is satisfied without a client-side cache to invalidate.
 *
 * Pass null as the path to skip the request entirely.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState<unknown>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (path === null) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}

interface MutationState<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>
  pending: boolean
  error: unknown
  reset: () => void
}

/**
 * Wraps a mutating call and blocks re-entry while one is in flight, which is
 * what protects every form against a duplicate submit. The guard is a ref, not
 * state, so a second click in the same tick is still refused.
 */
export function useMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): MutationState<A, R> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const inFlight = useRef(false)

  const run = useCallback(
    async (...args: A) => {
      if (inFlight.current) return undefined
      inFlight.current = true
      setPending(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (err) {
        setError(err)
        return undefined
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [fn],
  )

  const reset = useCallback(() => setError(null), [])

  return { run, pending, error, reset }
}
