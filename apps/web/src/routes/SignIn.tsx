import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { DemoAccount, User } from '@/lib/types'

function homeFor(user: User) {
  return user.role === 'admin' ? '/admin' : '/home'
}

export function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState<DemoAccount[]>([])

  useEffect(() => {
    api<{ users: DemoAccount[] }>('/auth/demo-accounts')
      .then(({ users }) => setAccounts(users))
      .catch(() => setAccounts([]))
  }, [])

  const attempt = async (value: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const user = await signIn(value)
      toast.success(`Welcome back, ${user.name}.`)
      navigate(from ?? homeFor(user), { replace: true })
    } catch (err) {
      // Leave the field populated so the user can correct it in place.
      const message =
        err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void attempt(identifier)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Temple CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulated sign-in — no password or OTP is checked.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use the mobile number or email you registered with.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="identifier">Mobile number or email</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'identifier-error' : undefined}
                placeholder="9800000002"
              />
              {error && (
                <p id="identifier-error" role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="font-medium text-primary underline underline-offset-4">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>

      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo accounts</CardTitle>
            <CardDescription>
              Seeded for this build. Suspended accounts are shown so the blocked state is testable.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {accounts.map((account) => (
              <Button
                key={account.id}
                type="button"
                variant="outline"
                disabled={busy || !account.identifier}
                onClick={() => account.identifier && void attempt(account.identifier)}
                className="h-auto justify-between gap-3 py-2 text-left"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{account.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {account.identifier}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {account.role === 'admin' ? 'Admin' : 'Devotee'}
                  {account.status === 'suspended' && ' · suspended'}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
