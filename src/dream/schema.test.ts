import example from "../../schemas/dream-spec-v1.example.json";
import { describe, expect, it } from "vitest";

import { DreamSpecV1Schema } from "./schema";

describe("DreamSpecV1Schema", () => {
  it("parses the governing DreamSpec v1 example", () => {
    const result = DreamSpecV1Schema.safeParse(example);

    expect(result.success).toBe(true);
  });

  it("rejects malformed and unsupported versions", () => {
    expect(DreamSpecV1Schema.safeParse({ version: 1 }).success).toBe(false);
    expect(
      DreamSpecV1Schema.safeParse({ ...example, version: 2 }).success,
    ).toBe(false);
  });

  it("rejects executable, URL, shader, and callback fields", () => {
    for (const field of ["code", "url", "shader", "callback"]) {
      const candidate: Record<string, unknown> = structuredClone(example);
      candidate[field] = "untrusted";

      expect(DreamSpecV1Schema.safeParse(candidate).success).toBe(false);
    }
  });
});
