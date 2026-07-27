"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { QtyStepper } from "@/components/customer/QtyStepper";
import { ErrorNote, Spinner, VegMark, inr } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { dishImage } from "@/lib/dishImages";
import { useLiveData } from "@/lib/useLiveData";
import type { MenuItem } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Filter = "all" | "veg" | "nonveg";

function MenuHome() {
  const { data, error, isLoading } = useLiveData<MenuItem[]>("/api/menu");
  const { lines, count, setTableId, tableId } = useCart();
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

  const cartTotal = lines.reduce((sum, l) => {
    const item = data?.find((m) => m.id === l.menuItemId);
    return sum + (item ? Number(item.price) * l.qty : 0);
  }, 0);

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
                    {/* alt is empty on purpose: the dish name sits right
                        beside it, so announcing the photo too would just make
                        a screen reader say everything twice. */}
                    <Image
                      src={dishImage(item.id) ?? "/menu/placeholder.svg"}
                      alt=""
                      width={56}
                      height={56}
                      className="w-14 h-14 flex-none object-cover border border-[var(--color-divider)] bg-surface"
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

                  <QtyStepper item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Filtering to nothing is a dead end otherwise — the page just empties
            and gives no hint that the veg filter is the reason. */}
        {data && grouped.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted m-0">No dishes match that.</p>
            <button
              className="btn btn-secondary mt-2"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : null}

        <Link href="/queue" className="btn btn-ghost no-underline">
          {t("joinQueue")}
        </Link>

        <p className="text-[11px] text-muted mt-6">
          Dish photography from{" "}
          <a href="/menu/CREDITS.md" className="text-muted underline">
            Wikimedia Commons contributors
          </a>
          , used under their respective licences.
        </p>

        {tableId ? null : (
          <p className="text-[12px] text-muted mt-4">
            No table scanned — open <code>/menu?table=3</code> to simulate a QR scan.
          </p>
        )}
      </main>

      {/* Running total, always in reach. Rendered outside <main> so it sticks
          to the viewport rather than the scrolling content. */}
      {count > 0 ? (
        <Link href="/cart" className="cartbar">
          <span className="font-[var(--font-heading)] font-extrabold">
            {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="opacity-85">{inr(cartTotal)}</span>
          <span className="ml-auto font-[var(--font-heading)] font-extrabold">
            {t("viewCart")} →
          </span>
        </Link>
      ) : null}
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
