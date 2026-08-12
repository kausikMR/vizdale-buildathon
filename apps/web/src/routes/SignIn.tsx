import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { Button, Card, ErrorNote, Loading, PageHeader } from '../components/ui'
import { ApiError, messageFor } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi, useMutation } from '../lib/useApi'
import type { User } from '../lib/types'

export function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const { data, loading } = useApi<{ users: User[] }>('/auth/users')
  const { run, pending, error } = useMutation(signIn)
  const [identifier, setIdentifier] = useState('')

  const go = async (choice: { userId?: string; identifier?: string }) => {
    const user = await run(choice)
    if (user) navigate(from ?? (user.role === 'admin' ? '/admin' : '/home'), { replace: true })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // The field keeps its value on failure, so a typo is correctable in place.
    void go({ identifier })
  }

  const message = messageFor(error)
  const fieldError = error instanceof ApiError ? error.field : undefined

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader title="Temple CRM" subtitle="Simulated sign-in — no password or OTP is checked." />

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Choose an account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          These accounts are seeded for the demo.
        </p>

        {loading && <Loading label="Loading accounts…" />}

        <div className="mt-4 grid gap-2">
          {data?.users.map((user) => (
            <Button
              key={user.id}
              // ui.tsx's Button does not set a type, and HTML defaults to
              // submit — explicit here so these never submit a future form.
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => void go({ userId: user.id })}
              className="w-full py-3"
              // The visible text is three adjacent spans, which a screen reader
              // would otherwise announce as one run-on string.
              aria-label={`Sign in as ${user.name}, ${user.role}`}
            >
              {/* Button centres its content, so the row layout lives in here. */}
              <span className="flex w-full items-center justify-between gap-3 text-left">
                <span className="flex min-w-0 flex-col items-start">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs font-normal opacity-80">
                    {user.mobile ?? user.email}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium capitalize opacity-80">
                  {user.role}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-lg font-semibold">Or use your details</h2>
        <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4">
          <Field
            id="identifier"
            label="Mobile number or email"
            value={identifier}
            onChange={setIdentifier}
            autoComplete="username"
            placeholder="9800000002"
            error={fieldError === 'identifier' ? message : null}
            disabled={pending}
          />

          {message && fieldError !== 'identifier' && <ErrorNote message={message} />}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary underline underline-offset-4">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
