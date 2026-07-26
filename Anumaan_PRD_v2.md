# Anumaan — Product Requirements Document (v2)
### The restaurant co-pilot that sees tomorrow's rush today

Prepared for: VibeAthon 6.0 (Smart Restaurant Management System) · Solo build with Claude Code
Author: CPO draft, based on `VibeAthon_Deep_Dive_Market_Research.md`
Status: v2 — merges the agentic architecture addendum and evaluation strategy directly into the PRD
Date: July 25, 2026 (Day 1 of 3)

**"Anumaan"** (अनुमान, Hindi/Urdu for "estimate" or "prediction") is the name because the product's whole differentiated bet is prediction and, as of v2, action — not another digital menu.

**What changed in v2**: the standalone `Anumaan_Agentic_Addendum_v1.md` is now folded into Section 6.4, 8, 10, 13 and 15 below, and a new Section 16 covers the evaluation strategy. Nothing in scope changed — this is a merge for a single source of truth, not a new round of feature creep.

---

## 0. One-line pitch

A digitized front-of-house + back-of-house system for independent Indian restaurants that layers predictive, action-taking AI agents (demand forecasting, waste prediction, staffing guidance — with human-approved execution) on top of the standard menu/order/table/billing workflow — the one thing neither the cheap incumbents (Petpooja) nor the AI-native newcomer (DineOpen) currently offer, and something even the India-market incumbents haven't shipped as of this research.

## 1. Problem Statement

Independent, single-outlet restaurants — ~56% of India's ₹5.69 trillion food services market and growing employer of 8.5M+ people — run on manual processes: no visibility into what's actually in stock, no forecasting so they over-prep (contributing to the 11.9M tons/year of food waste from the Indian food-service sector) or under-staff against demand swings, and no institutional memory once staff churn out (60% annual attrition in the sector). Existing software either serves them shallowly (Petpooja: great billing/aggregator sync, weak analytics) or serves enterprises they aren't (Posist: built for 10+ outlet chains). A newer AI-native entrant, DineOpen, has started serving this exact segment but its AI is conversational (voice/chat ordering) — nobody is giving a solo owner-operator the predictive, "operational insights" layer that a data team would otherwise provide a chain, and no India-specific competitor researched has shipped autonomous, action-taking agents. Full grounding for every claim above is in the research doc, Sections 2–8, and the agentic-specific claims in Section 13 below.

**Cost of not solving it**: margin lost to waste and idle tables, staff burnout from reactive (not planned) staffing, and — for this specific competition — a team that ships "digital menu #47" instead of something judges haven't seen, in a competition that explicitly penalizes clones.

## 2. Goals

**Competition goals:**
1. Score Platinum + Bonus on the official rubric (User Stories 1–5 fully working, plus one bonus feature) — not just claimed, but demoable live.
2. Win specifically on the "Innovation" and "Problem Solving" judging criteria by making the predictive *and agentic* layer real (even if simple) rather than a mocked slide.
3. Win on "Code Quality" and "Deployment" by keeping scope tight enough that everything shipped actually works, rather than five half-built features.

**Product goals (the honest, non-hallucinated version of "if this were real"):**
4. Cut a single restaurant's over-prep waste by giving the owner a same-day, item-level prep quantity suggestion before service starts — and, as of v2, an agent that drafts the actual prep task list, not just the number.
5. Reduce no-show/idle-table revenue loss by digitizing reservation + queue with automatic wait-time estimates.
6. Give an owner-operator, with zero data-analyst headcount, a daily plain-language summary and a set of agents that can act (with approval) on routine operational decisions — the "operational insights" a Posist enterprise customer gets, for free, in three days of solo build.

## 3. Non-Goals

