"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { LIVE_REFRESH_MS } from "./constants";

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Every live surface reads through this. Polling rather than Realtime is a
 * deliberate choice: the cross-surface sync moment is the core of the demo and
 * it cannot ride on a websocket that gets debugged at hour 30. 2s is fast
 * enough that the update reads as instant on stage.
 */
export function useLiveData<T>(
  path: string | null,
  options?: {
    /**
     * Milliseconds between polls. Pass 0 for feeds that must not be polled —
     * anything backed by an LLM call, because a 2s poll against a free tier
     * exhausts the day's quota in under a minute and then keeps failing.
     */
    refreshInterval?: number;
  }
) {
  const { data, error, isLoading, mutate } = useSWR<T>(path, fetcher, {
    refreshInterval: options?.refreshInterval ?? LIVE_REFRESH_MS,
    revalidateOnFocus: (options?.refreshInterval ?? LIVE_REFRESH_MS) > 0,
    keepPreviousData: true,
  });

  return { data, error: error as Error | undefined, isLoading, mutate };
}

/**
 * Sends a mutation and refreshes the affected feeds immediately rather than
 * waiting out the poll — the acting tab should feel instant, the other tab
 * catches up on its next tick.
 */
export async function sendMutation<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  revalidate: string[] = []
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error ?? `Request failed: ${res.status}`);
  }

  await Promise.all(revalidate.map((key) => globalMutate(key)));
  return payload as T;
}
