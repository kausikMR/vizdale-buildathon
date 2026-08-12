import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ContactFields, type ContactValues } from '@/components/ContactFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function Profile() {
  const { user, updateProfile } = useAuth()

  const [values, setValues] = useState<ContactValues>({
    name: user?.name ?? '',
    mobile: user?.mobile ?? '',
    email: user?.email ?? '',
  })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await updateProfile({
        name: values.name,
        mobile: values.mobile || undefined,
        email: values.email || undefined,
      })
      toast.success('Profile updated.')
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.'
      setError({ field: err instanceof ApiError ? err.field : undefined, message })
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your contact details current — they identify you at sign-in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            {user.role === 'admin' ? 'Administrator' : 'Devotee'} · member since {memberSince}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="grid max-w-md gap-4">
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

            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setValues({
                    name: user.name,
                    mobile: user.mobile ?? '',
                    email: user.email ?? '',
                  })
                  setError(null)
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
