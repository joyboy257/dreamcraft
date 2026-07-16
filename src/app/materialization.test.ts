import { describe, expect, it } from "vitest";
import { compileDreamDescriptor, MockLocalGenerationProvider } from "../dream";
import { CHUNK_VOLUME } from "../engine/chunkMath";
import { prepareDreamRuntime } from "./materialization";

describe("dream materialization preflight", () => {
  it("builds the real spawn chunk and semantic staging before entry", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a small lantern path through a candy forest",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "materialization-preflight",
    }, new AbortController().signal);
    const manifest = compileDreamDescriptor(generated.core, generated.issues);

    expect(prepareDreamRuntime(manifest)).toMatchObject({
      spawnChunk: { voxelCount: CHUNK_VOLUME },
      stagedAnchorCount: 3,
    });
  });
});
