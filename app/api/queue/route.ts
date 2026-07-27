import { RESTAURANT_ID } from "@/lib/constants";
import { badRequest, fromSupabase, ok, readJson } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QueueEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The walk-in queue, oldest first — position in the list is position in line. */
export async function GET() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("queue_entries")
    .select("*")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("joined_at");

  if (error) return fromSupabase(error);
  return ok<QueueEntry[]>(data as QueueEntry[]);
}

type Body = { name?: string; partySize?: number; phone?: string | null };

/** Join the queue. Public — a walk-in has no account. */
export async function POST(request: Request) {
  const body = await readJson<Body>(request);

  const name = body?.name?.trim();
  if (!name) return badRequest("name is required");

  const partySize = body?.partySize ?? 2;
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
    return badRequest("partySize must be an integer between 1 and 20");
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("queue_entries")
    .insert({
      restaurant_id: RESTAURANT_ID,
      name,
      party_size: partySize,
      phone: body?.phone ?? null,
      status: "waiting",
    })
    .select()
    .single();

  if (error) return fromSupabase(error);
  return ok<QueueEntry>(data as QueueEntry, { status: 201 });
}
