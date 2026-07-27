import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fromSupabase, notFound, ok, readJson } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RestaurantTable, TableStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABLE_STATUSES: TableStatus[] = [
  "empty",
  "seated",
  "bill_requested",
  "cleaning",
];

type Body = { status?: TableStatus };

/** Table status is a free transition — a floor can go from any state to any
 *  other legitimately (a table is cleared, then immediately re-seated). Only
 *  the value is validated, not the path. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const tableId = Number(id);
  if (!Number.isInteger(tableId)) return badRequest("Invalid table id");

  const body = await readJson<Body>(request);
  if (!body?.status || !TABLE_STATUSES.includes(body.status)) {
    return badRequest(`status must be one of ${TABLE_STATUSES.join(", ")}`);
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("restaurant_tables")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", tableId)
    .eq("restaurant_id", RESTAURANT_ID)
    .select()
    .maybeSingle();

  if (error) return fromSupabase(error);
  if (!data) return notFound("No such table");

  return ok<RestaurantTable>(data as RestaurantTable);
}
