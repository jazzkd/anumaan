"use client";

import { useT } from "@/lib/i18n";
import { sendMutation } from "@/lib/useLiveData";
import type { AgentAction } from "@/lib/types";
import { useState } from "react";

/**
 * The propose → approve card. This is the demo's strongest moment, so it says
 * four things plainly: what is proposed, on what basis, exactly which tool
 * would run with which arguments, and that nothing has happened yet.
 *
 * The tool call is shown rather than hidden. "It called a tool" is the claim
 * being made, and a card that only shows prose asks an evaluator to take that
 * on trust when we can simply show them the call.
 *
 * After a decision the card stays put and turns into a result. It used to
 * vanish from the pending list the instant you pressed Approve, which is the
 * worst possible moment to remove the thing someone is looking at — you lose
 * the confirmation, and on stage it reads as though the click did nothing.
 */
export function ProposalCard({
  action,
  provider,
  onDecided,
}: {
  action: AgentAction;
  /** Which model drafted it, when the caller knows. */
  provider?: string;
  onDecided?: (updated: AgentAction) => void;
}) {
  const { t } = useT();
  const [current, setCurrent] = useState(action);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string>();
  const [justDecided, setJustDecided] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setBusy(decision);
    setError(undefined);
    try {
      const updated = await sendMutation<AgentAction>(
        `/api/agents/${current.id}/decide`,
        "POST",
        { decision }
      );
      setCurrent(updated);
      setJustDecided(true);
      onDecided?.(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pending = current.status === "proposed";
  const approved = current.status === "approved";

  return (
    <div
      className={`card elev-sm border-l-4 max-w-[640px] ${
        pending ? "border-l-accent" : approved ? "border-l-accent" : "border-l-[var(--color-neutral-400)]"
      }`}
    >
      <span className="card-kicker">
        {t("agentProposal")} · {current.agent}
        {/* Named on purpose. "Drafted by groq" is checkable evidence that a
            model reasoned about this, where an unattributed card could just as
            easily be a hard-coded string. */}
        {provider ? <span className="text-muted"> · drafted by {provider}</span> : null}
      </span>

      <span className="card-title">{current.proposal}</span>

      <p className="card-body m-0">
        <span className="text-muted">Basis: </span>
        {current.basis}
      </p>

      {/* The actual call. Shown so "it called a tool" is demonstrated rather
          than asserted. */}
      {current.tool_name ? (
        <code className="text-[11px] bg-[var(--color-neutral-200)] px-2 py-1.5 block overflow-x-auto">
          {current.tool_name}({formatArgs(current.tool_args)})
        </code>
      ) : (
        <span className="text-[11px] text-muted">
          notify-only — this agent holds no tool
        </span>
      )}

      {pending ? (
        <>
          <p className="text-[12px] text-muted m-0">
            Nothing has run yet. This executes only if you approve it, and the
            check happens on the server.
          </p>
          <span className="flex gap-2 mt-1">
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => decide("approve")}
            >
              {busy === "approve" ? "Running…" : t("approve")}
            </button>
            <button
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => decide("reject")}
            >
              {busy === "reject" ? "…" : t("reject")}
            </button>
          </span>
        </>
      ) : (
        <span className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span className={`tag ${approved ? "tag-accent" : "tag-neutral"}`}>
              {approved
                ? "Approved — executed"
                : current.status === "rejected"
                  ? "Rejected — nothing changed"
                  : "Auto-executed"}
            </span>
            {justDecided ? (
              <span className="text-[11px] text-muted">just now</span>
            ) : null}
          </span>

          {/* What actually changed, not a restatement of the intent. */}
          {current.result_ref ? (
            <span className="text-[13px] font-medium">{current.result_ref}</span>
          ) : null}

          {justDecided && approved ? (
            <span className="text-[11px] text-muted">
              Check the customer menu — the change is already live there.
            </span>
          ) : null}
        </span>
      )}

      {error ? (
        <span className="tag tag-outline self-start" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Compact, readable arguments — the internal bookkeeping keys are noise on a
 *  card someone is reading to make a decision. */
function formatArgs(args: Record<string, unknown> | null): string {
  if (!args) return "";
  return Object.entries(args)
    .filter(([k]) => k !== "reason" && k !== "ingredient")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`)
    .join(", ");
}
