# Anumaan — Phase-Wise Build Plan (CTO)

## Context

**Situation.** Spec work is done and it's genuinely good: PRD v2, FRD v2, a 16-case eval suite, a market-research doc with real sourcing, a bound design system (Modernist), and a high-fidelity interactive prototype that already contains a working state machine, an EN/HI translation dictionary, 12 seeded menu items with prices, and the exact agent-proposal copy. **What does not exist is a single line of production code.**

**The schedule problem nobody has said out loud.** PRD §15 lays out a 72-hour plan starting Day 1 (Jul 25) with "scaffold repo, auth, data model" happening that evening. That didn't happen. It is now the morning of Jul 26 — Day 2 — and submission is Jul 27 evening. So this is not a 3-day plan being executed; it is a **~36-hour wall-clock window, of which maybe 26 hours are actually productive** once sleep and the submission deck are subtracted. Every decision below is made against 26 hours, not 72.

**The goal is top 3, not a perfect product.** That's a scoring problem, and it changes what "good engineering" means here. This plan optimizes for: everything demoed actually works live, the differentiator is visible in the first 90 seconds, and nothing is half-built.

---

## 1. The strategic read — where the marginal point comes from

Judging criteria are Innovation, Problem Solving, Code Quality, Functionality, and Deployment. Assume a large fraction of competing teams ship a competent digital menu + order board and stop there. That means:

| Where points are won | Why | What it costs |
|---|---|---|
| **Deployed and working live** | "Deployment" is its own criterion, and a broken live demo zeroes Functionality too. Most hackathon failures are integration failures discovered at hour 34. | Deploy at hour 2, not hour 30 |
| **The agentic layer, demoed live** | Genuine white space — the research establishes Petpooja/Posist/DineOpen have not shipped action-taking agents in India. This is the whole Innovation score. | ~4h |
| **The Agent Activity Log** | This is the sleeper. It answers the question every judge asks — *"how do I know the AI isn't doing something random?"* — with a scrollable audit trail instead of a promise. Cheap to build, disproportionately persuasive. | ~1h |
| **The approval gate as a stated design choice** | Reframes a limitation as judgment. "We deliberately did not build a tool that moves money" is a stronger answer than "our AI is fully autonomous." | ~0h (already the design) |
| **A runnable eval harness** | Almost nobody does this at a hackathon. `npm test` passing 16 cases in front of a judge is the Code Quality criterion, answered in 10 seconds. | ~2h |

Where points are **not** won: feature count, a floor-plan visualizer, Staff/Customers CRUD, real payments. The PS explicitly penalizes clones, so breadth is actively the wrong bet.

**The one-sentence demo narrative to build toward:** *"Anumaan doesn't just show Raj his data — it drafts the decision, shows its reasoning, waits for his approval, and logs what it did."*

---

## 2. Architecture decisions (and why)

**Stack: Next.js 15 (App Router) + TypeScript + Tailwind + Supabase, deployed on Vercel.**

| Decision | Why |
|---|---|
| **Single Next.js app, not API + client split** | One deploy target, one env, one thing that can break. Route Handlers give server-side enforcement, which we *need* — FR-A8 (403 for staff on `/analytics`) and the approval gate are both specified as server-side, and both are eval cases. |
| **Supabase for Postgres + Auth** | Email/password, OTP, and Google OAuth are FR-A1–A8. Hand-building those is ~5 hours that would come straight out of the agentic layer. Supabase gives all three configured, not coded. |
| **Polling first (2s SWR), Realtime as an upgrade** | E2E-001 requires the customer PWA to reflect "ready" *without manual refresh*. Polling satisfies that requirement in 30 minutes and cannot fail. Supabase Realtime is nicer and is a stretch item — do not put the core demo moment on a websocket you debug at hour 30. |
| **Forecast is a pure TypeScript function, never an LLM call** | `forecast_qty = seeded_avg × trend_factor` (FR-P1). DET-001 demands exact match (40 × 1.1 = 44). An LLM cannot be trusted to return 44, and doesn't need to — its job is narration only. This separation *is* the honesty claim in PRD §10. |
| **`AgentAction` table is the spine of the agentic layer** | Every proposal, basis, status, and outcome writes here. It powers the Activity Log (FR-D8), satisfies the auditability NFR, and is what the trajectory evals assert against. Build this table before building any agent. |
| **Approval gate enforced in the route handler, not the UI** | The NFR is explicit: a client that skips the UI approval step must still be rejected server-side. `push_to_staff_board()` checks for an approval record before it executes — it is not enough for the button to be hidden. |

