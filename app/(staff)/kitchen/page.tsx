"use client";

import {
  ErrorNote,
  LangToggle,
  Spinner,
  TableStatusTag,
  elapsedMin,
} from "@/components/ui";
import { LangProvider, useT, type StringId } from "@/lib/i18n";
import { ORDER_FLOW, nextStatus } from "@/lib/orders";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { MenuItem, Order, RestaurantTable, TableStatus } from "@/lib/types";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type View = "orders" | "tables" | "availability";

const TABLE_CYCLE: TableStatus[] = ["empty", "seated", "bill_requested", "cleaning"];

function KitchenDisplay() {
  const { t } = useT();
  const [view, setView] = useState<View>("orders");

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4">
      <div className="nav">
        <span className="nav-brand">Anumaan · {t("navKitchen")}</span>
        <LangToggle />
        <Link href="/" className="btn btn-ghost no-underline">
          Home
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 my-4">
        {(["orders", "tables", "availability"] as View[]).map((v) => (
          <button
            key={v}
            className={`btn ${view === v ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setView(v)}
          >
            {t(v === "orders" ? "orders" : v === "tables" ? "tables" : "availability")}
          </button>
        ))}
      </div>

      {view === "orders" ? <OrderBoard /> : null}
      {view === "tables" ? <TableBoard /> : null}
      {view === "availability" ? <AvailabilityGrid /> : null}
    </div>
  );
}

/** 4-column kanban. Tapping a card advances it exactly one step — the same
 *  single-step rule the server enforces, so the UI can never ask for something
 *  the handler will refuse. */
function OrderBoard() {
  const { data, error, isLoading, mutate } = useLiveData<Order[]>("/api/orders");
  const { t } = useT();
  const [actionError, setActionError] = useState<Error>();

  // Optimistic. A kitchen tablet tap that waits on a round trip before the
  // card moves reads as a missed tap, and the cook taps again — which is how
  // an order jumps two columns. The board updates immediately and reconciles
  // with the server behind it.
  async function advance(order: Order) {
    const next = nextStatus(order.status);
    if (!next) return;
    setActionError(undefined);

    mutate(
      (current) =>
        (current ?? []).map((o) => (o.id === order.id ? { ...o, status: next } : o)),
      { revalidate: false }
    );

    try {
      await sendMutation(`/api/orders/${order.id}`, "PATCH", { status: next });
      await mutate();
    } catch (err) {
      setActionError(err as Error);
      await mutate(); // snap back to what the server actually holds
    }
  }

  return (
    <>
      <ErrorNote error={error ?? actionError} />
      {isLoading && !data ? <Spinner /> : null}

      <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
        {ORDER_FLOW.map((column) => {
          const orders = (data ?? []).filter((o) => o.status === column);
          return (
            <section key={column}>
              <h6 className="pb-1.5 mb-2 border-b-2 border-[var(--color-divider)] flex items-center justify-between">
                <span>{t(column as StringId)}</span>
                <span className="text-muted">{orders.length}</span>
              </h6>

              <div className="flex flex-col gap-2">
                {orders.map((order) => {
                  const done = order.status === "served";
                  return (
                    <button
                      key={order.id}
                      className={`card elev-sm text-left ${
                        done ? "opacity-55 cursor-default" : "cursor-pointer"
                      }`}
                      disabled={done}
                      onClick={() => advance(order)}
                    >
                      <span className="card-kicker">
                        {order.table_id ? `${t("table")} ${order.table_id}` : "Takeaway"} ·{" "}
                        {order.code}
                      </span>
                      <span className="card-body">
                        {(order.order_items ?? [])
                          .map((i) => `${i.qty}× ${i.name}`)
                          .join(", ") || "—"}
                      </span>
                      <span className="card-meta">
                        <Clock size={12} />
                        {elapsedMin(order.placed_at)} min
                        {!done ? (
                          <span className="ml-auto text-accent">
                            Tap → {t(nextStatus(order.status) as StringId)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function TableBoard() {
  const { data, error, mutate } = useLiveData<RestaurantTable[]>("/api/tables");

  async function cycle(table: RestaurantTable) {
    const i = TABLE_CYCLE.indexOf(table.status);
    const next = TABLE_CYCLE[(i + 1) % TABLE_CYCLE.length];

    mutate(
      (current) =>
        (current ?? []).map((x) => (x.id === table.id ? { ...x, status: next } : x)),
      { revalidate: false }
    );

    try {
      await sendMutation(`/api/tables/${table.id}`, "PATCH", { status: next });
      await mutate();
    } catch {
      await mutate();
    }
  }

  return (
    <>
      <ErrorNote error={error} />
      <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
        {(data ?? []).map((table) => (
          <button
            key={table.id}
            className="card elev-sm text-left cursor-pointer"
            onClick={() => cycle(table)}
          >
            <span className="card-title text-[25px]">{table.label}</span>
            <span className="card-meta">{table.seats} seats</span>
            <TableStatusTag status={table.status} />
          </button>
        ))}
      </div>
    </>
  );
}

/** The 86 grid. Toggling here greys the item out on the customer menu within
 *  one poll — the cross-surface sync moment the demo is built around. */
function AvailabilityGrid() {
  const { data, error, mutate } = useLiveData<MenuItem[]>("/api/menu");
  const { t } = useT();

  async function toggle(item: MenuItem) {
    const next = !item.available;

    mutate(
      (current) =>
        (current ?? []).map((m) => (m.id === item.id ? { ...m, available: next } : m)),
      { revalidate: false }
    );

    try {
      await sendMutation(`/api/menu/${item.id}`, "PATCH", { available: next });
      await mutate();
    } catch {
      await mutate();
    }
  }

  return (
    <>
      <ErrorNote error={error} />
      <table className="table">
        <thead>
          <tr>
            <th>{t("menuHome")}</th>
            <th>{t("category")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((item) => (
            <tr key={item.id} className={item.available ? "" : "opacity-55"}>
              <td>{item.name}</td>
              <td className="text-muted">{item.category}</td>
              <td className="text-right">
                <button
                  className={`btn ${item.available ? "btn-secondary" : "btn-primary"}`}
                  onClick={() => toggle(item)}
                >
                  {item.available ? t("mark86") : t("markAvailable")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Page() {
  return (
    <LangProvider>
      <KitchenDisplay />
    </LangProvider>
  );
}
