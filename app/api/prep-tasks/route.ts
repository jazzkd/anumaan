import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrepTask } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The Kitchen Board's task list — what approved proposals actually produced. */
export async function GET() {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const { data, error } = await db
    .from("prep_tasks")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return fromSupabase(error);
  return ok<PrepTask[]>(data as PrepTask[]);
}
