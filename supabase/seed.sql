-- ══════════════════════════════════════════════════════════════════════════
-- Anumaan — seed data.
--
-- Menu, tables, orders, inventory, staff, customers and the compliance
-- checklist are carried over verbatim from the interactive prototype, so the
-- built app and the design handoff show the same restaurant.
--
-- The 28 days of sales history are SYNTHETIC and labelled as such in the data
-- (daily_summaries.is_synthetic) and in the UI. Two figures in it are load-
-- bearing for the evaluation suite and must not be casually retuned:
--
--   * Garlic Naan sells exactly 40 on every Friday  → DET-001 asserts the
--     forecast formula returns 40 × 1.1 = 44.
--   * Yesterday's revenue totals exactly ₹18,400    → GND-001 asserts the
--     Daily Briefing cites that figure unaltered.
--
-- Both fall out of real rows rather than test fixtures, so the evals check the
-- system rather than a mock. Idempotent: safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  rid uuid := '11111111-1111-4111-8111-111111111111';
begin

-- ─── restaurant ───────────────────────────────────────────────────────────

insert into restaurants (id, name, fssai_license, upi_vpa)
values (rid, 'Spice Route Kitchen', '11223344556677', 'spiceroute@upi')
on conflict (id) do update
  set name = excluded.name,
      fssai_license = excluded.fssai_license,
      upi_vpa = excluded.upi_vpa;

-- ─── menu (12 items, from the prototype) ──────────────────────────────────

insert into menu_items (id, restaurant_id, name, category, veg, price, available, description) values
  ( 1, rid, 'Paneer Tikka',         'Starters',  true,  220, true,  'Char-grilled cottage cheese marinated in yogurt and spices.'),
  ( 2, rid, 'Chicken 65',           'Starters',  false, 260, true,  'Deep-fried spiced chicken, a South Indian favorite.'),
  ( 3, rid, 'Butter Chicken',       'Mains',     false, 320, true,  'Slow-cooked chicken in a creamy tomato-butter gravy, finished with kasuri methi.'),
  ( 4, rid, 'Dal Makhani',          'Mains',     true,  260, false, 'Black lentils simmered overnight with butter and cream.'),
  ( 5, rid, 'Paneer Butter Masala', 'Mains',     true,  280, true,  'Cottage cheese in a rich tomato-cashew gravy.'),
  ( 6, rid, 'Veg Biryani',          'Mains',     true,  240, true,  'Basmati rice layered with mixed vegetables and whole spices.'),
  ( 7, rid, 'Chicken Biryani',      'Mains',     false, 300, true,  'Basmati rice slow-cooked with marinated chicken and saffron.'),
  ( 8, rid, 'Tandoori Roti',        'Breads',    true,   40, true,  'Whole-wheat bread baked in the tandoor.'),
  ( 9, rid, 'Garlic Naan',          'Breads',    true,   60, true,  'Leavened bread topped with garlic and butter.'),
  (10, rid, 'Gulab Jamun',          'Desserts',  true,   90, true,  'Milk-solid dumplings soaked in cardamom sugar syrup.'),
  (11, rid, 'Masala Chai',          'Beverages', true,   50, true,  'Spiced tea brewed with milk.'),
  (12, rid, 'Mango Lassi',          'Beverages', true,  110, true,  'Yogurt-based mango smoothie.')
on conflict (id) do update
  set name = excluded.name, category = excluded.category, veg = excluded.veg,
      price = excluded.price, available = excluded.available,
      description = excluded.description;

-- ─── tables T1–T8 ─────────────────────────────────────────────────────────

insert into restaurant_tables (id, restaurant_id, label, seats, status) values
  (1, rid, 'T1', 4, 'empty'),
  (2, rid, 'T2', 2, 'seated'),
  (3, rid, 'T3', 4, 'seated'),
  (4, rid, 'T4', 4, 'bill_requested'),
  (5, rid, 'T5', 6, 'empty'),
  (6, rid, 'T6', 2, 'cleaning'),
  (7, rid, 'T7', 4, 'seated'),
  (8, rid, 'T8', 8, 'empty')
on conflict (id) do update
  set label = excluded.label, seats = excluded.seats, status = excluded.status;

-- ─── live orders ──────────────────────────────────────────────────────────

insert into orders (id, restaurant_id, code, table_id, status, total, paid, placed_at) values
  (1, rid, 'O1', 3, 'preparing', 440, false, now() - interval '12 minutes'),
  (2, rid, 'O2', 7, 'new',       480, false, now() - interval '2 minutes'),
  (3, rid, 'O3', 4, 'ready',     320, false, now() - interval '18 minutes'),
  (4, rid, 'O4', 1, 'served',    260, true,  now() - interval '40 minutes')
