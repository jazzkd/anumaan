"use client";

import { useT } from "@/lib/i18n";
import { sendMutation } from "@/lib/useLiveData";
import type { AgentAction } from "@/lib/types";
import { useState } from "react";

/**
 * The propose → approve card. This is the demo's strongest moment, so it says
 * three things plainly: what is proposed, on what basis, and that nothing has
 * happened yet.
 *
 * After a decision the buttons are replaced by what actually resulted — not a
 * restatement of the intent. "Dal Makhani is now sold out on the customer
 * menu" is a claim the audience can go and check.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(undefined);
    try {
      const updated = await sendMutation<AgentAction>(
        `/api/agents/${current.id}/decide`,
        "POST",
        { decision }
      );
      setCurrent(updated);
      onDecided?.(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pending = current.status === "proposed";

  return (
    <div className="card elev-sm border-l-4 border-l-accent max-w-[620px]">
      <span className="card-kicker">
        {t("agentProposal")} · {current.agent}
        {/* Named on purpose. "Drafted by groq" is checkable evidence that a
            model reasoned about this, where an unattributed card could just as
            easily be a hard-coded string. */}
        {provider ? (
          <span className="text-muted"> · drafted by {provider}</span>
        ) : null}
      </span>

      <span className="card-title">{current.proposal}</span>

      <p className="card-body m-0">
        <span className="text-muted">Basis: </span>
        {current.basis}
      </p>

      {pending ? (
        <>
          <p className="text-[12px] text-muted m-0">
            Nothing has happened yet. This runs only if you approve it.
          </p>
          <span className="flex gap-2 mt-1">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => decide("approve")}
            >
              {busy ? "…" : t("approve")}
            </button>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => decide("reject")}
            >
              {t("reject")}
            </button>
          </span>
        </>
      ) : (
        <span className="flex flex-col gap-1">
          <span
            className={`tag self-start ${
              current.status === "approved" ? "tag-accent" : "tag-neutral"
            }`}
          >
            {current.status === "approved"
              ? "Approved"
              : current.status === "rejected"
                ? "Rejected"
                : "Auto-executed"}
          </span>
          {current.result_ref ? (
            <span className="text-[13px]">{current.result_ref}</span>
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
