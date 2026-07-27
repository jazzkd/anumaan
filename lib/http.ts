import { NextResponse } from "next/server";

/** Uniform JSON responses so every surface can assume one error shape.
 *  `{ error: string }` with a real status code — never a 200 carrying a
 *  failure, which is how silent breakage survives to demo day. */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export const badRequest = (error: string) => fail(400, error);
export const forbidden = (error = "Forbidden") => fail(403, error);
export const notFound = (error = "Not found") => fail(404, error);
export const serverError = (error: string) => fail(500, error);

/** Parses a JSON body, returning null rather than throwing on malformed input
 *  so handlers can answer 400 instead of 500. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Surfaces a PostgREST error as a 500 with its message intact. Supabase error
 *  text is developer-facing detail, not user data, and losing it turns every
 *  integration bug into a blank page. */
export function fromSupabase(error: { message: string }) {
  return serverError(error.message);
}
