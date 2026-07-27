"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ErrorNote, Spinner, inr } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { Order } from "@/lib/types";
import { use, useState } from "react";

const UPI_VPA = "spiceroute@upi";

export default function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, error, isLoading, mutate } = useLiveData<Order>(`/api/orders/${id}`);
  const { t } = useT();
  const [paying, setPaying] = useState(false);

  const upiLink = order
    ? `upi://pay?pa=${UPI_VPA}&pn=Spice%20Route%20Kitchen&am=${Number(
        order.total
      )}&cu=INR&tn=${order.code}`
    : "";

  async function markPaid() {
    setPaying(true);
    try {
      await sendMutation(`/api/orders/${id}`, "PATCH", { paid: true });
      await mutate();
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <CustomerHeader back={{ href: `/order/${id}`, label: t("back") }} />

      <main className="px-4 py-4 flex-1">
        <h4>{t("bill")}</h4>
        {isLoading && !order ? <Spinner /> : null}
        <ErrorNote error={error} />

        {order ? (
          <>
            <ul className="list-none p-0 m-0">
              {(order.order_items ?? []).map((line) => (
                <li
                  key={line.id}
                  className="flex items-center gap-3 py-2 border-b border-[var(--color-divider)]"
                >
                  <span className="flex-1 min-w-0 truncate">{line.name}</span>
                  <span className="text-muted text-[13px]">× {line.qty}</span>
                  <span className="w-16 text-right font-[var(--font-heading)] font-extrabold">
                    {inr(Number(line.unit_price) * line.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between py-3 border-y-2 border-[var(--color-divider)] my-2">
              <span className="font-[var(--font-heading)] font-extrabold">{t("total")}</span>
              <span className="font-[var(--font-heading)] font-extrabold text-[25px]">
                {inr(order.total)}
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <span className="card-kicker">{t("scanToPay")}</span>
              <div
                className="w-[160px] h-[160px] border-2 border-[var(--color-divider)] bg-surface grid place-items-center text-[11px] text-muted text-center px-2"
                aria-label="UPI QR placeholder"
              >
                UPI QR
                <br />
                (placeholder)
              </div>
              <code className="text-[10px] text-muted break-all text-center">{upiLink}</code>
            </div>

            <div className="mt-5">
              {order.paid ? (
                <span className="tag tag-accent">{t("paid")} ✓</span>
              ) : (
                <button
                  className="btn btn-primary w-full justify-center"
                  onClick={markPaid}
                  disabled={paying}
                >
                  {t("payNow")}
                </button>
              )}
            </div>

            <p className="text-[12px] text-muted mt-4">
              This build does not move money. The QR is a placeholder and
              &quot;{t("payNow")}&quot; only records that payment happened.
            </p>
          </>
        ) : null}
      </main>
    </>
  );
}
