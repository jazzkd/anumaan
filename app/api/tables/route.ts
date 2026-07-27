import { RESTAURANT_ID } from "@/lib/constants";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RestaurantTable } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Table status board. Readable without auth so the customer app can show the
 *  queue an honest picture of how full the room is. */
export async function GET() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("id");

  if (error) return fromSupabase(error);
  return ok<RestaurantTable[]>(data as RestaurantTable[]);
}
