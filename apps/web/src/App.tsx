import { useEffect, useState } from 'react'

import { Layout, type AppPage } from './components/Layout'
import type { DemoUser } from './lib/types'
import { AdminInventoryPage } from './pages/AdminInventoryPage'
import { PrasadamDetailPage } from './pages/PrasadamDetailPage'
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

type AppRoute =
  | { page: 'prasadam'; itemId?: string }
  | { page: 'inventory' }

function routeFromPath(): AppRoute {
  const detailMatch = window.location.pathname.match(/^\/prasadam\/([^/]+)\/?$/)
  if (detailMatch) return { page: 'prasadam', itemId: decodeURIComponent(detailMatch[1]) }
  if (window.location.pathname === '/inventory') return { page: 'inventory' }
  return { page: 'prasadam' }
}

function App() {
  const [user, setUser] = useState(demoUsers[0])
  const [route, setRoute] = useState<AppRoute>(routeFromPath)

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(page: AppPage, itemId?: string) {
    const path = page === 'inventory' ? '/inventory' : itemId ? `/prasadam/${itemId}` : '/prasadam'
    window.history.pushState({}, '', path)
    setRoute(page === 'inventory' ? { page } : { page, itemId })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeUser(nextUser: DemoUser) {
    setUser(nextUser)
    if (nextUser.role !== 'admin' && route.page === 'inventory') navigate('prasadam')
  }

  return (
    <Layout
      onPageChange={navigate}
      onUserChange={changeUser}
      page={route.page}
      user={user}
      users={demoUsers}
    >
      {route.page === 'inventory' && user.role === 'admin' ? (
        <AdminInventoryPage userId={user.id} />
      ) : route.page === 'prasadam' && route.itemId ? (
        <PrasadamDetailPage
          itemId={route.itemId}
          onBack={() => navigate('prasadam')}
          userId={user.id}
        />
      ) : (
        <PrasadamPage onSelect={(itemId) => navigate('prasadam', itemId)} userId={user.id} />
      )}
    </Layout>
  )
}

export default App
