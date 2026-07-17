import { describe, expect, it } from "vitest";
import { compileDreamDescriptor } from "../dream";
import { createG71ReferenceDreams } from "../../tests/fixtures/g7-1-referenceDreams";
import { compileDreamLibraryBinding } from "./grounding";

describe("DreamLibrary semantic grounding", () => {
  it("preserves each high-priority reference anchor as a capability and rendered instance id", async () => {
    for (const reference of await createG71ReferenceDreams()) {
      const manifest = compileDreamDescriptor(reference.spec, []);
      const binding = compileDreamLibraryBinding(manifest);
      for (const anchor of manifest.anchorStaging.filter(({ mustAppear, importance }) => mustAppear && importance >= 4)) {
        const bound = binding.anchors.find(({ anchorId }) => anchorId === anchor.anchorId);
        expect(bound?.renderedInstanceId).toContain("dreamlibrary-");
      }
    }
  });
});