**LLM: Gemini as primary, Groq as failover, canned responses as demo insurance — behind one adapter.**

You asked me to check free options for the duration of the event. Current state:

| Provider | Free tier | Card? | Tool calling | Verdict |
|---|---|---|---|---|
| **Google AI Studio (Gemini Flash)** | 250–1,500 req/day depending on model; 250K TPM | No | Native | **Primary** — matches the PRD, best tool-calling of the free options |
| **Groq (Llama 3.3 70B)** | ~1,000 req/day, OpenAI-compatible, very fast | No | Yes | **Failover + run the evals here** to protect Gemini quota |
| Cerebras | ~1M tokens/day | No | Limited | Backup only |
| OpenRouter free | 50/day | No | Varies | Too low to rely on |

Two consequences that drive real code:
1. **Quota is a live risk.** Gemini 2.5 Flash free tier was reportedly cut to ~250 requests/day in the Dec 2025 adjustment. Dev iteration plus trajectory evals (5 trials × 3 cases = 15 calls per run) will eat that. So: `lib/llm/index.ts` exposes `complete()` and `callWithTools()` over a `LLM_PROVIDER` env var (`gemini | groq | canned`), responses are cached in dev, and **eval runs point at Groq**.
2. **Never let a live API call be a single point of failure on stage.** The last successful Daily Briefing is persisted. If the call fails during the demo, render the cached one with a small "cached" label. A judge will not notice; a spinner-of-death they will.

**Free tiers train on your data.** Irrelevant here (synthetic restaurant data), but worth knowing before this ever becomes real.

---

## 3. Phases

Day 2 (today, ~14h) ends with Bronze + Silver + Gold **deployed and working**. Day 3 (~12h) is entirely differentiator and polish. This ordering is deliberate: if Day 3 goes badly, you still have a live, complete, Gold-tier product to demo.

**Standing rule for every phase below:** a phase's "Exit" is not met by its own criterion alone — unit tests must be green and a full E2E regression (every earlier phase's exit criterion, re-checked on the deployed URL) must still pass before starting the next phase. See §7.

### Phase 0 — Foundation + deploy an empty app (2.5h) · Day 2 AM
**What:** `create-next-app` (TS, Tailwind, App Router). Port `design-system/styles.css` tokens into `tailwind.config.ts` + a globals layer — Archivo, `#ec3013` accent, `#f3f2f2` ground, **radius 0 everywhere**. Supabase project + schema for every PRD §9 entity *including* `AgentAction`. `supabase/seed.sql` carrying the prototype's 12 menu items, tables T1–T8, inventory, staff, compliance checklist. Push to GitHub, connect Vercel, **deploy**.

**Why:** The deploy is the point. Getting a URL live while the app is trivially simple means the deployment pipeline is proven at hour 2, when a failure costs 20 minutes, instead of hour 30 when it costs the competition. Porting tokens now (not later) means every subsequent screen is on-design by default — you never do a "make it pretty" pass.

**Exit:** Public Vercel URL renders a themed page. Supabase has seeded rows.

---

### Phase 1 — Data spine + shared state (2.5h) · Day 2 AM
**What:** Route handlers for menu, orders, tables, inventory, queue. A `useLiveData` hook (SWR, 2s refresh). One `requireRole()` server helper used by every protected route.

**Why:** The cross-surface sync — 86 an item on the Kitchen Display, watch it grey out on the customer menu — is *the* proof of "digitized workflow" (US3) and it only works if all three surfaces read one source of truth. The prototype README is explicit that this must be shared backend state, not per-screen local state. Build the spine before the screens, or you will retrofit it.

**Exit:** Two browser tabs, change in one appears in the other within 2s.

---

### Phase 2 — Three surfaces, Silver tier (6h) · Day 2 midday→evening
**What:** Recreate the prototype's screens against real data.
- **Customer PWA** (mobile-first, no login): Menu Home with veg filter + live "Sold out", Item Detail, Cart, Order Status strip, Queue with wait *range*, Bill with UPI QR.
- **Kitchen Display** (tablet): 4-column order kanban with tap-to-advance, Table Status board, 86 toggle grid.
- **Owner Dashboard** shell: sidebar + Orders, Tables, Inventory tabs.