on conflict (id) do update
  set table_id = excluded.table_id, status = excluded.status,
      total = excluded.total, paid = excluded.paid, placed_at = excluded.placed_at;

delete from order_items where order_id in (1, 2, 3, 4);
insert into order_items (order_id, menu_item_id, name, qty, unit_price) values
  (1,  3, 'Butter Chicken', 1, 320),
  (1,  9, 'Garlic Naan',    2,  60),
  (2,  6, 'Veg Biryani',    2, 240),
  (3,  1, 'Paneer Tikka',   1, 220),
  (3, 11, 'Masala Chai',    2,  50),
  (4,  2, 'Chicken 65',     1, 260);

-- ─── walk-in queue ────────────────────────────────────────────────────────

insert into queue_entries (id, restaurant_id, name, party_size, status, joined_at) values
  (1, rid, 'Sharma', 4, 'waiting', now() - interval '10 minutes'),
  (2, rid, 'Verma',  2, 'waiting', now() - interval '4 minutes')
on conflict (id) do update
  set name = excluded.name, party_size = excluded.party_size, status = excluded.status;

-- ─── inventory ────────────────────────────────────────────────────────────
-- Butter is deliberately near stockout: it is what the Prep & Forecast Agent
-- flags in the demo, and it is the ingredient behind the paneer/butter mains.

insert into inventory_items (id, restaurant_id, name, stock, max_stock, unit, low_threshold) values
  (1, rid, 'Paneer',       2.0, 10, 'kg', 3.0),
  (2, rid, 'Chicken',      5.0, 12, 'kg', 3.0),
  (3, rid, 'Basmati Rice', 10.0, 20, 'kg', 5.0),
  (4, rid, 'Butter',       1.5,  8, 'kg', 2.0),
  (5, rid, 'Onions',       8.0, 15, 'kg', 4.0),
  (6, rid, 'Milk',         6.0, 12, 'L',  3.0)
on conflict (id) do update
  set stock = excluded.stock, max_stock = excluded.max_stock,
      unit = excluded.unit, low_threshold = excluded.low_threshold;

-- ─── staff & customers ────────────────────────────────────────────────────

insert into staff_members (id, restaurant_id, name, role_label, shift) values
  (1, rid, 'Meena',   'Floor',   '11am–8pm'),
  (2, rid, 'Ramesh',  'Kitchen', '10am–7pm'),
  (3, rid, 'Suresh',  'Kitchen', '1pm–10pm'),
  (4, rid, 'Pooja',   'Floor',   '1pm–10pm')
on conflict (id) do update
  set name = excluded.name, role_label = excluded.role_label, shift = excluded.shift;

insert into customers (id, restaurant_id, name, phone, visits, last_visit_at) values
  (1, rid, 'Priya Sharma', '98xxxxxx12', 12, now() - interval '2 days'),
  (2, rid, 'Ankit Verma',  '99xxxxxx48',  3, now() - interval '7 days'),
  (3, rid, 'Neha Gupta',   '97xxxxxx03',  7, now() - interval '1 day')
on conflict (id) do update
  set name = excluded.name, phone = excluded.phone,
      visits = excluded.visits, last_visit_at = excluded.last_visit_at;

-- ─── FSSAI compliance checklist ───────────────────────────────────────────
-- Item 5 is left incomplete on purpose: it is what the Compliance Nudge Agent
-- catches at its 9:00 PM check, the one agent that acts without approval.

insert into compliance_items (id, restaurant_id, label, checked, checked_at, sort_order) values
  (1, rid, 'Walk-in fridge temperature check — morning',   true,  current_date + time '09:02', 1),
  (2, rid, 'Walk-in fridge temperature check — afternoon', true,  current_date + time '15:05', 2),
  (3, rid, 'Kitchen surface sanitation',                   true,  current_date + time '11:40', 3),
  (4, rid, 'Handwash station stocked',                     true,  current_date + time '09:15', 4),
  (5, rid, 'Waste bin disposal log',                       false, null,                        5)
on conflict (id) do update
  set label = excluded.label, checked = excluded.checked,
      checked_at = excluded.checked_at, sort_order = excluded.sort_order;

-- ─── agent activity log ───────────────────────────────────────────────────

