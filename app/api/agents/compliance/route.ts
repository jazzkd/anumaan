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
export async function POST(request: Request) {
  const guard = await requireRole("owner", "staff");
  if (!guard.ok) return guard.response;

  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    return ok(await runComplianceCheck(new Date(), force));
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Check failed");
  }
}
