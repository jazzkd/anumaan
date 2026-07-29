import type { SupabaseClient } from "@supabase/supabase-js";
import { RESTAURANT_ID } from "./constants";
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

/* ══════════════════════════════════════════════════════════════════════════
   Self-healing.

   Rolling the window inside `/api/demo/reset` fixed the decay for whoever
   remembers to press reset. Judges do not press reset — they open the URL.
   Vercel runs UTC while the demo is narrated in IST, so the window can expire
   between the rehearsal and the judging with nobody having touched anything,
   and the first thing a judge would see is a Daily Briefing reporting ₹0.

   So the repair moved onto the read path: every handler that reads history
   checks first, and regenerates only if the window has actually decayed.
   ══════════════════════════════════════════════════════════════════════ */

/** The two columns the staleness test needs, as the readers select them. */
export type HistoryStamp = { business_date: string; is_synthetic: boolean };

/**
 * Whether the seeded window has decayed, judged from the newest row alone.
 *
 * Deliberately narrow on both sides. No history at all is a legitimate state —
 * FR-P6 says a restaurant with no sales gets no forecast and is told so, and
 * fabricating a month of trading to avoid an empty screen would be exactly the
 * dishonesty the rest of this product refuses. And if the newest row is *real*,
 * this is a live restaurant rather than the demo seed, so it is never touched.
 * Only synthetic history that has fallen behind yesterday gets regenerated.
 *
 * ISO dates compare correctly as strings, which is why `business_date` is
 * stored and compared in that form throughout.
 */
export function needsHeal(
  newest: HistoryStamp | null | undefined,
  from: Date = new Date()
): boolean {
  if (!newest) return false;
  if (!newest.is_synthetic) return false;
  return newest.business_date < businessDateOffset(-1, from);
}

/**
 * Regenerate the window if it has decayed. Returns whether it did.
 *
 * Costs one indexed single-row query in the overwhelmingly common case where
 * nothing is wrong. The write is an upsert on
 * `(restaurant_id, menu_item_id, business_date)` rather than a delete-then-
 * insert, so two requests arriving in the same second after a rollover cannot
 * race each other into a half-empty table — the worst case is that both write
 * identical rows.
 *
 * A failure here never fails the request it was protecting: serving a briefing
 * from a stale window is bad, serving no briefing at all is worse, and this is
 * demo scaffolding rather than a figure anyone is asked to trust.
 */
export async function ensureFreshHistory(
  db: SupabaseClient,
  from: Date = new Date()
): Promise<boolean> {
  try {
    const { data, error } = await db
      .from("daily_summaries")
      .select("business_date, is_synthetic")
      .eq("restaurant_id", RESTAURANT_ID)
      .order("business_date", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    if (!needsHeal(data?.[0] as HistoryStamp | undefined, from)) return false;

    // Prices come from the menu, not a constant: yesterday's ₹18,400 is
    // quantities × the seeded prices, so a repriced item must move the figure
    // rather than silently disagree with the menu the briefing cites.
    const { data: menu, error: menuError } = await db
      .from("menu_items")
      .select("id, price")
      .eq("restaurant_id", RESTAURANT_ID);
    if (menuError) throw new Error(menuError.message);

    const prices = new Map<number, number>(
      (menu ?? []).map((m) => [m.id as number, Number(m.price)])
    );
    const rows = synthesizeHistory(prices, from).map((row) => ({
      ...row,
      restaurant_id: RESTAURANT_ID,
    }));

    const { error: upsertError } = await db
      .from("daily_summaries")
      .upsert(rows, { onConflict: "restaurant_id,menu_item_id,business_date" });
    if (upsertError) throw new Error(upsertError.message);

    // Days that fell out of the back of the window, or the table grows without
    // bound across a long-lived demo. Synthetic rows only.
    await db
      .from("daily_summaries")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("is_synthetic", true)
      .lt("business_date", businessDateOffset(-28, from));

    return true;
  } catch (err) {
    console.warn(
      "[demoHistory] could not refresh the seeded window:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
