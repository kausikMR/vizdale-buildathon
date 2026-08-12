import type { ApiError } from "./types";

const STORAGE_KEY = "temple-crm.user-id";

export const getStoredUserId = () => localStorage.getItem(STORAGE_KEY);

export const setStoredUserId = (id: string | null) => {
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
};

/**
 * Every non-2xx response becomes one of these. `message` is already written for
 * a devotee to read (EXP-01) — render it directly, do not rewrite it.
 */
export class ApiRequestError extends Error {
  // Declared as fields rather than constructor parameter properties: the web
  // tsconfig sets `erasableSyntaxOnly`, which disallows the shorthand.
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  /**
   * Sent as `Idempotency-Key`. The API replays the first response instead of
   * creating a second booking or order, which is our duplicate-submit guard for
   * the two mutations where a double charge of capacity or stock would matter.
   */
  idempotencyKey?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const userId = getStoredUserId();

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      // Simulated sign-in: the server resolves role and identity from this id.
      ...(userId ? { "x-user-id": userId } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    let payload: ApiError | undefined;
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      // Non-JSON error body; fall through to the generic message.
    }
    throw new ApiRequestError(
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ??
        "We could not reach the temple office. Check your connection and try again.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T,>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};

/** Turns any thrown value into a message safe to show the user. */
export const messageFor = (err: unknown) =>
  err instanceof ApiRequestError
    ? err.message
    : "Something went wrong. Nothing was saved — please try again.";

/** Stable key per submit attempt, so a retry of the same click replays. */
export const newIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
