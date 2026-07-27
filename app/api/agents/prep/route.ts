import { draftPrepChecklist } from "@/lib/agents/prep";
import { requireRole } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Draft today's prep checklist. Drafts only — the Kitchen Board is written
 *  by the approval route, never by this one. */
export async function POST() {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  try {
    return ok(await draftPrepChecklist());
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Draft failed");
  }
}
