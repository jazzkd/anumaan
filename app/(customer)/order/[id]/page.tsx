"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ErrorNote, OrderStatusStrip, Spinner, inr } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useLiveData } from "@/lib/useLiveData";
import type { Order } from "@/lib/types";
import Link from "next/link";
import { use, useState } from "react";

/**
 * The screen E2E-001 is really about: the kitchen advances the order and this
 * updates on its own. The 2s poll in useLiveData is what makes that true — no
 * refresh, no websocket to debug on stage.
 */
export default function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, error, isLoading } = useLiveData<Order>(`/api/orders/${id}`);
  const { t } = useT();
  const [otpOpen, setOtpOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const billable = order?.status === "ready" || order?.status === "served";

  return (
    <>
      <CustomerHeader back={{ href: "/menu", label: t("menuHome") }} />

      <main className="px-4 py-4 flex-1">
        {isLoading && !order ? <Spinner /> : null}
        <ErrorNote error={error} />

        {order ? (
          <>
            <div className="flex items-baseline gap-2">
              <h4 className="m-0">{order.code}</h4>
              {order.table_id ? (
                <span className="text-muted text-[13px]">
                  {t("table")} {order.table_id}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <OrderStatusStrip status={order.status} />
            </div>

            <hr className="hr" />

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

            <div className="flex items-center justify-between py-3 border-b-2 border-[var(--color-divider)]">
              <span className="font-[var(--font-heading)] font-extrabold">
                {t("total")}
              </span>
              <span className="font-[var(--font-heading)] font-extrabold text-[20px]">
                {inr(order.total)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setOtpOpen(true)}>
                {t("getNotified")}
              </button>
              {billable ? (
                <Link href={`/bill/${order.id}`} className="btn btn-primary no-underline">
                  {t("bill")}
                </Link>
              ) : null}
            </div>

            {otpSent ? (
              <p className="text-[13px] text-muted mt-3">
                We&apos;ll text {phone} when your order is ready. (Demo build — no
                SMS is actually sent.)
              </p>
            ) : null}
          </>
        ) : null}
      </main>

      {/* Opt-in only. Never a gate before browsing — FR-C1. */}
      {otpOpen ? (
        <div
          className="dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t("getNotified")}
        >
          <div className="dialog">
            <span className="dialog-title">{t("getNotified")}</span>
            <div className="field">
              <label htmlFor="otp-phone">{t("phone")}</label>
              <input
                id="otp-phone"
                className="input"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98xxxxxx12"
              />
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setOtpOpen(false)}>
                {t("back")}
              </button>
              <button
                className="btn btn-primary"
                disabled={!phone}
                onClick={() => {
                  setOtpSent(true);
                  setOtpOpen(false);
                }}
              >
                {t("sendOtp")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
