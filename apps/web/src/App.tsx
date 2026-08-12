import { useState } from 'react'

import { Layout, type AppPage } from './components/Layout'
import type { DemoUser } from './lib/types'
import { AdminInventoryPage } from './pages/AdminInventoryPage'
import { PrasadamPage } from './pages/PrasadamPage'

const demoUsers: DemoUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Priya Raman',
    role: 'admin',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Arjun Iyer',
    role: 'devotee',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Lakshmi Nair',
    role: 'devotee',
  },
]

function App() {
  const [user, setUser] = useState(demoUsers[0])
  const [page, setPage] = useState<AppPage>('inventory')

  function changeUser(nextUser: DemoUser) {
    setUser(nextUser)
    if (nextUser.role !== 'admin') setPage('prasadam')
  }

  return (
    <Layout
      onPageChange={setPage}
      onUserChange={changeUser}
      page={page}
      user={user}
      users={demoUsers}
    >
      {page === 'inventory' && user.role === 'admin' ? (
        <AdminInventoryPage userId={user.id} />
      ) : (
        <PrasadamPage userId={user.id} />
      )}
    </Layout>
  )
}

export default App
