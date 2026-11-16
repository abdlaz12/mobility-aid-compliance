// Counts failures per key inside a sliding window and says when a key is locked. In memory, so it fits the
// single server process this project runs on; a restart clears it, and several processes would each count alone.

export class AttemptLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private max: number,
    private windowMs: number,
    private now: () => number = Date.now,
  ) {}

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (list.length) this.hits.set(key, list); else this.hits.delete(key);
    return list;
  }

  isLocked(key: string): boolean {
    return this.recent(key).length >= this.max;
  }

  /** Milliseconds until the key may try again (0 when it is not locked). */
  retryAfterMs(key: string): number {
    const list = this.recent(key);
    if (list.length < this.max) return 0;
    return list[list.length - this.max] + this.windowMs - this.now();
  }

  fail(key: string): void {
    const list = this.recent(key);
    list.push(this.now());
    this.hits.set(key, list);
    // Keep memory bounded when someone floods with made-up keys: drop the oldest keys.
    if (this.hits.size > 10_000) for (const k of [...this.hits.keys()].slice(0, 1_000)) this.hits.delete(k);
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}

const g = globalThis as { __limiters?: { email: AttemptLimiter; ip: AttemptLimiter; password: AttemptLimiter } };
// One set per process, kept across development reloads.
export const limiters = (g.__limiters ??= {
  email: new AttemptLimiter(5, 15 * 60_000), // 5 wrong passwords for one account in 15 minutes
  ip: new AttemptLimiter(30, 15 * 60_000), // only meaningful behind a proxy that sets x-forwarded-for truthfully
  password: new AttemptLimiter(5, 15 * 60_000), // wrong "current password" when changing your own password
});

export function clientIp(headers: Headers | undefined): string {
  return headers?.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) || "unknown";
}
