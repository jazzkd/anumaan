"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ErrorNote, Spinner, VegMark, inr } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
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
  const { add, lines } = useCart();
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
            <div
              className="w-full h-[200px] border border-[var(--color-divider)] bg-surface"
              aria-hidden
            />

            <div className="flex items-center gap-2 mt-4">
              <VegMark veg={item.veg} />
              <h3 className="m-0">{item.name}</h3>
            </div>

            <p className="font-[var(--font-heading)] font-extrabold text-[20px] mt-1 mb-2">
              {inr(item.price)}
            </p>

            {item.description ? (
              <p className="text-[14px] text-muted">{item.description}</p>
            ) : null}

            <hr className="hr" />

            {item.available ? (
              <>
                <button
                  className="btn btn-primary w-full justify-center"
                  onClick={() => add(item.id)}
                >
                  {t("addToCart")}
                </button>
                {inCart > 0 ? (
                  <p className="text-[13px] text-muted mt-2">
                    {t("inCart")}: {inCart}
                  </p>
                ) : null}
              </>
            ) : (
              <span className="tag tag-neutral">{t("soldOut")}</span>
            )}
          </>
        ) : null}
      </main>
    </>
  );
}
