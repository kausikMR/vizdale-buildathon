import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError, api } from '@/lib/api'
import type { User } from '@/lib/types'

/**
 * Reads the admin-only endpoint, so the server-side half of AUTH-02 is
 * exercised by a real screen rather than only by the route guard.
 */
export function AdminDevotees() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ users: User[] }>('/auth/users')
      .then(({ users: list }) => setUsers(list))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load the directory.'),
      )
  }, [])

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Devotee directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone registered on this temple's system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription>
            {users ? `${users.length} registered` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          {users && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Contact</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Role</th>
                    <th scope="col" className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{user.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {[user.mobile, user.email].filter(Boolean).join(' · ')}
                      </td>
                      <td className="py-2 pr-4">{user.role === 'admin' ? 'Admin' : 'Devotee'}</td>
                      {/* Status is spelled out, never colour alone. */}
                      <td className="py-2">{user.status === 'active' ? 'Active' : 'Suspended'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
