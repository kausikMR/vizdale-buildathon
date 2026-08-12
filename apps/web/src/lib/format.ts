/** Display helpers. Dates arrive as plain YYYY-MM-DD strings and stay that way. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-08-12" → "Wed 12 Aug". Parsed as local, never UTC, to avoid off-by-one. */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Adds a "Today"/"Tomorrow" prefix where it helps the devotee orient. */
export function formatDateRelative(iso: string): string {
  const today = todayIso();
  if (iso === today) return `Today, ${formatDate(iso)}`;

  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tomorrowIso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  if (iso === tomorrowIso) return `Tomorrow, ${formatDate(iso)}`;

  return formatDate(iso);
}

export const formatTimeRange = (start: string, end: string) => `${start} – ${end}`;

/** Rule 7: any figure shown is informational, never collected. */
export const formatRupees = (amount: number) => `₹${amount.toFixed(0)}`;

export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
