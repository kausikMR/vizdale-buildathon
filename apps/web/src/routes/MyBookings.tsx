import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  ReferencePlaque,
  StatusBadge,
} from "../components/ui";
import { api, messageFor } from "../lib/api";
import { formatDateRelative, formatTimeRange } from "../lib/format";
import type { BookingView } from "../lib/types";
import { useApi } from "../lib/useApi";

/** USR-01: scoped to the signed-in devotee by the server, not by anything here. */
export function MyBookings() {
  const bookings = useApi<{ bookings: BookingView[] }>("/bookings");

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancel = async (booking: BookingView) => {
    if (cancellingId) return; // one cancel at a time; guards double submit
    setCancellingId(booking.id);
    setCancelError(null);
    try {
      await api.post(`/bookings/${booking.id}/cancel`);
      // DAR-06: capacity was restored server-side — refetch so it shows.
      await bookings.reload();
    } catch (err) {
      setCancelError(messageFor(err));
    } finally {
      setCancellingId(null);
    }
  };

  const bookingList = bookings.data?.bookings ?? [];

  return (
    <>
      <PageHeader title="My bookings" subtitle="Your darshan bookings and their status." />

      {bookings.loading && <Loading label="Loading your bookings…" />}
      <ErrorNote message={bookings.error} />
      <ErrorNote message={cancelError} />

      {!bookings.loading && bookingList.length === 0 && (
        <EmptyState
          title="You have no darshan bookings yet"
          hint="Browse the published events to book a slot."
        />
      )}

      <ul className="space-y-3">
        {bookingList.map((booking) => (
          <li key={booking.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <ReferencePlaque value={booking.reference} />
                  <h3 className="mt-1 font-semibold">{booking.eventTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateRelative(booking.date)},{" "}
                    {formatTimeRange(booking.startTime, booking.endTime)}
                    {booking.venue ? ` · ${booking.venue}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.visitorCount} {booking.visitorCount === 1 ? "visitor" : "visitors"}
                    {booking.attendeeDetails.length > 0
                      ? `: ${booking.attendeeDetails.map((a) => a.name).join(", ")}`
                      : ""}
                  </p>
                </div>

                <StatusBadge status={booking.status} />
              </div>

              {booking.status === "confirmed" && (
                <div className="mt-4">
                  <Button
                    variant="destructive"
                    disabled={cancellingId === booking.id}
                    onClick={() => void cancel(booking)}
                  >
                    {cancellingId === booking.id ? "Cancelling…" : "Cancel booking"}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm">
        <Link
          to="/events"
          className="font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Book another darshan
        </Link>
      </p>
    </>
  );
}