- **Multi-outlet / franchise management.** Posist's turf; requires org-hierarchy, role-inheritance, and cross-location reporting that cannot be responsibly built and demoed solo in 72 hours. Single restaurant only.
- **Delivery aggregator integration (Zomato/Swiggy sync).** The PS explicitly says don't clone a delivery platform; UrbanPiper/Petpooja already own this; out of scope.
- **Native iOS/Android apps.** A mobile-first responsive PWA covers the "modern interface" requirement (User Story 1) without an App Store review cycle we don't have time for.
- **Real payment gateway / merchant settlement integration.** Display a UPI QR/deep link for the bill amount; do not build actual payment reconciliation, refunds, or a merchant account integration.
- **Conversational AI ordering (voice/chat-to-order).** Deliberately left to competitors like DineOpen — building it would make us a clone rather than a distinct product.
- **Historical-data-dependent "real" ML forecasting.** A brand-new demo restaurant has no sales history, so forecasting works from day-one seed data + a transparent heuristic — see Section 10.
- **Any agent action involving real money movement, supplier payment/commitment, or autonomous customer-facing marketing messages.** (New in v2 — see Section 6.4/13.) Too much financial/brand risk to automate without a human approval step in a hackathon build; these tools are simply not built, not gated by a policy layer on top of tools that exist.
- **Fully autonomous execution with no approval step**, for anything that changes what a customer sees or receives, in v1/v2. The one exception is the Compliance Nudge Agent, which only ever *notifies* — see Section 6.4.

## 4. Personas

- **Raj, owner-operator** (primary persona): runs one 30–40 cover casual-dining restaurant or cafe. No dedicated IT or analytics staff. Price-sensitive, time-poor, needs decisions made *for* him (with his sign-off), not more dashboards to interpret.
- **Meena, kitchen/floor staff**: needs a dead-simple order queue and table status view; high turnover means near-zero training time is a real constraint (60% sector attrition), so UI must be self-explanatory in under two minutes — this now includes reading agent-generated tasks on the Kitchen Board.
- **Aditi, customer**: dines in, wants to know what's actually available before ordering, doesn't want to download an app, wants to know how long the wait is.

## 5. Scope Mapped to Hackathon Tiers

| Tier | PS User Story | What we build |
|---|---|---|
| Bronze | US1 — modern, intuitive interface | Shared design system across customer PWA + owner dashboard |
| Silver | US2 — auth | Email/password + OTP for owners/staff; Google OAuth for owners; role-based access (Owner, Staff, Customer-guest) |
| Silver | US3 — digitize workflows | Digital menu, live item availability, smart reservation + queue, order management, billing, customer notifications |
| Gold | US4 — management dashboard | Orders, Tables, Inventory, Staff, Customers, Sales, Analytics — one dashboard, tabbed, plus a new Agent Activity Log tab |
| Platinum | US5 — intelligent features | Demand forecasting, inventory/stockout prediction, smart notifications, operational insights, **and three scoped agents that act on this data with human approval gates** |
| Bonus | Additional innovation | FSSAI digital compliance log, run by an autonomous (notify-only) Compliance Nudge Agent |

## 6. Detailed Requirements

### 6.1 Customer PWA — unchanged from v1
(Menu browsing without login, live availability, cart/order, queue with live wait estimate, bill + UPI display, order-status notifications, optional OTP capture for notifications only.)

### 6.2 Staff / Kitchen Display — unchanged, with one addition
- Kitchen Board now also receives **agent-drafted prep tasks** once the Owner approves them (see 6.4) — rendered identically to any other task, so staff don't need to know or care whether a task came from a human or an agent.

### 6.3 Owner/Manager Dashboard — unchanged, with one addition
- New tab: **Agent Activity Log** — timestamped record of every agent proposal, its basis, approval/rejection status, and resulting action. This is both a real trust feature and a strong demo artifact for judges asking "how do I know the AI isn't doing something random."

### 6.4 AI / Predictive Layer — Platinum (merged v1 + agentic addendum)

**Base layer (unchanged from v1):**
- Demand forecast: expected order volume by hour/item, from day-of-week pattern + seed data (Section 10).
- Inventory/stockout prediction: flags items at risk of running out before close.
- Daily Briefing: plain-language morning/evening summary, LLM-narrated over real structured data only.
- Ask Anumaan: free-text Q&A grounded only in the restaurant's own data; explicitly refuses when data is insufficient rather than guessing.

**Agentic layer (new in v2 — why this is real and not just a buzzword, see Section 13):** the same forecast/briefing/Q&A data now feeds three scoped agents that can propose — and, after approval, execute — actions, instead of only describing them:

1. **Prep & Forecast Agent**: drafts a same-day prep checklist and, when stockout risk is flagged, a restock note. Surfaces on the Owner's Daily Briefing for one-tap approval; once approved, becomes real tasks on the Kitchen Board (6.2).
2. **Anumaan Agent**: the same Ask Anumaan assistant can now propose scoped actions in response to a request — e.g., "86 the item about to run out," "notify the next 3 people in the queue" — rendered as an approve/reject card, never executed silently.
3. **Compliance Nudge Agent**: the one fully autonomous (no approval gate) agent — checks at a configured cutoff whether the FSSAI compliance checklist (6.5) was completed, and notifies the Owner if not. Safe to run unattended because it only ever notifies; it never changes restaurant-facing state.

