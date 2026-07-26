# Anumaan — Functional Requirements Document (v2)

Based on: `Anumaan_PRD_v2.md` · VibeAthon 6.0 Smart Restaurant Management System
Status: v2 — merges the agentic functional requirements (formerly a standalone addendum) and adds the Evaluation & QA section
Date: July 25, 2026

**How to use this document**: every requirement below traces to a PRD section (given in brackets). Where a rule is an engineering default rather than a research finding, it's marked **[Assumption]**. Nothing here introduces a feature outside the PRD's scope.

---

## 1. Actors & Roles — unchanged from v1

| Role | Access | Auth method |
|---|---|---|
| Owner/Manager | Full dashboard incl. Agent Activity Log, Ask Anumaan, Compliance Log, Settings | Email+password+OTP, or Google OAuth |
| Staff/Kitchen | Kitchen Board (incl. agent-originated tasks), Table Status Board, Availability Toggle Grid | Email+password+OTP (owner-provisioned) |
| Customer (guest) | Menu, Cart, Order Status, Queue, Bill | None required; OTP only if opting into notifications |

### 1.1 Role-Permission Matrix — unchanged, plus one row

| Screen/Action | Owner | Staff | Customer |
|---|---|---|---|
| (all rows from v1 unchanged) | | | |
| Approve/reject agent proposals | ✅ | ❌ | ❌ |
| View Agent Activity Log | ✅ | ❌ | ❌ |

---

## 2. Auth & Access — unchanged from v1 (FR-A1–FR-A8)

---

## 3. Digital Menu & Live Availability — unchanged from v1 (FR-M1–FR-M5)

---

## 4. Reservations, Queueing & Table Management — unchanged from v1 (FR-Q1–FR-Q7)

---

## 5. Ordering & Billing — unchanged from v1 (FR-O1–FR-O8)

---

## 6. Owner/Manager Dashboard — unchanged from v1 (FR-D1–FR-D7), plus:

| ID | Requirement |
|---|---|
| FR-D8 | Dashboard shall include an Agent Activity Log tab listing every `AgentAction` record (agent name, proposal, basis, status, timestamp, resulting change), newest first, filterable by agent and by status. |

---

## 7. AI / Predictive Layer & Agentic Capabilities (Platinum) — merged

**[PRD §6.4, §10]** — this section now contains both the base (v1) forecasting requirements and the agentic (formerly addendum) requirements, since they share the same underlying data and should be read together.

### 7.1 Base predictive layer (unchanged from v1)

| ID | Requirement |
|---|---|
| FR-P1 | System computes a per-item, per-day demand forecast: `forecast_qty(item, weekday) = seeded_avg_qty(item, weekday) × trend_factor`, where `trend_factor` is the ratio of last-7-days actual sales to the seeded baseline for the same weekday. If no seed data exists for an item, forecast is omitted, not fabricated. |
| FR-P2 | System computes stockout risk per InventoryItem: if `current_stock < forecast_consumption_remaining_today`, flag as at-risk, with an estimated time-of-day based on today's consumption rate so far. |
| FR-P3 | System generates a Daily Briefing (morning + evening) via LLM narration over FR-P1/FR-P2 outputs plus yesterday's actuals; the LLM is instructed to narrate, not invent, numbers, and the prompt includes the underlying figures for traceability. |
| FR-P4 | "Ask Anumaan" free-text Q&A answers only from the restaurant's own structured data; must respond "I don't have enough data to answer that" rather than fabricate when data doesn't cover the question. |
| FR-P5 | Every AI-generated number or claim on-screen is labeled with its basis (e.g., "based on your last 7 days + seed data"). |
| FR-P6 | With zero seed data and zero order history, the AI layer displays an explicit "not enough data yet" state rather than a fabricated forecast. |

### 7.2 Agentic layer (formerly the standalone addendum's FR-AG series)

| ID | Requirement |
|---|---|
| FR-AG1 | System shall maintain an Agent Activity Log (see FR-D8) recording every agent proposal, its basis, its approval/rejection status, timestamp, and resulting action (if any). |
| FR-AG2 | Prep & Forecast Agent shall generate a draft prep checklist and, if applicable, a draft restock note each morning before service, using `read_forecast()` and `read_inventory()`, visible on the Owner's Daily Briefing pending approval. |
| FR-AG3 | On Owner approval of a prep checklist, the approved items/quantities shall appear on the Staff/Kitchen Display as assigned tasks via `push_to_staff_board()` — this call shall only ever fire after an approval event is recorded, never before. |
| FR-AG4 | Anumaan Agent shall be able to propose (not silently execute) any of: `toggle_item_availability()`, `notify_queue_entry()`, `update_table_status()` — rendered as an approve/reject card in the same conversational surface as Ask Anumaan (FR-P4). |
| FR-AG5 | Compliance Nudge Agent shall run on a scheduled check (**[Assumption: default cutoff 9pm, configurable]**) using `read_compliance_log()`, and call `notify_owner()` if that day's compliance log (FR-C1) is incomplete — this is the one notify-only class action requiring no approval gate. |
| FR-AG6 | No agent shall be granted a tool that moves money, commits to a supplier, or sends a customer-facing marketing message in v1/v2 — enforced by not building those tools, not by a policy check layered on top of tools that exist. If asked to perform such an action, the relevant agent shall explain it cannot and, where applicable, offer the nearest in-scope alternative (e.g., drafting a restock note instead of placing a supplier order). |

