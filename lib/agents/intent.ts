import type { TableStatus } from "../types";

/**
 * Deterministic intent parsing — what the agent proposes when no model answers.
 *
 * This exists because of a failure worth remembering. The offline path used to
 * ignore the request entirely and always propose the at-risk dish, so once Groq
 * rate-limited, "mark the Gulab Jamun sold out" produced a proposal about
 * paneer. It looked like a working agent right up until anyone read the answer.
 *
 * A restaurant floor request is not open-ended language. "Take X off", "table 4
 * wants the bill", "seat the next party" are a small closed set over names and
 * ids we already hold. Parsing that directly means the product keeps working
 * with a dead API key, an exhausted quota, or no network — which is the
 * difference between a demo that survives being poked and one that does not.
 *
 * The model is still the better path when it is available: it handles phrasing
 * this cannot, and it explains itself. This is the floor, not the ceiling.
 */

export type ParsedIntent =
  | { kind: "toggle_item"; menuItemId: number; name: string; available: boolean }
  | { kind: "table_status"; tableId: number; label: string; status: TableStatus }
  | { kind: "notify_queue"; queueEntryId: number; name: string }
  | { kind: "restock"; ingredient: string }
  | { kind: "none" };

export type IntentWorld = {
  dishes: { menu_item_id: number; name: string; currently_available: boolean }[];
  tables: { table_id: number; label: string; status: string }[];
  waiting: { queue_entry_id: number; name: string }[];
  ingredients: { name: string }[];
};

/** "Bring it back" reads as restoring; everything else in this family removes. */
const MAKE_AVAILABLE =
  /\b(back on|bring back|restore|available again|put .{0,12}back|un-?86|back in stock|we have .{0,10}again)\b/i;
const MAKE_UNAVAILABLE =
  /\b(86|eighty-?six|sold out|sell out|run(?:ning)? out|ran out|out of|take .{0,15}off|remove .{0,15}from the menu|unavailable|stop selling|finished)\b/i;

const TABLE_WORDS: [RegExp, TableStatus][] = [
  [/\b(bill|cheque|check|paying|pay)\b/i, "bill_requested"],
  [/\b(clean|clear|dirty|reset|wipe)\b/i, "cleaning"],
  [/\b(seat|seated|sat|occupied|guests? (are )?in)\b/i, "seated"],
  [/\b(empty|free|vacant|available|left|gone)\b/i, "empty"],
];

const NOTIFY = /\b(notify|call|text|message|seat|tell)\b/i;
const RESTOCK = /\b(restock|re-?order|note|order more|top up|buy more)\b/i;

/** Longest name first, so "Chicken Biryani" wins over "Chicken 65". */
function matchName<T extends { name: string }>(request: string, items: T[]): T | null {
  const q = request.toLowerCase();
  const hits = items
    .filter((i) => q.includes(i.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  if (hits.length > 0) return hits[0];

  // Fall back to a distinctive word — "biryani", "jamun", "naan" — but only
  // when exactly one dish owns it, so "chicken" stays ambiguous rather than
  // resolving to whichever chicken dish happens to be first.
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  for (const w of words) {
    const owners = items.filter((i) => i.name.toLowerCase().split(/\s+/).includes(w));
    if (owners.length === 1) return owners[0];
  }
  return null;
}

function matchTable(request: string, tables: IntentWorld["tables"]) {
  const byLabel = tables.find((t) =>
    new RegExp(`\\b${t.label}\\b`, "i").test(request)
  );
  if (byLabel) return byLabel;

  const num = request.match(/\btable\s*(?:no\.?|number)?\s*(\d{1,2})\b/i);
  if (num) return tables.find((t) => t.table_id === Number(num[1])) ?? null;
  return null;
}

export function parseIntent(request: string, world: IntentWorld): ParsedIntent {
  const dish = matchName(request, world.dishes);
  const table = matchTable(request, world.tables);

  // A named dish with an availability verb is the most common floor request
  // and the least ambiguous, so it is checked first.
  if (dish) {
    if (MAKE_AVAILABLE.test(request)) {
      return {
        kind: "toggle_item",
        menuItemId: dish.menu_item_id,
        name: dish.name,
        available: true,
      };
    }
    if (MAKE_UNAVAILABLE.test(request)) {
      return {
        kind: "toggle_item",
        menuItemId: dish.menu_item_id,
        name: dish.name,
        available: false,
      };
    }
  }

  if (table) {
    for (const [pattern, status] of TABLE_WORDS) {
      if (pattern.test(request)) {
        return {
          kind: "table_status",
          tableId: table.table_id,
          label: table.label,
          status,
        };
      }
    }
  }

  if (NOTIFY.test(request) && world.waiting.length > 0) {
    const named = matchName(request, world.waiting.map((w) => ({ ...w })));
    const target = named ?? world.waiting[0];
    return {
      kind: "notify_queue",
      queueEntryId: target.queue_entry_id,
      name: target.name,
    };
  }

  if (RESTOCK.test(request)) {
    const ing = matchName(request, world.ingredients);
    if (ing) return { kind: "restock", ingredient: ing.name };
  }

  return { kind: "none" };
}
