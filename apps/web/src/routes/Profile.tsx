import { Card, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../lib/auth'

/**
 * Read-only. The contract defines no profile-update endpoint, so nothing here
 * claims to be editable — an input the user cannot save is worse than none.
 */
export function Profile() {
  const { user } = useAuth()
  if (!user) return null

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const rows = [
    { label: 'Name', value: user.name },
    { label: 'Mobile number', value: user.mobile ?? 'Not provided' },
    { label: 'Email address', value: user.email ?? 'Not provided' },
    { label: 'Role', value: user.role === 'admin' ? 'Administrator' : 'Devotee' },
    { label: 'Member since', value: memberSince },
  ]

  return (
    <>
      <PageHeader title="Profile" subtitle="The details the temple holds for your account." />

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your details</h2>
          <StatusBadge status={user.status} />
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 text-sm font-medium break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-xs text-muted-foreground">
          To correct any of these details, please contact the temple office.
        </p>
      </Card>
    </>
  )
}
