import { CartProvider } from "@/lib/cart";
import { LangProvider } from "@/lib/i18n";
import type { ReactNode } from "react";

/**
 * The customer surface. Mobile-first with no login gate anywhere — FR-C1 is
 * explicit that a diner scans a QR and browses. The prototype's 420px "phone"
 * frame was scaffolding for the design tool; here the mobile viewport is the
 * real thing, so the frame is a max-width and nothing more.
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <CartProvider>
        <div className="w-full max-w-[480px] mx-auto min-h-dvh flex flex-col bg-ground">
          {children}
        </div>
      </CartProvider>
    </LangProvider>
  );
}
