"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { QtyStepper } from "@/components/customer/QtyStepper";
import { ErrorNote, Spinner, VegMark, inr } from "@/components/ui";
import { useCart } from "@/lib/cart";
import Image from "next/image";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { dishImage } from "@/lib/dishImages";
import { useLiveData } from "@/lib/useLiveData";
import type { MenuItem } from "@/lib/types";
import { use } from "react";

export default function ItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error, isLoading } = useLiveData<MenuItem[]>("/api/menu");
  const { lines } = useCart();
  const { t } = useT();

  const item = data?.find((m) => m.id === Number(id));
  const inCart = lines.find((l) => l.menuItemId === Number(id))?.qty ?? 0;

  return (
    <>
      <CustomerHeader back={{ href: "/menu", label: t("menuHome") }} />

      <main className="px-4 py-4 flex-1">
        {isLoading && !data ? <Spinner /> : null}
        <ErrorNote error={error} />

        {data && !item ? <p className="text-muted">Item not found.</p> : null}

        {item ? (
          <>
            <Image
              src={dishImage(item.id) ?? "/menu/placeholder.svg"}
              alt={item.name}
              width={900}
              height={560}
              priority
              className="w-full h-[280px] object-cover rounded-2xl bg-surface"
            />

            <div className="flex items-center gap-2 mt-5">
              <VegMark veg={item.veg} />
              <h3 className="m-0">{item.name}</h3>
            </div>

            <p className="font-[var(--font-heading)] font-extrabold text-[26px] text-accent mt-1 mb-2">
              {inr(item.price)}
            </p>

            {item.description ? (
              <p className="text-[14px] text-muted">{item.description}</p>
            ) : null}

            <hr className="hr" />

            <QtyStepper item={item} size="lg" />

            {inCart > 0 ? (
              <Link
                href="/cart"
                className="btn btn-secondary w-full justify-center mt-2 no-underline"
              >
                {t("viewCart")} · {inr(Number(item.price) * inCart)}
              </Link>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
