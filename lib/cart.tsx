"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPersistentStore } from "./persistentStore";

/**
 * The cart is the one piece of genuinely customer-local state — it belongs to
 * a diner holding a phone, not to the restaurant, and it has no meaning to any
 * other surface until the order is confirmed. Persisted so a dropped
 * connection or an accidental back-swipe does not lose it (PRD §11's
 * patchy-connectivity posture).
 */

export type CartLine = { menuItemId: number; qty: number };

type Ctx = {
  lines: CartLine[];
  tableId: number | null;
  setTableId: (id: number | null) => void;
  add: (menuItemId: number) => void;
  setQty: (menuItemId: number, qty: number) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<Ctx | null>(null);

const cartStore = createPersistentStore<CartLine[]>("anumaan.cart", []);
const tableStore = createPersistentStore<number | null>("anumaan.table", null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );
  const tableId = useSyncExternalStore(
    tableStore.subscribe,
    tableStore.getSnapshot,
    tableStore.getServerSnapshot
  );

  const setTableId = useCallback((id: number | null) => tableStore.set(id), []);

  const add = useCallback((menuItemId: number) => {
    const prev = cartStore.getSnapshot();
    const found = prev.find((l) => l.menuItemId === menuItemId);
    cartStore.set(
      found
        ? prev.map((l) =>
            l.menuItemId === menuItemId ? { ...l, qty: l.qty + 1 } : l
          )
        : [...prev, { menuItemId, qty: 1 }]
    );
  }, []);

  const setQty = useCallback((menuItemId: number, qty: number) => {
    const prev = cartStore.getSnapshot();
    cartStore.set(
      qty <= 0
        ? prev.filter((l) => l.menuItemId !== menuItemId)
        : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, qty } : l))
    );
  }, []);

  const clear = useCallback(() => cartStore.set([]), []);

  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <CartContext.Provider
      value={{ lines, tableId, setTableId, add, setQty, clear, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
