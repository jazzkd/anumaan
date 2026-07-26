# Anumaan · अनुमान

Predictive, agentic restaurant operations for small Indian restaurants. One
source of truth across three surfaces — a scan-to-order customer PWA, a kitchen
display, and an owner's dashboard — plus an agent layer that drafts a decision,
shows its basis, waits for approval, and logs what it did.

**Built for VibeAthon.** Full write-up lands in Phase 7; this README grows with
the build.

## The claim we are careful about

Forecasting is a published formula, not a black box:

```
forecast_qty = seeded_avg_qty × trend_factor
```

The LLM's job is to **narrate** that number, never to compute it. Every AI-
surfaced figure carries the basis it came from. No agent holds a tool that moves
money or contacts a supplier — that is enforced by the absence of the tool, not
by a filter. Only the notify-only Compliance Nudge Agent acts without approval.

Sales history in this build is **synthetic and labelled as such**.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth)
· Vercel. Single app, one deploy target.

## Running it

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + LLM keys
npm run dev
```

Database setup — run in the Supabase SQL editor, in this order:

```
supabase/schema.sql    # tables, enums, RLS policies, auth trigger
supabase/seed.sql      # the prototype's restaurant + 28 days of synthetic history
```

`seed.sql` ends in assertions. If Garlic Naan's Friday average is not exactly 40
or yesterday's revenue is not exactly ₹18,400, it raises rather than leaving an
eval to fail mysteriously later — those two figures are what DET-001 and GND-001
assert against.

## Design system

`design_handoff_anumaan/design-system/styles.css` is the design source of truth.
`app/globals.css` is its Tailwind v4 translation — retune tokens there and the
whole app follows. Modernist: Archivo, `#ec3013` accent on a `#f3f2f2` ground,
radius 0 everywhere.

## Specs in this repo

| File | What it is |
|---|---|
| `Anumaan_PRD_v2.md` | Product requirements |
| `Anumaan_FRD_v2.md` | Functional requirements (FR-* ids referenced in code comments) |
| `anumaan_evals.json` | 16-case eval suite — the runner reads this file directly |
| `Anumaan_Evals_v1.md` | Eval methodology |
| `BUILD_PLAN.md` | Phase-wise build plan |
| `design_handoff_anumaan/` | Design system + interactive prototype |
| `VibeAthon_Deep_Dive_Market_Research.md` | Market research with sourcing |
