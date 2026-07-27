# Run sheet — keep this open on a second screen

Six minutes. `DEMO.md` has the full script and the reasoning; this is the
glanceable version for while you are actually talking.

**Before you start:** `/agents` → **Reset demo data**. Four tabs open:
**A** `/menu?table=3` · **B** `/kitchen` · **C** `/briefing` · **D** `/agents`.
Terminal ready with `npm run evals` typed, not run.

---

| By | Tab | Do | Say, in one line |
|---|---|---|---|
| **0:00** | A | Point at Dal Makhani, greyed out | *WhatsApp, a paper pad, and the owner's memory* |
| **0:30** | A | Add **2 × Garlic Naan** → Confirm Order | *No login. Scan and order.* |
| **1:00** | B | Tap the new card twice: New → Preparing → Ready | — |
| **1:30** | **A** | **Do not refresh.** Status strip has moved to Ready | *Two surfaces, one source of truth, no refresh* |
| **2:00** | C | **Refresh.** A proposal is already sitting there | *I haven't touched this screen* |
| **2:30** | C | Read the basis: 2kg vs forecast use 2.3kg | *It checked whether today's forecast fits what's on the shelf* |
| **3:00** | C | Point at ₹18,400 and one forecast basis line | *Computed in SQL. The model describes it, never calculates it* |
| **3:30** | A→C | Show Paneer Tikka still on sale, come back, **Approve** | *Note what hasn't happened. Nothing.* |
| **4:00** | **A** | Paneer Tikka now reads **Sold out** | *Noticed, reasoned, waited, then acted* |
| **4:20** | C | Ask Anumaan → **"Order more paneer from our supplier"** | *No such tool exists. Refused in code, before the model runs.* |
| **4:45** | D | Approved 86 · rejected supplier · compliance notify-only | *We log refusals too* |
| **5:15** | — | `npm run evals` | *16 cases from the spec file we wrote first* |
| **5:45** | — | Point at `TRJ-003 5/5`. Stop. | — |

---

## If you are behind

Cut **3:00** (the figures) — the forecast basis also appears on the proposal
card at 2:30. Never cut the approve at 3:30, the log at 4:45, or the evals.

## If something breaks

| Symptom | Do this |
|---|---|
| A page errors | Open `/api/health` — it names the cause |
| Briefing text missing | It has a stored copy and an offline path; carry on |
| No proposal at 2:00 | `/agents` → **Reset**, place one more order, wait ~4s |
| Anything weird | `/agents` → **Reset** puts everything back in ~1 second |

## The three questions to invite

1. *What if it hallucinates a number?* — It can't reach one. Figures are
   computed and handed to the model to narrate. Ask about a dish we've never
   sold; it refuses.
2. *What stops it acting alone?* — No code path from any trigger to the
   execution function. A test asserts the menu is untouched while a proposal
   is pending.
3. *Is it predicting or just a threshold?* — A threshold fires when stock drops
   below a number. This fires when *today's forecast demand* exceeds what is
   left. Paneer is at 2kg and nothing has gone wrong yet.
