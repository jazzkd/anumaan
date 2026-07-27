import { describe, expect, it } from "vitest";
import {
  TREND_CLAMP,
  forecastForItem,
  forecastQty,
  stockoutRisk,
  trendFactor,
  weekdayAverage,
  weekdayOf,
} from "./forecast";
import type { HistoryRow } from "./forecast";

/** Fridays in July 2026: the 3rd, 10th, 17th, 24th. */
const fridays = ["2026-07-03", "2026-07-10", "2026-07-17", "2026-07-24"];

const naanFridays: HistoryRow[] = fridays.map((d) => ({
  menu_item_id: 9,
  business_date: d,
  qty_sold: 40,
}));

describe("forecast formula (FR-P1)", () => {
  it("returns exactly 44 for a seeded average of 40 and trend 1.1 (DET-001)", () => {
    // 40 * 1.1 is 44.000000000000006 in floating point — the rounding matters.
    expect(forecastQty(40, 1.1)).toBe(44);
  });

  it("is a plain product, not a model call", () => {
    expect(forecastQty(10, 1)).toBe(10);
    expect(forecastQty(35, 1.3)).toBe(46); // 45.5 rounds up
    expect(forecastQty(0, 1.2)).toBe(0);
  });
});

describe("weekday handling", () => {
  it("reads a business date as a local day, not a UTC instant", () => {
    // Parsed as UTC this is Thursday in any timezone west of the line.
    expect(weekdayOf("2026-07-24")).toBe(5); // Friday
  });

  it("averages only the matching weekday", () => {
    const rows: HistoryRow[] = [
      ...naanFridays,
      { menu_item_id: 9, business_date: "2026-07-25", qty_sold: 100 }, // Saturday
    ];
    expect(weekdayAverage(rows, 9, 5)).toBe(40);
  });

  it("distinguishes no history from selling nothing (FR-P6)", () => {
    expect(weekdayAverage([], 9, 5)).toBeNull();
    expect(
      weekdayAverage(
        [{ menu_item_id: 9, business_date: "2026-07-24", qty_sold: 0 }],
        9,
        5
      )
    ).toBe(0);
  });
});

describe("trend factor", () => {
  it("is 1 when there is nothing to compare", () => {
    expect(trendFactor([], 9)).toBe(1);
    expect(trendFactor(naanFridays, 9, 7, new Date(2026, 6, 24))).toBe(1);
  });

  it("clamps a spike rather than telling the kitchen to triple prep", () => {
    const today = new Date(2026, 6, 27);
    const rows: HistoryRow[] = [
      { menu_item_id: 1, business_date: "2026-07-01", qty_sold: 10 },
      { menu_item_id: 1, business_date: "2026-07-02", qty_sold: 10 },
      { menu_item_id: 1, business_date: "2026-07-25", qty_sold: 90 },
      { menu_item_id: 1, business_date: "2026-07-26", qty_sold: 90 },
    ];
    expect(trendFactor(rows, 1, 7, today)).toBe(TREND_CLAMP.max);
  });

  it("clamps a collapse the same way", () => {
    const today = new Date(2026, 6, 27);
    const rows: HistoryRow[] = [
      { menu_item_id: 1, business_date: "2026-07-01", qty_sold: 100 },
      { menu_item_id: 1, business_date: "2026-07-02", qty_sold: 100 },
      { menu_item_id: 1, business_date: "2026-07-25", qty_sold: 1 },
      { menu_item_id: 1, business_date: "2026-07-26", qty_sold: 1 },
    ];
    expect(trendFactor(rows, 1, 7, today)).toBe(TREND_CLAMP.min);
  });
});

describe("forecastForItem", () => {
  it("returns null with no history rather than inventing a number", () => {
    expect(forecastForItem([], 9, 5)).toBeNull();
  });

  it("carries a basis string stating how the number was reached", () => {
    const f = forecastForItem(naanFridays, 9, 5, new Date(2026, 6, 24));
    expect(f).not.toBeNull();
    expect(f!.forecastQty).toBe(40);
    expect(f!.basis).toContain("Friday average of 40");
    expect(f!.basis).toContain("trend 1");
  });
});

describe("stockout risk (FR-P2)", () => {
  const butter = { id: 4, name: "Butter", stock: 1.5, low_threshold: 2, unit: "kg" };

  it("flags a shortfall when forecast use exceeds stock", () => {
    const r = stockoutRisk(butter, 2.0);
    expect(r.level).toBe("risk");
    expect(r.shortfall).toBeCloseTo(0.5);
  });

  it("reports low stock even when forecast use is covered", () => {
    expect(stockoutRisk(butter, 0.2).level).toBe("low");
  });

  it("reports healthy stock as ok", () => {
    expect(
      stockoutRisk({ ...butter, stock: 8 }, 1).level
    ).toBe("ok");
  });

  it("reports an empty shelf as out", () => {
    expect(stockoutRisk({ ...butter, stock: 0 }, 1).level).toBe("out");
  });

  it("states its basis in the units the kitchen uses", () => {
    expect(stockoutRisk(butter, 2).basis).toBe(
      "1.5kg in stock against forecast use of 2kg"
    );
  });
});
