"use client";

import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { LangToggle } from "@/components/ui";
import Link from "next/link";
import { ShoppingCart, ChevronLeft } from "lucide-react";

/** Header: "Anumaan · Table N" plus a cart button carrying a count badge.
 *  The table number comes from the QR the diner scanned. */
export function CustomerHeader({ back }: { back?: { href: string; label?: string } }) {
  const { count, tableId } = useCart();
  const { t } = useT();

  return (
    // dining-nav makes it translucent and blurred, so the dish photography
    // scrolls under the header rather than stopping at a hard bar.
    <header className="dining-nav sticky top-0 z-10 bg-ground">
      <div className="flex items-center gap-3 px-4 py-3">
        {back ? (
          <Link href={back.href} className="btn btn-ghost no-underline -ml-1">
            <ChevronLeft size={18} />
            {back.label ?? t("back")}
          </Link>
        ) : (
          <span className="font-[var(--font-heading)] font-extrabold text-[18px]">
            Anumaan
            {tableId ? (
              <span className="text-muted font-normal text-[14px]">
                {" "}
                · {t("table")} {tableId}
              </span>
            ) : null}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          <Link
            href="/cart"
            aria-label={t("viewCart")}
            className="btn btn-icon btn-secondary relative no-underline"
          >
            <ShoppingCart size={18} />
            {count > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[11px] font-bold text-ground bg-accent"
                aria-hidden
              >
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
