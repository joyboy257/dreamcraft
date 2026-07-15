import { describe, expect, it } from "vitest";
import {
  clampDialogueChoiceIndex,
  getFragmentCopy,
  MATERIALIZATION_COPY,
} from "./uiModel";

describe("product UI copy model", () => {
  it("uses real pipeline language for each materialization step", () => {
    expect(Object.keys(MATERIALIZATION_COPY)).toEqual([
      "requesting",
      "validating",
      "compiling",
      "generating-spawn",
      "staging",
      "entering",
    ]);
    expect(MATERIALIZATION_COPY["generating-spawn"].detail).toMatch(
      /central path/i,
    );
  });

  it("never exposes an unknown diagnostic as user copy", () => {
    const copy = getFragmentCopy("raw-schema-error-with-private-details");
    expect(copy.heading).toBe("The dream would not hold its shape.");
    expect(JSON.stringify(copy)).not.toContain("schema");
  });

  it("wraps keyboard dialogue selection in both directions", () => {
    expect(clampDialogueChoiceIndex(3, 3)).toBe(0);
    expect(clampDialogueChoiceIndex(-1, 3)).toBe(2);
    expect(clampDialogueChoiceIndex(4, 0)).toBe(0);
  });
});