insert into agent_actions (id, restaurant_id, agent, tool_name, tool_args, proposal, basis, status, result_ref, created_at)
values (
  1, rid,
  'Compliance Nudge Agent',
  null,                                    -- notify-only: it holds no tool
  null,
  'Compliance checklist incomplete at the 9:00 PM cutoff — "Waste bin disposal log" not completed.',
  'Scheduled 9:00 PM check of today''s compliance log',
  'auto_executed',
  'Notified owner. No restaurant state changed.',
  current_date - interval '1 day' + time '21:00'
)
on conflict (id) do update
  set proposal = excluded.proposal, basis = excluded.basis,
      status = excluded.status, result_ref = excluded.result_ref;

-- ─── 28 days of synthetic sales history ───────────────────────────────────

delete from daily_summaries where restaurant_id = rid;

-- Days 2–28 back: a base daily quantity per item, shaped by a weekday factor.
-- Garlic Naan is pinned to exactly 40 on Fridays — that pin is DET-001's
-- seeded average, so it holds no matter which weekday the demo lands on.
insert into daily_summaries (restaurant_id, menu_item_id, business_date, qty_sold, revenue, is_synthetic)
select
  rid,
  b.menu_item_id,
  d.business_date,
  q.qty,
  q.qty * m.price,
  true
from generate_series(current_date - 28, current_date - 2, interval '1 day') as d(business_date)
cross join (values
  ( 1,  8), ( 2,  6), ( 3, 12), ( 4,  5), ( 5,  9), ( 6,  4),
  ( 7,  5), ( 8, 24), ( 9, 35), (10,  7), (11, 15), (12,  2)
) as b(menu_item_id, base_qty)
join menu_items m on m.id = b.menu_item_id
cross join lateral (
  select case
    when b.menu_item_id = 9 and extract(dow from d.business_date) = 5 then 40
    else greatest(1, round(b.base_qty * case extract(dow from d.business_date)
      when 0 then 1.25   -- Sun
      when 1 then 0.85   -- Mon
      when 2 then 0.85   -- Tue
      when 3 then 0.90   -- Wed
      when 4 then 1.00   -- Thu
      when 5 then 1.15   -- Fri
      else 1.30          -- Sat
    end))::int
  end as qty
) q;

-- Yesterday, authored rather than generated: these twelve lines total exactly
-- ₹18,400, and Garlic Naan holds its 40 so the Friday average survives even
-- when yesterday is itself a Friday.
insert into daily_summaries (restaurant_id, menu_item_id, business_date, qty_sold, revenue, is_synthetic)
select rid, v.menu_item_id, current_date - 1, v.qty, v.qty * m.price, true
from (values
  ( 1,  8), ( 2,  6), ( 3, 12), ( 4,  5), ( 5,  9), ( 6,  4),
  ( 7,  5), ( 8, 24), ( 9, 40), (10,  7), (11, 15), (12,  2)
) as v(menu_item_id, qty)
join menu_items m on m.id = v.menu_item_id;

-- ─── keep identity sequences ahead of the hand-assigned ids ───────────────

perform setval(pg_get_serial_sequence('menu_items', 'id'),        (select max(id) from menu_items));
perform setval(pg_get_serial_sequence('restaurant_tables', 'id'), (select max(id) from restaurant_tables));
perform setval(pg_get_serial_sequence('orders', 'id'),            (select max(id) from orders));
perform setval(pg_get_serial_sequence('queue_entries', 'id'),     (select max(id) from queue_entries));
perform setval(pg_get_serial_sequence('inventory_items', 'id'),   (select max(id) from inventory_items));
perform setval(pg_get_serial_sequence('staff_members', 'id'),     (select max(id) from staff_members));
perform setval(pg_get_serial_sequence('customers', 'id'),         (select max(id) from customers));
perform setval(pg_get_serial_sequence('compliance_items', 'id'),  (select max(id) from compliance_items));
perform setval(pg_get_serial_sequence('agent_actions', 'id'),     (select max(id) from agent_actions));

end $$;

-- ─── assertions ───────────────────────────────────────────────────────────
-- The seed fails loudly here rather than letting an eval fail mysteriously later.

do $$
declare
  friday_avg numeric;
  yday_revenue numeric;
begin
  select avg(qty_sold) into friday_avg
  from daily_summaries
  where menu_item_id = 9 and extract(dow from business_date) = 5;

  if friday_avg is distinct from 40 then
    raise exception 'Seed invariant broken: Garlic Naan Friday average is %, expected 40 (DET-001)', friday_avg;
  end if;

  select sum(revenue) into yday_revenue
  from daily_summaries where business_date = current_date - 1;

  if yday_revenue is distinct from 18400 then
    raise exception 'Seed invariant broken: yesterday revenue is %, expected 18400 (GND-001)', yday_revenue;
  end if;
end $$;
