const USER_ID_KEY = 'temple-crm.user-id'

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

export function setUserId(id: string): void {
  localStorage.setItem(USER_ID_KEY, id)
}

export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY)
}

/**
 * Carries the contract's error code and message, plus the optional field the
 * API names so a form can attach the message to the right input.
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

/**
 * The API's message is already written for a devotee to read (EXP-01), so it is
 * rendered verbatim. Only a transport failure, where there is no server message
 * at all, gets wording from the client.
 */
export function messageFor(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) return error.message
  return 'Could not reach the temple server. Check your connection and try again.'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const userId = getUserId()
  // Always a relative /api path so the dev server proxy handles it.
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      // Simulated auth: the server resolves the role from this id itself.
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    const error = payload?.error
    throw new ApiError(
      res.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.field,
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
}
