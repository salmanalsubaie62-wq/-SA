import { HttpError } from "./auth";

/** Fixed-window in-memory limiter. Good for a single Node process; use Redis when scaling out. */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const nowMs = Date.now();
  const entry = windows.get(key);
  if (!entry || nowMs - entry.start >= windowMs) {
    windows.set(key, { start: nowMs, count: 1 });
    return;
  }
  if (entry.count >= limit) {
    const retry = Math.ceil((entry.start + windowMs - nowMs) / 1000);
    throw new HttpError(429, `Too many requests. Try again in ${retry}s.`);
  }
  entry.count += 1;
}
