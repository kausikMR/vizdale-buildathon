import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ContactFields, type ContactValues } from '@/components/ContactFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState<ContactValues>({ name: '', mobile: '', email: '' })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const user = await register({
        name: values.name,
        mobile: values.mobile || undefined,
        email: values.email || undefined,
      })
      toast.success(`Welcome, ${user.name}. Your account is ready.`)
      navigate('/home', { replace: true })
    } catch (err) {
      // Values are deliberately left untouched so one bad field does not cost
      // the user the rest of the form.
      const message =
        err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.'
      setError({ field: err instanceof ApiError ? err.field : undefined, message })
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Temple CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulated registration — no identity documents are collected.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Create a devotee account to book darshan and prasadam.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <ContactFields
              values={values}
              onChange={setValues}
              errorField={error?.field}
              errorMessage={error?.message}
              disabled={busy}
            />

            {error && !error.field && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error.message}
              </p>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/signin" className="font-medium text-primary underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
