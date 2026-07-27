"use client";

import type { Summary } from "@/app/api/summary/route";
import { ErrorNote, Spinner, inr } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useLiveData } from "@/lib/useLiveData";
import Link from "next/link";

export default function BriefingPage() {
  const { data, error, isLoading } = useLiveData<Summary>("/api/summary");
  const { t } = useT();

  return (
    <>
      <ErrorNote error={error} />
      {isLoading && !data ? <Spinner /> : null}

      {data ? (
        <>
          {/* The one place red runs large in this design — a full-bleed field
              with reversed type. Used once, deliberately, so it still lands. */}
          <section className="bg-accent text-ground p-6 md:p-8 -m-4 md:-m-6 mb-4 md:mb-6">
            <span className="text-[11px] uppercase tracking-[0.1em] opacity-90">
              {t("briefing")}
            </span>
            <h2 className="mt-1 mb-3 text-ground">Good morning, Raj</h2>

            <p className="font-[var(--font-heading)] font-extrabold text-[44px] leading-none m-0">
              {inr(data.yesterday.revenue)}
            </p>
            <p className="m-0 mt-1 text-[14px] opacity-90">
              Yesterday&apos;s revenue
              {data.yesterday.isSynthetic ? " · synthetic demo data" : ""}
            </p>
          </section>

          {/* Asymmetric, rule-divided — not boxed. */}
          <section className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr] border-y-2 border-[var(--color-divider)] py-4">
            <div className="md:border-r-2 border-[var(--color-divider)] md:pr-4">
              <h6 className="text-muted">Today, prep</h6>
              <p className="m-0 text-[14px]">
                {data.stockoutRisks.length > 0
                  ? `Watch ${data.stockoutRisks
                      .map((r) => r.name.toLowerCase())
                      .join(" and ")} — at or below the reorder line.`
                  : "Stock is comfortable across every tracked ingredient."}
              </p>
            </div>

            <div className="md:border-r-2 border-[var(--color-divider)] md:pr-4">
              <h6 className="text-muted">Revenue so far</h6>
              <p className="font-[var(--font-heading)] font-extrabold text-[25px] m-0">
                {inr(data.today.revenue)}
              </p>
            </div>

            <div>
              <h6 className="text-muted">Orders so far</h6>
              <p className="font-[var(--font-heading)] font-extrabold text-[25px] m-0">
                {data.today.orders}
              </p>
            </div>
          </section>

          {data.stockoutRisks.length > 0 ? (
            <div className="card elev-sm mt-4 max-w-[560px]">
              <span className="tag tag-accent self-start">Stockout risk</span>
              <p className="card-body m-0">
                {data.stockoutRisks
                  .map(
                    (r) =>
                      `${r.name}: ${r.stock}${r.unit} left, reorder line ${r.threshold}${r.unit}`
                  )
                  .join(" · ")}
              </p>
              <Link href="/inventory" className="btn btn-secondary self-start no-underline">
                {t("inventory")}
              </Link>
            </div>
          ) : null}

          {!data.hasHistory ? (
            <p className="tag tag-outline mt-4">
              Not enough data yet — no forecast will be shown.
            </p>
          ) : null}

          <p className="text-[12px] text-muted mt-6 max-w-[640px]">
            Every figure above is computed from the database, not generated. The
            forecast and its narration arrive next — and the model will be given
            these numbers to describe, never asked to work them out.
          </p>
        </>
      ) : null}
    </>
  );
}
