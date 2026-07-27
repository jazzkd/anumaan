import { runAnumaanAgent } from "@/lib/agents/anumaan";
import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, ok, readJson, serverError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export type ProposeResponse = {
  reply: string;
  actions: AgentAction[];
  provider: string;
};

type Body = { request?: string };

/**
 * Ask the agent to consider something. It proposes; nothing happens yet.
 *
 * Every proposal is written to `agent_actions` with status `proposed` BEFORE
 * any approval exists. That ordering is deliberate: the log records what was
 * suggested even when the owner says no, and a proposal that was never
 * persisted could not be audited or approved later.
 */
export async function POST(request: Request) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const body = await readJson<Body>(request);
  const ask = body?.request?.trim();
  if (!ask) return badRequest("request is required");
  if (ask.length > 500) return badRequest("request is too long");

  try {
    const run = await runAnumaanAgent(ask);
    const db = createAdminClient();

    let actions: AgentAction[] = [];
    if (run.proposals.length > 0) {
      const { data, error } = await db
        .from("agent_actions")
        .insert(
          run.proposals.map((p) => ({
            restaurant_id: RESTAURANT_ID,
            agent: "Anumaan Agent",
            tool_name: p.tool,
            tool_args: p.args,
            proposal: p.proposal,
            basis: p.basis,
            status: "proposed" as const,
          }))
        )
        .select();

      if (error) return serverError(error.message);
      actions = (data ?? []) as AgentAction[];
    } else {
      // A refusal is an outcome worth recording. ADV-001 asserts the attempt
      // is logged, not merely blocked — a guardrail nobody can see is a
      // guardrail nobody can trust.
      await db.from("agent_actions").insert({
        restaurant_id: RESTAURANT_ID,
        agent: "Anumaan Agent",
        tool_name: null,
        tool_args: { request: ask },
        proposal: `Declined: "${ask.slice(0, 160)}"`,
        basis: run.reply.slice(0, 400) || "No tool exists for this request.",
        status: "rejected" as const,
        result_ref: "No action proposed. Nothing changed.",
        resolved_at: new Date().toISOString(),
      });
    }

    return ok<ProposeResponse>({
      reply: run.reply,
      actions,
      provider: run.provider,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Agent failed");
  }
}
