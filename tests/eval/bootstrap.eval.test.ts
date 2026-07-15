import { describe, expect, it } from "vitest";
import { createLocalPreview, SAMPLE_DREAMS } from "../../src/app/localPreview";

describe("G0 local strategy eval", () => {
  it("keeps all bundled sample previews deterministic and distinct", () => {
    const previews = SAMPLE_DREAMS.map(createLocalPreview);
    expect(previews).toHaveLength(3);
    expect(new Set(previews.map((preview) => preview.seed)).size).toBe(3);
    expect(previews.every((preview) => preview.strategy === "mock-local")).toBe(
      true,
    );
  });
});
