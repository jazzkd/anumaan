import { requireRole } from "@/lib/auth";
import { loadGroundedData } from "@/lib/groundedData";
import { badRequest, ok, readJson, serverError } from "@/lib/http";
import { complete } from "@/lib/llm";
import { cannedAnswer } from "@/lib/llm/canned";
import { ASK_SYSTEM, askUser } from "@/lib/llm/prompts";

export const dynamic = "force-dynamic";

export type AskResponse = {
  answer: string;
  provider: string;
  fellBack: boolean;
  /** What the answer was allowed to draw on, shown in the UI as its basis. */
  basis: string;
};

type Body = { question?: string };

/**
 * Grounded Q&A. The model is handed the same computed object the briefing gets
 * and nothing else, so an item that was never sold simply is not in its
 * context — which is why refusing is the easy path for it rather than the
 * hard one (GND-003).
 *
 * Note there are no tools here. This endpoint answers questions; it cannot
 * change anything. Actions live behind the approval gate in the agent layer,
 * and keeping the two apart is also what stops customer free text from
 * reaching a tool-calling context (ADV-002).
 */
export async function POST(request: Request) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const body = await readJson<Body>(request);
  const question = body?.question?.trim();
  if (!question) return badRequest("question is required");
  if (question.length > 500) return badRequest("question is too long");

  try {
    const figures = await loadGroundedData();

    // The offline path grounds itself against the same data rather than
    // returning one generic paragraph — otherwise a demo without an API key
    // would answer a question about an item never sold, which is exactly the
    // failure GND-003 exists to catch.
    const fallback = cannedAnswer(question, figures);

    const result = await complete(
      { system: ASK_SYSTEM, user: askUser(question, figures) },
      fallback
    );

    return ok<AskResponse>({
      answer: result.text,
      provider: result.provider,
      fellBack: result.fellBack,
      basis: `Answered from ${figures.topSellersYesterday.length} sales records for ${figures.businessDate} and ${figures.itemsOnMenu.length} menu items. No other source.`,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Ask failed");
  }
}
