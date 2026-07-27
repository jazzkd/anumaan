"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ErrorNote, Spinner, VegMark, inr } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { useLiveData } from "@/lib/useLiveData";
import type { MenuItem } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Filter = "all" | "veg" | "nonveg";

function MenuHome() {
  const { data, error, isLoading } = useLiveData<MenuItem[]>("/api/menu");
  const { add, setTableId, tableId } = useCart();
  const { t } = useT();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // The QR encodes the table: /menu?table=3. Remembered thereafter so a diner
  // who navigates away does not have to rescan.
  const scanned = params.get("table");
  useEffect(() => {
    if (scanned && Number.isInteger(Number(scanned))) setTableId(Number(scanned));
  }, [scanned, setTableId]);

  const grouped = useMemo(() => {
    const items = (data ?? []).filter((m) => {
      if (filter === "veg" && !m.veg) return false;
      if (filter === "nonveg" && m.veg) return false;
      if (query && !m.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    const byCategory = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return [...byCategory.entries()];
  }, [data, filter, query]);

  return (
    <>
      <CustomerHeader />

      <div className="px-4 py-4 flex flex-col gap-3">
        <input
          className="input"
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("search")}
        />

        <div className="seg self-start" role="group" aria-label={t("all")}>
          {(["all", "veg", "nonveg"] as Filter[]).map((f) => (
            <label key={f} className="seg-opt">
              <input
                type="radio"
                name="veg-filter"
                checked={filter === f}
                onChange={() => setFilter(f)}
              />
              {t(f === "all" ? "all" : f === "veg" ? "veg" : "nonveg")}
            </label>
          ))}
        </div>
      </div>

      <main className="px-4 pb-6 flex-1">
        {isLoading && !data ? <Spinner /> : null}
        <ErrorNote error={error} />

        {grouped.map(([category, items]) => (
          <section key={category} className="mb-6">
            <h5 className="pb-1.5 mb-2 border-b-2 border-[var(--color-divider)]">
              {category}
            </h5>

            <ul className="list-none p-0 m-0 flex flex-col">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 py-3 border-b border-[var(--color-divider)] ${
                    item.available ? "" : "opacity-55"
                  }`}
                >
                  <Link
                    href={`/menu/${item.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 no-underline text-ink"
                  >
                    <span
                      className="w-12 h-12 flex-none border border-[var(--color-divider)] bg-surface"
                      aria-hidden
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <VegMark veg={item.veg} />
                        <span className="font-medium truncate">{item.name}</span>
                      </span>
                      {/* Dotted leader to the price — the print-menu pattern
                          the design calls for, not a card. */}
                      <span className="flex items-baseline gap-1 mt-0.5">
                        <span className="flex-1 border-b border-dotted border-[var(--color-divider)]" />
                        <span className="font-[var(--font-heading)] font-extrabold text-[15px]">
                          {inr(item.price)}
                        </span>
                      </span>
                    </span>
                  </Link>

                  {item.available ? (
                    <button
                      className="btn btn-secondary flex-none"
                      onClick={() => add(item.id)}
                    >
                      {t("addToCart")}
                    </button>
                  ) : (
                    <span className="tag tag-neutral flex-none">{t("soldOut")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Link href="/queue" className="btn btn-ghost no-underline">
          {t("joinQueue")}
        </Link>

        {tableId ? null : (
          <p className="text-[12px] text-muted mt-4">
            No table scanned — open <code>/menu?table=3</code> to simulate a QR scan.
          </p>
        )}
      </main>
    </>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <MenuHome />
    </Suspense>
  );
}
