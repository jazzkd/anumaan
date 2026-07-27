import { describe, expect, it } from "vitest";
import { waitEstimate } from "./queue";

describe("queue wait estimate", () => {
  it("returns a range centred on 45 for 2 ahead, 1 table free (DET-002)", () => {
    const e = waitEstimate(2, 1, 45);
    expect(e.type).toBe("range");
    expect(e.centerMin).toBe(45);
  });

  it("never returns a bare number — min and max always differ", () => {
    for (const ahead of [1, 2, 3, 5, 8]) {
      const e = waitEstimate(ahead, 0);
      expect(e.maxMin).toBeGreaterThan(e.minMin);
    }
  });

  it("seats immediately when there are more tables than parties", () => {
    const e = waitEstimate(1, 3);
    expect(e.centerMin).toBe(0);
    expect(e.label).toBe("Seating now");
  });

  it("never reports a negative wait", () => {
    expect(waitEstimate(0, 0).minMin).toBe(0);
    expect(waitEstimate(1, 5).minMin).toBe(0);
  });

  it("rounds the spread to 5-minute steps", () => {
    const e = waitEstimate(4, 0, 45); // centre 180, ±20% = 36 → 35
    expect(e.centerMin).toBe(180);
    expect(e.minMin % 5).toBe(0);
    expect(e.maxMin % 5).toBe(0);
  });
});