**Guardrail model**: every agent action is either *notify-only* (auto-executes — Compliance Nudge Agent only) or *propose-then-approve* (drafts, waits for a human tap — the other two). No agent is given a tool that moves money, commits to a supplier, or sends a customer-facing marketing message, in v1/v2 — enforced by simply not building those tools, not by a policy filter sitting on top of tools that exist.

### 6.5 Bonus — FSSAI Digital Compliance Log — unchanged, now agent-monitored
- Daily temperature/cleaning checklist, staff-completed with timestamp, append-only.
- FSSAI license + Food Safety Connect QR code shown on the customer-facing menu page.
- Monitored by the Compliance Nudge Agent (6.4.3) rather than relying on the Owner remembering to check.

## 7. Screens & Information Architecture (for Design)

**Customer PWA**: Menu Home, Item Detail, Cart/Order Review, Order Status, Queue/Wait Screen, Bill/Pay Screen, optional OTP capture sheet. *(Unchanged from v1.)*

**Staff / Kitchen Display**: Order Queue Board (now shows both human- and agent-originated tasks, visually identical), Table Status Board, Menu Availability Toggle Grid.

**Owner/Manager Dashboard**:
1. Home / Daily Briefing — now includes the Prep & Forecast Agent's proposal card as the primary "hero" element, not a separate screen.
2. Orders · 3. Tables · 4. Inventory · 5. Staff · 6. Customers · 7. Sales & Analytics
8. Ask Anumaan — persistent chat-style panel that now also renders agent proposal/approval cards inline with its answers.
9. **Agent Activity Log** *(new)* — full history of agent proposals and outcomes.
10. Compliance Log (Bonus)
11. Settings / Menu Management

**Shared auth screens**: Sign up / Log in, role selection, restaurant setup wizard (doubles as historical-data seeding step, Section 10).

## 8. Core User Flows

Flows A–E are unchanged from v1 (dine-in order, walk-in queue, kitchen fulfillment, owner's morning routine, 86'ing an item). One flow is new:

**Flow F — Agent proposal and approval (new)**: Prep & Forecast Agent generates a draft prep checklist/restock note each morning → appears on Owner's Daily Briefing as a proposal card with its basis shown ("based on today's orders vs. your seeded Friday average") → Owner taps Approve or Reject → on approval, tasks appear on the Kitchen Board and the action is logged in the Agent Activity Log; on rejection, nothing changes and the rejection is logged.

## 9. Data Model

Unchanged entities from v1 (`Restaurant`, `MenuItem`, `Table`, `Order`/`OrderItem`, `Reservation/QueueEntry`, `InventoryItem`, `StaffMember`, `Customer`, `DailySummary`), plus one new entity:

`Restaurant` → `AgentAction` (many: agent name, proposal payload, basis/explanation, status [proposed/approved/rejected/auto-executed], timestamp, resulting change reference) — this is what populates the Agent Activity Log (6.3) and is also what the evaluation suite's trajectory checks (Section 16) validate against.

## 10. AI Feature Spec — Honest Version (extended for agents)

The cold-start problem and the seed-data/heuristic-then-LLM-narration approach are unchanged from v1: forecasting is a transparent formula (`forecast_qty = seeded_avg_qty × trend_factor`), not a black-box model, and the LLM's job is to narrate that number, not invent new ones.

**Extension for agents**: the same honesty rule applies to actions, not just words. An agent proposal must state its basis (Section 6.4), must never claim a tool it doesn't have (there is no supplier-ordering or payment tool — if asked, the agent explains it can only draft a restock note for a human to act on), and must default to proposing rather than executing for anything except the notify-only Compliance Nudge Agent. We will not claim these agents are "autonomous" in the unqualified sense marketed by larger platforms (e.g., Toast IQ's chat-driven direct execution) — ours are deliberately approval-gated, and that's stated as a design choice for a hackathon-stage product, not hidden as a limitation.

## 11. Design Requirements & Guidelines

