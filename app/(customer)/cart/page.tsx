"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { QtyStepper } from "@/components/customer/QtyStepper";
import { ErrorNote, Spinner, VegMark, inr } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { MenuItem, Order } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CartPage() {
  const { data: menu, error } = useLiveData<MenuItem[]>("/api/menu");
  const { lines, clear, tableId } = useCart();
  const { t } = useT();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error>();

  const priced = lines.flatMap((line) => {
    const item = menu?.find((m) => m.id === line.menuItemId);
    return item ? [{ ...line, item }] : [];
  });
  const total = priced.reduce((sum, l) => sum + Number(l.item.price) * l.qty, 0);

  async function confirm() {
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const order = await sendMutation<Order>("/api/orders", "POST", {
        tableId,
        items: lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
      });
      clear();
      router.push(`/order/${order.id}`);
    } catch (err) {
      // The most likely cause is an item that was 86'd while the cart sat open
      // — the server refuses it, and the diner needs to know why.
      setSubmitError(err as Error);
      setSubmitting(false);
    }
  }

  return (
    <>
      <CustomerHeader back={{ href: "/menu", label: t("menuHome") }} />

      <main className="px-4 py-4 flex-1 flex flex-col">
        <h4>{t("viewCart")}</h4>
        <ErrorNote error={error} />

        {lines.length === 0 ? (
          <div className="mt-4">
            <p className="text-muted">{t("yourCartEmpty")}</p>
            <Link href="/menu" className="btn btn-secondary no-underline">
              {t("menuHome")}
            </Link>
          </div>
        ) : (
          <>
            {!menu ? <Spinner /> : null}

            <ul className="list-none p-0 m-0">
              {priced.map(({ item, qty }) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 border-b border-[var(--color-divider)]"
                >
                  <VegMark veg={item.veg} />
                  <span className="flex-1 min-w-0 truncate">{item.name}</span>

                  {/* Same control as the menu, so removing the last one is a
                      bin here too rather than a minus that silently deletes. */}
                  <QtyStepper item={item} />

                  <span className="sr-only" aria-hidden>
                    {qty}
                  </span>

                  <span className="w-16 text-right font-[var(--font-heading)] font-extrabold flex-none">
                    {inr(Number(item.price) * qty)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between py-3 mt-1 border-b-2 border-[var(--color-divider)]">
              <span className="font-[var(--font-heading)] font-extrabold">
                {t("total")}
              </span>
              <span className="font-[var(--font-heading)] font-extrabold text-[20px]">
                {inr(total)}
              </span>
            </div>

            {submitError ? (
              <p className="tag tag-outline mt-3 self-start" role="alert">
                {submitError.message}
              </p>
            ) : null}

            <button
              className="btn btn-primary btn-cta w-full justify-center mt-4"
              onClick={confirm}
              disabled={submitting || priced.length === 0}
            >
              {submitting ? "…" : t("confirmOrder")}
            </button>
          </>
        )}
      </main>
    </>
  );
}
