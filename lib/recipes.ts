/**
 * Ingredient consumption per menu item, in grams (or ml for liquids), keyed to
 * the seeded ids in supabase/seed.sql. Held in code rather than a table because
 * it is fixed reference data for one seeded restaurant — a `recipes` table
 * would be schema surface with no CRUD behind it.
 *
 * This is what makes inventory move when an order is placed (FR-O5). The
 * Paneer Butter Masala → 150 g paneer line is asserted by DET-004; changing it
 * breaks that case.
 */

/** inventory_items.id, from the seed. */
export const INGREDIENT = {
  PANEER: 1,
  CHICKEN: 2,
  RICE: 3,
  BUTTER: 4,
  ONIONS: 5,
  MILK: 6,
} as const;

export type RecipeLine = { inventoryItemId: number; gramsPerUnit: number };

export const RECIPES: Record<number, RecipeLine[]> = {
  1: [{ inventoryItemId: INGREDIENT.PANEER, gramsPerUnit: 150 }], // Paneer Tikka
  2: [{ inventoryItemId: INGREDIENT.CHICKEN, gramsPerUnit: 180 }], // Chicken 65
  3: [
    { inventoryItemId: INGREDIENT.CHICKEN, gramsPerUnit: 200 },
    { inventoryItemId: INGREDIENT.BUTTER, gramsPerUnit: 40 },
  ], // Butter Chicken
  4: [
    { inventoryItemId: INGREDIENT.BUTTER, gramsPerUnit: 30 },
    { inventoryItemId: INGREDIENT.MILK, gramsPerUnit: 50 },
  ], // Dal Makhani
  5: [
    { inventoryItemId: INGREDIENT.PANEER, gramsPerUnit: 150 },
    { inventoryItemId: INGREDIENT.BUTTER, gramsPerUnit: 40 },
  ], // Paneer Butter Masala — DET-004
  6: [
    { inventoryItemId: INGREDIENT.RICE, gramsPerUnit: 180 },
    { inventoryItemId: INGREDIENT.ONIONS, gramsPerUnit: 50 },
  ], // Veg Biryani
  7: [
    { inventoryItemId: INGREDIENT.RICE, gramsPerUnit: 180 },
    { inventoryItemId: INGREDIENT.CHICKEN, gramsPerUnit: 150 },
  ], // Chicken Biryani
  8: [{ inventoryItemId: INGREDIENT.BUTTER, gramsPerUnit: 5 }], // Tandoori Roti
  9: [{ inventoryItemId: INGREDIENT.BUTTER, gramsPerUnit: 10 }], // Garlic Naan
  10: [{ inventoryItemId: INGREDIENT.MILK, gramsPerUnit: 40 }], // Gulab Jamun
  11: [{ inventoryItemId: INGREDIENT.MILK, gramsPerUnit: 100 }], // Masala Chai
  12: [{ inventoryItemId: INGREDIENT.MILK, gramsPerUnit: 150 }], // Mango Lassi
};

export type OrderLine = { menuItemId: number; qty: number };

/**
 * Total consumption for an order, in grams, summed per ingredient. Pure, so the
 * arithmetic is testable without a database (DET-004). Items with no recipe
 * contribute nothing rather than throwing — an untracked ingredient is not an
 * order failure.
 */
export function computeInventoryDecrements(
  lines: OrderLine[]
): Map<number, number> {
  const totals = new Map<number, number>();

  for (const line of lines) {
    for (const r of RECIPES[line.menuItemId] ?? []) {
      const prev = totals.get(r.inventoryItemId) ?? 0;
      totals.set(r.inventoryItemId, prev + r.gramsPerUnit * line.qty);
    }
  }

  return totals;
}

/** Inventory is stocked in kg/L; recipes are written in g/ml. */
export const gramsToStockUnits = (grams: number) => grams / 1000;
