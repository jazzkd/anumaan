/** Row shapes mirroring supabase/schema.sql. Hand-written rather than generated
 *  so the build never blocks on `supabase gen types` being reachable. */

export type UserRole = "owner" | "staff";
export type OrderStatus = "new" | "preparing" | "ready" | "served";
export type TableStatus = "empty" | "seated" | "bill_requested" | "cleaning";
export type QueueStatus = "waiting" | "notified" | "seated" | "cancelled";
export type AgentActionStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "auto_executed";

export type MenuItem = {
  id: number;
  restaurant_id: string;
  name: string;
  category: string;
  veg: boolean;
  price: number;
  available: boolean;
  description: string | null;
};

export type RestaurantTable = {
  id: number;
  restaurant_id: string;
  label: string;
  seats: number;
  status: TableStatus;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  qty: number;
  unit_price: number;
};

export type Order = {
  id: number;
  restaurant_id: string;
  code: string;
  table_id: number | null;
  status: OrderStatus;
  total: number;
  paid: boolean;
  placed_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

export type QueueEntry = {
  id: number;
  restaurant_id: string;
  name: string;
  party_size: number;
  phone: string | null;
  status: QueueStatus;
  joined_at: string;
};

export type InventoryItem = {
  id: number;
  restaurant_id: string;
  name: string;
  stock: number;
  max_stock: number;
  unit: string;
  low_threshold: number;
  updated_at: string;
};

export type ComplianceItem = {
  id: number;
  restaurant_id: string;
  label: string;
  checked: boolean;
  checked_at: string | null;
  sort_order: number;
};

export type AgentAction = {
  id: number;
  restaurant_id: string;
  agent: string;
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  proposal: string;
  basis: string;
  status: AgentActionStatus;
  result_ref: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type PrepTask = {
  id: number;
  restaurant_id: string;
  agent_action_id: number | null;
  label: string;
  done: boolean;
  created_at: string;
};
