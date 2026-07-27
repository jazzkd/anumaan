import { describe, expect, it } from "vitest";
import { businessDate, businessDateOffset, startOfLocalDay } from "./dates";

describe("business dates", () => {
  it("uses the local calendar day, not the UTC one", () => {
    // Local midnight in any timezone east of UTC lands on the previous UTC day.
    const localMidnight = new Date(2026, 6, 27, 0, 0, 0);
    expect(businessDate(localMidnight)).toBe("2026-07-27");
  });

  it("does not drift late in the evening", () => {
    const lateNight = new Date(2026, 6, 27, 23, 45, 0);
    expect(businessDate(lateNight)).toBe("2026-07-27");
  });

  it("pads single-digit months and days", () => {
    expect(businessDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("steps back across a month boundary", () => {
    expect(businessDateOffset(-1, new Date(2026, 7, 1, 9, 0))).toBe("2026-07-31");
  });

  it("steps back one day for the common 'yesterday' case", () => {
    expect(businessDateOffset(-1, new Date(2026, 6, 27, 8, 15))).toBe("2026-07-26");
  });

  it("startOfLocalDay zeroes the clock but keeps the date", () => {
    const d = startOfLocalDay(new Date(2026, 6, 27, 18, 30));
    expect(d.getHours()).toBe(0);
    expect(businessDate(d)).toBe("2026-07-27");
  });
});
