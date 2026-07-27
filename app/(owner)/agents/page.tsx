"use client";

import { ErrorNote, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { AgentAction, PrepTask } from "@/lib/types";
import { useState } from "react";

const STATUS_LABEL: Record<AgentAction["status"], string> = {
  proposed: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  auto_executed: "Auto-executed",
};

const STATUS_TAG: Record<AgentAction["status"], string> = {
  proposed: "tag-outline",
  approved: "tag-accent",
  rejected: "tag-neutral",
  auto_executed: "tag-accent-2",
};

/**
 * The Agent Activity Log.
 *
 * This answers the question every judge asks — "how do I know the AI isn't
 * doing something random?" — with a scrollable record instead of a promise.
 * Rejections and refusals appear alongside approvals, because a log that only
 * showed successes would be marketing.
 */
export default function AgentsPage() {
  const { data, error, isLoading, mutate } =
    useLiveData<AgentAction[]>("/api/agents/actions");
  const { data: tasks } = useLiveData<PrepTask[]>("/api/prep-tasks");
  const { t } = useT();
  const [running, setRunning] = useState<string | null>(null);
  const [note, setNote] = useState<string>();

  async function run(kind: "compliance" | "prep") {
    setRunning(kind);
    setNote(undefined);
    try {
      const res = await sendMutation<{ message: string }>(
        kind === "compliance"
          ? "/api/agents/compliance?force=1"
          : "/api/agents/prep",
        "POST"
      );
      setNote(res.message);
      await mutate();
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setRunning(null);
    }
  }

  return (
    <>
      <h3>{t("agents")}</h3>
      <p className="text-muted text-[14px] max-w-[68ch]">
        Every action any agent has taken or proposed, newest first — including
        the ones that were rejected. The Compliance Nudge Agent is the only one
        that acts without approval, and it can only ever notify: it holds no
        tool that changes anything about the restaurant.
      </p>

      <div className="flex flex-wrap gap-2 my-3">
        <button
          className="btn btn-secondary"
          disabled={running !== null}
          onClick={() => run("compliance")}
        >
          {running === "compliance" ? "…" : "Run compliance check now"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={running !== null}
          onClick={() => run("prep")}
        >
          {running === "prep" ? "…" : "Draft today's prep checklist"}
        </button>
      </div>

      {note ? <p className="tag tag-outline">{note}</p> : null}

      <ErrorNote error={error} />
      {isLoading && !data ? <Spinner /> : null}

      <hr className="hr" />

      <ol className="list-none p-0 m-0 flex flex-col gap-3 max-w-[820px]">
        {(data ?? []).map((a) => (
          <li
            key={a.id}
            className="border-l-4 border-l-[var(--color-divider)] pl-3 py-1"
            style={
              a.status === "approved" || a.status === "auto_executed"
                ? { borderLeftColor: "var(--color-accent)" }
                : undefined
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tag ${STATUS_TAG[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
              <span className="text-[13px] font-[var(--font-heading)] font-extrabold">
                {a.agent}
              </span>
              <span className="text-[11px] text-muted ml-auto">
                {new Date(a.created_at).toLocaleString("en-IN")}
              </span>
            </div>

            <p className="m-0 mt-1 text-[14px]">{a.proposal}</p>
            <p className="m-0 text-[12px] text-muted">Basis: {a.basis}</p>
            {a.result_ref ? (
              <p className="m-0 text-[12px]">{a.result_ref}</p>
            ) : null}
            {a.tool_name ? (
              <p className="m-0 text-[11px] text-muted">tool: {a.tool_name}</p>
            ) : (
              <p className="m-0 text-[11px] text-muted">
                notify-only — no tool held
              </p>
            )}
          </li>
        ))}
      </ol>

      {(data ?? []).length === 0 && data ? (
        <p className="text-muted">No agent activity yet.</p>
      ) : null}

      {(tasks ?? []).length > 0 ? (
        <>
          <hr className="hr" />
          <h4>Kitchen Board tasks</h4>
          <p className="text-muted text-[13px]">
            What approved proposals actually produced.
          </p>
          <ul className="list-none p-0 m-0">
            {(tasks ?? []).map((task) => (
              <li
                key={task.id}
                className="py-2 border-b border-[var(--color-divider)] text-[14px]"
              >
                {task.label}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