Unchanged from v1 (mobile-first customer PWA, two-minute rule for staff screens, bilingual-ready, patchy-connectivity tolerance, one consistent design system), plus:
- **Agent proposal cards need a distinct, consistent visual pattern** wherever they appear (Daily Briefing, Ask Anumaan) — clear "this is a suggestion, not a done action" affordance, with visible Approve/Reject controls and the basis/explanation text always visible, never hidden behind a tooltip.
- **The Agent Activity Log should read like a clean audit trail**, not a developer log — plain language, not raw JSON, even though the underlying data is structured.

## 12. Success Metrics — Judging Criteria Mapping

Unchanged table from v1; "Innovation" now explicitly ties to the agentic layer being demoable live (Section 13), and "Functionality" now also covers the approval-gate flow working end-to-end, not just the base forecast.

## 13. Differentiation vs Competitors (updated)

- **vs Petpooja / Posist**: unchanged — not competing on billing depth or multi-outlet scale.
- **vs DineOpen**: unchanged core wedge — predictive/agentic vs. conversational ordering.
- **New grounding for the agentic wedge specifically**: 2026 industry coverage frames this year as the shift from "AI as novelty" to "agentic AI as operational necessity" in restaurants, with Toast (US market) as the clearest reference point — Toast IQ (launched Oct 2025) already takes real-time action from a chat interface, and Toast IQ Grow (May 2026) is a dedicated autonomous marketing agent. Checking whether India-specific competitors have caught up: **Petpooja (65,000+ restaurants) and Restroworks/Posist (20,000+ restaurants) show only "basic" AI integrations as of this research — no evidence of autonomous, action-taking agents.** DineOpen remains conversational, not agentic. This is a genuine, time-limited white space in the India market, not an invented one — full sourcing in the (now-merged) agentic addendum research.

## 14. Open Questions

- **[Design]** Colorblind-safe palette for the Kitchen Board — P0 or P1 polish pass?
- **[Engineering/Jasper]** Gemini API key/quota confirmed for the live demo? (Blocking.)
- **[Jasper]** Real seed data available, or fabricate a clearly-labeled synthetic example? (Blocking for Section 10 credibility.)
- **[Design]** Floor-plan visual for Tables vs. simple list — worth the time? (Non-blocking.)
- **[Jasper, new]** Confirm the approval-gated demo (agent proposes, you tap approve on stage) is the preferred live-demo moment over a fully autonomous run-through — recommended for safety and predictability, but it's your call to override.

## 15. Timeline & Build Plan (72-hour window, Jul 25–27)

- **Day 1 (remainder)**: Design team turns Section 7/11 into low-fidelity screens. Parallel: scaffold repo, auth, data model (including `AgentAction`).
- **Day 2**: Build Silver + Gold end-to-end; deploy early to a public URL.
- **Day 3**: Build Platinum AI layer + agentic layer in this priority order if time is tight — (1) Compliance Nudge Agent + Agent Activity Log (simplest, still genuinely autonomous), (2) Anumaan Agent propose/approve cards (strongest demo moment), (3) Prep & Forecast Agent's push-to-Kitchen-Board wiring (cut first if squeezed, the draft/approval step alone still demonstrates the pattern) — plus Bonus FSSAI log, demo rehearsal, README, and the required submission PPT.

## 16. Evaluation Strategy (new in v2)

Full detail lives in `Anumaan_Evals_v1.md` and the runnable fixture `anumaan_evals.json` — summarized here so the PRD is self-contained on what "we tested this properly" means for this build:

- **Deterministic checks** (forecast formula, permissions, state machines) — rule-based, run on every change, effectively free.
- **Grounding checks** (Daily Briefing, Ask Anumaan) — reference-grounded LLM-as-judge, calibrated against 15–20 human-graded examples before being trusted (≥80% agreement target).
- **Tool-use/trajectory checks** (the three agents) — verifies correct tool, correct parameters, and that the approval gate is respected; run across 5 trials per case since agents are stochastic.
- **End-to-end scenario checks** — the actual click-through flows (Section 8), human-graded against golden transcripts.
- **Adversarial/red-team checks** — attempts to push an agent outside its scope (e.g., "give this table a discount without telling the owner") — must be refused, since the tools to do otherwise simply don't exist.

This structure is borrowed from Anthropic's own published guidance on evaluating agentic systems and current LLM-as-judge practice, not invented for this project — full sourcing in `Anumaan_Evals_v1.md` Section 6.

---

*Every factual claim in this PRD traces to `VibeAthon_Deep_Dive_Market_Research.md` or the sourcing in Section 13/16 above. Where a figure or capability could not be verified, this document says so explicitly rather than asserting it.*
