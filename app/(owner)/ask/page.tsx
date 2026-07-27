"use client";

import type { AskResponse } from "@/app/api/ask/route";
import { useT } from "@/lib/i18n";
import { sendMutation } from "@/lib/useLiveData";
import { useState } from "react";

type Entry = { q: string; a?: AskResponse; error?: string; pending?: boolean };

const PRESETS = [
  "How did we do yesterday?",
  "What should I prep more of today?",
  "How many chicken lollipops did we sell last month?",
];

export default function AskPage() {
  const { t } = useT();
  const [log, setLog] = useState<Entry[]>([]);
  const [input, setInput] = useState("");

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    const index = log.length;
    setLog((prev) => [...prev, { q: question, pending: true }]);

    try {
      const res = await sendMutation<AskResponse>("/api/ask", "POST", { question });
      setLog((prev) =>
        prev.map((e, i) => (i === index ? { q: question, a: res } : e))
      );
    } catch (err) {
      setLog((prev) =>
        prev.map((e, i) =>
          i === index ? { q: question, error: (err as Error).message } : e
        )
      );
    }
  }

  return (
    <>
      <h3>{t("ask")}</h3>
      <p className="text-muted text-[14px] max-w-[62ch]">
        Answers come only from this restaurant&apos;s recorded figures. Ask about
        something that was never sold and it will say so rather than guess — the
        third preset below is there precisely to be tried.
      </p>

      <div className="flex flex-wrap gap-2 my-3">
        {PRESETS.map((p) => (
          <button key={p} className="btn btn-secondary" onClick={() => ask(p)}>
            {p}
          </button>
        ))}
      </div>

      <hr className="hr" />

      <div className="flex flex-col gap-3 max-w-[720px]">
        {log.map((entry, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end max-w-[80%] m-0 px-3 py-2 bg-ink text-ground text-[14px]">
              {entry.q}
            </p>

            {entry.pending ? (
              <p className="self-start max-w-[80%] m-0 px-3 py-2 bg-surface text-[14px] text-muted">
                …
              </p>
            ) : null}

            {entry.a ? (
              <div className="self-start max-w-[85%] flex flex-col gap-1">
                <p className="m-0 px-3 py-2 bg-surface text-[14px]">{entry.a.answer}</p>
                <span className="text-[11px] text-muted px-1">
                  {entry.a.basis} · {entry.a.provider}
                  {entry.a.fellBack ? " (failover)" : ""}
                </span>
              </div>
            ) : null}

            {entry.error ? (
              <p className="tag tag-outline self-start" role="alert">
                {entry.error}
              </p>
            ) : null}
          </div>
        ))}

        {log.length === 0 ? (
          <p className="text-muted text-[13px]">
            No questions yet. Try a preset above.
          </p>
        ) : null}
      </div>

      <form
        className="flex gap-2 mt-5 max-w-[720px]"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your own figures…"
          aria-label={t("ask")}
        />
        <button className="btn btn-primary flex-none" type="submit" disabled={!input.trim()}>
          {t("send")}
        </button>
      </form>
    </>
  );
}
