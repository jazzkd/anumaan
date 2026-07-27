"use client";

import { ErrorNote, Spinner, inr } from "@/components/ui";
import { useT, type StringId } from "@/lib/i18n";
import { ORDER_FLOW } from "@/lib/orders";
import { useLiveData } from "@/lib/useLiveData";
import type { Order, OrderStatus } from "@/lib/types";
import { useState } from "react";

export default function OrdersPage() {
  const { data, error, isLoading } = useLiveData<Order[]>("/api/orders");
  const { t } = useT();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const orders = (data ?? []).filter((o) => filter === "all" || o.status === filter);

  return (
    <>
      <h3>{t("orders")}</h3>
      <ErrorNote error={error} />

      <div className="flex flex-wrap gap-2 my-3">
        <button
          className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFilter("all")}
        >
          {t("all")}
        </button>
        {ORDER_FLOW.map((s) => (
          <button
            key={s}
            className={`btn ${filter === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(s)}
          >
            {t(s as StringId)}
          </button>
        ))}
      </div>

      {isLoading && !data ? <Spinner /> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>{t("table")}</th>
            <th>Items</th>
            <th>Status</th>
            <th className="text-right">{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="font-[var(--font-heading)] font-extrabold">{order.code}</td>
              <td className="text-muted">{order.table_id ?? "—"}</td>
              <td className="text-muted">
                {(order.order_items ?? []).map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}
              </td>
              <td>
                <span className={`tag ${order.status === "served" ? "tag-neutral" : "tag-accent"}`}>
                  {t(order.status as StringId)}
                </span>
              </td>
              <td className="text-right font-[var(--font-heading)] font-extrabold">
                {inr(order.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && data ? (
        <p className="text-muted mt-3">No orders in this state.</p>
      ) : null}
    </>
  );
}
