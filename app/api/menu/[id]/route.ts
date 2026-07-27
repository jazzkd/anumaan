import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fromSupabase, notFound, ok, readJson } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = { available?: boolean };

/**
 * The 86 toggle. Staff-only, and enforced here rather than by hiding the
 * control — this is also the write the Anumaan Agent's
 * `toggle_item_availability` tool ends up performing after approval, so it has
 * to be safe to call from something that is not the kitchen UI.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return badRequest("Invalid menu item id");

  const body = await readJson<Body>(request);
  if (typeof body?.available !== "boolean") {
    return badRequest("Body must be { available: boolean }");
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("menu_items")
    .update({ available: body.available })
    .eq("id", itemId)
    .eq("restaurant_id", RESTAURANT_ID)
    .select()
    .maybeSingle();

  if (error) return fromSupabase(error);
  if (!data) return notFound("No such menu item");

  return ok<MenuItem>(data as MenuItem);
}
