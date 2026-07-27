import { describe, expect, it } from "vitest";
import { cannedAnswer } from "./canned";
import type { GroundedData } from "../groundedData";

const data: GroundedData = {
  restaurant: "Spice Route Kitchen",
  businessDate: "2026-07-27",
  today: { revenue: 1240, orders: 3 },
  yesterday: { date: "2026-07-26", revenue: 18400, isSynthetic: true },
  topSellersYesterday: [
    { name: "Garlic Naan", qty: 40, revenue: 2400 },
    { name: "Tandoori Roti", qty: 24, revenue: 960 },
  ],
  forecasts: [
    {
      menuItemId: 9,
      name: "Garlic Naan",
      seededAvg: 40,
      trendFactor: 1.1,
      forecastQty: 44,
      basis: "Friday average of 40 over 4 weeks × trend 1.1",
    },
  ],
  stockouts: [
    {
      inventoryItemId: 4,
      name: "Butter",
      stock: 0.3,
      forecastUsage: 1.2,
      shortfall: 0.9,
      level: "risk",
      basis: "0.3kg in stock against forecast use of 1.2kg",
    },
  ],
  itemsOnMenu: ["Garlic Naan", "Chicken 65", "Chicken Biryani", "Butter Chicken"],
  hasHistory: true,
};

describe("offline grounded responder", () => {
  it("refuses an item that was never sold (GND-003)", () => {
    const a = cannedAnswer(
      "How many chicken lollipops did we sell last month?",
      data
    );
    expect(a).toMatch(/don't have any sales records/i);
    expect(a).not.toMatch(/\d+ plates/);
  });

  it("does not let 'chicken lollipops' match 'Chicken 65'", () => {
    const a = cannedAnswer("How many chicken lollipops did we sell?", data);
    expect(a).not.toContain("Chicken 65");
  });

  it("cites yesterday's revenue exactly (GND-001's figure)", () => {
    const a = cannedAnswer("How did we do yesterday?", data);
    expect(a).toContain("₹18,400");
  });

  it("says out loud when history is synthetic", () => {
    expect(cannedAnswer("How did we do yesterday?", data)).toMatch(/synthetic/i);
  });

  it("answers about a dish that is on the menu", () => {
    const a = cannedAnswer("How many Garlic Naan did we sell?", data);
    expect(a).toContain("40");
    expect(a).toContain("Garlic Naan");
  });

  it("carries the forecast basis into a prep question", () => {
    const a = cannedAnswer("What should I prep more of today?", data);
    expect(a).toContain("Garlic Naan 44");
    expect(a).toMatch(/weekday average/i);
    expect(a).toContain("Butter");
  });

  it("still answers aggregate 'how many orders' rather than refusing", () => {
    const a = cannedAnswer("How many orders did we have today?", data);
    expect(a).toContain("3 orders");
  });

  it("refuses everything when there is no history (FR-P6)", () => {
    const empty = { ...data, hasHistory: false };
    expect(cannedAnswer("How did we do yesterday?", empty)).toMatch(
      /isn't enough recorded data/i
    );
  });

  it("never invents a figure for an unrelated question", () => {
    const a = cannedAnswer("Who is my biggest competitor?", data);
    expect(a).toMatch(/only answer from/i);
    expect(a).not.toContain("18,400");
  });
});
