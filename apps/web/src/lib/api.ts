const TOKEN_KEY = 'temple-crm.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Carries the server's actionable message plus the field it belongs to, so
 * forms can attach the error to the right input instead of only toasting it.
 */
export class ApiError extends Error {
  status: number
  code: string
  field?: string

  constructor(status: number, code: string, message: string, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

/** Always call with a relative /api path so the Vite proxy handles it. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const error = body?.error
    throw new ApiError(
      res.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.field,
    )
  }

  return body as T
}
