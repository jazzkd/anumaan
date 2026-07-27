import { describe, expect, it } from "vitest";
import { ORDER_FLOW, isLegalTransition, nextStatus } from "./orders";
import type { OrderStatus } from "./types";

describe("order state machine", () => {
  it("advances one step at a time through the full flow", () => {
    expect(nextStatus("new")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("ready");
    expect(nextStatus("ready")).toBe("served");
  });

  it("has no step past served", () => {
    expect(nextStatus("served")).toBeNull();
  });

  it("rejects skipping a step (DET-005)", () => {
    expect(isLegalTransition("new", "ready")).toBe(false);
    expect(isLegalTransition("new", "served")).toBe(false);
    expect(isLegalTransition("preparing", "served")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isLegalTransition("ready", "preparing")).toBe(false);
    expect(isLegalTransition("served", "new")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    for (const s of ORDER_FLOW) {
      expect(isLegalTransition(s, s)).toBe(false);
    }
  });

  it("accepts exactly the forward steps and nothing else", () => {
    const legal: [OrderStatus, OrderStatus][] = [];
    for (const from of ORDER_FLOW) {
      for (const to of ORDER_FLOW) {
        if (isLegalTransition(from, to)) legal.push([from, to]);
      }
    }
    expect(legal).toEqual([
      ["new", "preparing"],
      ["preparing", "ready"],
      ["ready", "served"],
    ]);
  });
});