**Why:** This is Bronze (US1) + Silver (US3) — the non-negotiable scoring floor. Six hours is achievable *only* because the prototype already resolved every layout, interaction, and piece of copy; this is transcription against an API, not design work. Wait time ships as a **range** (DET-002) because false precision is the exact thing a judge probes.

**Exit:** E2E-001 passes by hand — QR → order → kitchen marks ready → customer screen updates, no refresh.

---

### Phase 3 — Auth + Gold dashboard (4h) · Day 2 evening
**What:** Supabase Auth (email/password + OTP; Google OAuth if free). `profiles.role` = owner | staff. Server-side role guard on every owner-only route. Sales & Analytics tab, Compliance Log tab (Bonus), thin Staff + Customers tables.

**Why:** US2 + US4 + Bonus. The 403 enforcement matters beyond the checkbox — DET-003 asserts a staff token hitting `/analytics` gets 403 *regardless of client-side UI state*, and "we enforce this server-side" is a credible answer to a technical judge in a way that a hidden nav link is not.

**Exit:** Deployed. Silver + Gold + Bonus complete. **Sleep here.** Whatever happens tomorrow, you have a full product live.

---

### Phase 4 — Platinum predictive layer (3h) · Day 3 AM
**What:** `lib/forecast.ts` (pure, unit-tested), stockout risk per FR-P2, Daily Briefing via LLM narration over structured figures, Ask Anumaan grounded Q&A, "not enough data yet" empty state, basis labels on every AI number.

**Why:** US5 base. The critical constraint: the LLM receives the computed figures in its prompt and is instructed to narrate, not compute. GND-001 asserts ₹18,400 appears *exactly*; GND-003 asserts it refuses to answer about an item never sold. Grounding isn't a nicety — a fabricated number caught live by a judge is fatal, and refusing well is more impressive than answering everything.

**Exit:** Briefing cites real seeded figures; asking about an unsold item returns a refusal.

---

### Phase 5 — Agentic layer (4h) · Day 3 midday — *the differentiator*
**What:** In PRD §15's priority order:
1. **Compliance Nudge Agent** (~45m) — scheduled check, notify-only, auto-executes, writes to the log. Simplest, and genuinely autonomous.
2. **Agent Activity Log tab** (~45m) — plain-language audit trail, newest first.
3. **Anumaan Agent propose/approve cards** (~1.5h) — `toggle_item_availability`, `notify_queue_entry`, `update_table_status` as proposals with basis text and Approve/Reject. **The strongest demo moment.**
4. **Prep & Forecast Agent → Kitchen Board** (~1h) — draft checklist, on approval `push_to_staff_board()`.

**Why this order:** it is strictly descending value-per-hour and each step is independently demoable. If you have 2 hours instead of 4, you stop after step 3 and still have a complete, honest agentic story. Step 4 is the PRD's own designated first cut.

**Non-negotiables:** every proposal writes an `AgentAction` row *before* approval. No tool exists that moves money or contacts a supplier — FR-AG6 is enforced by absence, not by a filter. If asked to order from a supplier, the agent explains it can only draft a restock note (TRJ-003, and a genuinely good thing to have a judge try).

**Exit:** E2E-002 passes — briefing → approve → task on Kitchen Board → logged.

---

### Phase 6 — Eval harness (2h) · Day 3 afternoon
**What:** A thin runner reading `anumaan_evals.json` — exactly as that file was designed to be used. L1 deterministic (DET-001…005) as unit tests; L3 trajectory (TRJ-001…003) inspecting tool-call sequences over 5 trials against Groq; L5 adversarial (ADV-001, ADV-002) asserting refusal and context isolation. Skip LLM-judge calibration — it costs 3 hours and buys the least here.

**Why:** Two returns. First, regression safety on the last day, when you're tired and most likely to break the forecast. Second and larger: `npm test` printing 16 green cases is the Code Quality criterion answered in ten seconds, and ADV-002 in particular — proving customer free text cannot reach the owner agent's tool context — is an architectural claim, not a prompt-level one.

