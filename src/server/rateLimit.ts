import type { RateLimitDecision } from "./dreamRoute";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function stableKey(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export class InMemoryRateLimitHook {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly maximumRequests = 6,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly maximumGlobalRequests = 24,
    private readonly maximumBuckets = 512,
  ) {}

  private consume(
    requestedKey: string,
    maximum: number,
    now: number,
  ): RateLimitDecision {
    let key = requestedKey;
    const current = this.buckets.get(key);
    if (!current && this.buckets.size >= this.maximumBuckets) key = "overflow";
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }
    if (bucket.count >= maximum) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((bucket.resetAt - now) / 1_000),
        ),
      };
    }
    bucket.count += 1;
    return { allowed: true };
  }

  check(request: Request): Promise<RateLimitDecision> {
    const now = this.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    const global = this.consume("global", this.maximumGlobalRequests, now);
    if (!global.allowed) return Promise.resolve(global);

    const forwarded =
      request.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0]?.trim() ??
      request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
      "local";
    return Promise.resolve(
      this.consume(`client:${stableKey(forwarded)}`, this.maximumRequests, now),
    );
  }
}
