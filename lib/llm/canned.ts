import type { GroundedData } from "../groundedData";

/**
 * The offline responder.
 *
 * `canned` is the demo-day insurance policy — if both free tiers run dry, the
 * whole product still works. That only holds if the offline path obeys the
 * same rule as the model: answer from the data, and refuse when the data does
 * not cover the question. A fallback that answered everything with a generic
 * paragraph would pass GND-001 (the revenue figure is in it) while quietly
 * failing GND-003, and the failure would surface on stage.
 *
 * So this is deterministic grounded logic, not a canned string.
 */

const AGGREGATE_NOUNS =
  /\b(order|orders|revenue|sales|takings|total|turnover|covers|money|earn|earned)\b/i;
const QUANTITY_QUESTION = /\b(how many|how much)\b/i;
const AGGREGATE_QUESTION =
  /\b(yesterday|today|how did we|how are we|doing|so far|this week)\b/i;
const PREP_QUESTION = /\b(prep|prepare|forecast|expect|tomorrow|stock|run out|restock)\b/i;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Menu items named in the question, matched on the full item name so
 *  "chicken lollipops" does not match "Chicken 65". */
function matchedItems(question: string, data: GroundedData): string[] {
  const q = question.toLowerCase();
  return data.itemsOnMenu.filter((name) => q.includes(name.toLowerCase()));
}

export function cannedAnswer(question: string, data: GroundedData): string {
  if (!data.hasHistory) {
    return "There isn't enough recorded data yet for me to answer that.";
  }

  const items = matchedItems(question, data);

  // A question about a specific dish we do sell.
  if (items.length > 0) {
    const name = items[0];
    const sold = data.topSellersYesterday.find((s) => s.name === name);
    const forecast = data.forecasts.find((f) => f.name === name);

    const parts: string[] = [];
    if (sold) {
      parts.push(`${name} sold ${sold.qty} yesterday, worth ${inr(sold.revenue)}.`);
    } else {
      parts.push(`I have no sales recorded for ${name} yesterday.`);
    }
    if (forecast) {
      parts.push(`Today's forecast is ${forecast.forecastQty}, based on its ${forecast.basis.toLowerCase()}.`);
    }
    return parts.join(" ");
  }

  // A quantity question about something that is not on the menu at all. This
  // is GND-003, and the honest answer is that there are no records.
  if (QUANTITY_QUESTION.test(question) && !AGGREGATE_NOUNS.test(question)) {
    return "I don't have any sales records for that — it isn't on the menu, so there's nothing for me to count. I can only answer from what this restaurant has actually sold.";
  }

  if (PREP_QUESTION.test(question)) {
    if (data.forecasts.length === 0) {
      return "There isn't enough history yet to forecast today's prep.";
    }
    const top = data.forecasts
      .slice(0, 3)
      .map((f) => `${f.name} ${f.forecastQty}`)
      .join(", ");
    const risk =
      data.stockouts.length > 0
        ? ` Watch ${data.stockouts[0].name}: ${data.stockouts[0].basis}.`
        : "";
    return `Today's forecast is ${top}, each from its weekday average times a clamped trend factor.${risk}`;
  }

  if (AGGREGATE_QUESTION.test(question) || AGGREGATE_NOUNS.test(question)) {
    const top = data.topSellersYesterday[0];
    return `Yesterday brought in ${inr(data.yesterday.revenue)}${
      data.yesterday.isSynthetic ? " across synthetic demo history" : ""
    }.${top ? ` ${top.name} led on volume at ${top.qty} plates.` : ""} Today so far: ${inr(
      data.today.revenue
    )} across ${data.today.orders} orders.`;
  }

  return "I can only answer from this restaurant's recorded figures — yesterday's sales, today's takings, and the forecast. I don't have data covering that question.";
}
