import { RESTAURANT_ID } from "../constants";
import { loadGroundedData } from "../groundedData";
import { createAdminClient } from "../supabase/admin";
import type { AgentAction } from "../types";

/**
 * The Prep & Forecast Agent.
 *
 * Reads the forecast, reads inventory, drafts a checklist — in that order, and
 * writes nothing to the Kitchen Board until the draft is approved. TRJ-002
 * asserts both the ordering and the absence of a pre-approval write.
 *
 * Deterministic on purpose. The checklist is the forecast restated as
 * instructions; there is no judgement for a model to add, and making it an LLM
 * call would spend quota to introduce variance into the one thing a kitchen
 * needs to be stable.
 */

export type PrepDraft = {
  action: AgentAction | null;
  items: string[];
  basis: string;
  message: string;
};

export async function draftPrepChecklist(): Promise<PrepDraft> {
  const db = createAdminClient();

  // 1. read_forecast, 2. read_inventory — both inside loadGroundedData, in
  //    that order, before anything is drafted.
  const grounded = await loadGroundedData();

  if (!grounded.hasHistory || grounded.forecasts.length === 0) {
    return {
      action: null,
      items: [],
      basis: "",
      message:
        "Not enough history to forecast today's prep — no checklist drafted.",
    };
  }

  const items = grounded.forecasts
    .slice(0, 5)
    .map((f) => `Prep ${f.forecastQty} × ${f.name}`);

  for (const risk of grounded.stockouts.filter((s) => s.level !== "ok")) {
    items.push(`Check ${risk.name} before service — ${risk.basis}`);
  }

  const basis = `Today's forecast for ${grounded.forecasts.length} items (${grounded.forecasts
    .slice(0, 3)
    .map((f) => f.basis)
    .join("; ")})`;

  // 3. draft_prep_checklist — persisted as a proposal, not as prep tasks.
  //    Nothing reaches the Kitchen Board until the approval route runs.
  const { data, error } = await db
    .from("agent_actions")
    .insert({
      restaurant_id: RESTAURANT_ID,
      agent: "Prep & Forecast Agent",
      tool_name: "draft_prep_checklist",
      tool_args: { items, reason: basis },
      proposal: `Push a ${items.length}-line prep checklist to the Kitchen Board`,
      basis,
      status: "proposed",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    action: data as AgentAction,
    items,
    basis,
    message: `Drafted ${items.length} prep tasks from today's forecast. Nothing has been sent to the Kitchen Board yet.`,
  };
}
