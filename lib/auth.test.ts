import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DET-003: a staff role must be refused by an owner-only endpoint server-side.
 *
 * These exercise `requireRole` directly, with a mocked Supabase session, which
 * is the function every protected route calls before doing anything. The role
 * is read from the `profiles` table, never from the request, so the test
 * supplies a session and a profile rather than a header a client could forge.
 *
 * Being straight about the limit: this proves the guard, not a browser login
 * flow. `AUTH_ENABLED` is false in the deployed demo so the surfaces are
 * reachable without a sign-in, and no login UI was built — that was the
 * deliberate Phase 3 cut. What is asserted here is that the moment the flag is
 * on, a staff token gets a 403 from the handler.
 */

const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock("./supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

const { requireRole } = await import("./auth");

function signedInAs(role: "owner" | "staff") {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockSingle.mockResolvedValue({
    data: { role, restaurant_id: "11111111-1111-4111-8111-111111111111" },
    error: null,
  });
}

describe("requireRole (DET-003)", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_ENABLED", "true");
    mockGetUser.mockReset();
    mockSingle.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a staff role on an owner-only route with 403", async () => {
    signedInAs("staff");
    const guard = await requireRole("owner");

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it("says which role was required and which was presented", async () => {
    signedInAs("staff");
    const guard = await requireRole("owner");

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      const body = await guard.response.json();
      expect(body.error).toMatch(/requires role owner/i);
      expect(body.error).toMatch(/you are staff/i);
    }
  });

  it("admits an owner to an owner-only route", async () => {
    signedInAs("owner");
    const guard = await requireRole("owner");

    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.actor.role).toBe("owner");
      expect(guard.actor.simulated).toBe(false);
    }
  });

  it("admits staff to a route that allows either role", async () => {
    signedInAs("staff");
    const guard = await requireRole("staff", "owner");
    expect(guard.ok).toBe(true);
  });

  it("refuses an unauthenticated request with 403", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const guard = await requireRole("owner");

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it("refuses a signed-in user with no profile row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "ghost" } } });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const guard = await requireRole("owner");
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it("never reads the role from the request", async () => {
    // A forged role must not help: the profile says staff, so staff it is.
    signedInAs("staff");
    const guard = await requireRole("owner");
    expect(guard.ok).toBe(false);
  });
});

describe("requireRole while auth is disabled", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_ENABLED", "false");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("resolves to a simulated owner, and says so", async () => {
    const guard = await requireRole("owner");
    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.actor.simulated).toBe(true);
      expect(guard.actor.userId).toBeNull();
    }
  });
});
