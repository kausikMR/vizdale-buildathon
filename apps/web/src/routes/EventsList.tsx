import { Link } from "react-router-dom";
import {
  Card,
  EmptyState,
  ErrorNote,
  GradientLink,
  HeroBanner,
  LotusIcon,
  Loading,
  SectionHeading,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/format";
import { templeImages } from "../lib/images";
import { useApi } from "../lib/useApi";
import type { EventView } from "../lib/types";

/** Derived purely from the event's own slot times — never a made-up label. */
function timeOfDay(event: EventView): { label: string; emoji: string } {
  const hour = Number(event.slots[0]?.startTime.split(":")[0] ?? NaN);
  if (Number.isNaN(hour)) return { label: "All day", emoji: "🕉️" };
  if (hour < 12) return { label: "Morning", emoji: "☀️" };
  if (hour < 17) return { label: "Afternoon", emoji: "🌤️" };
  return { label: "Evening", emoji: "🌙" };
}

/**
 * DAR-03: this list only ever contains published events with slots a devotee
 * could actually book — the API filters both, so there is nothing to check here.
 */
export function EventsList() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<{ events: EventView[] }>("/events");
  const events = data?.events ?? [];

  return (
    <>
      <HeroBanner
        greeting={`Welcome, ${user?.name ?? "devotee"}`}
        title="Book your divine darshan"
        subtitle="Choose from our published events and secure your visit in a few steps."
      />

      <SectionHeading
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

      <ul className="grid gap-5 sm:grid-cols-2">
        {events.map((event) => {
          const placesLeft = event.slots.reduce((sum, slot) => sum + slot.remaining, 0);
          const slotCount = event.slots.length;
          const { label, emoji } = timeOfDay(event);

          return (
            <li key={event.id}>
              <Card className="flex h-full flex-col overflow-hidden p-0">
                <div
                  className="relative h-28 shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${templeImages.sanctum()})` }}
                >
                  {/* Warm gradient over the photo — keeps the badge and
                      watermark legible against whatever the image shows. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, color-mix(in oklch, var(--accent) 55%, transparent), color-mix(in oklch, var(--primary) 55%, transparent))',
                    }}
                  />
                  <LotusIcon className="absolute -bottom-3 -right-3 h-20 w-20 text-primary-foreground/25" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                    {emoji} {label}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-serif text-lg font-bold text-primary">{event.title}</h3>

                  <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {event.venue && (
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true">📍</span>
                        <dt className="font-medium text-foreground">Venue:</dt>
                        <dd>{event.venue}</dd>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true">📅</span>
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

                  <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                    {/* Capacity is stated in words as well as numbers, never colour alone. */}
                    <p className="text-sm font-medium">
                      {placesLeft > 0 ? (
                        <>
                          <span aria-hidden="true">🎟️</span> {placesLeft}{" "}
                          {placesLeft === 1 ? "place" : "places"}
                          <br />
                          across {slotCount} {slotCount === 1 ? "slot" : "slots"}
                        </>
                      ) : (
                        "All slots are currently full"
                      )}
                    </p>

                    <GradientLink to={`/events/${event.id}`}>
                      View slots <span aria-hidden="true">→</span>
                    </GradientLink>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-sm">
        <Link
          to="/my-bookings"
          className="font-medium text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View my bookings
        </Link>
      </p>
    </>
  );
}
