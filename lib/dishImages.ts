/**
 * Photograph per seeded menu item.
 *
 * Held in code rather than a database column for the same reason RECIPES is:
 * it is fixed reference data for one seeded restaurant, and a nullable
 * `image_url` column would add schema surface with no CRUD behind it. A real
 * deployment would upload per-item images and this map would become that
 * column — the UI already treats a missing entry as normal.
 *
 * Files live in public/menu/ and are served from our own origin. Sources and
 * licences are in public/menu/CREDITS.md; several are CC BY-SA, which requires
 * that attribution to travel with the work.
 */
export const DISH_IMAGES: Record<number, string> = {
  1: "/menu/paneer-tikka.jpg",
  2: "/menu/chicken-65.jpg",
  3: "/menu/butter-chicken.jpg",
  4: "/menu/dal-makhani.jpg",
  5: "/menu/paneer-butter-masala.jpg",
  6: "/menu/veg-biryani.jpg",
  7: "/menu/chicken-biryani.jpg",
  8: "/menu/tandoori-roti.jpg",
  9: "/menu/garlic-naan.jpg",
  10: "/menu/gulab-jamun.jpg",
  11: "/menu/masala-chai.jpg",
  12: "/menu/mango-lassi.jpg",
};

export function dishImage(menuItemId: number): string | null {
  return DISH_IMAGES[menuItemId] ?? null;
}
