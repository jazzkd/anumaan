import { RESTAURANT_ID } from "./constants";
import { forbidden } from "./http";
import { createClient } from "./supabase/server";
import type { UserRole } from "./types";

export type Actor = {
  userId: string | null;
  role: UserRole;
  restaurantId: string;
  /** True when the guard passed without a real session — see AUTH_ENABLED. */
  simulated: boolean;
};

export type Guard =
  | { ok: true; actor: Actor }
  | { ok: false; response: Response };

/**
 * Auth is built in Phase 3, but every protected route wears its guard from the
 * moment it is written — retrofitting authorisation is how a route gets missed.
 * Until `AUTH_ENABLED=true`, `requireRole` resolves to a simulated owner so the
 * staff and owner surfaces are reachable during Phases 1–2. Flipping the flag
 * makes every one of those guards real at once, with no route edits.
 */
function authEnabled() {
  return process.env.AUTH_ENABLED === "true";
}

const SIMULATED_OWNER: Actor = {
  userId: null,
  role: "owner",
  restaurantId: RESTAURANT_ID,
  simulated: true,
};

/**
 * Server-side role check. The role is read from `profiles`, never from the
 * request — a client that forges a role header or skips the UI gate still
 * gets a 403 (the requirement DET-003 asserts against).
 */
export async function requireRole(...allowed: UserRole[]): Promise<Guard> {
  if (!authEnabled()) {
    return { ok: true, actor: SIMULATED_OWNER };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: forbidden("Not signed in") };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { ok: false, response: forbidden("No profile for this user") };
  }

  if (!allowed.includes(profile.role as UserRole)) {
    return {
      ok: false,
      response: forbidden(
        `Requires role ${allowed.join(" or ")}; you are ${profile.role}`
      ),
    };
  }

  return {
    ok: true,
    actor: {
      userId: user.id,
      role: profile.role as UserRole,
      restaurantId: profile.restaurant_id ?? RESTAURANT_ID,
      simulated: false,
    },
  };
}
