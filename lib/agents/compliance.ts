import { RESTAURANT_ID } from "../constants";
import { businessDate } from "../dates";
import { createAdminClient } from "../supabase/admin";

/**
 * The Compliance Nudge Agent.
 *
 * The only agent that acts without approval, and it earns that by holding no
 * tools at all: it reads today's checklist and, past the cutoff, writes a
 * notification. It cannot change one thing about the restaurant. That is what
 * makes autonomy safe here — not a rule saying it may not, but an absence of
 * anything it could do.
 *
 * It is also deliberately not an LLM call. "Is the checklist complete after
 * 21:00" is a comparison, and asking a model to make it would add latency,
 * quota cost, and a failure mode, in exchange for nothing.
 */

export const CUTOFF_HOUR = 21;
/** Written the way a person says it, not the way the clock stores it. */
export const CUTOFF_LABEL = "9:00 PM";

export type ComplianceCheck = {
  ran: boolean;
  pastCutoff: boolean;
  incomplete: string[];
  notified: boolean;
  message: string;
};

export async function runComplianceCheck(
  now: Date = new Date(),
  force = false
): Promise<ComplianceCheck> {
  const db = createAdminClient();
  const pastCutoff = now.getHours() >= CUTOFF_HOUR;

  const { data: items } = await db
    .from("compliance_items")
    .select("id, label, checked")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("sort_order");

  const incomplete = (items ?? []).filter((i) => !i.checked).map((i) => i.label);

  if (!pastCutoff && !force) {
    return {
      ran: true,
      pastCutoff: false,
      incomplete,
      notified: false,
      message: `Not yet ${CUTOFF_LABEL} — the check runs at the cutoff. ${incomplete.length} item(s) outstanding so far.`,
    };
  }

  if (incomplete.length === 0) {
    return {
      ran: true,
      pastCutoff,
      incomplete: [],
      notified: false,
      message: "Checklist complete at the cutoff. Nothing to notify.",
    };
  }

  // One notification per day, not one per check — the agent may be polled.
  const today = businessDate(now);
  const { data: existing } = await db
    .from("agent_actions")
    .select("id")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("agent", "Compliance Nudge Agent")
    .gte("created_at", `${today}T00:00:00`)
    .limit(1)
    .maybeSingle();

  if (existing && !force) {
    return {
      ran: true,
      pastCutoff,
      incomplete,
      notified: false,
      message: "Already notified for today.",
    };
  }

  const proposal = `Compliance checklist incomplete at the ${CUTOFF_LABEL} cutoff — ${incomplete
    .map((l) => `"${l}"`)
    .join(", ")} not completed.`;

  await db.from("agent_actions").insert({
    restaurant_id: RESTAURANT_ID,
    agent: "Compliance Nudge Agent",
    tool_name: null, // notify-only: it holds no tool
    tool_args: null,
    proposal,
    basis: `Scheduled ${CUTOFF_LABEL} check of today's compliance log`,
    status: "auto_executed",
    result_ref: "Notified owner. No restaurant state changed.",
  });

  return {
    ran: true,
    pastCutoff,
    incomplete,
    notified: true,
    message: proposal,
  };
}
