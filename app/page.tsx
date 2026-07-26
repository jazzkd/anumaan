import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SURFACES = [
  {
    href: "/menu",
    kicker: "Customer",
    title: "Menu & Ordering",
    body: "Scan-to-order PWA. No login to browse — live availability, cart, order status, queue, and bill.",
  },
  {
    href: "/kitchen",
    kicker: "Staff",
    title: "Kitchen Display",
    body: "Order queue board, table status, and the 86-an-item availability grid. Built for a two-minute learning curve.",
  },
  {
    href: "/briefing",
    kicker: "Owner",
    title: "Dashboard",
    body: "Daily Briefing, forecasts with their basis shown, Ask Anumaan, and the Agent Activity Log.",
  },
];

/** Proves the database connection end-to-end rather than asserting it —
 *  a seeded row count is the Phase 0 exit criterion made visible. */
async function seedStatus(): Promise<{ ok: boolean; detail: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, detail: "Supabase env vars not set yet" };
  }
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${count ?? 0} menu items seeded` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "unreachable" };
  }
}

export default async function Home() {
  const seed = await seedStatus();

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h6 className="text-accent">Anumaan · अनुमान</h6>
        <h1 className="mt-2 max-w-3xl">
          Restaurant operations that predict, propose, and log what they did.
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] text-muted">
          One source of truth across the customer app, the kitchen display, and
          the owner&apos;s dashboard — with an agentic layer that drafts the
          decision, shows its basis, and waits for approval.
        </p>
      </header>

      <hr className="hr" />

      <section className="grid gap-3 sm:grid-cols-3">
        {SURFACES.map((s) => (
          <Link key={s.href} href={s.href} className="card elev-sm no-underline text-ink">
            <span className="card-kicker">{s.kicker}</span>
            <span className="card-title">{s.title}</span>
            <p className="card-body">{s.body}</p>
            <span className="card-meta">Open →</span>
          </Link>
        ))}
      </section>

      <hr className="hr" />

      <section className="flex flex-wrap items-center gap-3">
        <h6 className="m-0 text-muted">Build status</h6>
        <span className="tag tag-accent">Phase 0 · foundation</span>
        <span className={seed.ok ? "tag tag-accent-2" : "tag tag-outline"}>
          {seed.ok ? "Database connected" : "Database pending"}
        </span>
        <span className="text-[12px] text-muted">{seed.detail}</span>
      </section>

      <p className="mt-6 text-[12px] text-muted">
        Sales history in this build is synthetic and clearly labelled as such.
        Forecasts are a published formula, not a black box — the model narrates
        the number, it never invents it.
      </p>
    </main>
  );
}
