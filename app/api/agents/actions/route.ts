import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentAction } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The Agent Activity Log. Newest first, everything included — proposed,
 * approved, rejected, and auto-executed alike.
 *
 * Rejected proposals stay in the log on purpose. A trail that only recorded
 * what an agent was allowed to do would answer the easy question; showing what
 * it suggested and was refused is what makes this an audit trail rather than a
 * changelog.
 */
export async function GET() {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const { data, error } = await db
    .from("agent_actions")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return fromSupabase(error);
  return ok<AgentAction[]>(data as AgentAction[]);
}
