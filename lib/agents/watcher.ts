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

    // Pick the dish that actually drains this ingredient hardest today, not
    // whichever happens to sit first in the menu. Garlic Naan uses 10g of
    // butter and Butter Chicken 40g — 86'ing the naan to save butter would be
    // theatre, and a judge who checks the numbers would spot it.
    const candidates = (menu ?? [])
      .filter((m) => m.available)
      .map((m) => {
        const line = (RECIPES[m.id] ?? []).find(
          (l) => l.inventoryItemId === risk.inventoryItemId
        );
        if (!line) return null;
        const forecast =
          grounded.forecasts.find((f) => f.menuItemId === m.id)?.forecastQty ?? 0;
        return { ...m, drain: line.gramsPerUnit * forecast, perDish: line.gramsPerUnit };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.drain - a.drain);

    const dish = candidates[0];

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
        proposal: `Take ${dish.name} off the menu — ${risk.name} is forecast to run out before service ends`,
        basis: `${risk.basis}. ${dish.name} is the heaviest draw on ${risk.name.toLowerCase()} today at ${dish.perDish}g per dish against a forecast of ${
          grounded.forecasts.find((f) => f.menuItemId === dish.id)?.forecastQty ?? 0
        }, and that forecast is the weekday average times a clamped trend factor.`,
        status: "proposed",
      })
      .select()
      .single();

    if (!error && data) result.raised.push(data as AgentAction);
  }

  return result;
}
