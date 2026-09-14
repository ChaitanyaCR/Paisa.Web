type Entry = { count: number; resetAt: number };
const attempts = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60_000,
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clearRateLimits(): void {
  attempts.clear();
}
