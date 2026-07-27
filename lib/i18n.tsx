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
 * Flat EN/HI dictionary, carried over verbatim from the prototype. Copy stays
 * externalised here rather than inlined in components — that is the PRD's
 * bilingual-readiness requirement, and it is only cheap if it is never
 * violated once.
 */
export const EN = {
  addToCart: "Add to Cart",
  viewCart: "Cart",
  confirmOrder: "Confirm Order",
  joinQueue: "No table free? Join the queue instead",
  payNow: "Mark as Paid",
  back: "Back",
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  navCustomer: "Customer App",
  navKitchen: "Kitchen Display",
  navOwner: "Owner Dashboard",
  briefing: "Daily Briefing",
  orders: "Orders",
  tables: "Tables",
  inventory: "Inventory",
  staff: "Staff",
  customers: "Customers",
  sales: "Sales & Analytics",
  ask: "Ask Anumaan",
  compliance: "Compliance Log",
  settings: "Settings",
  menuHome: "Menu",
  queueWait: "Queue / Wait",
  bill: "View Bill",
  availability: "Availability",
  search: "Search dishes...",
  all: "All",
  veg: "Veg",
  nonveg: "Non-veg",
  soldOut: "Sold out",
  addItem: "Add Item",
  sendOtp: "Send OTP",
  getNotified: "Get notified via SMS",
  simulateReady: "Simulate: table is ready",
  send: "Send",
  yourCartEmpty: "Your cart is empty",
  noActiveOrder: "No active order yet — place one from the menu.",
  approve: "Approve",
  reject: "Reject",
  agents: "Agent Activity Log",
  agentProposal: "Agent proposal",
  proposedAction: "Proposed action",
  // Added for the built app — screens the prototype only sketched.
  table: "Table",
  total: "Total",
  inCart: "In cart",
  markAvailable: "Mark available",
  mark86: "Mark 86'd",
  yourPosition: "Your position",
  estimatedWait: "Estimated wait",
  name: "Name",
  phone: "Phone",
  partySize: "Party size",
  join: "Join queue",
  paid: "Paid",
  scanToPay: "Scan to pay",
  empty: "Empty",
  seated: "Seated",
  bill_requested: "Bill requested",
  cleaning: "Needs cleaning",
  loading: "Loading…",
  cycle: "Cycle",
  orderPlaced: "Order placed",
  category: "Category",
  price: "Price",
} as const;

export type StringId = keyof typeof EN;

export const HI: Partial<Record<StringId, string>> = {
  addToCart: "कार्ट में जोड़ें",
  viewCart: "कार्ट",
  confirmOrder: "ऑर्डर पक्का करें",
  joinQueue: "टेबल खाली नहीं? कतार में जुड़ें",
  payNow: "भुगतान दर्ज करें",
  back: "वापस",
  new: "नया",
  preparing: "बन रहा है",
  ready: "तैयार",
  served: "परोसा गया",
  navCustomer: "ग्राहक ऐप",
  navKitchen: "किचन डिस्प्ले",
  navOwner: "मालिक डैशबोर्ड",
  briefing: "दैनिक सारांश",
  orders: "ऑर्डर",
  tables: "टेबल",
  inventory: "भंडार",
  staff: "स्टाफ",
  customers: "ग्राहक",
  sales: "बिक्री और विश्लेषण",
  ask: "अनुमान से पूछें",
  compliance: "अनुपालन लॉग",
  settings: "सेटिंग्स",
  menuHome: "मेनू",
  queueWait: "प्रतीक्षा सूची",
  bill: "बिल देखें",
  availability: "उपलब्धता",
  search: "व्यंजन खोजें...",
  all: "सभी",
  veg: "शाकाहारी",
  nonveg: "मांसाहारी",
  soldOut: "खत्म हो गया",
  addItem: "आइटम जोड़ें",
  sendOtp: "ओटीपी भेजें",
  getNotified: "एसएमएस पर सूचना पाएं",
  simulateReady: "सिमुलेट: टेबल तैयार है",
  send: "भेजें",
  yourCartEmpty: "आपकी कार्ट खाली है",
  noActiveOrder: "अभी कोई सक्रिय ऑर्डर नहीं है — मेनू से ऑर्डर करें।",
  approve: "स्वीकृत करें",
  reject: "अस्वीकार करें",
  agents: "एजेंट गतिविधि लॉग",
  agentProposal: "एजेंट प्रस्ताव",
  proposedAction: "प्रस्तावित कार्रवाई",
  table: "टेबल",
  total: "कुल",
  inCart: "कार्ट में",
  markAvailable: "उपलब्ध करें",
  mark86: "खत्म बताएं",
  yourPosition: "आपकी बारी",
  estimatedWait: "अनुमानित प्रतीक्षा",
  name: "नाम",
  phone: "फ़ोन",
  partySize: "कितने लोग",
  join: "कतार में जुड़ें",
  paid: "भुगतान हो गया",
  scanToPay: "भुगतान के लिए स्कैन करें",
  empty: "खाली",
  seated: "बैठे हैं",
  bill_requested: "बिल मांगा",
  cleaning: "सफ़ाई चाहिए",
  loading: "लोड हो रहा है…",
  cycle: "बदलें",
  orderPlaced: "ऑर्डर दर्ज हुआ",
  category: "श्रेणी",
  price: "दाम",
};

export type Lang = "en" | "hi";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (id: StringId) => string };

const LangContext = createContext<Ctx | null>(null);

const langStore = createPersistentStore<Lang>("anumaan.lang", "en");

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(
    langStore.subscribe,
    langStore.getSnapshot,
    langStore.getServerSnapshot
  );

  const setLang = useCallback((l: Lang) => langStore.set(l), []);

  // Hindi falls back to English per key, so a missing translation shows real
  // copy rather than a key name.
  const t = useCallback(
    (id: StringId) => (lang === "hi" ? HI[id] ?? EN[id] : EN[id]),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT must be used inside <LangProvider>");
  return ctx;
}