**Acceptance criteria (sample, both subsections)**
- Given a restaurant has 7 days of seeded weekday sales for an item and today matches that weekday, when the Owner opens the Daily Briefing, then the prep-quantity suggestion cites the seeded average and any trend adjustment applied (FR-P1/FR-P3).
- Given the Prep & Forecast Agent drafts a restock note for an at-risk item, when the Owner rejects it, then no restock task is created and the rejection is recorded in the Agent Activity Log with no further action (FR-AG2/FR-AG1).
- Given a request to "order more paneer from our supplier," when the Anumaan Agent processes it, then it does not attempt to call a nonexistent ordering/payment tool and instead offers to draft a restock note (FR-AG6).
- Given the Compliance Nudge Agent's cutoff passes with an incomplete checklist, when no human has acted, then the Owner still receives a notification automatically, with no approval gate (FR-AG5).

---

## 8. Bonus — FSSAI Digital Compliance Log — unchanged from v1 (FR-C1–FR-C3), now monitored by FR-AG5

---

## 9. Notifications — unchanged from v1 (FR-N1–FR-N3)

---

## 10. Non-Functional Requirements — unchanged from v1, plus:

| Category | Requirement |
|---|---|
| Agent auditability *(new)* | Every agent proposal and outcome must be reconstructable from the Agent Activity Log alone — no agent action should be invisible to that log, including auto-executed notify-only actions. |
| Approval-gate enforcement *(new)* | The propose-then-approve boundary (FR-AG2–FR-AG4) must be enforced server-side, identically to role permissions (FR-A8) — a client that skips the UI approval step must still be rejected server-side if no approval record exists. |

---

## 11. Indicative API Surface — extended

All v1 endpoints unchanged, plus:

- `GET /agents/proposals/:restaurantId`, `POST /agents/proposals/:id/approve`, `POST /agents/proposals/:id/reject`
- `GET /agents/activity-log/:restaurantId`
- `POST /agents/ask` (Anumaan Agent entry point, supersedes the v1 `/ai/ask` for anything action-capable; read-only questions may still resolve without a proposal)

---

## 12. Traceability Matrix — updated

| FRD section | PRD section | PS User Story / Tier |
|---|---|---|
| 2. Auth & Access | §6.1, US2 | Silver |
| 3. Menu & Availability | §6.1/6.2 | Silver |
| 4. Reservation/Queue/Tables | §6.1/6.3 | Silver |
| 5. Ordering & Billing | §6.1/6.2 | Silver |
| 6. Owner Dashboard (incl. Activity Log) | §6.3 | Gold |
| 7.1 Base predictive layer | §6.4, §10 | Platinum |
| 7.2 Agentic layer | §6.4, §13 | Platinum (innovation differentiator) |
| 8. FSSAI Compliance | §6.5 | Bonus |
| 9. Notifications | §6.1/6.4 | Silver/Platinum |
| 13. Evaluation & QA | §16 | Cross-cutting (Code Quality / Functionality judging criteria) |

---

## 13. Evaluation & Quality Assurance (new in v2)

Full detail and a runnable 16-case fixture live in `Anumaan_Evals_v1.md` and `anumaan_evals.json` — summarized here for engineering to wire directly into the build:

| Layer | Checks | Grader | Cadence |
|---|---|---|---|
| Deterministic | Forecast formula, wait-time formula, inventory math, permissions, state machines | Rule-based assertion | Every change |
| Grounding | Daily Briefing / Ask Anumaan stay grounded in real data, refuse when data is missing | Reference-grounded LLM-as-judge (calibrated against 15–20 human-graded examples, ≥80% agreement target) | Each major milestone |
| Tool-use / trajectory | Correct tool, correct parameters, approval gate respected | Transcript-centric rule-based check, 5 trials/case, ≥4/5 pass | Each major milestone |
| End-to-end scenario | Full flows (PRD §8) match FRD acceptance criteria | Human grading against golden transcripts | Pre-demo rehearsal |
| Adversarial / red-team | Attempts to push agents outside scope (prompt injection, requests for non-existent tools) | Rule-based refusal detection + human spot-check | Pre-demo rehearsal |

This structure follows Anthropic's published guidance on evaluating agentic systems (eval harness, multi-trial sampling, grader stack, transcript-centric evaluation) rather than an invented process — see `Anumaan_Evals_v1.md` Section 6 for full sourcing.

---

*Everything in this FRD stays inside the scope fixed by the PRD's Non-Goals (§3) — no new features were introduced in this merge. Items marked **[Assumption]** are engineering defaults, not sourced facts; flag any for Jasper to override before build.*
