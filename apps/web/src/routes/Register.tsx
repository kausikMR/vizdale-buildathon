import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { Button, Card, ErrorNote, PageHeader } from '../components/ui'
import { ApiError, messageFor } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useMutation } from '../lib/useApi'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { run, pending, error } = useMutation(register)

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Nothing is cleared on failure — one rejected field must not cost the user
    // the rest of the form.
    const user = await run({
      name,
      mobile: mobile || undefined,
      email: email || undefined,
    })
    if (user) navigate('/home', { replace: true })
  }

  const message = messageFor(error)
  const field = error instanceof ApiError ? error.field : undefined
  const errorFor = (name: string) => (field === name ? message : null)

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader
        title="Temple CRM"
        subtitle="Simulated registration — no identity documents are collected."
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Register</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a devotee account to book darshan and reserve prasadam.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4">
          <Field
            id="name"
            label="Full name"
            value={name}
            onChange={setName}
            autoComplete="name"
            placeholder="Arjun"
            error={errorFor('name')}
            disabled={pending}
          />
          <Field
            id="mobile"
            label="Mobile number"
            optional
            type="tel"
            value={mobile}
            onChange={setMobile}
            autoComplete="tel"
            placeholder="9800000002"
            hint="Mobile or email — at least one is required."
            error={errorFor('mobile')}
            disabled={pending}
          />
          <Field
            id="email"
            label="Email address"
            optional
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="arjun@example.org"
            error={errorFor('email')}
            disabled={pending}
          />

          {message && !field && <ErrorNote message={message} />}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/signin" className="font-semibold text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
