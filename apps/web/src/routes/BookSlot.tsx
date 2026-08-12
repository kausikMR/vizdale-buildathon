import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  ReferencePlaque,
} from "../components/ui";
import { api, messageFor, newIdempotencyKey } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDateRelative, formatTimeRange } from "../lib/format";
import { MAX_VISITORS_PER_BOOKING, type Booking, type EventView } from "../lib/types";
import { useApi } from "../lib/useApi";

interface AttendeeDraft {
  name: string;
  age: string;
}

type Step = "details" | "review" | "confirmed";

const blankAttendee = (): AttendeeDraft => ({ name: "", age: "" });

export function BookSlot() {
  const { eventId, slotId } = useParams<{ eventId: string; slotId: string }>();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<{ event: EventView }>(
    eventId ? `/events/${eventId}` : null,
  );

  const event = data?.event;
  const slot = event?.slots.find((s) => s.id === slotId);

  const [step, setStep] = useState<Step>("details");
  const [visitorCount, setVisitorCount] = useState(1);
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([
    { name: user?.name ?? "", age: "" },
  ]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  // Rule 3 capped by what is actually left, so the control cannot offer a
  // number the server would reject.
  const maxSelectable = useMemo(() => {
    if (!slot) return 1;
    return Math.max(1, Math.min(MAX_VISITORS_PER_BOOKING, slot.remaining));
  }, [slot]);

  const setCount = (next: number) => {
    setVisitorCount(next);
    setAttendees((current) => {
      const grown = [...current];
      while (grown.length < next) grown.push(blankAttendee());
      // Keep any names already typed if the count shrinks then grows again.
      return grown.slice(0, next);
    });
  };

  const updateAttendee = (index: number, patch: Partial<AttendeeDraft>) => {
    setAttendees((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

  if (loading) return <Loading label="Loading slot…" />;
  if (error) return <ErrorNote message={error} />;

  if (!event || !slot) {
    return (
      <EmptyState
        title="That time slot is no longer available"
        hint="It may have filled up or been closed. Please choose another slot."
      />
    );
  }

  // ------------------------------------------------------------- confirmation
  if (step === "confirmed" && booking) {
    return (
      <>
        <PageHeader title="Booking confirmed" subtitle="Please arrive fifteen minutes early." />

        <Card className="max-w-xl p-6 temple-rise-in">
          <p className="text-sm text-muted-foreground">Your booking reference</p>
          <ReferencePlaque value={booking.reference} className="mt-1.5 px-4 py-2 text-2xl" />

          <Divider className="mt-5" />

          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">Event:</dt>
              <dd className="text-muted-foreground">{event.title}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">When:</dt>
              <dd className="text-muted-foreground">
                {formatDateRelative(slot.date)}, {formatTimeRange(slot.startTime, slot.endTime)}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">Visitors:</dt>
              <dd className="text-muted-foreground">{booking.visitorCount}</dd>
            </div>
            {event.venue && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium">Venue:</dt>
                <dd className="text-muted-foreground">{event.venue}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/my-bookings"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4
                text-sm font-semibold text-primary-foreground transition hover:opacity-90
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              View my bookings
            </Link>
            <Link
              to="/events"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-secondary px-4
                text-sm font-semibold text-secondary-foreground transition hover:opacity-90
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Book another darshan
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const confirm = async () => {
    if (pending) return; // duplicate-submit guard
    setPending(true);
    setSubmitError(null);

    try {
      const result = await api.post<{ booking: Booking }>(
        "/bookings",
        {
          slotId: slot.id,
          visitorCount,
          attendeeDetails: attendees.map((a) => ({
            name: a.name.trim(),
            ...(a.age.trim() ? { age: Number(a.age) } : {}),
          })),
        },
        { idempotencyKey: newIdempotencyKey() },
      );
      setBooking(result.booking);
      setStep("confirmed");
    } catch (err) {
      // Error recovery: stay on the form with everything the devotee typed
      // still in place, and refresh capacity so the figures shown are current.
      setSubmitError(messageFor(err));
      setStep("details");
      void reload();
    } finally {
      setPending(false);
    }
  };

  // -------------------------------------------------------------------- review
  if (step === "review") {
    return (
      <>
        <PageHeader title="Review your booking" subtitle="Check the details before confirming." />

        <Card className="max-w-xl p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">Event:</dt>
              <dd className="text-muted-foreground">{event.title}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">When:</dt>
              <dd className="text-muted-foreground">
                {formatDateRelative(slot.date)}, {formatTimeRange(slot.startTime, slot.endTime)}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium">Visitors:</dt>
              <dd className="text-muted-foreground">{visitorCount}</dd>
            </div>
          </dl>

          <h2 className="mt-5 text-sm font-semibold">Attendees</h2>
          <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
            {attendees.map((a, i) => (
              <li key={i}>
                {i + 1}. {a.name.trim()}
                {a.age.trim() ? `, age ${a.age.trim()}` : ""}
              </li>
            ))}
          </ol>

          <p className="mt-5 text-xs text-muted-foreground">
            No payment is collected for darshan bookings.
          </p>

          <ErrorNote message={submitError} />

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void confirm()} disabled={pending}>
              {pending ? "Confirming…" : "Confirm booking"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("details")} disabled={pending}>
              Back to edit
            </Button>
          </div>
        </Card>
      </>
    );
  }

  // ------------------------------------------------------------------- details
  const missingName = attendees.some((a) => !a.name.trim());

  return (
    <>
      <Link
        to={`/events/${event.id}`}
        className="mb-4 inline-block text-sm font-medium text-muted-foreground underline
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        ← Back to slots
      </Link>

      <PageHeader
        title="Book darshan"
        subtitle={`${event.title} · ${formatDateRelative(slot.date)}, ${formatTimeRange(
          slot.startTime,
          slot.endTime,
        )}`}
      />

      <Card className="max-w-xl p-6">
        <p className="text-sm font-medium">
          {slot.remaining} of {slot.capacity} places left in this slot
        </p>

        <form
          className="mt-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (missingName) {
              setSubmitError("Please enter a name for every visitor.");
              return;
            }
            setSubmitError(null);
            setStep("review");
          }}
        >
          <div>
            <label htmlFor="visitors" className="mb-1.5 block text-sm font-medium">
              Number of visitors
            </label>
            <select
              id="visitors"
              value={visitorCount}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-describedby="visitors-hint"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p id="visitors-hint" className="mt-1.5 text-xs text-muted-foreground">
              Up to {MAX_VISITORS_PER_BOOKING} visitors per booking
              {slot.remaining < MAX_VISITORS_PER_BOOKING
                ? `, and only ${slot.remaining} left in this slot`
                : ""}
              .
            </p>
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Attendee details</legend>

            {attendees.map((attendee, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <div>
                  <label htmlFor={`name-${index}`} className="mb-1.5 block text-sm font-medium">
                    Visitor {index + 1} name
                  </label>
                  <input
                    id={`name-${index}`}
                    value={attendee.name}
                    onChange={(e) => updateAttendee(index, { name: e.target.value })}
                    className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
                <div>
                  <label htmlFor={`age-${index}`} className="mb-1.5 block text-sm font-medium">
                    Age
                  </label>
                  <input
                    id={`age-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={120}
                    value={attendee.age}
                    onChange={(e) => updateAttendee(index, { age: e.target.value })}
                    className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
              </div>
            ))}

            <p className="text-xs text-muted-foreground">Age is optional.</p>
          </fieldset>

          <ErrorNote message={submitError} />

          <Button type="submit" className="w-full sm:w-auto">
            Review booking
          </Button>
        </form>
      </Card>
    </>
  );
}
