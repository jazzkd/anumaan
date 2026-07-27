"use client";

import { ErrorNote, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { InventoryItem } from "@/lib/types";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

/**
 * Stock levels, and the controls to move them.
 *
 * These are deliberately generous — a set-to-exact field, half-kilo steppers,
 * and Fill/Empty shortcuts. Someone evaluating this needs to be able to drive
 * an ingredient to zero and watch the Inventory Watch agent react, and doing
 * that half a kilo at a time is not a test anyone will bother finishing.
 *
 * The colour is never the only signal: each card states its condition in words
 * too, which matters for the ~8% of men with red/green colour blindness
 * standing in a hot kitchen.
 */
function level(item: InventoryItem) {
  const stock = Number(item.stock);
  const low = Number(item.low_threshold);
  if (stock <= 0) return { tag: "Out of stock", cls: "tag-accent", bar: "var(--color-accent)" };
  if (stock <= low) return { tag: "Stockout risk", cls: "tag-accent", bar: "var(--color-accent)" };
  if (stock <= low * 1.5) return { tag: "Low stock", cls: "tag-accent-2", bar: "var(--color-accent-2)" };
  return { tag: "Healthy", cls: "tag-neutral", bar: "var(--color-ink)" };
}

export default function InventoryPage() {
  const { data, error, isLoading, mutate } = useLiveData<InventoryItem[]>("/api/inventory");
  const { t } = useT();
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<string>();
  const [draft, setDraft] = useState<Record<number, string>>({});

  async function setStock(item: InventoryItem, next: number) {
    setBusy(item.id);
    setFailed(undefined);
    try {
      await sendMutation(`/api/inventory/${item.id}`, "PATCH", {
        stock: Math.max(0, Math.round(next * 100) / 100),
      });
      await mutate();
      setDraft((d) => ({ ...d, [item.id]: "" }));
    } catch (err) {
      // Previously this failed in silence, which reads exactly like a dead
      // button.
      setFailed(`${item.name}: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h3>{t("inventory")}</h3>
      <p className="text-muted text-[14px] max-w-[68ch]">
        Change any level and the forecast, the risk flags and the agent all
        follow within a couple of seconds. Drive something to zero and place an
        order to see the Inventory Watch agent raise a proposal on its own.
      </p>

      <ErrorNote error={error} />
      {failed ? (
        <p className="tag tag-outline mt-2" role="alert">
          {failed}
        </p>
      ) : null}
      {isLoading && !data ? <Spinner /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
        {(data ?? []).map((item) => {
          const state = level(item);
          const stock = Number(item.stock);
          const max = Math.max(1, Number(item.max_stock));
          const pct = Math.min(100, Math.round((stock / max) * 100));
          const working = busy === item.id;

          return (
            <div key={item.id} className="card elev-sm">
              <span className="flex items-baseline justify-between gap-2">
                <span className="card-title">{item.name}</span>
                <span className={`tag ${state.cls}`}>{state.tag}</span>
              </span>

              <span className="flex items-baseline gap-1">
                <span className="font-[var(--font-heading)] font-extrabold text-[25px]">
                  {stock.toFixed(1)}
                </span>
                <span className="text-muted text-[13px]">
                  / {max} {item.unit} · reorder at {Number(item.low_threshold)}
                  {item.unit}
                </span>
              </span>

              <span
                className="h-2 w-full bg-[var(--color-neutral-300)] block"
                role="img"
                aria-label={`${pct}% of maximum stock`}
              >
                <span className="h-2 block" style={{ width: `${pct}%`, background: state.bar }} />
              </span>

              {/* Half-kilo steps for nudging. */}
              <span className="flex items-center gap-1">
                <button
                  className="btn btn-icon btn-secondary"
                  aria-label={`Reduce ${item.name} by 0.5${item.unit}`}
                  disabled={working || stock <= 0}
                  onClick={() => setStock(item, stock - 0.5)}
                >
                  <Minus size={16} />
                </button>
                <button
                  className="btn btn-icon btn-secondary"
                  aria-label={`Increase ${item.name} by 0.5${item.unit}`}
                  disabled={working}
                  onClick={() => setStock(item, stock + 0.5)}
                >
                  <Plus size={16} />
                </button>
                <span className="text-[11px] text-muted ml-1">0.5{item.unit} steps</span>
              </span>

              {/* Set an exact figure — the only practical way to test a
                  specific scenario without forty clicks. */}
              <span className="flex items-center gap-1">
                <input
                  className="input flex-1 min-w-0"
                  type="number"
                  min={0}
                  max={max * 2}
                  step={0.1}
                  placeholder={`Set ${item.unit}`}
                  aria-label={`Set ${item.name} stock exactly`}
                  value={draft[item.id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draft[item.id] !== "") {
                      setStock(item, Number(draft[item.id]));
                    }
                  }}
                />
                <button
                  className="btn btn-secondary flex-none"
                  disabled={working || !draft[item.id]}
                  onClick={() => setStock(item, Number(draft[item.id]))}
                >
                  Set
                </button>
              </span>

              <span className="flex gap-1">
                <button
                  className="btn btn-secondary flex-1 justify-center"
                  disabled={working}
                  onClick={() => setStock(item, max)}
                >
                  Fill
                </button>
                <button
                  className="btn btn-secondary flex-1 justify-center"
                  disabled={working || stock <= 0}
                  onClick={() => setStock(item, 0)}
                >
                  Empty
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
