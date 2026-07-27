import { executeTool, type ToolName } from "@/lib/agents/tools";
import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fail, notFound, ok, readJson, serverError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentAction } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = { decision?: "approve" | "reject" };

/**
 * The approval gate. This is the only place an agent's proposal can execute.
 *
 * It is enforced here rather than in the UI, and that distinction is the whole
 * safety claim: a client that skips the interface, forges a request, or
 * replays an old one still cannot execute anything that has not been approved
 * in this handler. Hiding the button would not be enforcement.
 *
 * Re-approving an already-resolved action is rejected too, so a double-tap or
 * a replayed request cannot run the same side effect twice.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const actionId = Number(id);
  if (!Number.isInteger(actionId)) return badRequest("Invalid action id");

  const body = await readJson<Body>(request);
  if (body?.decision !== "approve" && body?.decision !== "reject") {
    return badRequest('decision must be "approve" or "reject"');
  }

  const db = createAdminClient();
  const { data: action, error: readError } = await db
    .from("agent_actions")
    .select("*")
    .eq("id", actionId)
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!action) return notFound("No such agent action");

  if (action.status !== "proposed") {
    return fail(
      409,
      `This action is already ${action.status} and cannot be decided again`
    );
  }

  const now = new Date().toISOString();

  if (body.decision === "reject") {
    const { data, error } = await db
      .from("agent_actions")
      .update({
        status: "rejected",
        resolved_at: now,
        resolved_by: guard.actor.userId,
        result_ref: "Rejected by owner. Nothing changed.",
      })
      .eq("id", actionId)
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok<AgentAction>(data as AgentAction);
  }

  // Approved. Execute, then record what actually changed — not what was
  // intended. If the tool fails, the action does not silently become approved.
  let resultRef: string;
  try {
    resultRef = await executeTool(
      action.tool_name as ToolName,
      (action.tool_args ?? {}) as Record<string, unknown>
    );
  } catch (err) {
    await db
      .from("agent_actions")
      .update({
        result_ref: `Execution failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      })
      .eq("id", actionId);

    return serverError(
      err instanceof Error ? err.message : "Could not execute the approved action"
    );
  }

  const { data, error } = await db
    .from("agent_actions")
    .update({
      status: "approved",
      resolved_at: now,
      resolved_by: guard.actor.userId,
      result_ref: resultRef,
    })
    .eq("id", actionId)
    .select()
    .single();

  if (error) return serverError(error.message);
  return ok<AgentAction>(data as AgentAction);
}
