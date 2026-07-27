import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * Client Component — only Route Handlers and server-side agent code.
 *
 * Why it exists: the staff and owner surfaces write to tables whose RLS
 * policies require an authenticated session, but authorisation for those
 * writes is enforced in the route handler by `requireRole()` (see lib/auth.ts),
 * which is the layer the specification names. RLS stays as the boundary for
 * anything the browser touches directly with the anon key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
