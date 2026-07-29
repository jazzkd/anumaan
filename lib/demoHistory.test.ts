import { describe, expect, it } from "vitest";
import { needsHeal, synthesizeHistory } from "./demoHistory";
import { businessDateOffset } from "./dates";

/** Seeded menu prices — the ones yesterday's ₹18,400 is authored against. */
const PRICES = new Map<number, number>([
  [1, 220], [2, 260], [3, 320], [4, 260], [5, 280], [6, 240],
  [7, 300], [8, 40], [9, 60], [10, 90], [11, 50], [12, 110],
]);

/**
 * The invariants `supabase/seed.sql` asserts, moved somewhere `npm test` runs.
 *
 * Each is checked across a full year of start dates rather than on today only.
 * The bug these exist to prevent was a date one: the figures were right on the
 * day they were seeded and wrong the next morning. A test pinned to `new Date()`
 * would have passed on both.
 */
describe("demo sales history", () => {
  const startDates = Array.from({ length: 371 }, (_, i) => {
    const d = new Date("2026-01-01T12:00:00");
    d.setDate(d.getDate() + i);
    return d;
  });

  it("totals exactly ₹18,400 yesterday, whatever today is (GND-001)", () => {
    for (const from of startDates) {
      const yesterday = businessDateOffset(-1, from);
      const total = synthesizeHistory(PRICES, from)
        .filter((r) => r.business_date === yesterday)
        .reduce((s, r) => s + r.revenue, 0);
      expect(total, `yesterday of ${from.toDateString()}`).toBe(18400);
    }
  });

  it("holds Garlic Naan's Friday average at 40, whatever today is (DET-001)", () => {
    for (const from of startDates) {
      const fridays = synthesizeHistory(PRICES, from).filter(
        (r) => r.menu_item_id === 9 && new Date(`${r.business_date}T12:00:00`).getDay() === 5
      );
      expect(fridays.length, `Fridays in window from ${from.toDateString()}`)
        .toBeGreaterThan(0);
      const avg = fridays.reduce((s, r) => s + r.qty_sold, 0) / fridays.length;
      expect(avg, `Friday average from ${from.toDateString()}`).toBe(40);
    }
  });

  it("ends yesterday and never writes today or the future", () => {
    const from = new Date("2026-07-29T12:00:00");
    const dates = synthesizeHistory(PRICES, from).map((r) => r.business_date);
    expect(Math.max(...dates.map((d) => Date.parse(d)))).toBe(
      Date.parse(businessDateOffset(-1, from))
    );
    expect(dates).not.toContain(businessDateOffset(0, from));
  });

  it("covers 28 distinct days so the forecast has a month to read", () => {
    const from = new Date("2026-07-29T12:00:00");
    const days = new Set(synthesizeHistory(PRICES, from).map((r) => r.business_date));
    expect(days.size).toBe(28);
  });

  it("skips items with no price rather than writing NaN revenue", () => {
    const rows = synthesizeHistory(new Map([[9, 60]]), new Date("2026-07-29T12:00:00"));
    expect(rows.every((r) => Number.isFinite(r.revenue))).toBe(true);
    expect(new Set(rows.map((r) => r.menu_item_id))).toEqual(new Set([9]));
  });
});

/**
 * The read-path guard. What it *declines* to do matters more than what it does:
 * it is a write triggered by a GET, so the two cases below are the ones that
 * would turn demo scaffolding into data loss on someone's real restaurant.
 */
describe("needsHeal", () => {
  const now = new Date("2026-07-29T12:00:00");
  const yesterday = businessDateOffset(-1, now);

  it("heals synthetic history that has fallen behind yesterday", () => {
    expect(needsHeal({ business_date: "2026-07-20", is_synthetic: true }, now)).toBe(true);
  });

  it("leaves a window that still ends yesterday alone", () => {
    expect(needsHeal({ business_date: yesterday, is_synthetic: true }, now)).toBe(false);
  });

  it("never touches real trading history, however stale", () => {
    expect(needsHeal({ business_date: "2020-01-01", is_synthetic: false }, now)).toBe(false);
  });

  it("leaves an empty history empty — no history is an honest state (FR-P6)", () => {
    expect(needsHeal(null, now)).toBe(false);
    expect(needsHeal(undefined, now)).toBe(false);
  });

  it("does not fire on a window running ahead of yesterday", () => {
    const today = businessDateOffset(0, now);
    expect(needsHeal({ business_date: today, is_synthetic: true }, now)).toBe(false);
  });

  it("regenerates to a window that immediately satisfies itself", () => {
    // Whatever day it heals on, the result must not ask to be healed again —
    // otherwise every read rewrites the table.
    for (let i = 0; i < 371; i++) {
      const from = new Date("2026-01-01T12:00:00");
      from.setDate(from.getDate() + i);
      const newest = synthesizeHistory(PRICES, from)
        .map((r) => r.business_date)
        .sort()
        .at(-1)!;
      expect(
        needsHeal({ business_date: newest, is_synthetic: true }, from),
        `healed on ${from.toDateString()}`
      ).toBe(false);
    }
  });
});
