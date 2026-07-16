import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface HeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

interface FunctionRule {
  maxDuration: number;
  supportsCancellation?: boolean;
}

const config = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
) as {
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  functions: Record<string, FunctionRule>;
  headers: HeaderRule[];
};

function headersFor(source: string): Map<string, string> {
  const rule = config.headers.find((candidate) => candidate.source === source);
  return new Map(rule?.headers.map(({ key, value }) => [key.toLowerCase(), value]) ?? []);
}

describe("Vercel release security headers", () => {
  it("locks executable, embedding, network, and base URL sources to the application origin", () => {
    const headers = headersFor("/(.*)");
    const policy = headers.get("content-security-policy") ?? "";

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("https:");
    expect(policy).not.toContain("wss:");
  });

  it("ships transport, MIME, framing, privacy, and API no-store defenses", () => {
    const headers = headersFor("/(.*)");
    expect(headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(headersFor("/api/(.*)").get("cache-control")).toBe("no-store");
  });

  it("keeps the Vite output and both serverless functions explicitly bounded", () => {
    expect(config.installCommand).toBe("corepack pnpm install --frozen-lockfile");
    expect(config.buildCommand).toBe("corepack pnpm build");
    expect(config.outputDirectory).toBe("dist");
    expect(config.functions).toEqual({
      "api/health.ts": { maxDuration: 5 },
      "api/dream.ts": { maxDuration: 30, supportsCancellation: true },
    });
  });
});
