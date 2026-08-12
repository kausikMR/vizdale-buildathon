import { Card, EmptyState, ErrorNote, Loading, PageHeader, StatusBadge } from '../components/ui'
import { messageFor } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { User } from '../lib/types'

/**
 * Reads the admin-only endpoint, so the server half of AUTH-02 is exercised by
 * a real screen rather than only by the route guard.
 *
 * A seven-column table does not fit at 360px, so this renders a card per
 * devotee on mobile and a table from sm: up (DESIGN.md section 6).
 */
export function AdminDevotees() {
  const { data, loading, error } = useApi<{ users: User[] }>('/devotees')
  const message = messageFor(error)
  const devotees = data?.users ?? []

  const contactOf = (user: User) =>
    [user.mobile, user.email].filter(Boolean).join(' · ') || 'No contact on file'

  return (
    <>
      <PageHeader title="Devotee directory" subtitle="Everyone registered on this temple's system." />

      {loading && <Loading label="Loading devotees…" />}
      {message && <ErrorNote message={message} />}

      {!loading && !message && devotees.length === 0 && (
        <EmptyState title="No devotees yet" hint="Registrations will appear here." />
      )}

      {devotees.length > 0 && (
        <>
          <div className="grid gap-3 sm:hidden">
            {devotees.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold break-words">{user.name}</p>
                  <StatusBadge status={user.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground break-words">{contactOf(user)}</p>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {devotees.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contactOf(user)}</td>
                    {/* Status prints the word, never colour alone. */}
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  )
}
