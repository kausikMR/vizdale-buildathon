import { PageHeader, Placeholder } from '../components/ui'
import { useAuth } from '../lib/auth'

/**
 * Landing pages for each role. Only the auth module is in scope, so these mark
 * the screens other lanes own and prove role routing lands in the right place.
 */

export function DevoteeHome() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader
        title={`Namaskaram, ${user?.name ?? 'devotee'}`}
        subtitle="You are signed in to the devotee experience."
      />
      <Placeholder screen="Events, booking and prasadam" owner="darshan and prasadam lanes" />
    </>
  )
}

export function AdminHome() {
  return (
    <>
      <PageHeader
        title="Admin dashboard"
        subtitle="You are signed in as a temple administrator."
      />
      <Placeholder screen="Dashboard" owner="dashboard lane" />
    </>
  )
}
