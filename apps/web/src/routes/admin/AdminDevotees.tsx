import { useEffect, useState } from "react";
import { Card, EmptyState, ErrorNote, Loading, PageHeader } from "../../components/ui";
import { api, messageFor } from "../../lib/api";
import type { User } from "../../lib/types";

interface Devotee extends User {
  bookingCount: number;
  orderCount: number;
  lastActivity: string | null;
}

/** USR-02: admin search by name. Booking/order counts come pre-joined from the API. */
export function AdminDevotees() {
  const [search, setSearch] = useState("");
  const [devotees, setDevotees] = useState<Devotee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";

    // Small debounce so each keystroke doesn't fire its own request.
    const timer = setTimeout(async () => {
      try {
        const { devotees: list } = await api.get<{ devotees: Devotee[] }>(`/devotees${query}`);
        if (!cancelled) {
          setDevotees(list);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(messageFor(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <>
      <PageHeader title="Devotee directory" subtitle="Everyone who has signed in as a devotee." />

      <Card className="mb-5 p-4">
        <label htmlFor="devotee-search" className="mb-1.5 block text-sm font-medium">
          Search by name
        </label>
        <input
          id="devotee-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Ravi"
          className="min-h-11 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </Card>

      {loading && <Loading label="Loading devotees…" />}
      <ErrorNote message={error} />

      {!loading && devotees?.length === 0 && (
        <EmptyState title="No devotees match that search" />
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {devotees?.map((devotee) => (
          <li key={devotee.id}>
            <Card className="p-4">
              <p className="font-semibold">{devotee.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {devotee.mobile || devotee.email || "No contact details on file"}
              </p>
              <p className="mt-3 text-sm">
                {devotee.bookingCount} confirmed booking{devotee.bookingCount === 1 ? "" : "s"} ·{" "}
                {devotee.orderCount} order{devotee.orderCount === 1 ? "" : "s"}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
