import { describe, expect, it } from "vitest";
import {
  INGREDIENT,
  computeInventoryDecrements,
  gramsToStockUnits,
} from "./recipes";

describe("inventory decrements", () => {
  it("decrements 300 g of paneer for 2× Paneer Butter Masala (DET-004)", () => {
    const totals = computeInventoryDecrements([{ menuItemId: 5, qty: 2 }]);
    expect(totals.get(INGREDIENT.PANEER)).toBe(300);
  });

  it("sums the same ingredient across different dishes", () => {
    // Butter Chicken (40 g butter) + 2× Garlic Naan (10 g each)
    const totals = computeInventoryDecrements([
      { menuItemId: 3, qty: 1 },
      { menuItemId: 9, qty: 2 },
    ]);
    expect(totals.get(INGREDIENT.BUTTER)).toBe(60);
    expect(totals.get(INGREDIENT.CHICKEN)).toBe(200);
  });

  it("ignores items with no tracked ingredients", () => {
    const totals = computeInventoryDecrements([{ menuItemId: 9999, qty: 3 }]);
    expect(totals.size).toBe(0);
  });

  it("converts grams to the kg/L the inventory table stores", () => {
    expect(gramsToStockUnits(300)).toBe(0.3);
  });
});
