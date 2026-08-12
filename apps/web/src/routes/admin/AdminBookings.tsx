import { useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  ReferencePlaque,
  StatusBadge,
} from "../../components/ui";
import { api, messageFor } from "../../lib/api";
import { formatDate, formatTimeRange } from "../../lib/format";
import type { BookingView } from "../../lib/types";
import { useApi } from "../../lib/useApi";

/**
 * Admin booking list: reference, devotee, slot, party size, status, filters
 * (USR-02: search by devotee name or reference). Admins can cancel any booking,
 * restoring capacity the same way a devotee's own cancel does (DAR-06/Rule 4).
 */
export function AdminBookings() {
  const { data, loading, error, reload } = useApi<{ bookings: BookingView[] }>("/bookings");
  const bookings = data?.bookings ?? [];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "confirmed" | "cancelled">("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!term) return true;
      return (
        b.devoteeName.toLowerCase().includes(term) || b.reference.toLowerCase().includes(term)
      );
    });
  }, [bookings, search, status]);

  const cancel = async (booking: BookingView) => {
    if (cancellingId) return; // one cancel at a time; guards double submit
    setCancellingId(booking.id);
    setCancelError(null);
    try {
      await api.post(`/bookings/${booking.id}/cancel`);
      await reload();
    } catch (err) {
      setCancelError(messageFor(err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every darshan booking across all devotees." />

      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="booking-search" className="mb-1.5 block text-sm font-medium">
            Search by devotee or reference
          </label>
          <input
            id="booking-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Ravi Kumar or DSN-01003"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div>
          <label htmlFor="booking-status" className="mb-1.5 block text-sm font-medium">
            Status
          </label>
          <select
            id="booking-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {loading && <Loading label="Loading bookings…" />}
      <ErrorNote message={error} />
      <ErrorNote message={cancelError} />

      {!loading && filtered.length === 0 && (
        <EmptyState
          title="No bookings match"
          hint={bookings.length === 0 ? "No bookings have been made yet." : "Try a different search or filter."}
        />
      )}

      {/* Card list below sm:, table from sm: up — a table doesn't fit at 360px. */}
      <ul className="space-y-3 sm:hidden">
        {filtered.map((booking) => (
          <li key={booking.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <ReferencePlaque value={booking.reference} />
                <StatusBadge status={booking.status} />
              </div>
              <p className="mt-1 text-sm">{booking.devoteeName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {booking.eventTitle} · {formatDate(booking.date)},{" "}
                {formatTimeRange(booking.startTime, booking.endTime)}
              </p>
              <p className="mt-1 text-sm">
                {booking.visitorCount} {booking.visitorCount === 1 ? "visitor" : "visitors"}
              </p>
              {booking.status === "confirmed" && (
                <Button
                  variant="destructive"
                  className="mt-3"
                  disabled={cancellingId === booking.id}
                  onClick={() => void cancel(booking)}
                >
                  {cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        {filtered.length > 0 && (
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-3">Devotee</th>
                <th className="py-2 pr-3">Event / slot</th>
                <th className="py-2 pr-3">Party size</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id} className="border-b border-border">
                  <td className="py-3 pr-3">
                    <ReferencePlaque value={booking.reference} />
                  </td>
                  <td className="py-3 pr-3">{booking.devoteeName}</td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {booking.eventTitle}
                    <br />
                    {formatDate(booking.date)}, {formatTimeRange(booking.startTime, booking.endTime)}
                  </td>
                  <td className="py-3 pr-3">{booking.visitorCount}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="py-3 pr-3">
                    {booking.status === "confirmed" && (
                      <Button
                        variant="destructive"
                        disabled={cancellingId === booking.id}
                        onClick={() => void cancel(booking)}
                      >
                        {cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
