import { checkStockAndPropose } from "@/lib/agents/watcher";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fail, fromSupabase, ok, readJson } from "@/lib/http";
import { computeInventoryDecrements, gramsToStockUnits } from "@/lib/recipes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuItem, Order } from "@/lib/types";
import { after } from "next/server";

export const dynamic = "force-dynamic";

/** Orders with their lines, newest first — one query feeds both the kitchen
 *  board and the customer's status strip. */
export async function GET() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("orders")
    .select("*, order_items(*)")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("placed_at", { ascending: false });

  if (error) return fromSupabase(error);
  return ok<Order[]>(data as Order[]);
}

type Body = {
  tableId?: number | null;
  items?: { menuItemId: number; qty: number }[];
};

/**
 * Place an order. Unauthenticated by design (FR-C1 — a diner scans a QR and
 * orders without an account), which is exactly why the server does the work
 * the client cannot be trusted with:
 *
 *   - prices come from the database, never from the request body;
 *   - an item that is 86'd is refused here, not merely greyed out in the UI;
 *   - inventory is decremented from the recipe map (FR-O5 / DET-004).
 */
export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const lines = body?.items ?? [];

  if (!Array.isArray(lines) || lines.length === 0) {
    return badRequest("items must be a non-empty array");
  }
  for (const line of lines) {
    if (!Number.isInteger(line?.menuItemId) || !Number.isInteger(line?.qty)) {
      return badRequest("Each item needs an integer menuItemId and qty");
    }
    if (line.qty <= 0) return badRequest("qty must be greater than 0");
  }

  const db = createAdminClient();

  const { data: menu, error: menuError } = await db
    .from("menu_items")
    .select("id, name, price, available")
    .eq("restaurant_id", RESTAURANT_ID)
    .in(
      "id",
      lines.map((l) => l.menuItemId)
    );

  if (menuError) return fromSupabase(menuError);

  const byId = new Map<number, Pick<MenuItem, "id" | "name" | "price" | "available">>(
    (menu ?? []).map((m) => [m.id, m])
  );

  const missing = lines.filter((l) => !byId.has(l.menuItemId));
  if (missing.length > 0) {
    return badRequest(
      `Unknown menu item(s): ${missing.map((l) => l.menuItemId).join(", ")}`
    );
  }

  const soldOut = lines.filter((l) => !byId.get(l.menuItemId)!.available);
  if (soldOut.length > 0) {
    return fail(
      409,
      `Sold out: ${soldOut.map((l) => byId.get(l.menuItemId)!.name).join(", ")}`
    );
  }

  const orderItems = lines.map((l) => {
    const item = byId.get(l.menuItemId)!;
    return {
      menu_item_id: item.id,
      name: item.name,
      qty: l.qty,
      unit_price: Number(item.price),
    };
  });
  const total = orderItems.reduce((sum, i) => sum + i.unit_price * i.qty, 0);

  // Human-facing code. The seed hands out O1–O4, so continue that sequence
  // rather than exposing the identity column.
  const { data: lastOrder } = await db
    .from("orders")
    .select("id")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const code = `O${(lastOrder?.id ?? 0) + 1}`;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      restaurant_id: RESTAURANT_ID,
      code,
      table_id: body?.tableId ?? null,
      status: "new",
      total,
    })
    .select()
    .single();

  if (orderError) return fromSupabase(orderError);

  const { error: itemsError } = await db
    .from("order_items")
    .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));

  if (itemsError) {
    // Leaving a headless order on the board would confuse the kitchen more
    // than a failed submission does.
    await db.from("orders").delete().eq("id", order.id);
    return fromSupabase(itemsError);
  }

  await decrementInventory(db, lines);

  // Stock has just moved, so this is the moment to notice it has moved too
  // far. `after` runs once the response is on its way to the diner — the
  // watcher must never sit between someone and their dinner.
  after(async () => {
    try {
      await checkStockAndPropose();
    } catch {
      // A missed warning is a worse day for the owner; a failed order is a
      // worse day for the diner. Never let the first cause the second.
    }
  });

  // Seat the table if the order came from an empty one — the floor board
  // should never show an empty table that is actively eating.
  if (body?.tableId) {
    await db
      .from("restaurant_tables")
      .update({ status: "seated", updated_at: new Date().toISOString() })
      .eq("id", body.tableId)
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("status", "empty");
  }

  const { data: full } = await db
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", order.id)
    .single();

  return ok<Order>((full ?? order) as Order, { status: 201 });
}

/** Best-effort: a stock write that fails must not fail the diner's order.
 *  Stock floors at 0 rather than going negative — a negative kilogram is not a
 *  fact about the world, and the stockout logic reads this column. */
async function decrementInventory(
  db: ReturnType<typeof createAdminClient>,
  lines: { menuItemId: number; qty: number }[]
) {
  const decrements = computeInventoryDecrements(lines);
  if (decrements.size === 0) return;

  const { data: stock } = await db
    .from("inventory_items")
    .select("id, stock")
    .eq("restaurant_id", RESTAURANT_ID)
    .in("id", [...decrements.keys()]);

  await Promise.all(
    (stock ?? []).map((row) => {
      const used = gramsToStockUnits(decrements.get(row.id) ?? 0);
      const next = Math.max(0, Number(row.stock) - used);
      return db
        .from("inventory_items")
        .update({ stock: next, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    })
  );
}
