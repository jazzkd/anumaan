/**
 * Demand forecasting — pure arithmetic, no model anywhere near it.
 *
 * This separation is the honesty claim the whole predictive layer rests on.
 * The formula is published in the UI as the basis line under every number, an
 * LLM is only ever asked to narrate the result, and DET-001 asserts an exact
 * match (40 × 1.1 = 44). A language model cannot be trusted to return 44, and
 * does not need to be.
 */

export type HistoryRow = {
  menu_item_id: number;
  business_date: string; // YYYY-MM-DD, a local calendar day
  qty_sold: number;
};

/** Day of week for a `YYYY-MM-DD` business date, 0 = Sunday.
 *  Parsed as local parts — `new Date("2026-07-24")` is parsed as UTC and can
 *  land on the wrong weekday east of Greenwich. */
export function weekdayOf(businessDate: string): number {
  const [y, m, d] = businessDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * The seeded average: what this item sells on this weekday, historically.
 * Returns null rather than 0 when there is no history — "no data" and "sells
 * nothing" are different claims, and FR-P6 requires the first to be said out
 * loud instead of dressed up as the second.
 */
export function weekdayAverage(
  rows: HistoryRow[],
  menuItemId: number,
  weekday: number
): number | null {
  const matching = rows.filter(
    (r) => r.menu_item_id === menuItemId && weekdayOf(r.business_date) === weekday
  );
  if (matching.length === 0) return null;
  const total = matching.reduce((sum, r) => sum + r.qty_sold, 0);
  return total / matching.length;
}

/**
 * Trend factor: recent demand against the longer baseline, clamped.
 *
 * Clamping is the point. Over a 28-day window one unusual week can produce a
 * factor of 3, and a forecast that tells a kitchen to prep triple is worse
 * than no forecast — it burns money and trust in one service. ±30% is a band a
 * restaurant can act on without being wrecked by it.
 */
export const TREND_CLAMP = { min: 0.7, max: 1.3 } as const;

export function trendFactor(
  rows: HistoryRow[],
  menuItemId: number,
  recentDays = 7,
  today = new Date()
): number {
  const forItem = rows.filter((r) => r.menu_item_id === menuItemId);
  if (forItem.length === 0) return 1;

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - recentDays);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const recent = forItem.filter((r) => r.business_date >= cutoffKey);
  const baseline = forItem.filter((r) => r.business_date < cutoffKey);

  if (recent.length === 0 || baseline.length === 0) return 1;

  const mean = (xs: HistoryRow[]) =>
    xs.reduce((sum, r) => sum + r.qty_sold, 0) / xs.length;

  const baselineMean = mean(baseline);
  if (baselineMean === 0) return 1;

  const raw = mean(recent) / baselineMean;
  return Math.min(TREND_CLAMP.max, Math.max(TREND_CLAMP.min, raw));
}

/**
 * FR-P1: forecast_qty = seeded_avg × trend_factor.
 *
 * Rounded to a whole dish, because a kitchen preps units. DET-001 requires
 * exactly 44 from 40 × 1.1 — which in floating point is 44.000000000000006,
 * so the rounding is load-bearing, not cosmetic.
 */
export function forecastQty(seededAvg: number, trend: number): number {
  return Math.round(seededAvg * trend);
}

export type ItemForecast = {
  menuItemId: number;
  seededAvg: number;
  trendFactor: number;
  forecastQty: number;
  /** Shown verbatim in the UI. Every AI-adjacent number carries its basis. */
  basis: string;
};

const WEEKDAY_NAME = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Forecast for one item on one weekday, or null when there is no history. */
export function forecastForItem(
  rows: HistoryRow[],
  menuItemId: number,
  weekday: number,
  today = new Date()
): ItemForecast | null {
  const seededAvg = weekdayAverage(rows, menuItemId, weekday);
  if (seededAvg === null) return null;

  const trend = trendFactor(rows, menuItemId, 7, today);
  const qty = forecastQty(seededAvg, trend);

  return {
    menuItemId,
    seededAvg,
    trendFactor: trend,
    forecastQty: qty,
    basis: `${WEEKDAY_NAME[weekday]} average of ${round1(
      seededAvg
    )} over ${countFor(rows, menuItemId, weekday)} weeks × trend ${round2(trend)}`,
  };
}

function countFor(rows: HistoryRow[], menuItemId: number, weekday: number) {
  return rows.filter(
    (r) => r.menu_item_id === menuItemId && weekdayOf(r.business_date) === weekday
  ).length;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * FR-P2: stockout risk, expressed as whether forecast usage clears the shelf
 * before service ends. Grams in, kilograms compared — the recipe map speaks
 * grams and the inventory table speaks kg.
 */
export type StockoutRisk = {
  inventoryItemId: number;
  name: string;
  stock: number;
  forecastUsage: number;
  shortfall: number;
  level: "out" | "risk" | "low" | "ok";
  basis: string;
};

export function stockoutRisk(
  item: { id: number; name: string; stock: number; low_threshold: number; unit: string },
  forecastUsageInStockUnits: number
): StockoutRisk {
  const stock = Number(item.stock);
  const shortfall = forecastUsageInStockUnits - stock;

  let level: StockoutRisk["level"];
  if (stock <= 0) level = "out";
  else if (shortfall >= 0) level = "risk";
  else if (stock <= Number(item.low_threshold)) level = "low";
  else level = "ok";

  return {
    inventoryItemId: item.id,
    name: item.name,
    stock,
    forecastUsage: forecastUsageInStockUnits,
    shortfall: Math.max(0, shortfall),
    level,
    basis: `${round1(stock)}${item.unit} in stock against forecast use of ${round1(
      forecastUsageInStockUnits
    )}${item.unit}`,
  };
}
