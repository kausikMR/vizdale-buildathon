import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading, Placeholder } from "./components/ui";
import { AuthProvider, useAuth } from "./lib/auth";
import { AdminBookings } from "./routes/admin/AdminBookings";
import { AdminDarshan } from "./routes/admin/AdminDarshan";
import { AdminDevotees } from "./routes/admin/AdminDevotees";
import { BookSlot } from "./routes/BookSlot";
import { EventDetail } from "./routes/EventDetail";
import { EventsList } from "./routes/EventsList";
import { MyBookings } from "./routes/MyBookings";
import { Profile } from "./routes/Profile";
import { SignIn } from "./routes/SignIn";

/** Where each role belongs after signing in (acceptance check: role routing). */
const homeFor = (isAdmin: boolean) => (isAdmin ? "/admin" : "/events");

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking your session…" />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

/**
 * AUTH-02: admin routes are unreachable for devotee accounts. The server refuses
 * them too — this only keeps a devotee from landing on a broken screen.
 */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/events" replace />;
  return <>{children}</>;
}

function Home() {
  const { isAdmin } = useAuth();
  return <Navigate to={homeFor(isAdmin)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />

        {/* Devotee experience */}
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/events/:eventId/slots/:slotId/book" element={<BookSlot />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin — darshan management, bookings and the devotee directory. The
            dashboard and prasadam admin screens belong to other lanes. */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Placeholder screen="Admin dashboard" owner="dashboard lane" />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/darshan"
          element={
            <RequireAdmin>
              <AdminDarshan />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <RequireAdmin>
              <AdminBookings />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/devotees"
          element={
            <RequireAdmin>
              <AdminDevotees />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <RequireAdmin>
              <Placeholder screen="Prasadam inventory" owner="prasadam lane" />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RequireAdmin>
              <Placeholder screen="Order fulfilment" owner="prasadam lane" />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
