/**
 * One adapter over Groq, Gemini, and a canned fallback.
 *
 * Three reasons this indirection earns its keep on a hackathon timeline:
 *
 *  1. Free-tier quota is a live risk, and bigger than the plan assumed. This
 *     was budgeted around a reported ~250 requests/day for Gemini Flash. The
 *     figure measured against our own key is far worse: gemini-3.6-flash
 *     returns 429 with quotaId GenerateRequestsPerDayPerProjectPerModel-
 *     FreeTier and quotaValue 20 — twenty requests per day, which a single
 *     afternoon of development exhausts. Groq reports 1000/day on the same
 *     workload, so Groq is primary and Gemini is the failover. That is the
 *     reverse of the original plan, changed on evidence rather than taste.
 *  2. A live API call must never be a single point of failure on stage. Every
 *     caller can fall back, and the Daily Briefing additionally stores its
 *     narration so repeat views cost nothing.
 *  3. `canned` runs the entire product with no network at all, which is the
 *     demo-day insurance policy if both free tiers run dry.
 */

export type Provider = "gemini" | "groq" | "canned";

export type CompleteArgs = {
  system: string;
  user: string;
  /** Low by default: this model narrates figures, it does not brainstorm. */
  temperature?: number;
  /**
   * Generous by default because Gemini 3.x spends this budget on internal
   * reasoning before it writes a word — a 400-token cap produced 382 thinking
   * tokens and 14 of output, which arrived as half a sentence. There is no
   * supported way to turn that off on this model (`thinkingBudget` and
   * `thinkingLevel` are both rejected on v1beta), so the budget accommodates
   * it instead.
   */
  maxTokens?: number;
};

export type CompleteResult = {
  text: string;
  provider: Provider;
  /** True when the answer did not come from the configured provider. */
  fellBack: boolean;
};

export function configuredProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER ?? "canned").trim().toLowerCase();
  if (raw === "gemini" || raw === "groq" || raw === "canned") return raw;
  return "canned";
}

/** Which providers actually have a key, in preference order. */
function availableChain(): Provider[] {
  const preferred = configuredProvider();
  const chain: Provider[] = [];

  const canGemini = Boolean(process.env.GEMINI_API_KEY);
  const canGroq = Boolean(process.env.GROQ_API_KEY);

  if (preferred === "gemini" && canGemini) chain.push("gemini");
  if (preferred === "groq" && canGroq) chain.push("groq");

  // Failover, then the offline fallback that always works.
  if (!chain.includes("gemini") && canGemini) chain.push("gemini");
  if (!chain.includes("groq") && canGroq) chain.push("groq");
  chain.push("canned");

  return chain;
}

export async function complete(
  args: CompleteArgs,
  cannedFallback: string
): Promise<CompleteResult> {
  const chain = availableChain();
  const preferred = chain[0];

  for (const provider of chain) {
    try {
      if (provider === "canned") {
        return { text: cannedFallback, provider, fellBack: preferred !== "canned" };
      }
      const text =
        provider === "gemini" ? await callGemini(args) : await callGroq(args);
      if (text) {
        return { text, provider, fellBack: provider !== preferred };
      }
    } catch {
      // Try the next provider. A judge will not notice a failover; they will
      // very much notice a spinner that never resolves.
    }
  }

  return { text: cannedFallback, provider: "canned", fellBack: true };
}

export type ToolCall = { name: string; args: Record<string, unknown> };

export type ToolResult = {
  toolCalls: ToolCall[];
  text: string;
  provider: Provider;
  /** True when no provider was reachable and no tool decision was made. */
  offline: boolean;
};

/**
 * Tool-calling turn. Returns whatever the model decided to call — including
 * nothing, which is a legitimate and often correct outcome (TRJ-003 requires
 * exactly that when asked to contact a supplier).
 *
 * Groq first, then Gemini, then the deterministic path.
 *
 * This was Groq-only until a scenario sweep exhausted Groq's 100,000
 * tokens-per-day allowance, at which point every agent request fell through to
 * the offline parser. That path answers correctly, but it means a demo shows no
 * model reasoning at all — and the model reasoning is the thing being
 * demonstrated. One provider is not a failover strategy when both the daily and
 * per-minute ceilings are this low.
 *
 * Gemini's free tier is small in requests but that suits a demo burst, and its
 * limits are counted separately from Groq's — so the two run out at different
 * times, which is the entire point of having both.
 */
export async function callWithTools(args: {
  system: string;
  user: string;
  tools: unknown[];
  temperature?: number;
}): Promise<ToolResult> {
  if (process.env.GROQ_API_KEY) {
    const groq = await groqTools(args);
    if (groq) return groq;
  }

  if (process.env.GEMINI_API_KEY) {
    const gemini = await geminiTools(args);
    if (gemini) return gemini;
  }

  return { toolCalls: [], text: "", provider: "canned", offline: true };
}

