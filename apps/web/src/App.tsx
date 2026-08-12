import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomeRedirect, RedirectIfSignedIn, RequireAdmin, RequireAuth } from './components/guards'
import { AdminDevotees } from './routes/AdminDevotees'
import { AdminHome, DevoteeHome } from './routes/Placeholders'
import { Profile } from './routes/Profile'
import { Register } from './routes/Register'
import { SignIn } from './routes/SignIn'

function App() {
  return (
    <Routes>
      {/* Public. Signed-in users are bounced to their own landing page. */}
      <Route element={<RedirectIfSignedIn />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Everything below requires a chosen account. */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/home" element={<DevoteeHome />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin subtree — a devotee never reaches these. */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/devotees" element={<AdminDevotees />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
