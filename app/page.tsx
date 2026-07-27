import Link from "next/link";

export const dynamic = "force-dynamic";

const SURFACES = [
  {
    href: "/menu?table=3",
    kicker: "Customer",
    title: "Menu & Ordering",
    body: "Scan-to-order from your phone. No login to browse — live availability, cart, order status, queue, and bill.",
  },
  {
    href: "/kitchen",
    kicker: "Staff",
    title: "Kitchen Display",
    body: "Order board with tap-to-advance, table status, and the availability grid. Built for a two-minute learning curve.",
  },
  {
    href: "/briefing",
    kicker: "Owner",
    title: "Dashboard",
    body: "Daily Briefing, forecasts with their basis shown, Ask Anumaan, and the Agent Activity Log.",
  },
];

export default function Home() {
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

      {/* Worth trying, rather than build telemetry nobody outside the team
          cares about. Someone landing here cold should know which two clicks
          show the product. */}
      <section>
        <h6 className="text-muted">Two things worth trying</h6>
        <ul className="list-none p-0 m-0 grid gap-2 sm:grid-cols-2 mt-2">
          <li className="text-[14px]">
            Open the <strong>Kitchen Display</strong> and the{" "}
            <strong>Menu</strong> side by side. Mark an item sold out on one and
            watch the other update, without refreshing.
          </li>
          <li className="text-[14px]">
            Place an order, then open the <strong>Dashboard</strong>. A proposal
            will be waiting that nobody asked for — approve it and check the
            menu again.
          </li>
        </ul>
      </section>

      <p className="mt-6 text-[12px] text-muted max-w-2xl">
        Sales history in this demo is synthetic and labelled as such throughout.
        Forecasts are a published formula, not a black box — the model narrates
        the number, it never invents it. No agent holds a tool that moves money
        or contacts a supplier.
      </p>
    </main>
  );
}
