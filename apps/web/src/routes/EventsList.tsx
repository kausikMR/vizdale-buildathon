import { Link } from "react-router-dom";
import { Card, EmptyState, ErrorNote, Loading, PageHeader } from "../components/ui";
import { formatDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { EventView } from "../lib/types";

/**
 * DAR-03: this list only ever contains published events with slots a devotee
 * could actually book — the API filters both, so there is nothing to check here.
 */
export function EventsList() {
  const { data, loading, error } = useApi<{ events: EventView[] }>("/events");
  const events = data?.events ?? [];

  return (
    <>
      <PageHeader
        title="Darshan events"
        subtitle="Choose an event to see available dates and time slots."
      />

      {error && <ErrorNote message={error} />}
      {loading && <Loading label="Loading darshan events…" />}

      {!loading && !error && events.length === 0 && (
        <EmptyState
          title="No darshan events open right now"
          hint="Please check back later — the temple office publishes new events regularly."
        />
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {events.map((event) => {
          const placesLeft = event.slots.reduce((sum, slot) => sum + slot.remaining, 0);
          const slotCount = event.slots.length;

          return (
            <li key={event.id}>
              <Card className="flex h-full flex-col p-5">
                <h2 className="font-serif text-lg font-bold">{event.title}</h2>

                <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {event.venue && (
                    <div className="flex gap-1.5">
                      <dt className="font-medium text-foreground">Venue:</dt>
                      <dd>{event.venue}</dd>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <dt className="font-medium text-foreground">Dates:</dt>
                    <dd>
                      {event.startDate === event.endDate
                        ? formatDate(event.startDate)
                        : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
                    </dd>
                  </div>
                </dl>

                {event.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>
                )}

                {/* Capacity is stated in words as well as numbers, never colour alone. */}
                <p className="mt-4 text-sm font-medium">
                  {placesLeft > 0
                    ? `${placesLeft} ${placesLeft === 1 ? "place" : "places"} left across ${slotCount} ${
                        slotCount === 1 ? "slot" : "slots"
                      }`
                    : "All slots are currently full"}
                </p>

                <Link
                  to={`/events/${event.id}`}
                  className="mt-4 inline-flex min-h-11 items-center justify-center self-start rounded-md
                    bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  View slots
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
