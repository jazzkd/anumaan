/**
 * Capability boundary, enforced before the model is ever called.
 *
 * The system prompt already tells the agent it cannot order from suppliers or
 * apply discounts. Measured across trials, it obeyed the words and then
 * proposed a restock note anyway — three times out of three. A prompt is a
 * strong prior, not a guarantee, and TRJ-003 is a 5/5 case.
 *
 * So the guarantee lives here instead. A request that asks for a capability
 * this product does not have is refused deterministically and never reaches
 * the model, which means:
 *
 *   - the refusal cannot vary between runs;
 *   - no quota is spent being told no;
 *   - the claim we make to a judge — "it cannot do this" — is true of the
 *     system, not just usually true of the model.
 *
 * Defence in depth, not replacement: the prompt rules stay, the tool registry
 * still contains no such tool, and this catches the request first.
 */

export type ScopeVerdict =
  | { inScope: true }
  | { inScope: false; capability: string; reply: string };

const SUPPLIER =
  /\b(order|re-?order|purchase|buy|procure|source|restock)\b[^.?!]{0,40}\b(from|with|through|via)?\s*(our|the|a)?\s*(supplier|vendor|wholesaler|distributor|market)\b/i;
const SUPPLIER_CONTACT =
  /\b(call|phone|email|message|contact|notify)\b[^.?!]{0,30}\b(supplier|vendor|wholesaler|distributor)\b/i;
const DISCOUNT =
  /\b(discount|comp\s+(the|this|their)|on the house|free of charge|waive|write off)\b/i;
const REFUND = /\b(refund|charge ?back|reverse the (payment|charge)|return the money)\b/i;
const PRICE_CHANGE =
  /\b(change|update|set|raise|increase|lower|reduce|cut|drop)\b[^.?!]{0,25}\b(price|prices|pricing|rate)\b/i;
const PAYMENT = /\b(charge|bill)\b[^.?!]{0,20}\b(card|upi|account)\b|\bmove money\b|\btransfer\b/i;
const COVERT =
  /\bwithout (telling|informing|notifying|asking)\b|\bdon'?t tell\b|\bkeep (it|this) (quiet|secret)\b|\bbehind (his|her|their|the owner'?s) back\b/i;

const CANNOT =
  "I have no tool that can do this — not a restricted one, none at all.";

export function checkScope(request: string): ScopeVerdict {
  if (COVERT.test(request)) {
    return {
      inScope: false,
      capability: "acting without the owner's knowledge",
      reply: `I won't act without you knowing. Every action I can take is proposed to you first and recorded in the Agent Activity Log — that gate is the point of me, so there is no version of this I can do quietly.`,
    };
  }

  if (DISCOUNT.test(request) || REFUND.test(request) || PAYMENT.test(request)) {
    return {
      inScope: false,
      capability: "moving money",
      reply: `${CANNOT} I cannot apply discounts, issue refunds, or move money in any form. Those were deliberately never built, so this is not something an approval could unlock. You'd need to do it at the till.`,
    };
  }

  if (SUPPLIER.test(request) || SUPPLIER_CONTACT.test(request)) {
    return {
      inScope: false,
      capability: "contacting a supplier",
      reply: `${CANNOT} I cannot contact a supplier or place an order — nothing I do reaches outside this restaurant. If it would help, ask me to draft a restock note and I'll put a line on the Kitchen Board for you to act on. That writes a note and nothing more.`,
    };
  }

  if (PRICE_CHANGE.test(request)) {
    return {
      inScope: false,
      capability: "changing prices",
      reply: `${CANNOT} I cannot change prices. I can take an item off the menu if it can't be made, but what it costs is your decision to make in Settings.`,
    };
  }

  return { inScope: true };
}
