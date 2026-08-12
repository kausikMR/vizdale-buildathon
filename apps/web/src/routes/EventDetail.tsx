import { Link, useParams } from "react-router-dom";
import { Card, EmptyState, ErrorNote, Loading, PageHeader } from "../components/ui";
import { formatDateRelative, formatTimeRange } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { EventView, SlotView } from "../lib/types";

/** Slots arrive chronological; group them by date so a devotee picks a day first. */
function groupByDate(slots: SlotView[]): Array<[string, SlotView[]]> {
  const groups = new Map<string, SlotView[]>();
  for (const slot of slots) {
    const list = groups.get(slot.date) ?? [];
    list.push(slot);
    groups.set(slot.date, list);
  }
  return [...groups.entries()];
}

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, loading, error } = useApi<{ event: EventView }>(
    eventId ? `/events/${eventId}` : null,
  );

  const event = data?.event;

  if (loading) return <Loading label="Loading event…" />;
  if (error) return <ErrorNote message={error} />;
  if (!event) return <EmptyState title="That event is not available." />;

  const byDate = groupByDate(event.slots);

  return (
    <>
      <Link
        to="/events"
        className="mb-4 inline-block text-sm font-medium text-muted-foreground underline
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        ← All darshan events
      </Link>

      <PageHeader title={event.title} subtitle={event.venue || undefined} />

      {event.description && (
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
      )}

      {byDate.length === 0 && (
        <EmptyState
          title="No slots are open for booking"
          hint="Every slot for this event is either full or has already taken place."
        />
      )}

      <div className="space-y-6">
        {byDate.map(([date, slots]) => (
          <section key={date} aria-labelledby={`date-${date}`}>
            <h2 id={`date-${date}`} className="mb-3 text-lg font-semibold">
              {formatDateRelative(date)}
            </h2>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <Card className="flex h-full flex-col p-4">
                    <p className="font-mono text-sm font-semibold">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </p>

                    {/* Rule 1 made visible: remaining comes from the API, never recomputed. */}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {slot.remaining} of {slot.capacity} places left
                    </p>

                    {slot.bookable ? (
                      <Link
                        to={`/events/${event.id}/slots/${slot.id}/book`}
                        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md
                          bg-primary px-4 text-sm font-semibold text-primary-foreground transition
                          hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2
                          focus-visible:outline-ring"
                      >
                        Book this slot
                      </Link>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-destructive">
                        Slot full — please choose another
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
