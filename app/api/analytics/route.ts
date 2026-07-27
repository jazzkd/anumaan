import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { businessDateOffset } from "@/lib/dates";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type Analytics = {
  revenue: { today: number; week: number; month: number };
  peakHours: { hour: number; orders: number }[];
  isSynthetic: boolean;
};

/**
 * Sales & Analytics — owner-only, and the endpoint DET-003 names.
 *
 * The role check is the point here, not the arithmetic: a staff token must be
 * refused by this handler regardless of what the client believes about its own
 * permissions. Hiding the nav link is not enforcement.
 */
export async function GET() {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const monthAgo = businessDateOffset(-30);
  const weekAgo = businessDateOffset(-7);
  const today = businessDateOffset(0);

  const [historyRes, ordersRes] = await Promise.all([
    db
      .from("daily_summaries")
      .select("business_date, revenue, is_synthetic")
      .eq("restaurant_id", RESTAURANT_ID)
      .gte("business_date", monthAgo),
    db
      .from("orders")
      .select("placed_at, total")
      .eq("restaurant_id", RESTAURANT_ID),
  ]);

  if (historyRes.error) return fromSupabase(historyRes.error);
  if (ordersRes.error) return fromSupabase(ordersRes.error);

  const history = historyRes.data ?? [];
  const sum = (rows: { revenue: number }[]) =>
    rows.reduce((s, r) => s + Number(r.revenue), 0);

  const byHour = new Map<number, number>();
  for (const o of ordersRes.data ?? []) {
    const h = new Date(o.placed_at).getHours();
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
  }

  return ok<Analytics>({
    revenue: {
      today: (ordersRes.data ?? [])
        .filter((o) => o.placed_at.slice(0, 10) >= today)
        .reduce((s, o) => s + Number(o.total), 0),
      week: sum(history.filter((r) => r.business_date >= weekAgo)),
      month: sum(history),
    },
    peakHours: [...byHour.entries()]
      .map(([hour, orders]) => ({ hour, orders }))
      .sort((a, b) => a.hour - b.hour),
    isSynthetic: history.some((r) => r.is_synthetic),
  });
}
