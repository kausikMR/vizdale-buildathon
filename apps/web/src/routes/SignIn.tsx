import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { Button, Card, ErrorNote, PageHeader } from '../components/ui'
import { ApiError, messageFor } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useMutation } from '../lib/useApi'

export function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const { run, pending, error } = useMutation(signIn)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Neither field is cleared on failure, so a typo is correctable in place.
    const user = await run({ identifier, password })
    if (user) navigate(from ?? (user.role === 'admin' ? '/admin' : '/home'), { replace: true })
  }

  const message = messageFor(error)
  const field = error instanceof ApiError ? error.field : undefined
  // A wrong password names no field, so it shows at form level rather than
  // pointing at one input — the server does not say which half was wrong.
  const errorFor = (name: string) => (field === name ? message : null)

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader title="Temple CRM" subtitle="Sign in to book darshan and reserve prasadam." />

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Sign in</h2>

        <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4">
          <Field
            id="identifier"
            label="Mobile number or email"
            value={identifier}
            onChange={setIdentifier}
            autoComplete="username"
            placeholder="9800000002"
            error={errorFor('identifier')}
            disabled={pending}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={errorFor('password')}
            disabled={pending}
          />

          {message && !field && <ErrorNote message={message} />}

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

      {/*
        Demo credentials as static text rather than one-click buttons: with real
        passwords, an endpoint listing every account would be an enumeration
        vector, and a click-to-sign-in list would defeat the password entirely.
      */}
      <Card className="mt-4 p-6">
        <h2 className="text-lg font-semibold">Demo accounts</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Seeded for this build. Fictional data only.
        </p>
        <dl className="mt-3 grid gap-2 text-sm">
          {[
            { who: 'Priya — administrator', id: '9800000001' },
            { who: 'Arjun — devotee', id: '9800000002' },
            { who: 'Lakshmi — devotee', id: '9800000003' },
          ].map((account) => (
            <div key={account.id} className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-muted-foreground">{account.who}</dt>
              <dd className="font-mono">{account.id}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          Password <span className="font-mono">Temple@123</span>
        </p>
      </Card>
    </div>
  )
}