/** Gemini's function-calling shape differs from OpenAI's; translate rather
 *  than maintain two tool registries. */
async function geminiTools(args: {
  system: string;
  user: string;
  tools: unknown[];
  temperature?: number;
}): Promise<ToolResult | null> {
  const functionDeclarations = (args.tools as {
    function: { name: string; description: string; parameters: unknown };
  }[]).map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));

  for (const model of GEMINI_TOOL_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY!,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: args.system }] },
            contents: [{ role: "user", parts: [{ text: args.user }] }],
            tools: [{ functionDeclarations }],
            // Generous, because Gemini 3.x spends this budget thinking before
            // it emits the call.
            generationConfig: {
              temperature: args.temperature ?? 0.1,
              maxOutputTokens: 3000,
            },
          }),
          signal: AbortSignal.timeout(20_000),
        }
      );

      if (!res.ok) {
        console.warn(`[llm] gemini tools ${model}: HTTP ${res.status}`);
        continue;
      }

      const body = await res.json();
      const parts = body?.candidates?.[0]?.content?.parts ?? [];

      const toolCalls: ToolCall[] = parts
        .filter((p: { functionCall?: unknown }) => p.functionCall)
        .map((p: { functionCall: { name: string; args?: Record<string, unknown> } }) => ({
          name: p.functionCall.name,
          args: p.functionCall.args ?? {},
        }));

      const text = parts
        .filter((p: { text?: string }) => typeof p.text === "string")
        .map((p: { text: string }) => p.text)
        .join(" ")
        .trim();

      return { toolCalls, text, provider: "gemini", offline: false };
    } catch (err) {
      console.warn(
        `[llm] gemini tools ${model} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
}

/** Returns null when Groq cannot answer, so the caller can try Gemini. */
async function groqTools(args: {
  system: string;
  user: string;
  tools: unknown[];
  temperature?: number;
}): Promise<ToolResult | null> {
  try {
    let res!: Response;

    // Groq allows 12k tokens per minute, which a few agent calls in quick
    // succession will exceed. A 429 is a "wait a moment", not a failure, and
    // treating it as one dropped every request onto the fallback path.
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: args.temperature ?? 0.1,
          max_tokens: 900,
          tools: args.tools,
          tool_choice: "auto",
          messages: [
            { role: "system", content: args.system },
            { role: "user", content: args.user },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status !== 429) break;

      // Groq tells us how long to wait; believe it, within reason.
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 6000)
        : 1200 * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const body = await res.json();
    const message = body?.choices?.[0]?.message;

    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).flatMap(
      (c: { function?: { name?: string; arguments?: string } }) => {
        if (!c.function?.name) return [];
        try {
          return [
            {
              name: c.function.name,
              args: JSON.parse(c.function.arguments ?? "{}"),
            },
          ];
        } catch {
          // A tool call we cannot parse is not a tool call we should act on.
          return [];
        }
      }
    );

    return {
      toolCalls,
      text: (message?.content ?? "").trim(),
      provider: "groq",
      offline: false,
    };
  } catch (err) {
    // Never silent. A swallowed failure here drops every request onto the
    // deterministic fallback, which answers with the at-risk dish no matter
    // what was asked — so the agent looks like it works while ignoring the
    // question. That is far worse than an error, and it is exactly what this
    // empty catch block hid.
    // Never silent. A swallowed failure here used to drop every request onto
    // the deterministic path, which answered with the at-risk dish no matter
    // what was asked — the agent looked like it worked while ignoring the
    // question. Returning null hands the turn to Gemini instead of giving up.
    console.warn(
      "[llm] groq tools failed, trying gemini:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// Pinned rather than `gemini-flash-latest`: an alias can rotate underneath a
// demo, and "it behaved differently this morning" is not a debuggable state at
// hour 30. Note gemini-2.5-flash now 404s for new API keys — Google retired it
// for new users, which is exactly the kind of drift the pin protects against.
const GEMINI_MODEL = "gemini-3.6-flash";

// Tried in order for tool calling. Each carries its own quota, so one running
// dry does not end the turn.
const GEMINI_TOOL_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGemini({
  system,
  user,
  temperature = 0.2,
  maxTokens = 1600,
}: CompleteArgs): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const body = await res.json();
  const candidate = body?.candidates?.[0];

  // A response cut off mid-sentence is worse on stage than a clean failover to
  // Groq, which does no hidden reasoning and answers well inside the budget.
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response truncated");
  }

  return candidate?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function callGroq({
  system,
  user,
  temperature = 0.2,
  maxTokens = 400,
}: CompleteArgs): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const body = await res.json();
  return body?.choices?.[0]?.message?.content?.trim() ?? "";
}
