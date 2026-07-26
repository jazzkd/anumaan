import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client — read paths and auth UI only. Anything that
 *  needs enforcement (role guards, the agent approval gate) goes through a
 *  Route Handler using lib/supabase/server.ts instead. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
