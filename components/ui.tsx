"use client";

import { useT, type Lang, type StringId } from "@/lib/i18n";
import { ORDER_FLOW } from "@/lib/orders";
import type { OrderStatus, TableStatus } from "@/lib/types";

/** Rupees, Indian digit grouping. One helper so no screen invents its own. */
export function inr(amount: number | string) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * The FSSAI veg/non-veg mark — an outlined green square for veg, a filled
 * brown-red one for non-veg. This is a legally recognised symbol in India and
 * diners scan for it before they read the dish name, so it is not decoration.
 */
export function VegMark({ veg }: { veg: boolean }) {
  const color = veg ? "#1a7f37" : "#ae1800";
  return (
    <span
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      title={veg ? "Vegetarian" : "Non-vegetarian"}
      className="inline-grid place-items-center flex-none"
      style={{ width: 14, height: 14, border: `1.5px solid ${color}` }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
        }}
      />
    </span>
  );
}

/** The 4-step order strip. Reached steps carry the accent, the rest stay quiet. */
export function OrderStatusStrip({ status }: { status: OrderStatus }) {
  const { t } = useT();
  const reachedTo = ORDER_FLOW.indexOf(status);

  return (
    <div className="flex flex-wrap gap-1.5">
      {ORDER_FLOW.map((s, i) => (
        <span key={s} className={`tag ${i <= reachedTo ? "tag-accent" : "tag-neutral"}`}>
          {t(s as StringId)}
        </span>
      ))}
    </div>
  );
}

const TABLE_TAG: Record<TableStatus, string> = {
  empty: "tag-neutral",
  seated: "tag-accent",
  bill_requested: "tag-outline",
  cleaning: "tag-accent-2",
};

export function TableStatusTag({ status }: { status: TableStatus }) {
  const { t } = useT();
  return <span className={`tag ${TABLE_TAG[status]}`}>{t(status as StringId)}</span>;
}

/** EN/हिं switch. Native radios, per the design system — focus and keyboard
 *  behaviour come free and stay correct. */
export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="seg" role="group" aria-label="Language">
      {(["en", "hi"] as Lang[]).map((l) => (
        <label key={l} className="seg-opt">
          <input
            type="radio"
            name="anu-lang"
            checked={lang === l}
            onChange={() => setLang(l)}
          />
          {l === "en" ? "EN" : "हिं"}
        </label>
      ))}
    </div>
  );
}

/** Minutes since a timestamp, for the kitchen's elapsed-time meta row. */
export function elapsedMin(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useT();
  return <p className="text-muted text-[13px]">{label ?? t("loading")}</p>;
}

/** Errors are shown, never swallowed — a silent failure on stage is worse than
 *  an ugly one. */
export function ErrorNote({ error }: { error?: Error }) {
  if (!error) return null;
  return (
    <p className="tag tag-outline" role="alert">
      {error.message}
    </p>
  );
}
