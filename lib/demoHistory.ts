import { businessDateOffset } from "./dates";

/**
 * The 28 days of synthetic sales history, as a pure function.
 *
 * This is a second home for logic that already lives in `supabase/seed.sql`,
 * and that duplication is deliberate. The seed writes `current_date - 1` — a
 * value resolved when the seed *runs* and then stored as an absolute date. So
 * the history was correct on the day it was seeded and silently wrong the next
 * morning: "yesterday" walked off the end of the window and the briefing
 * reported ₹0 where GND-001 asserts ₹18,400. Nothing caught it. The unit tests
 * are pure functions, the build compiles, `/api/health` reports OK.
 *
 * Reproducing the shape here lets `/api/demo/reset` roll the window forward on
 * every press, so the demo cannot decay between rehearsals.
 *
 * Both figures the eval suite pins are date-relative by construction and
 * survive regeneration on any calendar day:
 *
 *  - Garlic Naan's Friday average is 40 because Fridays are pinned to 40
 *    outright, never derived from the weekday factor (DET-001).
 *  - Yesterday totals exactly ₹18,400 because its twelve quantities are
 *    authored against fixed menu prices rather than generated (GND-001).
 *
 * `demoHistory.test.ts` asserts both, which is the same guarantee the seed's
 * own assertion block makes — moved somewhere `npm test` can see it.
 */

/** Typical daily cover for each menu item, before the weekday shape. */
const BASE_QTY: Record<number, number> = {
  1: 8, 2: 6, 3: 12, 4: 5, 5: 9, 6: 4,
  7: 5, 8: 24, 9: 35, 10: 7, 11: 15, 12: 2,
};

/** Sunday-indexed, matching Postgres `extract(dow)` and JS `getDay()`. */
const WEEKDAY_FACTOR = [1.25, 0.85, 0.85, 0.9, 1.0, 1.15, 1.3];

/** Garlic Naan, pinned so DET-001's seeded average holds on any weekday. */
const NAAN_ID = 9;
const NAAN_FRIDAY_QTY = 40;
const FRIDAY = 5;

/**
 * Yesterday is authored rather than generated: these twelve lines total exactly
 * ₹18,400 at seeded prices, and Garlic Naan holds its 40 so the Friday average
 * survives even when yesterday is itself a Friday.
 */
const YESTERDAY_QTY: Record<number, number> = {
  1: 8, 2: 6, 3: 12, 4: 5, 5: 9, 6: 4,
  7: 5, 8: 24, 9: 40, 10: 7, 11: 15, 12: 2,
};

export type HistoryRow = {
  menu_item_id: number;
  business_date: string;
  qty_sold: number;
  revenue: number;
  is_synthetic: true;
};

function qtyFor(menuItemId: number, date: Date): number {
  if (menuItemId === NAAN_ID && date.getDay() === FRIDAY) return NAAN_FRIDAY_QTY;
  return Math.max(
    1,
    Math.round(BASE_QTY[menuItemId] * WEEKDAY_FACTOR[date.getDay()])
  );
}

/**
 * 28 days ending yesterday, for the given menu prices.
 *
 * Dates come from `businessDateOffset`, not a UTC round-trip — the history has
 * to land on the same local calendar days the forecast reads back, which is the
 * bug `lib/dates.ts` was written to close.
 */
export function synthesizeHistory(
  prices: Map<number, number>,
  from: Date = new Date()
): HistoryRow[] {
  const rows: HistoryRow[] = [];

  for (let back = 28; back >= 2; back--) {
    const day = new Date(from);
    day.setDate(day.getDate() - back);

    for (const id of Object.keys(BASE_QTY).map(Number)) {
      const price = prices.get(id);
      if (price === undefined) continue;
      const qty = qtyFor(id, day);
      rows.push({
        menu_item_id: id,
        business_date: businessDateOffset(-back, from),
        qty_sold: qty,
        revenue: qty * price,
        is_synthetic: true,
      });
    }
  }

  for (const [key, qty] of Object.entries(YESTERDAY_QTY)) {
    const id = Number(key);
    const price = prices.get(id);
    if (price === undefined) continue;
    rows.push({
      menu_item_id: id,
      business_date: businessDateOffset(-1, from),
      qty_sold: qty,
      revenue: qty * price,
      is_synthetic: true,
    });
  }

  return rows;
}
