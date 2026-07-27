import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fromSupabase, notFound, ok, readJson } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QueueEntry, QueueStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUEUE_STATUSES: QueueStatus[] = [
  "waiting",
  "notified",
  "seated",
  "cancelled",
];

type Body = { status?: QueueStatus };

/** Move a party along the queue. This is also the write behind the agent's
 *  `notify_queue_entry` tool once a proposal is approved. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId)) return badRequest("Invalid queue entry id");

  const body = await readJson<Body>(request);
  if (!body?.status || !QUEUE_STATUSES.includes(body.status)) {
    return badRequest(`status must be one of ${QUEUE_STATUSES.join(", ")}`);
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("queue_entries")
    .update({ status: body.status })
    .eq("id", entryId)
    .eq("restaurant_id", RESTAURANT_ID)
    .select()
    .maybeSingle();

  if (error) return fromSupabase(error);
  if (!data) return notFound("No such queue entry");

  return ok<QueueEntry>(data as QueueEntry);
}
