import { useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { api, messageFor } from "../../lib/api";
import { formatDate, formatTimeRange } from "../../lib/format";
import type { EventStatus, EventView } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const emptyEventForm = () => ({
  title: "",
  description: "",
  venue: "",
  startDate: "",
  endDate: "",
});

const emptySlotForm = () => ({ date: "", startTime: "", endTime: "", capacity: "" });

/**
 * DAR-01/02: create and edit events, add dated slots with capacity > 0, and
 * publish/unpublish. This is the admin half of the journey the devotee side
 * (EventsList/EventDetail/BookSlot) depends on.
 */
export function AdminDarshan() {
  const { data, loading, error, reload } = useApi<{ events: EventView[] }>("/events");
  const events = data?.events ?? [];

  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [slotForms, setSlotForms] = useState<Record<string, ReturnType<typeof emptySlotForm>>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [slotPending, setSlotPending] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const slotFormFor = (eventId: string) => slotForms[eventId] ?? emptySlotForm();

  const createEvent = async () => {
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      await api.post("/events", eventForm);
      setEventForm(emptyEventForm());
      setShowCreate(false);
      await reload();
    } catch (err) {
      setFormError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  const addSlot = async (eventId: string) => {
    if (slotPending) return;
    const form = slotFormFor(eventId);
    setSlotPending(eventId);
    setSlotErrors((current) => ({ ...current, [eventId]: "" }));
    try {
      await api.post(`/events/${eventId}/slots`, {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: Number(form.capacity),
      });
      setSlotForms((current) => ({ ...current, [eventId]: emptySlotForm() }));
      await reload();
    } catch (err) {
      // Keep whatever was typed so it can be corrected, not retyped.
      setSlotErrors((current) => ({ ...current, [eventId]: messageFor(err) }));
    } finally {
      setSlotPending(null);
    }
  };

  const setStatus = async (event: EventView, status: EventStatus) => {
    if (togglingId) return;
    setTogglingId(event.id);
    setToggleError(null);
    try {
      await api.patch(`/events/${event.id}`, { status });
      await reload();
    } catch (err) {
      setToggleError(messageFor(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Darshan management"
        subtitle="Create events, add dated slots, and publish them for devotees."
      />

      <div className="mb-6">
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "New event"}
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6 max-w-xl p-6">
          <h2 className="mb-4 text-sm font-semibold">New darshan event</h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void createEvent();
            }}
          >
            <div>
              <label htmlFor="ev-title" className="mb-1.5 block text-sm font-medium">
                Title
              </label>
              <input
                id="ev-title"
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            <div>
              <label htmlFor="ev-venue" className="mb-1.5 block text-sm font-medium">
                Venue
              </label>
              <input
                id="ev-venue"
                value={eventForm.venue}
                onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            <div>
              <label htmlFor="ev-desc" className="mb-1.5 block text-sm font-medium">
                Description
              </label>
              <textarea
                id="ev-desc"
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-start" className="mb-1.5 block text-sm font-medium">
                  Start date
                </label>
                <input
                  id="ev-start"
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
              <div>
                <label htmlFor="ev-end" className="mb-1.5 block text-sm font-medium">
                  End date
                </label>
                <input
                  id="ev-end"
                  type="date"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            </div>

            <ErrorNote message={formError} />

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create event (draft)"}
            </Button>
          </form>
        </Card>
      )}

      {loading && <Loading label="Loading events…" />}
      <ErrorNote message={error} />
      <ErrorNote message={toggleError} />

      {!loading && events.length === 0 && (
        <EmptyState title="No darshan events yet" hint="Create one to get started." />
      )}

      <ul className="space-y-4">
        {events.map((event) => {
          const isOpen = expanded === event.id;
          const slotForm = slotFormFor(event.id);

          return (
            <li key={event.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-lg font-bold">{event.title}</h2>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.venue ? `${event.venue} · ` : ""}
                      {formatDate(event.startDate)}
                      {event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ""}
                    </p>
                    <p className="mt-1 text-sm">
                      {event.booked} / {event.capacity} booked across {event.slots.length}{" "}
                      {event.slots.length === 1 ? "slot" : "slots"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setExpanded(isOpen ? null : event.id)}
                    >
                      {isOpen ? "Hide slots" : "Manage slots"}
                    </Button>

                    {(event.status === "draft" || event.status === "published") && (
                      <Button
                        variant={event.status === "published" ? "destructive" : "primary"}
                        disabled={togglingId === event.id}
                        onClick={() =>
                          void setStatus(
                            event,
                            event.status === "published" ? "draft" : "published",
                          )
                        }
                      >
                        {togglingId === event.id
                          ? "Saving…"
                          : event.status === "published"
                            ? "Unpublish"
                            : "Publish"}
                      </Button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-5 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold">Time slots</h3>

                    {event.slots.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No slots yet. Add one below — publishing needs at least one.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {event.slots.map((slot) => (
                          <li
                            key={slot.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                          >
                            <span className="font-mono">
                              {formatDate(slot.date)}, {formatTimeRange(slot.startTime, slot.endTime)}
                            </span>
                            <span className="font-medium">
                              {slot.bookedCount} / {slot.capacity} booked
                              {slot.status === "closed" ? " · closed" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <form
                      className="mt-4 grid gap-3 sm:grid-cols-[repeat(4,1fr)_auto]"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void addSlot(event.id);
                      }}
                    >
                      <div>
                        <label
                          htmlFor={`slot-date-${event.id}`}
                          className="mb-1.5 block text-xs font-medium"
                        >
                          Date
                        </label>
                        <input
                          id={`slot-date-${event.id}`}
                          type="date"
                          value={slotForm.date}
                          onChange={(e) =>
                            setSlotForms((current) => ({
                              ...current,
                              [event.id]: { ...slotForm, date: e.target.value },
                            }))
                          }
                          className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`slot-start-${event.id}`}
                          className="mb-1.5 block text-xs font-medium"
                        >
                          Start
                        </label>
                        <input
                          id={`slot-start-${event.id}`}
                          type="time"
                          value={slotForm.startTime}
                          onChange={(e) =>
                            setSlotForms((current) => ({
                              ...current,
                              [event.id]: { ...slotForm, startTime: e.target.value },
                            }))
                          }
                          className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`slot-end-${event.id}`}
                          className="mb-1.5 block text-xs font-medium"
                        >
                          End
                        </label>
                        <input
                          id={`slot-end-${event.id}`}
                          type="time"
                          value={slotForm.endTime}
                          onChange={(e) =>
                            setSlotForms((current) => ({
                              ...current,
                              [event.id]: { ...slotForm, endTime: e.target.value },
                            }))
                          }
                          className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`slot-cap-${event.id}`}
                          className="mb-1.5 block text-xs font-medium"
                        >
                          Capacity
                        </label>
                        <input
                          id={`slot-cap-${event.id}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={slotForm.capacity}
                          onChange={(e) =>
                            setSlotForms((current) => ({
                              ...current,
                              [event.id]: { ...slotForm, capacity: e.target.value },
                            }))
                          }
                          className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </div>
                      <Button type="submit" disabled={slotPending === event.id} className="self-end">
                        {slotPending === event.id ? "Adding…" : "Add slot"}
                      </Button>
                    </form>

                    <ErrorNote message={slotErrors[event.id] || null} />
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
