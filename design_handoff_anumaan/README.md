# Handoff: Anumaan — Restaurant Co-pilot (Customer PWA + Kitchen Display + Owner Dashboard)

## Overview
Anumaan is a restaurant management system for independent Indian restaurants: a customer-facing ordering PWA, a staff/kitchen display, and an owner/manager dashboard with a predictive + agentic AI layer (demand forecasting, stockout prediction, and three scoped AI agents with human approval gates). This bundle hands off the full interactive design for all three surfaces.

## About the Design Files
The files in this bundle (`Anumaan.dc.html`, `Anumaan Wireframes.dc.html`) are **design references built in HTML** — interactive prototypes showing intended layout, visual language, and behavior. They are **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's environment** (React, Vue, native mobile, etc., per the PRD: a mobile-first responsive PWA for the customer surface) using that codebase's existing patterns and libraries — or, if no environment exists yet, choose the framework best suited to the project (a React + PWA stack is a natural fit given the requirement for an installable, offline-tolerant customer app) and implement the designs there.

Open either `.dc.html` file directly in a browser to view/interact with it — no build step required.

## Fidelity
- **`Anumaan.dc.html` — High-fidelity.** This is the primary handoff artifact. It uses final colors, typography, spacing, and real components from the bound **Modernist** design system (see `design-system/` folder). Recreate this UI faithfully using the codebase's existing component library if one matches Modernist's tokens, or port Modernist's tokens into the codebase's styling system (Tailwind config, CSS variables, styled-components theme, etc.) if not.
- **`Anumaan Wireframes.dc.html` — Low-fidelity.** An earlier structural pass (same functional scope, sketch-style visuals). Included only as a secondary reference for flow/layout decisions if `Anumaan.dc.html` is ever ambiguous — the high-fidelity file is the source of truth for visual design.

Both files share the identical interaction model (same state machine, same screens) — only the visual layer differs.

## Design System — Modernist
Full token source is in `design-system/` (`styles.css` is canonical; `theme.json` is the machine-readable record; `modernist-readme.md` is the written guide). Summary:

- **Style**: flat, architectural, zero corner radius everywhere (`--radius-md/lg: 0px`), strong 2px rules for structure, nothing floats/no soft decoration except where elevation utilities are explicitly used.
- **Type**: Archivo for both headings and body (`--font-heading`, `--font-body`), weight 800 for headings. Scale: h1 42px, h2 32px, h3 25px, h4 20px, h5 16px, h6 13px (uppercase, letter-spaced).
- **Color**: ground `#f3f2f2` (`--color-bg`), surface `#eae9e9`, ink `#201e1d` (`--color-text`), single accent red `#ec3013` (`--color-accent`) — mono scheme, used sparingly for primary actions and one reserved "poster" moment (the Daily Briefing hero band uses the accent as a full-bleed field with reversed white type — this is the one place red runs large). Full 100–900 tonal ramps for neutral and accent live in `styles.css`.
- **Components used**: `.nav`, `.seg`/`.seg-opt` (native radio-based segmented control — used for the surface switcher and language toggle), `.btn` (`.btn-primary` solid accent fill, `.btn-secondary` outlined, `.btn-ghost` text-only, `.btn-icon` square icon button, `.btn-block` full-width flush-left), `.tag` (`.tag-accent`, `.tag-outline`, `.tag-neutral`) for all status labels, `.card` (+ `.card-kicker`/`.card-title`/`.card-body`/`.card-meta`, `.elev-sm`/`.elev-md`), `.table`, `.field`/`.input`, `.dialog-backdrop`/`.dialog` for the OTP modal.
- **Icons**: inline SVGs in the Lucide style (stroke-based, 24×24 viewBox, `stroke-width="2"`, round caps/joins) — cart, back-arrow, plus/minus, clock.

## Screens / Views

