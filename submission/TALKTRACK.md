# How to explain Anumaan

Short sentences. No jargon unless a judge uses it first. When you don't know
something, say so and say what you'd check — that reads as competence, not a
gap.

---

## If someone asks "what is it?" — 20 seconds

> "Small Indian restaurants run on a WhatsApp group and the owner's memory.
> Anumaan is one system across three screens — the diner's phone, the kitchen
> display, and the owner's dashboard. On top of that there's an AI layer that
> watches the numbers and *proposes decisions* the owner approves. It doesn't
> just show him data. It drafts the decision and waits."

If they want one more sentence:

> "The interesting part isn't the ordering. It's that the system notices paneer
> won't last today and says so before anyone runs out."

---

## The three explanations you will actually be asked for

### 1. "How does the forecast work?"

Don't say "machine learning". You'd be describing something you didn't build,
and it's a weaker answer than the truth.

> "We look at what this dish sold on this weekday over the past four weeks —
> Mondays only get compared to Mondays, because a Saturday looks nothing like a
> Tuesday in a restaurant. Then we adjust for whether the last week has been
> busier or quieter than usual. That's it. It's arithmetic, and we print the
> sum next to every number so you can check it."

If they push on why there's no model in it:

> "Because a language model might return a confidently wrong number, and a
> forecast you can't check is worse than none. The model's only job here is to
> put our numbers into a sentence."

If they ask about the clamp:

> "We cap the adjustment at plus or minus thirty percent. Over a four-week
> window one freak week can suggest tripling your prep, and a forecast that
> wastes a whole service costs more trust than it ever buys back."

### 2. "What does the agent actually do?"

> "It watches stock fall as orders come in. When what we expect to sell today
> would need more paneer than we have left, it raises a proposal — take Paneer
> Tikka off the menu before a diner orders something the kitchen can't make.
>
> It doesn't do it. It proposes it, shows the two numbers it compared, and
> waits for Raj. He taps approve, and *then* it comes off the customer menu."

The distinction to make explicit, because it's the whole product:

> "Most 'AI features' summarise what already happened. This one takes a
> position on what to do next — and then asks."

### 3. "What stops it doing something stupid or dangerous?"

Three layers. Say them in this order; each is stronger than the last.

> "First: it has no tool that spends money, gives a discount, issues a refund,
> or contacts a supplier. Not blocked — never built. There's nothing there to
> jailbreak.
>
> Second: if you ask for one of those anyway, the request is refused in code
> before the AI is even called. It never sees it.
>
> Third: the approval gate is on the server, not in the interface. Hiding a
> button isn't security. If you bypassed our UI entirely and sent the request
> yourself, it would still be refused."

---

## The story worth telling if you get the chance

This one lands with technical judges because it is an admission, and it shows
you tested your own claims rather than assuming them.

> "We told the agent in its instructions that it couldn't order from suppliers.
> It agreed — it literally replied 'I have no capability to contact suppliers'
> — and then proposed a restock note anyway. Three times out of three.
>
> So we stopped relying on the instruction. That rule now lives in code that
> runs before the model is called. A prompt is a strong hint. It isn't a
> guarantee, and we could prove it wasn't."

---

## Questions you might not have an answer ready for

**"Is this real data?"**
> "No, and we say so on the screen. It's twenty-eight days of synthetic
> history, flagged as synthetic in the database and in the briefing text.
> Making up 'real' sales figures would undercut the honesty everything else
> here is built on."

**"Is there a login?"**
> "The role checks are written and tested — a staff account gets a 403 from an
> owner-only endpoint, enforced on the server. We cut the login screens to
> protect the agent layer, and one environment variable turns every guard on.
> That was a scope decision, not an oversight."

**"How is this different from Petpooja or Posist?"**
> "They digitise the recording — billing, inventory, orders — and they do it
> well. None of them ship an agent that acts. That's the gap we went for."

**"Could this actually be used tomorrow?"**
> "The ordering, kitchen and inventory flows, yes. Before a real restaurant
> used it you'd want the login screens, real photography, and a payments
> integration we deliberately didn't build."

**"What would you do next?"**
> "Auth screens first, since the enforcement is already there. Then the agent
> watching more than stock — table turn times, staffing against forecast."

**Anything you don't know:**
> "I don't know — let me check." Then check it. Judges remember the person who
> didn't bluff.

---

## Words to avoid

| Don't say | Say instead |
|---|---|
| "AI-powered" | "It proposes, you approve" |
| "Machine learning" | "Weekday average times a trend factor" |
| "Fully autonomous" | "It acts only after approval — except the compliance one, which can only notify" |
| "Real-time" | "It updates in about two seconds, no refresh" |
| "Cutting-edge / revolutionary" | Nothing. Show the thing instead. |

The strongest line you have is not a claim. It's *"watch — I haven't touched
this screen."*
