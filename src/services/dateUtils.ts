/**
 * Shared date-parsing helpers for backend timestamps.
 *
 * The Spring backend stores Java `LocalDateTime` (no timezone) and
 * Jackson serializes it as a naked ISO string ("2026-05-25T19:30:00"
 * with no Z and no offset). The Render hosts run in UTC, so those
 * naked timestamps ARE UTC — they just don't say so.
 *
 * JavaScript's `new Date("2026-05-25T19:30:00")` interprets a naked
 * ISO string as the device's LOCAL time, which surfaces as message
 * timestamps being off by the device's UTC offset (7 hours for PDT,
 * 8 for PST, etc.).
 *
 * `parseServerTimestamp` handles both shapes: naked LocalDateTime
 * (treats as UTC by appending Z) and well-formed ISO strings with a
 * zone marker (passes through). Use it instead of `new Date(...)`
 * wherever a backend timestamp is parsed for display.
 */

export function parseServerTimestamp(raw: unknown): Date {
  if (raw == null) return new Date();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return new Date(raw);
  const s = String(raw).trim();
  if (!s) return new Date();
  // Matches "2026-05-25T19:30:00", "2026-05-25T19:30", "2026-05-25T19:30:00.123456" —
  // anything that's ISO-shaped but missing a zone marker (Z, +HH:MM, -HH:MM).
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}

/**
 * Same as parseServerTimestamp but returns a number (epoch ms) — useful
 * for sort comparators that already destructure with `.getTime()`.
 */
export function parseServerTimestampMs(raw: unknown): number {
  return parseServerTimestamp(raw).getTime();
}

/**
 * "YYYY-MM-DD" in the device's LOCAL timezone.
 *
 * Why: `new Date().toISOString().slice(0, 10)` returns the UTC date,
 * which for any device west of UTC silently rolls forward to TOMORROW
 * once the local clock passes (24 - offset)h. In PDT (UTC-7), an order
 * placed at 6:30 PM is recorded as 01:30 AM the *next* day — so the
 * kitchen dashboard's "today's orders" view never sees it.
 *
 * Use this for any date that represents "what day did this happen on
 * for the user looking at the screen" — meal-order dates, schedule
 * keys, "today's auto-suggest" keys. NOT for instants in time (use
 * Date directly or ISO with Z for those).
 */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shorthand for `toLocalISODate(new Date())`. */
export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}
