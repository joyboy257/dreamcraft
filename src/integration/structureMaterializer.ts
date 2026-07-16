import { CHUNK_HEIGHT, CHUNK_SIZE, voxelIndex } from "../engine/chunkMath";
import type { BlockId } from "../engine/localGenerator";
import type { DreamSpecV1, Vec3 } from "../dream";

const MAX_STRUCTURE_DIMENSION = 24;
const MAX_STRUCTURE_HEIGHT = 20;
const SPAWN_CLEARANCE = 5;

export const SUPPORTED_VOXEL_ARCHETYPES = [
  "room",
  "corridor",
  "school",
  "kitchen",
  "house",
  "stage",
  "bridge",
  "tower",
  "doorway",
  "tree",
  "giant_cup",
  "bowl",
  "instrument",
  "sign",
  "jackpot_board",
  "platform",
  "floating_island",
] as const;

export type SupportedVoxelArchetype = (typeof SUPPORTED_VOXEL_ARCHETYPES)[number];

export interface VoxelStructureSource {
  seed: number;
  radius: number;
  height: number;
  spawn: Vec3;
  surfaceAt: (x: number, z: number) => number;
}

export interface CompiledVoxelStructure {
  id: string;
  kind: DreamSpecV1["structures"][number]["kind"];
  position: Vec3;
  dimensions: readonly [number, number, number];
  blockId: string | null;
  accentBlockId: string | null;
  tags: readonly string[];
  interactionId: string | null;
}

type StructureSpec = DreamSpecV1["structures"][number];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function sourcePosition(structure: StructureSpec, source: VoxelStructureSource, index: number): Vec3 {
  if (structure.position) return structure.position;
  if (structure.center) return structure.center;
  if (structure.from && structure.to) {
    return [
      (structure.from[0] + structure.to[0]) / 2,
      (structure.from[1] + structure.to[1]) / 2,
      (structure.from[2] + structure.to[2]) / 2,
    ];
  }
  const angle = (((source.seed + index * 79) % 360) * Math.PI) / 180;
  return [Math.cos(angle) * (10 + index * 3), 0, Math.sin(angle) * (10 + index * 3)];
}

function safePosition(
  position: Vec3,
  source: VoxelStructureSource,
  index: number,
  spawnClearance: number,
): Vec3 {
  const maximumRadius = Math.max(4, source.radius - 3);
  let x = clamp(position[0], -maximumRadius, maximumRadius);
  let z = clamp(position[2], -maximumRadius, maximumRadius);
  const distance = Math.hypot(x, z);
  if (distance > maximumRadius) {
    x = (x / distance) * maximumRadius;
    z = (z / distance) * maximumRadius;
  }

  const fromSpawnX = x - source.spawn[0];
  const fromSpawnZ = z - source.spawn[2];
  const fromSpawnDistance = Math.hypot(fromSpawnX, fromSpawnZ);
  const requiredClearance = Math.min(spawnClearance, maximumRadius);
  if (fromSpawnDistance < requiredClearance) {
    const angle = fromSpawnDistance > 0.01
      ? Math.atan2(fromSpawnZ, fromSpawnX)
      : (((source.seed + index * 137) % 360) * Math.PI) / 180;
    x = source.spawn[0] + Math.cos(angle) * requiredClearance;
    z = source.spawn[2] + Math.sin(angle) * requiredClearance;
  }
  x = Math.round(clamp(x, -maximumRadius, maximumRadius));
  z = Math.round(clamp(z, -maximumRadius, maximumRadius));
  return [x, clamp(source.surfaceAt(x, z) + 1, 1, Math.min(source.height - 2, CHUNK_HEIGHT - 2)), z];
}

function structureDimensions(structure: StructureSpec): readonly [number, number, number] {
  const radius = structure.radius ?? 3;
  const width = structure.width ?? radius * 2 + 1;
  const depth = structure.depth ?? radius * 2 + 1;
  const height = structure.height ?? (structure.kind === "tower" ? 12 : 6);
  return [
    Math.round(clamp(width, 2, MAX_STRUCTURE_DIMENSION)),
    Math.round(clamp(height, 2, MAX_STRUCTURE_HEIGHT)),
    Math.round(clamp(depth, 2, MAX_STRUCTURE_DIMENSION)),
  ];
}

