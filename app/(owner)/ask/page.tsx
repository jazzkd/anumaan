"use client";

import type { AskResponse } from "@/app/api/ask/route";
import type { ProposeResponse } from "@/app/api/agents/propose/route";
import { ProposalCard } from "@/components/owner/ProposalCard";
import { useT } from "@/lib/i18n";
import { sendMutation } from "@/lib/useLiveData";
import type { AgentAction } from "@/lib/types";
import { useState } from "react";

type Entry = {
  q: string;
  provider?: string;
  answer?: string;
  meta?: string;
  actions?: AgentAction[];
  error?: string;
  pending?: boolean;
};

/**
 * Two different things share this panel, and the distinction matters:
 *
 *  - a QUESTION goes to /api/ask, which has no tools and cannot change
 *    anything;
 *  - a REQUEST TO ACT goes to /api/agents/propose, which returns proposals
 *    that a human must approve.
 *
 * Keeping them on separate endpoints is what stops a question from quietly
 * becoming an action, and it is also the architectural half of ADV-002:
 * customer free text reaches neither.
 */
const PRESETS: { label: string; mode: "ask" | "act" }[] = [
  { label: "How did we do yesterday?", mode: "ask" },
  { label: "How many chicken lollipops did we sell last month?", mode: "ask" },
  { label: "Handle the item that's about to run out", mode: "act" },
  { label: "Order more paneer from our supplier", mode: "act" },
];

export default function AskPage() {
  const { t } = useT();
  const [log, setLog] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"ask" | "act">("ask");

  async function send(question: string, asMode: "ask" | "act") {
    if (!question.trim()) return;
    setInput("");
    const index = log.length;
    setLog((prev) => [...prev, { q: question, pending: true }]);

    const update = (entry: Entry) =>
      setLog((prev) => prev.map((e, i) => (i === index ? entry : e)));

    try {
      if (asMode === "ask") {
        const res = await sendMutation<AskResponse>("/api/ask", "POST", {
          question,
        });
        update({ q: question, answer: res.answer, meta: `${res.basis} · ${res.provider}` });
      } else {
        const res = await sendMutation<ProposeResponse>(
          "/api/agents/propose",
          "POST",
          { request: question }
        );
        update({
          q: question,
          answer: res.reply,
          actions: res.actions,
          provider: res.provider,
          meta:
            res.actions.length === 0
              ? `No action proposed · logged · ${res.provider}`
              : `${res.actions.length} proposal(s) awaiting your approval · ${res.provider}`,
        });
      }
    } catch (err) {
      update({ q: question, error: (err as Error).message });
    }
  }

  return (
    <>
      <h3>{t("ask")}</h3>
      <p className="text-muted text-[14px] max-w-[68ch]">
        Questions are answered from recorded figures only. Requests to act are
        answered with a <strong>proposal</strong> — the agent drafts it, shows
        its basis, and waits. Nothing runs until you approve it, and that is
        enforced on the server, not by hiding a button.
      </p>

      <div className="flex flex-wrap gap-2 my-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`btn ${p.mode === "act" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => send(p.label, p.mode)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted">
        The last two are worth trying in front of a sceptic: one produces an
        approval gate, the other a refusal — the agent has no supplier tool to
        reach for.
      </p>

      <hr className="hr" />

      <div className="flex flex-col gap-4 max-w-[760px]">
        {log.map((entry, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end max-w-[80%] m-0 px-3 py-2 bg-ink text-ground text-[14px]">
              {entry.q}
            </p>

            {entry.pending ? (
              <p className="self-start m-0 px-3 py-2 bg-surface text-[14px] text-muted">
                …
              </p>
            ) : null}

            {entry.answer ? (
              <div className="self-start max-w-[85%] flex flex-col gap-1">
                <p className="m-0 px-3 py-2 bg-surface text-[14px]">{entry.answer}</p>
                {entry.meta ? (
                  <span className="text-[11px] text-muted px-1">{entry.meta}</span>
                ) : null}
              </div>
            ) : null}

            {(entry.actions ?? []).map((action) => (
              <ProposalCard key={action.id} action={action} provider={entry.provider} />
            ))}

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
        className="flex flex-wrap gap-2 mt-5 max-w-[760px]"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, mode);
        }}
      >
        <div className="seg" role="group" aria-label="Mode">
          {(["ask", "act"] as const).map((m) => (
            <label key={m} className="seg-opt">
              <input
                type="radio"
                name="ask-mode"
                checked={mode === m}
                onChange={() => setMode(m)}
              />
              {m === "ask" ? "Ask" : "Propose"}
            </label>
          ))}
        </div>
        <input
          className="input flex-1 min-w-[220px]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "ask" ? "Ask about your own figures…" : "Ask the agent to handle something…"
          }
          aria-label={t("ask")}
        />
        <button className="btn btn-primary flex-none" type="submit" disabled={!input.trim()}>
          {t("send")}
        </button>
      </form>
    </>
  );
}
