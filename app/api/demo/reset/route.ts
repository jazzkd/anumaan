import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
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
 * It resets the moving parts and leaves the 28 days of sales history alone:
 * that history is what the forecast reads, and regenerating it would change
 * the two figures the eval suite pins (Garlic Naan's Friday 40, yesterday's
 * ₹18,400).
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

    return ok({
      reset: done,
      note: "Sales history was left untouched — it is what the forecast reads, and the eval suite pins two figures in it.",
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Reset failed");
  }
}
