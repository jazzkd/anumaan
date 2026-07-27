import { RESTAURANT_ID } from "./constants";
import { businessDate, businessDateOffset, startOfLocalDay } from "./dates";
import {
  forecastForItem,
  stockoutRisk,
  type HistoryRow,
  type ItemForecast,
  type StockoutRisk,
} from "./forecast";
import { RECIPES, gramsToStockUnits } from "./recipes";
import { createAdminClient } from "./supabase/admin";

/**
 * Assembles the single structured object that every grounded feature is
 * allowed to see. Both the Daily Briefing and Ask Anumaan read from this and
 * nothing else — which is what makes "the model cannot invent a figure" a
 * property of the architecture rather than a hope about the prompt.
 */

export type GroundedData = {
  restaurant: string;
  businessDate: string;
  today: { revenue: number; orders: number };
  yesterday: { date: string; revenue: number; isSynthetic: boolean };
  topSellersYesterday: { name: string; qty: number; revenue: number }[];
  forecasts: (ItemForecast & { name: string })[];
  stockouts: StockoutRisk[];
  itemsOnMenu: string[];
  hasHistory: boolean;
};

/**
 * What the model is shown.
 *
 * Same facts, reshaped: figures carry their units, keys read like English, and
 * camelCase internals are gone. Handing a model raw serialised state gets you
 * "a stock of 0.02 against a forecastUsage of 1.235" in the owner's briefing —
 * technically grounded, visibly a machine reading its own JSON aloud. The
 * structured object stays for the UI, which wants numbers it can format.
 */
export function forPrompt(d: GroundedData) {
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return {
    restaurant: d.restaurant,
    today_date: d.businessDate,
    yesterday: {
      date: d.yesterday.date,
      revenue: inr(d.yesterday.revenue),
      note: d.yesterday.isSynthetic
        ? "This history is synthetic demo data, not real trading history."
        : "Real trading history.",
    },
    today_so_far: {
      revenue: inr(d.today.revenue),
      orders: d.today.orders,
    },
    yesterdays_top_sellers: d.topSellersYesterday.map(
      (s) => `${s.name}: ${s.qty} sold, ${inr(s.revenue)}`
    ),
    todays_forecast: d.forecasts.map(
      (f) => `${f.name}: ${f.forecastQty} expected (${f.basis})`
    ),
    ingredients_at_risk: d.stockouts.map((s) => `${s.name}: ${s.basis}`),
    items_we_sell: d.itemsOnMenu,
    has_history: d.hasHistory,
  };
}

export async function loadGroundedData(): Promise<GroundedData> {
  const db = createAdminClient();
  const startOfToday = startOfLocalDay();
  const todayKey = businessDate();
  const yKey = businessDateOffset(-1);
  const weekday = new Date().getDay();

  const [menuRes, ordersRes, historyRes, inventoryRes, restaurantRes] =
    await Promise.all([
      db
        .from("menu_items")
        .select("id, name, price")
        .eq("restaurant_id", RESTAURANT_ID),
      db
        .from("orders")
        .select("total")
        .eq("restaurant_id", RESTAURANT_ID)
        .gte("placed_at", startOfToday.toISOString()),
      db
        .from("daily_summaries")
        .select("menu_item_id, business_date, qty_sold, revenue, is_synthetic")
        .eq("restaurant_id", RESTAURANT_ID),
      db
        .from("inventory_items")
        .select("id, name, stock, low_threshold, unit")
        .eq("restaurant_id", RESTAURANT_ID),
      db.from("restaurants").select("name").eq("id", RESTAURANT_ID).single(),
    ]);

  const menu = menuRes.data ?? [];
  const nameById = new Map(menu.map((m) => [m.id, m.name]));
  const history = historyRes.data ?? [];
  const rows: HistoryRow[] = history.map((r) => ({
    menu_item_id: r.menu_item_id,
    business_date: r.business_date,
    qty_sold: r.qty_sold,
  }));

  const yesterdayRows = history.filter((r) => r.business_date === yKey);

  const forecasts = menu
    .map((m) => {
      const f = forecastForItem(rows, m.id, weekday);
      return f ? { ...f, name: m.name } : null;
    })
    .filter((f): f is ItemForecast & { name: string } => f !== null)
    .sort((a, b) => b.forecastQty - a.forecastQty);

  // Forecast ingredient usage for today, so stockout risk is about what is
  // actually going to be cooked rather than a static threshold.
  const usageByIngredient = new Map<number, number>();
  for (const f of forecasts) {
    for (const line of RECIPES[f.menuItemId] ?? []) {
      const prev = usageByIngredient.get(line.inventoryItemId) ?? 0;
      usageByIngredient.set(
        line.inventoryItemId,
        prev + line.gramsPerUnit * f.forecastQty
      );
    }
  }

  const stockouts = (inventoryRes.data ?? [])
    .map((item) =>
      stockoutRisk(
        item,
        gramsToStockUnits(usageByIngredient.get(item.id) ?? 0)
      )
    )
    .filter((r) => r.level !== "ok")
    .sort((a, b) => b.shortfall - a.shortfall);

  return {
    restaurant: restaurantRes.data?.name ?? "the restaurant",
    businessDate: todayKey,
    today: {
      revenue: (ordersRes.data ?? []).reduce((s, o) => s + Number(o.total), 0),
      orders: (ordersRes.data ?? []).length,
    },
    yesterday: {
      date: yKey,
      revenue: yesterdayRows.reduce((s, r) => s + Number(r.revenue), 0),
      isSynthetic: yesterdayRows.some((r) => r.is_synthetic),
    },
    topSellersYesterday: yesterdayRows
      .map((r) => ({
        name: nameById.get(r.menu_item_id) ?? `item ${r.menu_item_id}`,
        qty: r.qty_sold,
        revenue: Number(r.revenue),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    forecasts: forecasts.slice(0, 5),
    stockouts,
    // Named explicitly so the model can tell "we don't sell that" from
    // "we sold none yesterday" — the distinction GND-003 turns on.
    itemsOnMenu: menu.map((m) => m.name),
    hasHistory: history.length > 0,
  };
}
