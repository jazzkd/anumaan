import { OwnerShell } from "@/components/owner/OwnerShell";
import { LangProvider } from "@/lib/i18n";
import type { ReactNode } from "react";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <OwnerShell>{children}</OwnerShell>
    </LangProvider>
  );
}
