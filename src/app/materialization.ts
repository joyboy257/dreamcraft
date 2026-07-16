import type { TrustedDreamManifest } from "../dream";
import { CHUNK_VOLUME, worldToChunk } from "../engine/chunkMath";
import { adaptDreamManifest } from "../integration/dreamRuntimeAdapter";

export interface PreparedDreamRuntime {
  readonly spawnChunk: { readonly x: number; readonly z: number; readonly voxelCount: number };
  readonly stagedAnchorCount: number;
}

export function prepareDreamRuntime(manifest: TrustedDreamManifest): PreparedDreamRuntime {
  const runtime = adaptDreamManifest(manifest);
  const chunkX = worldToChunk(Math.floor(manifest.spawn[0])).chunk;
  const chunkZ = worldToChunk(Math.floor(manifest.spawn[2])).chunk;
  const chunk = runtime.generator.generate({ chunkX, chunkZ });
  if (chunk.voxels.length !== CHUNK_VOLUME) {
    throw new Error("The central dream chunk did not materialize safely.");
  }
  return {
    spawnChunk: { x: chunkX, z: chunkZ, voxelCount: chunk.voxels.length },
    stagedAnchorCount: runtime.staging.objectivePath.length,
  };
}
