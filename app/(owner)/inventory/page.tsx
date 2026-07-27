"use client";

import { ErrorNote, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { InventoryItem } from "@/lib/types";
import { Minus, Plus } from "lucide-react";

/** Stock level, its bar, and a plain-language state. The colour is not the
 *  only signal — the tag says it in words too, which matters for the ~8% of
 *  men with red/green colour blindness standing in a hot kitchen. */
function level(item: InventoryItem) {
  if (item.stock <= 0) return { tag: "Out of stock", cls: "tag-accent", bar: "var(--color-accent)" };
  if (item.stock <= item.low_threshold)
    return { tag: "Stockout risk", cls: "tag-accent", bar: "var(--color-accent)" };
  if (item.stock <= item.low_threshold * 1.5)
    return { tag: "Low stock", cls: "tag-accent-2", bar: "var(--color-accent-2)" };
  return { tag: "Healthy", cls: "tag-neutral", bar: "var(--color-ink)" };
}

export default function InventoryPage() {
  const { data, error, isLoading, mutate } = useLiveData<InventoryItem[]>("/api/inventory");
  const { t } = useT();

  async function adjust(item: InventoryItem, delta: number) {
    const next = Math.max(0, Number(item.stock) + delta);
    await sendMutation(`/api/inventory/${item.id}`, "PATCH", { stock: next });
    await mutate();
  }

  return (
    <>
      <h3>{t("inventory")}</h3>
      <ErrorNote error={error} />
      {isLoading && !data ? <Spinner /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
        {(data ?? []).map((item) => {
          const state = level(item);
          const pct = Math.min(
            100,
            Math.round((Number(item.stock) / Math.max(1, Number(item.max_stock))) * 100)
          );

          return (
            <div key={item.id} className="card elev-sm">
              <span className="card-title">{item.name}</span>

              <span className="flex items-baseline gap-1">
                <span className="font-[var(--font-heading)] font-extrabold text-[25px]">
                  {Number(item.stock).toFixed(1)}
                </span>
                <span className="text-muted text-[13px]">
                  / {Number(item.max_stock)} {item.unit}
                </span>
              </span>

              <span
                className="h-2 w-full bg-[var(--color-neutral-300)] block"
                role="img"
                aria-label={`${pct}% of maximum stock`}
              >
                <span
                  className="h-2 block"
                  style={{ width: `${pct}%`, background: state.bar }}
                />
              </span>

              <span className="flex items-center gap-2">
                <span className={`tag ${state.cls}`}>{state.tag}</span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    className="btn btn-icon btn-secondary"
                    aria-label={`Decrease ${item.name}`}
                    onClick={() => adjust(item, -0.5)}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    className="btn btn-icon btn-secondary"
                    aria-label={`Increase ${item.name}`}
                    onClick={() => adjust(item, 0.5)}
                  >
                    <Plus size={16} />
                  </button>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
