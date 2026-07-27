import { requireRole } from "@/lib/auth";
import { RESTAURANT_ID } from "@/lib/constants";
import { businessDateOffset, startOfLocalDay } from "@/lib/dates";
import { fromSupabase, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type Summary = {
  today: { revenue: number; orders: number };
  yesterday: { revenue: number; isSynthetic: boolean };
  stockoutRisks: { name: string; stock: number; unit: string; threshold: number }[];
  hasHistory: boolean;
};

/**
 * Every figure the Daily Briefing shows, computed in SQL and TypeScript — never
 * by a model. Phase 4's LLM narration receives this object and is instructed to
 * describe it, not to calculate. That separation is the honesty claim the whole
 * predictive layer rests on: GND-001 asserts yesterday's ₹18,400 appears
 * unaltered, and a model that was allowed to do arithmetic could not guarantee
 * it.
 */
export async function GET() {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const db = createAdminClient();
  const startOfToday = startOfLocalDay();

  const [ordersRes, historyRes, inventoryRes] = await Promise.all([
    db
      .from("orders")
      .select("total, placed_at")
      .eq("restaurant_id", RESTAURANT_ID)
      .gte("placed_at", startOfToday.toISOString()),
    db
      .from("daily_summaries")
      .select("revenue, business_date, is_synthetic")
      .eq("restaurant_id", RESTAURANT_ID)
      .order("business_date", { ascending: false })
      .limit(400),
    db
      .from("inventory_items")
      .select("name, stock, unit, low_threshold")
      .eq("restaurant_id", RESTAURANT_ID),
  ]);

  if (ordersRes.error) return fromSupabase(ordersRes.error);
  if (historyRes.error) return fromSupabase(historyRes.error);
  if (inventoryRes.error) return fromSupabase(inventoryRes.error);

  const todayOrders = ordersRes.data ?? [];
  const history = historyRes.data ?? [];

  const yKey = businessDateOffset(-1);
  const yesterdayRows = history.filter((r) => r.business_date === yKey);

  const stockoutRisks = (inventoryRes.data ?? [])
    .filter((i) => Number(i.stock) <= Number(i.low_threshold))
    .map((i) => ({
      name: i.name,
      stock: Number(i.stock),
      unit: i.unit,
      threshold: Number(i.low_threshold),
    }));

  const summary: Summary = {
    today: {
      revenue: todayOrders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: todayOrders.length,
    },
    yesterday: {
      revenue: yesterdayRows.reduce((sum, r) => sum + Number(r.revenue), 0),
      // Said out loud in the UI. Presenting generated history as real would
      // contradict the posture the rest of this product is built on.
      isSynthetic: yesterdayRows.some((r) => r.is_synthetic),
    },
    stockoutRisks,
    // FR-P6: with no history there is no forecast, and the honest answer is to
    // say so rather than to extrapolate from nothing.
    hasHistory: history.length > 0,
  };

  return ok(summary);
}
