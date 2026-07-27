import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fromSupabase, notFound, ok, readJson } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InventoryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = { stock?: number };

/** Manual stock correction — restocking, or fixing a count. Owner-only: this
 *  is the number the forecast and the stockout warnings are computed from. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return badRequest("Invalid inventory item id");

  const body = await readJson<Body>(request);
  if (typeof body?.stock !== "number" || body.stock < 0) {
    return badRequest("stock must be a number >= 0");
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_items")
    .update({ stock: body.stock, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("restaurant_id", RESTAURANT_ID)
    .select()
    .maybeSingle();

  if (error) return fromSupabase(error);
  if (!data) return notFound("No such inventory item");

  return ok<InventoryItem>(data as InventoryItem);
}
