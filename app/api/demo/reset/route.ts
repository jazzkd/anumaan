import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { businessDateOffset } from "@/lib/dates";
import { synthesizeHistory } from "@/lib/demoHistory";
import { ok, serverError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Restores the seeded demo state.
 *
 * This exists because the demo will be run more than once and cannot be
 * re-seeded by hand between rehearsals. Every pass places real orders, which
 * consume real stock and 86 real items — after three run-throughs the
 * stockout story the agent tells no longer matches the one the seed set up,
 * and the most persuasive moment in the demo stops working.
 *
 * It also rolls the 28 days of sales history forward so the window still ends
 * yesterday. An earlier version of this handler deliberately left that history
 * alone, on the stated grounds that regenerating it would move the two figures
 * the eval suite pins. That turned out to be false, and costly: both figures
 * are date-relative by construction, and `seed.sql` proves it by asserting them
 * after every run. Meanwhile the seed stored `current_date - 1` as an absolute
 * date, so the demo silently decayed the morning after it was seeded — GND-001
 * reporting ₹0 against the ₹18,400 it asserts — with no way to recover short of
 * re-seeding by hand. Rolling it here is what makes the reset button honest.
 *
 * See `lib/demoHistory.ts`; `demoHistory.test.ts` holds both invariants across
 * a year of start dates.
 */
const SEEDED_INVENTORY: Record<number, number> = {
  1: 2.0, // Paneer  — deliberately tight, this is what the agent flags
  2: 5.0, // Chicken
  3: 10.0, // Basmati Rice
  4: 1.5, // Butter  — below its reorder line by design
  5: 8.0, // Onions
  6: 6.0, // Milk
};

const SEEDED_TABLES: Record<number, string> = {
  1: "empty",
  2: "seated",
  3: "seated",
  4: "bill_requested",
  5: "empty",
  6: "cleaning",
  7: "seated",
  8: "empty",
};

export async function POST() {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const done: string[] = [];

  try {
    // Menu: everything available except Dal Makhani, which ships 86'd.
    await db
      .from("menu_items")
      .update({ available: true })
      .eq("restaurant_id", RESTAURANT_ID);
    await db
      .from("menu_items")
      .update({ available: false })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("id", 4);
    done.push("menu availability");

    for (const [id, stock] of Object.entries(SEEDED_INVENTORY)) {
      await db
        .from("inventory_items")
        .update({ stock, updated_at: new Date().toISOString() })
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("id", Number(id));
    }
    done.push("inventory levels");

    for (const [id, status] of Object.entries(SEEDED_TABLES)) {
      await db
        .from("restaurant_tables")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("id", Number(id));
    }
    done.push("table statuses");

    // Orders beyond the four seeded ones are demo debris.
    await db
      .from("orders")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID)
      .gt("id", 4);
    await db
      .from("orders")
      .update({ status: "preparing", paid: false })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("id", 1);
    await db
      .from("orders")
      .update({ status: "new", paid: false })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("id", 2);
    await db
      .from("orders")
      .update({ status: "ready", paid: false })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("id", 3);
    await db
      .from("orders")
      .update({ status: "served", paid: true })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("id", 4);
    done.push("orders");

    await db
      .from("queue_entries")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID)
      .gt("id", 2);
    await db
      .from("queue_entries")
      .update({ status: "waiting" })
      .eq("restaurant_id", RESTAURANT_ID)
      .lte("id", 2);
    done.push("walk-in queue");

    // Compliance: item 5 stays incomplete — it is what the Compliance Nudge
    // Agent catches, and a complete checklist has nothing to demonstrate.
    await db
      .from("compliance_items")
      .update({ checked: true })
      .eq("restaurant_id", RESTAURANT_ID)
      .lte("sort_order", 4);
    await db
      .from("compliance_items")
      .update({ checked: false, checked_at: null })
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("sort_order", 5);
    done.push("compliance checklist");

    // Agent trail and kitchen board: keep the one seeded Compliance Nudge
    // entry so the Activity Log is never empty on first view.
    await db
      .from("agent_actions")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID)
      .gt("id", 1);
    await db.from("prep_tasks").delete().eq("restaurant_id", RESTAURANT_ID);
    done.push("agent log and kitchen board");

    // Today's stored narration, so the next briefing is written fresh.
    await db.from("briefings").delete().eq("restaurant_id", RESTAURANT_ID);
    done.push("stored briefing");

    // Sales history, rolled forward so the window still ends yesterday. Prices
    // come from the menu rather than a constant here: yesterday's ₹18,400 is
    // quantities × the seeded prices, so a repriced item must move the figure
    // rather than silently disagree with the menu the briefing cites.
    const { data: menu, error: menuError } = await db
      .from("menu_items")
      .select("id, price")
      .eq("restaurant_id", RESTAURANT_ID);
    if (menuError) throw new Error(`menu prices: ${menuError.message}`);

    const prices = new Map<number, number>(
      (menu ?? []).map((m) => [m.id as number, Number(m.price)])
    );
    const history = synthesizeHistory(prices).map((row) => ({
      ...row,
      restaurant_id: RESTAURANT_ID,
    }));

    await db
      .from("daily_summaries")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID);
    const { error: historyError } = await db
      .from("daily_summaries")
      .insert(history);
    if (historyError) throw new Error(`sales history: ${historyError.message}`);
    done.push(`sales history (28 days ending ${businessDateOffset(-1)})`);

    return ok({
      reset: done,
      note: "Sales history was rolled forward so the 28-day window still ends yesterday; the figures GND-001 and DET-001 pin are reproduced exactly.",
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Reset failed");
  }
}
