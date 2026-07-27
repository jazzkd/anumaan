/**
 * Wait-time estimation for the walk-in queue.
 *
 * This returns a *range*, never a single number, and that is a product
 * decision rather than a hedge: a restaurant cannot know that a table frees in
 * exactly 43 minutes, and a diner who is told "45 min" and waits 60 trusts
 * nothing else the app says. DET-002 asserts the range shape.
 */

export const AVG_TABLE_TURN_MIN = 45;

export type WaitEstimate = {
  type: "range";
  centerMin: number;
  minMin: number;
  maxMin: number;
  label: string;
};

/**
 * Parties ahead of you that cannot be seated immediately, each costing one
 * table turn. Available matching tables absorb the front of the queue.
 */
export function waitEstimate(
  partiesAhead: number,
  tablesAvailable: number,
  avgTurnMin: number = AVG_TABLE_TURN_MIN
): WaitEstimate {
  const blocked = Math.max(0, partiesAhead - Math.max(0, tablesAvailable));
  const centerMin = blocked * avgTurnMin;

  // ±20%, rounded to 5-minute steps — a range that looks computed to the
  // minute would reintroduce exactly the false precision this avoids.
  const spread = Math.max(5, Math.round((centerMin * 0.2) / 5) * 5);
  const minMin = Math.max(0, centerMin - spread);
  const maxMin = centerMin + spread;

  return {
    type: "range",
    centerMin,
    minMin,
    maxMin,
    label: centerMin === 0 ? "Seating now" : `${minMin}–${maxMin} min`,
  };
}