### Customer PWA (mobile-first, no login to browse)
Rendered inside a bordered "phone" frame (420px wide, 2px divider border, `--shadow-lg`) for prototype purposes only — in the real app this is just the mobile viewport, no literal frame chrome.

1. **Menu Home** — Header: "Anumaan · Table {N}" + cart icon button with a red badge showing item count. Search field (`.input`). Veg/Non-veg/All filter as a `.seg` control. Menu items grouped by category; category headers are `h5` with a 2px rule beneath (deliberate print-menu styling). Each row: 48×48 bordered placeholder thumbnail, veg/non-veg mark (small square: outlined = veg, filled accent-700 = non-veg — this mirrors India's real FSSAI veg/non-veg mark), item name, a dotted leader line, price (Archivo bold, right-aligned) — classic menu typographic pattern, not a card. Available items get an "Add to Cart" button (`.btn-secondary`); unavailable items show a "Sold out" `.tag-neutral` instead and grey out (this is the live 86'ing behavior — see Interactions). Bottom: ghost-button link to the Queue screen ("No table free? Join the queue instead").
2. **Item Detail** — Back button (arrow icon + label), large placeholder hero image (full width, 200px), veg/non-veg mark + item name (`h3`), price, description paragraph, full-width primary "Add to Cart" button, and an "In cart: N" indicator once added.
3. **Cart / Order Review** — Line items with name, decrement/increment icon buttons, quantity, line total; empty state with a message + "Menu" button; total row (bold, Archivo) and full-width primary "Confirm Order" button.
4. **Order Status** — Items summary + table number; a 4-step status strip rendered as tags (`New`/`Preparing`/`Ready`/`Served`) where reached steps are `.tag-accent` and unreached are `.tag-neutral`; total; "Get notified via SMS" button (opens the OTP dialog); "View Bill" primary button appears once the order reaches Ready/Served.
5. **Queue / Wait Screen** — Name + phone inputs (visual only in the prototype), a bordered "Your position" card showing `#N` and an estimated wait in minutes, a list of other queue entries with their own wait estimates, and a "Simulate: table is ready" button that returns to Menu Home (stands in for the real push-notification flow).
6. **Bill / Pay Screen** — Items summary, total (bold, rule above/below), a bordered UPI-QR placeholder box + the raw `upi://pay?...` deep link text, and either a "Paid ✓" confirmation or a "Mark as Paid" button.
7. **OTP capture** — A `.dialog` modal (phone input + "Send OTP" button), triggered only opt-in from Order Status — never a gate before browsing the menu.

### Staff / Kitchen Display (tablet, landscape, large touch targets)
Rendered inside a bordered panel (960px max width). Three sub-views switched by `.btn-primary`/`.btn-ghost` toggle buttons:
1. **Order Queue Board** — 4-column kanban (New / Preparing / Ready / Served). Each order is a `.card.elev-sm`: table number + order id as kicker, items summary as body, elapsed-time meta row with a clock icon. Tapping a card (New/Preparing/Ready columns) advances it one status; Served cards are non-interactive and dimmed (opacity .55).
2. **Table Status Board** — 4-column grid of table cards (T1–T8), each showing table number and a status tag (Empty/Seated/Bill requested/Needs cleaning); tapping cycles to the next status.
3. **Menu Availability Toggle Grid** — Row per menu item (name, category, and a toggle button reading "Mark 86'd" / "Mark available") — this is the live 86-an-item control; toggling here is reflected instantly on the Customer Menu Home (shared state).

