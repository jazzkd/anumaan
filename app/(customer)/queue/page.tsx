"use client";

import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { ErrorNote, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { waitEstimate } from "@/lib/queue";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { QueueEntry, RestaurantTable } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export default function QueuePage() {
  const { data: queue, error, isLoading, mutate } = useLiveData<QueueEntry[]>("/api/queue");
  const { data: tables } = useLiveData<RestaurantTable[]>("/api/tables");
  const { t } = useT();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [joinedId, setJoinedId] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<Error>();

  const waiting = (queue ?? []).filter((q) => q.status === "waiting");
  const free = (tables ?? []).filter((t) => t.status === "empty").length;

  async function join() {
    setJoinError(undefined);
    try {
      const entry = await sendMutation<QueueEntry>("/api/queue", "POST", {
        name,
        partySize,
        phone: phone || null,
      });
      setJoinedId(entry.id);
      await mutate();
    } catch (err) {
      setJoinError(err as Error);
    }
  }

  const myIndex = waiting.findIndex((q) => q.id === joinedId);

  return (
    <>
      <CustomerHeader back={{ href: "/menu", label: t("menuHome") }} />

      <main className="px-4 py-4 flex-1">
        <h4>{t("queueWait")}</h4>
        <ErrorNote error={error} />
        {isLoading && !queue ? <Spinner /> : null}

        {joinedId && myIndex >= 0 ? (
          <div className="border-2 border-[var(--color-divider)] p-4 mb-4">
            <span className="card-kicker">{t("yourPosition")}</span>
            <p className="font-[var(--font-heading)] font-extrabold text-[42px] leading-none m-0">
              #{myIndex + 1}
            </p>
            <p className="m-0 mt-2 text-[13px] text-muted">
              {t("estimatedWait")}: {waitEstimate(myIndex, free).label}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            <div className="field">
              <label htmlFor="q-name">{t("name")}</label>
              <input
                id="q-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="q-phone">{t("phone")}</label>
              <input
                id="q-phone"
                className="input"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="q-size">{t("partySize")}</label>
              <input
                id="q-size"
                className="input"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </div>

            {joinError ? (
              <p className="tag tag-outline self-start" role="alert">
                {joinError.message}
              </p>
            ) : null}

            <button className="btn btn-primary justify-center" disabled={!name} onClick={join}>
              {t("join")}
            </button>
          </div>
        )}

        <hr className="hr" />

        <h6 className="text-muted">{t("queueWait")}</h6>
        <ul className="list-none p-0 m-0">
          {waiting.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 py-2 border-b border-[var(--color-divider)]"
            >
              <span className="w-8 text-muted text-[13px]">#{i + 1}</span>
              <span className="flex-1 min-w-0 truncate">
                {entry.id === joinedId ? <strong>{entry.name}</strong> : entry.name}
              </span>
              <span className="text-muted text-[13px]">×{entry.party_size}</span>
              <span className="tag tag-neutral">{waitEstimate(i, free).label}</span>
            </li>
          ))}
          {waiting.length === 0 && queue ? (
            <li className="py-2 text-muted text-[13px]">No one waiting — walk right in.</li>
          ) : null}
        </ul>

        <p className="text-[12px] text-muted mt-4">
          Waits are shown as a range on purpose. A restaurant cannot know the
          minute a table frees, and a promise it misses costs more than a vague
          one it keeps.
        </p>

        <Link href="/menu" className="btn btn-ghost no-underline mt-2">
          {t("simulateReady")}
        </Link>
      </main>
    </>
  );
}
