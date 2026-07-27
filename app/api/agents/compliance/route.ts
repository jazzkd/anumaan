import { runComplianceCheck } from "@/lib/agents/compliance";
import { requireRole } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Runs the scheduled compliance check.
 *
 * In production this would be a cron trigger. Here it is also callable so the
 * check can be demonstrated at 11am rather than waiting until 9pm — `force`
 * runs it regardless of the hour. The agent's behaviour is identical either
 * way; only the clock check is bypassed.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const fromScheduler =
    Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;

  if (!fromScheduler) {
    const guard = await requireRole("owner", "staff");
    if (!guard.ok) return guard.response;
  }

  // The scheduler fires at the cutoff, so it never needs to force past the
  // clock check; a human demonstrating at noon does.
  const force =
    !fromScheduler && new URL(request.url).searchParams.get("force") === "1";

  try {
    return ok(await runComplianceCheck(new Date(), force));
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Check failed");
  }
}

export async function POST(request: Request) {
  return run(request);
}

/** Vercel Cron issues GET. */
export async function GET(request: Request) {
  return run(request);
}