### Owner/Manager Dashboard (desktop-first, tablet-usable)
Left sidebar (230px, full-width `.btn-block` nav buttons, active = `.btn-primary`) + main content area. 11 sections:
1. **Home / Daily Briefing (hero screen)** — Full-bleed accent-red band (the one "poster" moment in the whole design): uppercase kicker + "Good morning, Raj", a large (44px) reversed-white revenue figure with order count, and a summary line. Below it, an asymmetric 3-column rule-divided (not boxed) row: a wider "Today, prep" note, then "Revenue so far" and "Orders so far" figures. Below that: a Stockout Risk card (`.tag-accent` label + text + "Inventory" link button) and an **Agent Proposal card** for the Prep & Forecast Agent (basis text + Approve/Reject `.btn-primary`/`.btn-secondary` pair; after a decision, shows an "Approved — sent to Kitchen Board" or "Rejected" tag instead of the buttons). Finally a Forecast-vs-Actual mini bar chart (paired bars per hour, forecast in light neutral, actual in ink) with a link to Ask Anumaan.
2. **Orders** — Status filter chips (`.btn-primary` when active) + a `.table` of all orders (id, items, status tag, total).
3. **Tables** — `.table` list (not a floor plan — deferred per the PRD's open question) with a "Cycle" button per row to advance table status.
4. **Inventory** — One `.card` per ingredient: name + stock level, a 2-color progress bar (ink = healthy, lighter accent = low, full accent = stockout-risk), inline "Low stock"/"Stockout risk" tags, and decrement/increment icon buttons.
5. **Staff** — `.table` of name/role/shift + a note that clock-in/out attendance is a planned follow-up (P1).
6. **Customers** — `.table` of name/visits/last-visit/phone (masked).
7. **Sales & Analytics** — 3 stat cards (today/week/month revenue) + a peak-hours bar chart.
8. **Ask Anumaan** — Persistent chat-style panel: 3 preset-question buttons (incl. one that triggers an agent proposal), a scrolling Q&A log (user question right-aligned dark bubble, answer left-aligned light bubble), and — when the Anumaan Agent proposes an action (e.g. "86 the item about to run out") — an inline proposal card with Approve/Reject, identical pattern to the Daily Briefing's agent card. Free-text input + Send button at the bottom.
9. **Agent Activity Log** *(new — the agentic layer's audit trail)* — Reverse-chronological list of every agent action: agent name, a status tag (Approved / Rejected / Auto-executed), the proposal text, and its basis + timestamp. Seeded with one auto-executed Compliance Nudge Agent entry to demonstrate the notify-only pattern.
10. **Compliance Log (Bonus)** — Checklist rows (tag showing Done/Pending, label, timestamp) toggle on tap; below, a placeholder FSSAI QR + license number note (this also appears on the customer-facing menu in the real product).
11. **Settings / Menu Management** — "Add Item" button (stubs a new row) + a list of all menu items with veg/non-veg mark, name, category, price, and the same 86-toggle button used on the Kitchen Display.

## Interactions & Behavior
- **Shared source of truth across surfaces**: menu item availability and order status are single pieces of state read by multiple screens — toggling an item unavailable on the Kitchen Display's Availability Grid (or the Owner's Settings screen) instantly greys it out / shows "Sold out" on the Customer Menu Home. Advancing an order's status on the Kitchen Board updates the Customer's Order Status screen live. This cross-surface sync is the core "digitized workflow" demo moment and should be modeled as shared backend state (e.g. via websockets/polling in production), not per-screen local state.
- **Agent proposal pattern (propose → approve/reject)**: both the Prep & Forecast Agent (Daily Briefing) and the Anumaan Agent (Ask Anumaan) render a distinct card with the proposed action + its basis, and two buttons (Approve = primary accent, Reject = secondary outline). On Approve, the action executes (e.g. marks an item unavailable) and a new entry is appended to the Agent Activity Log with status "approved"; on Reject, no state changes and a "rejected" entry is logged. Only the Compliance Nudge Agent auto-executes with no approval step (it only ever notifies, never changes restaurant-facing state) — this distinction (notify-only vs. propose-then-approve) must be preserved; do not let any other agent skip the approval gate.
- **Cart flow**: adding an item increments a per-item quantity; quantity can be adjusted from the Cart screen; confirming creates a new order (status "new") and routes to Order Status.
- **Segmented controls** (surface switcher, language toggle, veg filter) are native radio-input based (`.seg`/`.seg-opt`) — keyboard/focus behavior comes for free from native radios; preserve that pattern rather than building a custom tab component.
- **Bilingual**: every label in the UI is sourced from a flat translation dictionary (English/Hindi) keyed by a small set of string ids — component copy must stay externalized (no hardcoded strings) to support this per the PRD's bilingual-readiness requirement.
- **No hard login gate**: customers can browse and view live availability without any authentication; phone/OTP capture is opt-in, triggered only when the customer asks to be notified.
- **Patchy-connectivity tolerance** (per PRD §11): design assumes optimistic UI updates with "syncing" states rather than blocking spinners — not fully modeled in the prototype's local state, but required in the real implementation.

## State Management
Minimum state shape needed (see the `.dc.html` files' logic classes for the exact reference implementation):
- `surface` (customer/kitchen/owner), `lang` (en/hi) — top-level UI mode.
- Per-surface "current screen" (`custScreen`, `kitScreen`, `ownScreen`).
- `menuItems[]` — id, name, category, veg, price, available, description. Shared across all three surfaces.
- `cart[]` — {itemId, qty}, customer-local until order confirmation.
- `orders[]` — id, table, items[], status (new/preparing/ready/served), total, paid. Shared across customer/kitchen/owner.
- `tables[]` — id, status (empty/seated/billRequested/cleaning). Shared across kitchen/owner.
- `queueEntries[]`, `inventory[]`, `staff[]`, `customers[]`, `complianceChecklist[]` — per-domain lists as described above.
- `prepProposal` — {status: pending/approved/rejected, text, basis} for the Daily Briefing's agent card.
- `askLog[]` — {q, a, proposal?} where `proposal` (when present) is {status, actionText, itemId?} for inline agent cards in Ask Anumaan.
- `agentActions[]` — the full audit trail feeding the Agent Activity Log: {agent, proposal, basis, status, time}.

State transitions of note: toggling availability mutates the single shared `menuItems` array; advancing/cycling orders and tables mutates shared `orders`/`tables` arrays; approving an agent proposal both mutates domain state (e.g. `menuItems`) AND appends to `agentActions` — rejecting only appends to `agentActions`.

## Design Tokens
See `design-system/styles.css` for the full, authoritative token set. Key values:
- Colors: `--color-bg #f3f2f2`, `--color-surface #eae9e9`, `--color-text #201e1d`, `--color-accent #ec3013` (+ tonal ramps `--color-accent-100…900`, `--color-neutral-100…900`).
- Fonts: `--font-heading` / `--font-body` = Archivo (weights 400/600/800 loaded via Google Fonts).
- Spacing scale: `--space-1: 4px` … `--space-8: 32px` (1/2/3/4/6/8 steps only).
- Radius: `--radius-sm/md/lg: 0px` (no rounded corners anywhere).
- Shadows: `--shadow-sm/md/lg` (soft ink-tinted shadows, used only via `.elev-*` utility classes on cards/dialogs).

## Assets
No real photography or icons are bundled — dish photos, the item-detail hero image, and the FSSAI QR are all placeholder boxes in the prototype (image-drop targets in the design tool). Source real product photography and a real FSSAI Food Safety Connect QR code before shipping. Icons are hand-drawn inline SVGs in the Lucide style — swap for the actual Lucide icon package in the real codebase.

## Files
- `Anumaan.dc.html` — high-fidelity design, source of truth for visual design. Open directly in a browser.
- `Anumaan Wireframes.dc.html` — low-fidelity structural reference (same flows/state, sketch visuals).
- `design-system/styles.css` — canonical Modernist design tokens + component CSS.
- `design-system/theme.json` — machine-readable token record.
- `design-system/modernist-readme.md` — written design system guide (voice, do/don't rules).