export function compileVoxelStructures(
  structures: readonly StructureSpec[],
  source: VoxelStructureSource,
): CompiledVoxelStructure[] {
  return structures.map((structure, index) => {
    const dimensions = structureDimensions(structure);
    return {
      id: structure.id,
      kind: structure.kind,
      position: safePosition(
        sourcePosition(structure, source, index),
        source,
        index,
        Math.max(SPAWN_CLEARANCE, Math.ceil(Math.hypot(dimensions[0], dimensions[2]) / 2) + 2),
      ),
      dimensions,
      blockId: structure.block ?? structure.trunkBlock ?? null,
      accentBlockId: structure.canopyBlock ?? null,
      tags: [...structure.tags],
      interactionId: structure.interactionId ?? null,
    };
  });
}

function isPerimeter(x: number, z: number, width: number, depth: number): boolean {
  return x === 0 || z === 0 || x === width - 1 || z === depth - 1;
}

function occupied(kind: CompiledVoxelStructure["kind"], x: number, y: number, z: number, width: number, height: number, depth: number): boolean {
  const top = height - 1;
  const centerX = (width - 1) / 2;
  const centerZ = (depth - 1) / 2;
  const radial = Math.hypot((x - centerX) / Math.max(1, centerX), (z - centerZ) / Math.max(1, centerZ));
  switch (kind) {
    case "room":
    case "school":
    case "kitchen":
    case "house":
      return y === 0 || y === top || (isPerimeter(x, z, width, depth) && !(z === 0 && x === Math.round(centerX) && y < Math.min(3, height - 1)));
    case "corridor":
    case "bridge":
      return y === 0 || ((x === 0 || x === width - 1) && y <= Math.min(2, top));
    case "stage":
    case "platform":
      return y <= Math.min(1, top);
    case "floating_island":
      return radial + Math.abs(y - top / 2) / Math.max(1, top / 2) <= 1;
    case "tower":
      return isPerimeter(x, z, width, depth) || y === 0;
    case "doorway":
    case "arch":
      return ((x === 0 || x === width - 1) && y < top) || (y === top && x > 0 && x < width - 1);
    case "tree":
    case "tree_cluster":
      return (Math.abs(x - centerX) <= 0.5 && Math.abs(z - centerZ) <= 0.5) || (y >= Math.floor(height * 0.55) && radial <= 0.85 - (y - height * 0.55) / Math.max(1, height));
    case "giant_cup":
      return (y < top - 1 && radial > 0.68 && radial <= 1) || (y === 0 && radial <= 0.92) || (x === width - 1 && z === Math.round(centerZ) && y > 1 && y < top - 1);
    case "bowl":
      return (y === 0 && radial <= 1) || (y === 1 && radial > 0.52 && radial <= 1);
    case "instrument":
      return y === 0 || (Math.abs(x - centerX) <= 1 && y < top) || (y === Math.floor(height / 2) && z > 0 && z < depth - 1);
    case "sign":
    case "jackpot_board":
      return (Math.abs(x - centerX) <= 0.5 && y < Math.floor(height / 2)) || (y >= Math.floor(height / 2) && y < top && x > 0 && x < width - 1);
    case "stair":
      return y <= Math.floor((z / Math.max(1, depth - 1)) * top);
    case "ring":
      return radial > 0.62 && radial <= 1 && y >= Math.floor(height / 3) && y <= Math.floor((height * 2) / 3);
    default:
      return y === 0 || (isPerimeter(x, z, width, depth) && y < top);
  }
}

export function materializeVoxelStructures(
  voxels: Uint16Array,
  chunkX: number,
  chunkZ: number,
  structures: readonly CompiledVoxelStructure[],
  numericIds: ReadonlyMap<string, BlockId>,
  fallbackBlock: BlockId,
): void {
  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;
  for (const structure of structures) {
    const [width, height, depth] = structure.dimensions;
    const minX = Math.round(structure.position[0] - Math.floor(width / 2));
    const minZ = Math.round(structure.position[2] - Math.floor(depth / 2));
    const blockId = numericIds.get(structure.blockId ?? "") ?? fallbackBlock;
    for (let worldZ = Math.max(originZ, minZ); worldZ < Math.min(originZ + CHUNK_SIZE, minZ + depth); worldZ += 1) {
      for (let worldX = Math.max(originX, minX); worldX < Math.min(originX + CHUNK_SIZE, minX + width); worldX += 1) {
        const localX = worldX - originX;
        const localZ = worldZ - originZ;
        for (let localY = 0; localY < height && structure.position[1] + localY < CHUNK_HEIGHT; localY += 1) {
          if (!occupied(structure.kind, worldX - minX, localY, worldZ - minZ, width, height, depth)) continue;
          voxels[voxelIndex(localX, structure.position[1] + localY, localZ)] = blockId;
        }
      }
    }
  }
}