**Exit:** `npm test` green. Add a case for anything that broke during the build (the suite's own stated intent).

---

### Phase 7 — Demo, docs, submission (3h) · Day 3 evening
**What:** `/api/demo/reset` + a reset button. A written 6-minute demo script. README (problem, architecture, agent guardrail model, how to run, eval results). Submission PPT. **Two full rehearsals on the deployed URL, not localhost.**

**Why:** Judges score what they see. An unrehearsed demo drifts, overruns, and buries the agent moment at minute 8 when attention is gone. The reset endpoint exists because you will demo more than once and cannot re-seed by hand between runs.

**Suggested 6-minute run of show:** customer orders (0:00–1:00) → kitchen advances, customer screen updates live (1:00–2:00) → owner briefing with real figures (2:00–3:00) → **agent proposes 86'ing the stockout item, you approve on stage, it takes effect on the customer menu** (3:00–4:30) → Agent Activity Log showing the auto-executed compliance nudge alongside your approval (4:30–5:15) → `npm test` green (5:15–6:00).

---

## 4. Cut list — decided now, not at 2am

Cut strictly bottom-up: Google OAuth → Staff/Customers tabs → Supabase Realtime (keep polling) → Prep & Forecast push-to-board → Sales charts (numbers without the chart).

**Never cut:** cross-surface live sync · one working agent + approval card · Agent Activity Log · Daily Briefing grounded in real numbers · the deployed URL · README.

**Keep despite looking cuttable:** the Hindi toggle. The full translation dictionary already exists in the prototype — it is ~20 minutes of wiring for a visible India-market credibility signal.

---

## 5. Risk register

| Risk | Mitigation |
|---|---|
| LLM quota exhausted mid-demo | Provider adapter + Groq failover + persisted last-good briefing |
| Realtime sync flakiness on stage | Ship polling; Realtime is a stretch, never the demo path |
| Seed data too thin for a credible forecast | Generate 4 weeks of synthetic weekday sales in `seed.sql`, **clearly labeled synthetic** — PRD §14 flags this as blocking for §10 credibility |
| Deploy breaks late | Deployed at hour 2, then continuously |
| Scope creep from the dashboard's 11 tabs | Tabs 5/6 (Staff, Customers) are static tables by design |

## 6. Open items from PRD §14 — resolved here

- **Gemini key/quota** → resolved: free tier confirmed, plus Groq failover and a canned fallback.
- **Real vs synthetic seed data** → resolved: synthetic, explicitly labeled. Fabricating "real" data would contradict the honesty posture the PRD is built on.
- **Approval-gated demo vs autonomous** → recommend approval-gated. Tapping Approve on stage *is* the differentiator; a fully autonomous run is both riskier and a weaker story.
- **Floor plan visual, colorblind palette** → deferred. Not scored.

---

## 7. Verification

- **Continuous:** `npm test` (L1) on every meaningful change.
- **End of every phase, no exceptions:** before moving to the next phase, run (1) the full unit test suite and (2) an E2E regression pass covering every prior phase's exit criterion, not just the phase just finished — not only on localhost but re-checked against the **deployed URL**. A phase is not "done" until this passes; a broken earlier surface blocks starting the next phase's work. This is what stops Phase 2's live-sync from silently breaking during Phase 3's auth work, discovered only at hour 34.
- **Milestone (end of Phase 5):** L3 trajectory evals, 5 trials each, ≥4/5 (5/5 for TRJ-003).
- **Pre-demo:** full E2E-001/002/003 by hand, plus ADV-001/002 red-team, then two timed rehearsals.
- **Golden rule:** if it hasn't been demonstrated on the deployed URL, it doesn't count as done.

---

## Files to create (representative)

```
app/(customer)/menu, cart, order/[id], queue, bill    — Customer PWA
app/(staff)/kitchen, tables, availability             — Kitchen Display
app/(owner)/briefing, orders, inventory, ask,
            agents, compliance, analytics             — Owner Dashboard
app/api/{orders,menu,tables,inventory}/route.ts       — data spine
app/api/agents/{ask,proposals/[id]/approve}/route.ts  — approval gate (server-side)
lib/forecast.ts        — pure, unit-tested, no LLM      (DET-001)
lib/llm/index.ts       — gemini | groq | canned adapter
lib/agents/{prep,anumaan,compliance}.ts — tool defs; no money/supplier tool exists
lib/auth.ts            — requireRole()                  (DET-003)
supabase/{schema.sql,seed.sql}  — incl. AgentAction + synthetic history
evals/run.ts           — reads anumaan_evals.json
```

Sources for the free-LLM findings: [OpenRouter free LLM API comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/) · [Gemini free tier limits](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits) · [Google rate limits docs](https://ai.google.dev/gemini-api/docs/rate-limits) · [Free LLM API tiers 2026](https://wetheflywheel.com/en/ai-model-access/free-llm-api-tiers-2026/)
