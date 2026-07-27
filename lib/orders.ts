import type { OrderStatus } from "./types";

/** The kitchen state machine, exactly as the prototype defines it. Pure and
 *  unit-tested because the route handler's guard is only as trustworthy as
 *  this function (DET-005 asserts an illegal jump is rejected). */
export const ORDER_FLOW: readonly OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "served",
] as const;

/** The next legal status, or null if the order is already served. */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(current);
  if (i < 0 || i === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[i + 1];
}

/** Legal iff `to` is exactly one step forward from `from`. Backwards moves and
 *  skips (new → ready) are both rejected — an order that reaches a customer as
 *  "ready" without ever being cooked is the failure this prevents. */
export function isLegalTransition(from: OrderStatus, to: OrderStatus): boolean {
  return nextStatus(from) === to;
}

/** Human-facing labels; kept next to the machine so they cannot drift apart. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};
