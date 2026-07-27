import { RESTAURANT_ID } from "@/lib/constants";
import { ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Is this instance actually wired up? Reports which configuration is present
 * (never its values) and whether the database answers.
 *
 * Exists because a misconfigured deploy otherwise shows up as an opaque 500 on
 * every endpoint, and the golden rule is that nothing counts until it works on
 * the deployed URL — so the deployed URL needs a way to say what is wrong.
 */
export async function GET() {
  const config = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    authEnabled: process.env.AUTH_ENABLED === "true",
    llmProvider: process.env.LLM_PROVIDER ?? "unset",
  };

  let database: { ok: boolean; detail: string };
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", RESTAURANT_ID);

    database = error
      ? { ok: false, detail: error.message }
      : { ok: true, detail: `${count ?? 0} menu items` };
  } catch (err) {
    database = {
      ok: false,
      detail: err instanceof Error ? err.message : "unknown failure",
    };
  }

  return ok(
    { config, database },
    { status: database.ok ? 200 : 503 }
  );
}
