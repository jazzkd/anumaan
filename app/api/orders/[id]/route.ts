import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import {
  badRequest,
  fail,
  fromSupabase,
  notFound,
  ok,
  readJson,
} from "@/lib/http";
import { ORDER_FLOW, isLegalTransition, nextStatus } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** One order. Public: the customer's status screen polls this after ordering,
 *  and the order code is the only thing they hold. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return badRequest("Invalid order id");

  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  if (error) return fromSupabase(error);
  if (!data) return notFound("No such order");

  return ok<Order>(data as Order);
}

type Body = { status?: OrderStatus; paid?: boolean };

/**
 * Advance an order. The state machine is enforced here, in the handler, not in
 * the kitchen UI's disabled buttons — a request that jumps new → served is
 * rejected with a 409 no matter what sent it (DET-005).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("staff", "owner");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return badRequest("Invalid order id");

  const body = await readJson<Body>(request);
  if (!body || (body.status === undefined && body.paid === undefined)) {
    return badRequest("Body must include status and/or paid");
  }

  const db = createAdminClient();
  const { data: current, error: readError } = await db
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  if (readError) return fromSupabase(readError);
  if (!current) return notFound("No such order");

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    if (!ORDER_FLOW.includes(body.status)) {
      return badRequest(`status must be one of ${ORDER_FLOW.join(", ")}`);
    }

    const from = current.status as OrderStatus;
    if (!isLegalTransition(from, body.status)) {
      const allowed = nextStatus(from);
      return fail(
        409,
        allowed
          ? `Illegal transition ${from} → ${body.status}; only ${allowed} is allowed next`
          : `Order is already ${from} and cannot advance further`
      );
    }

    update.status = body.status;
  }

  if (body.paid !== undefined) {
    if (typeof body.paid !== "boolean") return badRequest("paid must be boolean");
    update.paid = body.paid;
  }

  const { data, error } = await db
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select("*, order_items(*)")
    .single();

  if (error) return fromSupabase(error);
  return ok<Order>(data as Order);
}
