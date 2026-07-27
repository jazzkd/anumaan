"use client";

import type { Briefing } from "@/app/api/briefing/route";
import { ProposalCard } from "@/components/owner/ProposalCard";
import { ErrorNote, Spinner, inr } from "@/components/ui";
import { useT } from "@/lib/i18n";
import type { AgentAction } from "@/lib/types";
import { useLiveData } from "@/lib/useLiveData";
import Link from "next/link";
import { useState } from "react";

export default function BriefingPage() {
  // Never polled. Every fetch can cost an LLM call, and Gemini's free tier
  // 429s on the second request within a minute — a 2s poll here would burn the
  // quota before the demo began. Rewriting is explicit, via the button below.
  const { data, error, isLoading, mutate } = useLiveData<Briefing>(
    "/api/briefing",
    { refreshInterval: 0 }
  );
  // Polled: the watcher can raise a proposal at any moment, and the owner
  // should not have to reload to find out.
  const { data: actions, mutate: mutateActions } =
    useLiveData<AgentAction[]>("/api/agents/actions");
  const pending = (actions ?? []).filter((a) => a.status === "proposed");

  const { t } = useT();
  const [rewriting, setRewriting] = useState(false);

  async function rewrite() {
    setRewriting(true);
    try {
      const fresh = await fetch("/api/briefing?refresh=1").then((r) => r.json());
      await mutate(fresh, { revalidate: false });
    } finally {
      setRewriting(false);
    }
  }

  const figures = data?.figures;

  return (
    <>
      <ErrorNote error={error} />
      {isLoading && !data ? <Spinner /> : null}

      {data && figures ? (
        <>
          {/* The one place red runs large in this design. Used once so it lands. */}
          <section className="bg-accent text-ground p-6 md:p-8 -m-4 md:-m-6 mb-4 md:mb-6">
            <span className="text-[11px] uppercase tracking-[0.1em] opacity-90">
              {t("briefing")}
            </span>
            <h2 className="mt-1 mb-3 text-ground">Good morning, Raj</h2>

            <p className="font-[var(--font-heading)] font-extrabold text-[44px] leading-none m-0">
              {inr(figures.yesterday.revenue)}
            </p>
            <p className="m-0 mt-1 text-[14px] opacity-90">
              Yesterday&apos;s revenue
              {figures.yesterday.isSynthetic ? " · synthetic demo data" : ""}
            </p>

            <p className="m-0 mt-4 text-[15px] leading-relaxed max-w-[62ch]">
              {data.narration}
            </p>

            <p className="m-0 mt-3 text-[11px] opacity-80 flex flex-wrap items-center gap-2">
              <span>
                Narrated by {data.provider}
                {data.cached ? " · written earlier today" : ""}
                {data.fellBack && !data.cached ? " · failover" : ""} · figures
                computed from the database, not generated
              </span>
              <button
                className="btn btn-secondary text-ground border-ground/40"
                onClick={rewrite}
                disabled={rewriting}
              >
                {rewriting ? "…" : "Rewrite"}
              </button>
            </p>
          </section>

          {/* Anything an agent raised on its own, at the top where it will be
              seen. A warning the owner has to go looking for is not a warning. */}
          {pending.length > 0 ? (
            <section className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="tag tag-accent">
                  {pending.length} awaiting your approval
                </span>
                <span className="text-[12px] text-muted">
                  raised automatically — nothing has happened yet
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {pending.map((action) => (
                  <ProposalCard
                    key={action.id}
                    action={action}
                    onDecided={() => mutateActions()}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr] border-y-2 border-[var(--color-divider)] py-4">
            <div className="md:border-r-2 border-[var(--color-divider)] md:pr-4">
              <h6 className="text-muted">Today, prep</h6>
              <p className="m-0 text-[14px]">
                {figures.forecasts.length > 0
                  ? figures.forecasts
                      .slice(0, 3)
                      .map((f) => `${f.name} ${f.forecastQty}`)
                      .join(" · ")
                  : "Not enough data yet."}
              </p>
            </div>
            <div className="md:border-r-2 border-[var(--color-divider)] md:pr-4">
              <h6 className="text-muted">Revenue so far</h6>
              <p className="font-[var(--font-heading)] font-extrabold text-[25px] m-0">
                {inr(figures.today.revenue)}
              </p>
            </div>
            <div>
              <h6 className="text-muted">Orders so far</h6>
              <p className="font-[var(--font-heading)] font-extrabold text-[25px] m-0">
                {figures.today.orders}
              </p>
            </div>
          </section>

          {/* Every forecast carries the arithmetic that produced it. A number a
              judge can check is worth more than one they have to trust. */}
          {figures.forecasts.length > 0 ? (
            <section className="mt-5">
              <h4>Today&apos;s forecast</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Forecast</th>
                    <th>Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {figures.forecasts.map((f) => (
                    <tr key={f.menuItemId}>
                      <td>{f.name}</td>
                      <td className="text-right font-[var(--font-heading)] font-extrabold">
                        {f.forecastQty}
                      </td>
                      <td className="text-muted text-[12px]">{f.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[12px] text-muted mt-2">
                forecast = weekday average × trend factor, clamped to ±30%. No
                model is involved in this number.
              </p>
            </section>
          ) : (
            <p className="tag tag-outline mt-4">
              Not enough data yet — no forecast will be shown.
            </p>
          )}

          {figures.stockouts.length > 0 ? (
            <section className="mt-5">
              <h4>Stockout risk</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {figures.stockouts.map((s) => (
                  <div key={s.inventoryItemId} className="card elev-sm">
                    <span
                      className={`tag self-start ${
                        s.level === "ok" ? "tag-neutral" : "tag-accent"
                      }`}
                    >
                      {s.level === "out"
                        ? "Out of stock"
                        : s.level === "risk"
                          ? "Stockout risk"
                          : "Low stock"}
                    </span>
                    <span className="card-title">{s.name}</span>
                    <p className="card-body m-0">{s.basis}</p>
                    <Link
                      href="/inventory"
                      className="btn btn-secondary self-start no-underline"
                    >
                      {t("inventory")}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <Link href="/ask" className="btn btn-primary no-underline mt-6">
            {t("ask")}
          </Link>
        </>
      ) : null}
    </>
  );
}
