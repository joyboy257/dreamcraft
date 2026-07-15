import { describe, expect, it } from "vitest";

import { InMemoryRateLimitHook } from "./rateLimit";

describe("InMemoryRateLimitHook", () => {
  it("enforces per-client and global bounds, then expires buckets", async () => {
    let now = 1_000;
    const limiter = new InMemoryRateLimitHook(2, 1_000, () => now, 3, 4);
    const request = (ip: string) =>
      new Request("http://dreamcraft.test/api/dream", {
        headers: { "x-forwarded-for": ip },
      });

    expect((await limiter.check(request("198.51.100.1"))).allowed).toBe(true);
    expect((await limiter.check(request("198.51.100.1"))).allowed).toBe(true);
    expect((await limiter.check(request("198.51.100.1"))).allowed).toBe(false);
    expect((await limiter.check(request("198.51.100.2"))).allowed).toBe(false);

    now += 1_001;
    expect((await limiter.check(request("198.51.100.2"))).allowed).toBe(true);
  });
});
