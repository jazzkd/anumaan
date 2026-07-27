import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InventoryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Stock levels. Staff need this to know what they can cook; the owner's
 *  Inventory tab reads the same feed. Never public — stock is business data. */
export async function GET() {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const { data, error } = await db
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("id");

  if (error) return fromSupabase(error);
  return ok<InventoryItem[]>(data as InventoryItem[]);
}
