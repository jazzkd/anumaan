import { RESTAURANT_ID } from "../constants";
import { businessDate } from "../dates";
import { loadGroundedData } from "../groundedData";
import { RECIPES } from "../recipes";
import { createAdminClient } from "../supabase/admin";
import type { AgentAction } from "../types";

/**
 * Inventory Watch — the agent that starts the conversation.
 *
 * Every other agent here waits to be asked. This one watches stock fall as
 * orders are placed and raises a proposal the moment the forecast says an
 * ingredient will not last the day. The owner does not press anything; a
 * proposal simply appears on the dashboard with the arithmetic that produced
 * it.
 *
 * Deliberately deterministic — no LLM call.
 *
 *   - It runs on the hot path of every order. A diner should never wait on a
 *     model to get their food.
 *   - "stock 2.0 against forecast use 2.3" is a comparison, not a judgement.
 *     Asking a model to make it would add latency, quota cost and variance in
 *     exchange for nothing.
 *   - It must fire reliably during a demo. Free-tier quota is finite; this
 *     path cannot run out.
 *
 * What it does NOT do is act. It writes a `proposed` row exactly like every
 * other agent and waits for a human. Automating when the agent thinks must
 * never automate what it does.
 */

export const WATCH_AGENT = "Inventory Watch Agent";

export type WatchResult = {
  checked: number;
  raised: AgentAction[];
  skipped: { ingredient: string; why: string }[];
};

export async function checkStockAndPropose(): Promise<WatchResult> {
  const db = createAdminClient();
  const grounded = await loadGroundedData();
  const today = businessDate();

  const atRisk = grounded.stockouts.filter(
    (s) => s.level === "risk" || s.level === "out"
  );

  const result: WatchResult = { checked: atRisk.length, raised: [], skipped: [] };
  if (atRisk.length === 0) return result;

  // Which dishes are still on sale and depend on the ingredient in trouble.
  const { data: menu } = await db
    .from("menu_items")
    .select("id, name, available")
    .eq("restaurant_id", RESTAURANT_ID);

  for (const risk of atRisk) {
    // Once per ingredient per day. Without this, every order past the
    // threshold raises another identical proposal and the log becomes noise
    // the owner learns to ignore — which is worse than not warning at all.
    const { data: already } = await db
      .from("agent_actions")
      .select("id")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("agent", WATCH_AGENT)
      .eq("tool_args->>ingredient", risk.name)
      .gte("created_at", `${today}T00:00:00`)
      .limit(1)
      .maybeSingle();

    if (already) {
      result.skipped.push({ ingredient: risk.name, why: "already raised today" });
      continue;
    }

    const dish = (menu ?? []).find(
      (m) =>
        m.available &&
        (RECIPES[m.id] ?? []).some((l) => l.inventoryItemId === risk.inventoryItemId)
    );

    if (!dish) {
      result.skipped.push({
        ingredient: risk.name,
        why: "no available dish depends on it",
      });
      continue;
    }

    const { data, error } = await db
      .from("agent_actions")
      .insert({
        restaurant_id: RESTAURANT_ID,
        agent: WATCH_AGENT,
        tool_name: "toggle_item_availability",
        tool_args: {
          menu_item_id: dish.id,
          available: false,
          ingredient: risk.name,
          reason: risk.basis,
        },
        proposal: `86 ${dish.name} — ${risk.name} is forecast to run out before service ends`,
        basis: `${risk.basis}. ${dish.name} depends on ${risk.name.toLowerCase()}, and today's forecast was computed from the weekday average times a clamped trend factor.`,
        status: "proposed",
      })
      .select()
      .single();

    if (!error && data) result.raised.push(data as AgentAction);
  }

  return result;
}
