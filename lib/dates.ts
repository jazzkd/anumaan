/**
 * Business dates are local calendar days, not UTC instants.
 *
 * `daily_summaries.business_date` is a Postgres `date` — "26 July", with no
 * timezone. Converting a local midnight through `toISOString()` shifts it back
 * into the previous UTC day for any timezone east of Greenwich, so an IST
 * server reading "yesterday" silently gets the day before that. This is not
 * hypothetical: it made the Daily Briefing report ₹24,020 instead of the
 * seeded ₹18,400 that GND-001 asserts.
 *
 * Everything that touches a business date goes through here.
 */

/** Local calendar day as `YYYY-MM-DD`, with no UTC round-trip. */
export function businessDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** N days before the given local day, still as a local calendar day. */
export function businessDateOffset(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return businessDate(d);
}

/** Local midnight, for range queries against `timestamptz` columns. */
export function startOfLocalDay(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  return d;
}
