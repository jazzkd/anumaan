import { RESTAURANT_ID } from "../constants";
import { createAdminClient } from "../supabase/admin";

/**
 * The complete set of actions any agent can propose.
 *
 * What is not here is the design. There is no tool that moves money, applies a
 * discount, issues a refund, or contacts a supplier — FR-AG6 is enforced by
 * absence, not by a filter or a prompt instruction. An agent cannot call a
 * tool it was never given, and a model cannot be talked into inventing one at
 * runtime. Asked to order stock from a supplier, the most it can do is draft a
 * note for a human to act on (TRJ-003).
 *
 * Every tool here changes something a manager could undo in ten seconds.
 * That is the test for whether a tool belongs in this file.
 */

export type ToolName =
  | "toggle_item_availability"
  | "notify_queue_entry"
  | "update_table_status"
  | "draft_restock_note"
  | "draft_prep_checklist";

export type ToolDef = {
  name: ToolName;
  description: string;
  parameters: Record<string, unknown>;
  /** Shown in the Activity Log and on the proposal card. */
  summarise: (args: Record<string, unknown>) => string;
};

export const TOOLS: ToolDef[] = [
  {
    name: "toggle_item_availability",
    description:
      "Mark a menu item as sold out, or put it back on sale. Use when an ingredient is about to run out, or when stock has been replenished.",
    parameters: {
      type: "object",
      properties: {
        menu_item_id: { type: "integer", description: "The menu item's id." },
        available: {
          type: "boolean",
          description: "false to mark sold out, true to restore.",
        },
        reason: {
          type: "string",
          description:
            "Why, in one plain sentence, citing the figure that prompted it.",
        },
      },
      required: ["menu_item_id", "available", "reason"],
    },
    summarise: (a) =>
      a.available
        ? `Put menu item ${a.menu_item_id} back on the menu`
        : `Take menu item ${a.menu_item_id} off the menu (mark sold out)`,
  },
  {
    name: "notify_queue_entry",
    description:
      "Notify a waiting party that their table is ready. Use when a table has been freed and a party is waiting.",
    parameters: {
      type: "object",
      properties: {
        queue_entry_id: { type: "integer" },
        reason: { type: "string" },
      },
      required: ["queue_entry_id", "reason"],
    },
    summarise: (a) => `Notify queue entry ${a.queue_entry_id} that a table is ready`,
  },
  {
    name: "update_table_status",
    description:
      "Change a table's status: empty, seated, bill_requested, or cleaning.",
    parameters: {
      type: "object",
      properties: {
        table_id: { type: "integer" },
        status: {
          type: "string",
          enum: ["empty", "seated", "bill_requested", "cleaning"],
        },
        reason: { type: "string" },
      },
      required: ["table_id", "status", "reason"],
    },
    summarise: (a) => `Set table ${a.table_id} to ${a.status}`,
  },
  {
    name: "draft_restock_note",
    description:
      "Draft a restock note for the owner to act on. This does NOT order anything and does not contact a supplier — it only writes a note. It is the only thing that can be done about low stock.",
    parameters: {
      type: "object",
      properties: {
        ingredient: { type: "string" },
        quantity: { type: "string", description: "e.g. '5 kg'" },
        reason: { type: "string" },
      },
      required: ["ingredient", "quantity", "reason"],
    },
    summarise: (a) => `Draft a restock note for ${a.quantity} of ${a.ingredient}`,
  },
  {
    name: "draft_prep_checklist",
    description:
      "Draft a prep checklist for the kitchen board, based on today's forecast.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description: "Each line as it should appear on the kitchen board.",
        },
        reason: { type: "string" },
      },
      required: ["items", "reason"],
    },
    summarise: (a) =>
      `Push a ${(a.items as string[])?.length ?? 0}-line prep checklist to the Kitchen Board`,
  },
];

export const TOOL_NAMES = TOOLS.map((t) => t.name);

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** OpenAI-compatible shape, which is what Groq's tool calling expects. */
export function toolsForApi() {
  return TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

/**
 * Executes an approved action. Only ever called from the approval route, after
 * a human has said yes — never from the agent itself. Returns a plain-language
 * record of what actually changed, which is what the Activity Log shows.
 */
export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<string> {
  const db = createAdminClient();

  switch (name) {
    case "toggle_item_availability": {
      const { data, error } = await db
        .from("menu_items")
        .update({ available: Boolean(args.available) })
        .eq("id", Number(args.menu_item_id))
        .eq("restaurant_id", RESTAURANT_ID)
        .select("name, available")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No such menu item");
      return `${data.name} is now ${data.available ? "available" : "sold out"} on the customer menu.`;
    }

    case "notify_queue_entry": {
      const { data, error } = await db
        .from("queue_entries")
        .update({ status: "notified" })
        .eq("id", Number(args.queue_entry_id))
        .eq("restaurant_id", RESTAURANT_ID)
        .select("name")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No such queue entry");
      return `${data.name} marked as notified. (This build sends no real SMS.)`;
    }

    case "update_table_status": {
      const { data, error } = await db
        .from("restaurant_tables")
        .update({
          status: String(args.status),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(args.table_id))
        .eq("restaurant_id", RESTAURANT_ID)
        .select("label, status")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No such table");
      return `Table ${data.label} is now ${data.status}.`;
    }

    case "draft_restock_note": {
      // Writes a note onto the kitchen board. Buys nothing, tells no supplier.
      const { error } = await db.from("prep_tasks").insert({
        restaurant_id: RESTAURANT_ID,
        label: `Restock: ${args.quantity} ${args.ingredient}`,
      });
      if (error) throw new Error(error.message);
      return `Restock note for ${args.quantity} of ${args.ingredient} added to the Kitchen Board. No order was placed and no supplier was contacted.`;
    }

    case "draft_prep_checklist": {
      const items = (args.items as string[]) ?? [];
      if (items.length === 0) throw new Error("Checklist is empty");
      const { error } = await db.from("prep_tasks").insert(
        items.map((label) => ({
          restaurant_id: RESTAURANT_ID,
          label,
        }))
      );
      if (error) throw new Error(error.message);
      return `${items.length} prep tasks pushed to the Kitchen Board.`;
    }

    default: {
      // Unreachable while ToolName is exhaustive — the compiler enforces that.
      const never: never = name;
      throw new Error(`Unknown tool: ${never}`);
    }
  }
}
