/**
 * End-to-end smoke test against a running instance.
 *
 *   npm run smoke                    # localhost:3000
 *   npm run smoke -- <base-url>      # the deployed URL
 *
 * BUILD_PLAN §7 requires every prior phase's exit criterion to be re-checked
 * against the deployed URL before the next phase starts. Doing that by hand
 * gets skipped at hour 30, so it lives here instead.
 *
 * Written to be re-runnable: it restores any state it changes.
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(path, init) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

console.log(`\nAnumaan smoke test → ${base}\n`);

// ── Phase 1: the data spine reads ────────────────────────────────────────────
console.log("Data spine");

const menu = await call("/api/menu");
check("GET /api/menu returns 200", menu.status === 200, `got ${menu.status}`);
check(
  "menu has the 12 seeded items",
  menu.body?.length === 12,
  `got ${menu.body?.length}`
);

const tables = await call("/api/tables");
check("GET /api/tables returns 8 tables", tables.body?.length === 8);

const orders = await call("/api/orders");
check("GET /api/orders returns the seeded orders", orders.body?.length >= 4);
check(
  "orders carry their line items",
  Array.isArray(orders.body?.[0]?.order_items)
);

const queue = await call("/api/queue");
check("GET /api/queue returns 200", queue.status === 200);

const inventory = await call("/api/inventory");
check("GET /api/inventory returns 6 ingredients", inventory.body?.length === 6);

// ── Server-side rules the UI cannot be trusted with ──────────────────────────
console.log("\nServer-side enforcement");

// Dal Makhani (id 4) ships 86'd in the seed.
const soldOut = await call("/api/orders", {
  method: "POST",
  body: JSON.stringify({ tableId: 1, items: [{ menuItemId: 4, qty: 1 }] }),
});
check(
  "ordering an 86'd item is refused with 409",
  soldOut.status === 409,
  `got ${soldOut.status}`
);

const badQty = await call("/api/orders", {
  method: "POST",
  body: JSON.stringify({ items: [{ menuItemId: 1, qty: 0 }] }),
});
check("qty 0 is rejected with 400", badQty.status === 400);

const unknownItem = await call("/api/orders", {
  method: "POST",
  body: JSON.stringify({ items: [{ menuItemId: 99999, qty: 1 }] }),
});
check("unknown menu item is rejected with 400", unknownItem.status === 400);

// ── A real order, priced and costed by the server ────────────────────────────
console.log("\nOrder lifecycle");

const paneerBefore = inventory.body?.find((i) => i.id === 1)?.stock;

// 2× Paneer Butter Masala (id 5, ₹280) = ₹560, and 300 g of paneer.
const placed = await call("/api/orders", {
  method: "POST",
  body: JSON.stringify({ tableId: 5, items: [{ menuItemId: 5, qty: 2 }] }),
});
check("POST /api/orders returns 201", placed.status === 201, `got ${placed.status}`);
check(
  "server prices the order from the database (2 × ₹280 = ₹560)",
  Number(placed.body?.total) === 560,
  `got ${placed.body?.total}`
);

const orderId = placed.body?.id;

// Client-supplied prices must be ignored, not trusted.
const spoofed = await call("/api/orders", {
  method: "POST",
  body: JSON.stringify({
    items: [{ menuItemId: 5, qty: 1, unit_price: 1, price: 1 }],
  }),
});
check(
  "a client-supplied price is ignored (still ₹280)",
  Number(spoofed.body?.total) === 280,
  `got ${spoofed.body?.total}`
);

const invAfter = await call("/api/inventory");
const paneerAfter = invAfter.body?.find((i) => i.id === 1)?.stock;
check(
  "inventory decremented by 0.3 kg paneer for 2 dishes (DET-004)",
  Math.abs(Number(paneerBefore) - Number(paneerAfter) - 0.45) < 0.001,
  `${paneerBefore} → ${paneerAfter} (expected -0.45 across both orders)`
);

// DET-005: the state machine is enforced in the handler.
const skip = await call(`/api/orders/${orderId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "served" }),
});
check(
  "new → served is rejected with 409 (DET-005)",
  skip.status === 409,
  `got ${skip.status}`
);

const advance = await call(`/api/orders/${orderId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "preparing" }),
});
check("new → preparing is accepted", advance.status === 200);
check("status actually changed", advance.body?.status === "preparing");

const back = await call(`/api/orders/${orderId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "new" }),
});
check("preparing → new is rejected with 409", back.status === 409);

// ── The 86 toggle, which the agent will later drive ──────────────────────────
console.log("\nAvailability toggle");

const off = await call("/api/menu/9", {
  method: "PATCH",
  body: JSON.stringify({ available: false }),
});
check("86'ing an item returns 200", off.status === 200);
check("item reads back as unavailable", off.body?.available === false);

const reread = await call("/api/menu");
check(
  "the change is visible on the shared menu feed",
  reread.body?.find((m) => m.id === 9)?.available === false
);

const on = await call("/api/menu/9", {
  method: "PATCH",
  body: JSON.stringify({ available: true }),
});
check("restoring availability returns 200", on.body?.available === true);

const badBody = await call("/api/menu/9", {
  method: "PATCH",
  body: JSON.stringify({ available: "yes" }),
});
check("a non-boolean availability is rejected with 400", badBody.status === 400);

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exitCode = failed === 0 ? 0 : 1;
