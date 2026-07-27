import { checkStockAndPropose } from "@/lib/agents/watcher";
import { requireRole } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * The Inventory Watch agent, on demand.
 *
 * Normally this fires by itself after every order (see app/api/orders). This
 * endpoint exists for two other callers: a scheduler, and a human who wants to
 * force the check during a demo without placing five orders first.
 *
 * Vercel sets `Authorization: Bearer $CRON_SECRET` on scheduled invocations.
 * When that secret is configured the header is the credential; otherwise the
 * caller must be a signed-in owner. Without one of those this would be an
 * unauthenticated endpoint that writes rows, which is not something to leave
 * on the public internet.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const fromScheduler = Boolean(secret) && auth === `Bearer ${secret}`;

  if (!fromScheduler) {
    const guard = await requireRole("owner");
    if (!guard.ok) return guard.response;
  }

  try {
    const result = await checkStockAndPropose();
    return ok({
      ...result,
      message:
        result.raised.length > 0
          ? `Raised ${result.raised.length} proposal(s): ${result.raised
              .map((r) => r.proposal)
              .join("; ")}`
          : result.checked === 0
            ? "Nothing at risk — no ingredient is forecast to run short today."
            : `${result.checked} ingredient(s) at risk, nothing new to raise (${result.skipped
                .map((s) => `${s.ingredient}: ${s.why}`)
                .join("; ")}).`,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Watch failed");
  }
}

export async function POST(request: Request) {
  return run(request);
}

/** Vercel Cron issues GET. Same work, same guard. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return forbidden("This endpoint is scheduler-only");
  }
  return run(request);
}
