"use client";

import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import type { MenuItem } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";

/**
 * "Add to Cart" that becomes a quantity stepper once the item is in the cart.
 *
 * The pattern every Indian food app has trained diners on: one tap adds and the
 * button turns into − 1 +, so the second item costs one tap instead of a trip
 * to the cart. At quantity 1 the minus becomes a bin, because "decrement to
 * zero" and "remove this" are the same intent and a diner should not have to
 * work out that they are.
 *
 * Reads the cart directly rather than taking props, so the menu row, the item
 * detail page and the cart cannot drift out of sync with each other.
 */
export function QtyStepper({
  item,
  size = "sm",
}: {
  item: Pick<MenuItem, "id" | "name" | "available">;
  size?: "sm" | "lg";
}) {
  const { lines, add, setQty } = useCart();
  const { t } = useT();

  const qty = lines.find((l) => l.menuItemId === item.id)?.qty ?? 0;

  if (!item.available) {
    return <span className="tag tag-neutral flex-none">{t("soldOut")}</span>;
  }

  if (qty === 0) {
    return (
      <button
        className={`btn ${size === "lg" ? "btn-primary w-full justify-center" : "btn-secondary"} flex-none`}
        onClick={() => add(item.id)}
        aria-label={`${t("addToCart")} — ${item.name}`}
      >
        {t("addToCart")}
      </button>
    );
  }

  const atOne = qty === 1;

  return (
    <span
      className={`stepper flex-none ${size === "lg" ? "stepper-lg w-full" : ""}`}
      role="group"
      aria-label={`${item.name} quantity`}
    >
      <button
        onClick={() => setQty(item.id, qty - 1)}
        aria-label={atOne ? `Remove ${item.name}` : `One fewer ${item.name}`}
      >
        {atOne ? <Trash2 size={size === "lg" ? 18 : 15} /> : <Minus size={size === "lg" ? 18 : 15} />}
      </button>

      <span className="qty" aria-live="polite">
        {qty}
      </span>

      <button onClick={() => add(item.id)} aria-label={`One more ${item.name}`}>
        <Plus size={size === "lg" ? 18 : 15} />
      </button>
    </span>
  );
}
