import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

/**
 * Landing pages for each role. Only the auth module is in scope for this
 * build, so these exist to prove role routing lands in the right place.
 */

function Stub({ title, description, upcoming }: { title: string; description: string; upcoming: string[] }) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not built yet</CardTitle>
          <CardDescription>These arrive with the later slices.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {upcoming.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export function DevoteeHome() {
  const { user } = useAuth()
  return (
    <Stub
      title={`Namaskaram, ${user?.name ?? 'devotee'}`}
      description="You are signed in to the devotee experience."
      upcoming={['Browse published darshan events', 'Book a slot', 'Reserve prasadam', 'My Bookings']}
    />
  )
}

export function AdminHome() {
  return (
    <Stub
      title="Admin dashboard"
      description="You are signed in as a temple administrator."
      upcoming={[
        "Today's bookings and expected visitors",
        'Slot utilisation',
        'Prasadam orders and low stock',
        'Recent activity',
      ]}
    />
  )
}
