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
import { Clock, Radio, Search, Smartphone } from "lucide-react";
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

      <div className="dining-hero">
        <span className="eyebrow">Spice Route Kitchen</span>
        {/* Two clauses, two spans: the accent lands on the second without any
            component slicing a translated string in half. */}
        <h2>
          {t("heroTitle")} <em>{t("heroTitleAccent")}</em>
        </h2>
        <p className="text-muted text-[13px] m-0">
          {tableId ? `${t("table")} ${tableId} · ` : ""}Order from your phone —
          no app, no waiting for a server.
        </p>

        {/* Three claims the product actually delivers, not decoration. */}
        <ul className="hero-points">
          <li>
            <Smartphone size={14} />
            {t("heroNoApp")}
          </li>
          <li>
            <Radio size={14} />
            {t("heroLive")}
          </li>
          <li>
            <Clock size={14} />
            {t("heroTrack")}
          </li>
        </ul>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            aria-hidden
          />
          <input
            className="input pl-11"
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("search")}
          />
        </div>

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
          <section key={category}>
            <div className="dining-section">
              <h5>{category}</h5>
              <span className="dining-section-meta">
                {items.length} {t(items.length === 1 ? "dish" : "dishes")}
              </span>
            </div>

            <ul className="list-none p-0 m-0 grid grid-cols-2 gap-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`dish ${item.available ? "" : "dish-sold"}`}
                >
                  <Link
                    href={`/menu/${item.id}`}
                    className="dish-media no-underline block"
                  >
                    {/* alt is empty on purpose: the dish name sits directly
                        beneath, so announcing the photo too would make a
                        screen reader say everything twice. */}
                    <Image
                      src={dishImage(item.id) ?? "/menu/placeholder.svg"}
                      alt=""
                      width={400}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                    <span className="dish-badge">
                      <VegMark veg={item.veg} />
                    </span>
                  </Link>

                  <div className="dish-body">
                    <Link
                      href={`/menu/${item.id}`}
                      className="dish-name no-underline"
                      style={{ color: "inherit" }}
                    >
                      {item.name}
                    </Link>
                    {item.description ? (
                      <p className="dish-desc m-0">{item.description}</p>
                    ) : null}
                    {/* Price and action share the footer. The reference puts
                        both under the plate rather than stamping the price
                        over the corner of the photograph. */}
                    <div className="dish-foot">
                      <span className="dish-price">{inr(item.price)}</span>
                      <QtyStepper item={item} />
                    </div>
                  </div>
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
            Scan the QR on your table to order. Browsing without one is fine —
            you can still see the full menu.
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
