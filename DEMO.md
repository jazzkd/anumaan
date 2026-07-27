# Anumaan — six-minute demo script

**URL:** https://anumaan-vibeathon.vercel.app

Rehearse on the deployed URL, never localhost. If it has not been shown working
on that URL, it does not count.

---

## Before you start

1. Open `/agents` → **Reset demo data**. Confirm it says what it restored.
2. Open four tabs, in this order, and leave them open:
   - **A** `…/menu?table=3` — customer, phone-width window if you can
   - **B** `…/kitchen` — kitchen display
   - **C** `…/briefing` — owner
   - **D** `…/agents` — Agent Activity Log
3. Have a terminal ready in the repo with `npm run evals` typed but not run.
4. Check `/api/health` returns `database.ok: true`.

**If the network dies:** set `LLM_PROVIDER=canned` and the whole product still
works — the briefing, Ask, and the agent all have deterministic paths. Say so
out loud if it happens; it is a design feature, not a save.

---

## 0:00–1:00 · The problem, and a diner orders

> "An independent restaurant in India runs on a WhatsApp group, a paper KOT pad,
> and the owner's memory. Petpooja and Posist digitise the recording of that.
> Nobody ships an agent that notices a problem and proposes a fix. That's what
> we built."

**Tab A.** Scanning the QR on table 3 opens this — no login, that's deliberate.

- Point out the veg/non-veg marks (the real FSSAI symbol).
- Point out **Dal Makhani greyed out, "Sold out"** — that's live shared state.
- Add **2 × Garlic Naan** → Cart → **Confirm Order**.

Lands on the order status screen. Leave it visible.

---

## 1:00–2:00 · The kitchen advances it, and the diner's screen follows

**Tab B.** The new order is in the **New** column.

- Tap it once → **Preparing**. Tap again → **Ready**.
- **Switch to Tab A without refreshing.** The status strip has moved to Ready.

> "Two surfaces, one source of truth. No refresh — this polls every two seconds.
> We chose polling over websockets on purpose: this is the moment the demo turns
> on, and it isn't riding on something we'd be debugging at 3am."

**Tab B → Availability.** 86 any item. **Tab A** greys it out within ~2 seconds.

---

## 2:00–3:00 · The owner's briefing, grounded

**Tab C.**

> "Yesterday's revenue: ₹18,400. That number is computed in SQL. The model is
> handed it and told to describe it — it never does arithmetic."

Point at the forecast table and read one basis line aloud:

> "Garlic Naan, 30 expected — *Monday average of 30 over 4 weeks × trend 0.98*.
> Every AI-adjacent number in this product prints the arithmetic that produced
> it. And the history is synthetic, which the briefing says out loud."

---

## 3:00–4:30 · The agent proposes, you approve — **the moment**

**Tab C → Ask Anumaan.** Click **"Handle the item that's about to run out."**

A proposal card appears. Read it out:

> "It's proposing to 86 Paneer Tikka. The basis: *Paneer is at risk with 2kg in
> stock against forecast use of 2.3kg, and Paneer Tikka depends on it.* Note
> what hasn't happened — nothing. It drafted this and stopped."

**Switch to Tab A.** Paneer Tikka is still available. Come back.

Press **Approve.**

- The card becomes "Approved" with **what actually changed**.
- **Switch to Tab A.** Paneer Tikka now reads **Sold out**.

> "That's the whole product in fifteen seconds. It noticed, it proposed, it
> showed its reasoning, it waited, and only then did it act."

**Now the one to invite them to try.** Click **"Order more paneer from our
supplier."**

> "It refuses. Not because we filtered it — because no such tool exists. We
> never built one that spends money or contacts anyone outside this building.
> And that refusal isn't the model's judgement: requests for capabilities we
> don't have are rejected in code before the model is ever called. We measured
> the alternative — told only in the prompt, it agreed in words and proposed a
> restock note anyway, three times out of three."

*Offer them the keyboard here if they seem sceptical. It survives being poked.*

---

## 4:30–5:15 · The audit trail

**Tab D.**

> "Every action any agent has taken or proposed. Newest first."

Point out three rows:

1. Your **approved** 86 — with the basis and what changed.
2. The **rejected** discount attempt, if you ran one — *"we log refusals too. A
   trail that only showed successes would be marketing."*
3. The **Compliance Nudge Agent**, auto-executed, `notify-only — no tool held`.

> "This one acts without approval. It's allowed to because it holds no tools at
> all — it can only notify. Autonomy is safe here because there's nothing it
> could do, not because a rule says it mustn't."

---

## 5:15–6:00 · Evals

Terminal:

```bash
npm run evals
```

> "Sixteen cases, read straight out of the spec file we wrote before any code.
> Thirteen pass, three are end-to-end flows we grade by hand — and they print as
> MANUAL, not as passing, because a suite that marks its own unverified cases
> green is worse than no suite."

Point at `TRJ-003 5/5` and stop there.

---

## Questions you should want them to ask

**"What if the AI hallucinates a number?"**
It cannot reach one. The figures are computed in SQL and TypeScript and handed
to the model in its prompt; it is instructed to narrate, never to calculate.
GND-001 asserts ₹18,400 appears unaltered. Ask it about a dish we've never
sold — it says it has no records.

**"What stops it doing something destructive?"**
Three layers. The tool doesn't exist. Requests for capabilities we don't have
are refused in code before the model runs. And the approval gate is in the route
handler, so skipping the UI doesn't help — plus re-approving returns 409, so a
replay can't fire the same side effect twice.

**"Is this actually deployed?"**
Everything you've seen is the deployed URL. `npm run smoke -- <url>` runs 69
assertions against production.

**"What would you do next?"**
Auth UI — the guard is written and tested, `AUTH_ENABLED` turns it on, but we
cut the login screens to protect the agent layer. Then Realtime instead of
polling, and real per-item photography.

---

## Time discipline

The agent moment is at 3:00. If you are running long, cut the queue screen and
the bill screen — not the agent, not the log, not the evals.
