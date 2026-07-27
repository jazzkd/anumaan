import { RESTAURANT_ID } from "@/lib/constants";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The menu, for everyone. No auth: FR-C1 is explicit that browsing needs no
 *  login, and `available` is the field the customer app greys out on. */
export async function GET() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("id");

  if (error) return fromSupabase(error);
  return ok<MenuItem[]>(data as MenuItem[]);
}
