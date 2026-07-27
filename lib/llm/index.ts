/**
 * One adapter over Gemini, Groq, and a canned fallback.
 *
 * Three reasons this indirection earns its keep on a hackathon timeline:
 *
 *  1. Free-tier quota is a live risk. Gemini Flash's free tier is reportedly
 *     ~250 requests/day, and dev iteration plus eval runs will eat that. Evals
 *     point at Groq specifically to protect the demo's quota.
 *  2. A live API call must never be a single point of failure on stage. Every
 *     caller can fall back, and the Daily Briefing additionally persists its
 *     last good result.
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

// Pinned rather than `gemini-flash-latest`: an alias can rotate underneath a
// demo, and "it behaved differently this morning" is not a debuggable state at
// hour 30. Note gemini-2.5-flash now 404s for new API keys — Google retired it
// for new users, which is exactly the kind of drift the pin protects against.
const GEMINI_MODEL = "gemini-3.6-flash";
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
