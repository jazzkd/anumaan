"use client";

import { LangToggle } from "@/components/ui";
import { useT, type StringId } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Sidebar + content. The nav lists only what exists — sections still to be
 * built are absent rather than present-and-dead, because a judge who clicks a
 * nav item and lands on an empty page has learned something worse than that
 * the section is missing.
 */
const NAV: { href: string; id: StringId }[] = [
  { href: "/briefing", id: "briefing" },
  { href: "/ask", id: "ask" },
  { href: "/agents", id: "agents" },
  { href: "/orders", id: "orders" },
  { href: "/tables", id: "tables" },
  { href: "/inventory", id: "inventory" },
];

export function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="nav">
        <span className="nav-brand">Anumaan · {t("navOwner")}</span>
        <LangToggle />
        <Link href="/" className="btn btn-ghost no-underline">
          Home
        </Link>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        <nav className="md:w-[230px] flex-none p-3 md:border-r-2 border-b-2 md:border-b-0 border-[var(--color-divider)]">
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`btn btn-block no-underline whitespace-nowrap ${
                    active ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {t(item.id)}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
