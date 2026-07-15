import type { DreamIssue, DreamSpecV1, Vec3 } from "./schema";

type TerrainOperation = DreamSpecV1["world"]["terrain"][number];
type TerrainLayer = DreamSpecV1["world"]["layers"][number];
type RuntimeBlock = DreamSpecV1["blocks"][number];

export interface EmergencyPlatformDescriptor {
  center: Vec3;
  halfSize: number;
  blockId: string;
}

export interface CompiledGeneratorDescriptor {
  protocol: 1;
  kind: "dreamcraft_terrain_v1";
  seed: number;
  radius: number;
  height: number;
  baseHeight: number;
  airBlockId: "air";
  terrain: TerrainOperation[];
  layers: TerrainLayer[];
  solidBlockIds: string[];
  emergencyPlatform: EmergencyPlatformDescriptor | null;
}

export interface SemanticAnchorStaging {
  anchorId: string;
  concept: string;
  position: Vec3;
  source: "structure" | "entity" | "fallback";
}

export interface TrustedDreamManifest {
  protocol: 1;
  id: string;
  title: string;
  seed: number;
  spawn: Vec3;
  blocks: RuntimeBlock[];
  generator: CompiledGeneratorDescriptor;
  emergencyPlatform: EmergencyPlatformDescriptor | null;
  anchorStaging: SemanticAnchorStaging[];
  diagnostics: DreamIssue[];
  spec: DreamSpecV1;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampToTerrainDisk(x: number, z: number, radius: number): readonly [number, number] {
  let nextX = clamp(x, -radius, radius);
  let nextZ = clamp(z, -radius, radius);
  const distance = Math.hypot(nextX, nextZ);
  if (distance > radius) {
    const scale = Math.max(0, radius - 1) / distance;
    nextX *= scale;
    nextZ *= scale;
  }
  return [Math.round(nextX), Math.round(nextZ)];
}

function hash32(seed: number, x: number, z: number): number {
  let hash = seed | 0;
  hash = Math.imul(hash ^ (x | 0), 0x45d9f3b);
  hash = Math.imul(hash ^ (z | 0), 0x45d9f3b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function latticeNoise(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const value = (xi: number, zi: number) => hash32(seed, xi, zi) / 0xffffffff;
  const lower = value(x0, z0) * (1 - tx) + value(x0 + 1, z0) * tx;
  const upper = value(x0, z0 + 1) * (1 - tx) + value(x0 + 1, z0 + 1) * tx;
  return (lower * (1 - tz) + upper * tz) * 2 - 1;
}

function fbm(seed: number, x: number, z: number, octaves: number): number {
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += latticeNoise(seed + octave * 1_013, x * frequency, z * frequency) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return normalizer === 0 ? 0 : total / normalizer;
}

function distanceToSegment(
  x: number,
  z: number,
  start: readonly [number, number],
  end: readonly [number, number],
): number {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(x - start[0], z - start[1]);
  const t = clamp(((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared, 0, 1);
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

function pathDistance(x: number, z: number, points: readonly (readonly [number, number])[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    minimum = Math.min(minimum, distanceToSegment(x, z, points[index - 1]!, points[index]!));
  }
  return minimum;
}

export function sampleSurfaceHeight(
  descriptor: CompiledGeneratorDescriptor,
  x: number,
  z: number,
): number {
  let height = descriptor.baseHeight;
  for (const operation of descriptor.terrain) {
    switch (operation.kind) {
      case "fbm_height":
        height += fbm(descriptor.seed, x * operation.scale, z * operation.scale, operation.octaves) * operation.amplitude;
        break;
      case "ridge_height":
        height += (1 - Math.abs(latticeNoise(descriptor.seed + 7_919, x * operation.scale, z * operation.scale))) * operation.amplitude;
        break;
      case "terrace":
        height = Math.round(height / operation.stepHeight) * operation.stepHeight;
        break;
      case "radial_island": {
        const distance = Math.hypot(x, z);
        if (distance > operation.radius) height -= (distance - operation.radius) / operation.falloff;
        break;
      }
      case "waves": {
        const directionLength = Math.hypot(...operation.direction) || 1;
        const phase = (x * operation.direction[0] + z * operation.direction[1]) / directionLength;
        height += Math.sin((phase / operation.wavelength) * Math.PI * 2) * operation.amplitude;
        break;
      }
      case "crater": {
        const distance = Math.hypot(x - operation.center[0], z - operation.center[1]);
        if (distance < operation.radius) {
          const normalized = 1 - distance / operation.radius;
          height -= operation.depth * normalized * normalized;
        }
        break;
      }
      case "path_bias": {
        const distance = pathDistance(x, z, operation.points);
        if (distance < operation.width) {
          const strength = (1 - distance / operation.width) * operation.flattenStrength;
          height = height * (1 - strength) + descriptor.baseHeight * strength;
        }
        break;
      }
      case "floating_islands":
      case "caves":
        break;
    }
    if (!Number.isFinite(height)) height = descriptor.baseHeight;
  }
  const safeHeight = Number.isFinite(height) ? height : 1;
  return Math.round(clamp(safeHeight, 1, descriptor.height - 4));
}

function layerBlockAt(descriptor: CompiledGeneratorDescriptor, y: number, surface: number): string {
  const depth = surface - y;
  let accumulated = 0;
  for (const layer of descriptor.layers) {
    accumulated += layer.depth;
    if (depth < accumulated) return layer.block;
  }
  return descriptor.layers.at(-1)?.block ?? descriptor.solidBlockIds[0] ?? "air";
}

export function sampleCompiledBlock(
  descriptor: CompiledGeneratorDescriptor,
  x: number,
  y: number,
  z: number,
): string {
  const blockX = Math.floor(x);
  const blockY = Math.floor(y);
  const blockZ = Math.floor(z);
  if (
    blockY < 0 ||
    blockY >= descriptor.height ||
    Math.hypot(blockX, blockZ) > descriptor.radius
  ) {
    return descriptor.airBlockId;
  }
  const platform = descriptor.emergencyPlatform;
  if (
    platform !== null &&
    blockY === platform.center[1] &&
    Math.abs(blockX - platform.center[0]) <= platform.halfSize &&
    Math.abs(blockZ - platform.center[2]) <= platform.halfSize
  ) {
    return platform.blockId;
  }
  const surface = sampleSurfaceHeight(descriptor, blockX, blockZ);
  return blockY > surface
    ? descriptor.airBlockId
    : layerBlockAt(descriptor, blockY, surface);
}

function descriptorIssue(code: string, path: string, message: string): DreamIssue {
  return { code, severity: "warning", path, message, repaired: true };
}

function sourcePositionForStructure(
  structure: DreamSpecV1["structures"][number],
): Vec3 | null {
  if (structure.position !== undefined) return structure.position;
  if (structure.center !== undefined) return structure.center;
  if (structure.from !== undefined && structure.to !== undefined) {
    return [
      (structure.from[0] + structure.to[0]) / 2,
      (structure.from[1] + structure.to[1]) / 2,
      (structure.from[2] + structure.to[2]) / 2,
    ];
  }
  return null;
}

function sourcePositionForEntity(entity: DreamSpecV1["entities"][number], spec: DreamSpecV1): Vec3 | null {
  const spawn = entity.spawn;
  switch (spawn.kind) {
    case "fixed":
      return spawn.positions[0] ?? null;
    case "surface_scatter":
      return spawn.center;
    case "around_structure": {
      const structure = spec.structures.find(({ id }) => id === spawn.structureId);
      return structure === undefined ? null : sourcePositionForStructure(structure);
    }
    case "in_zone":
      return spec.world.zones.find(({ id }) => id === spawn.zoneId)?.center ?? null;
  }
}

function fallbackAnchorPosition(
  generator: CompiledGeneratorDescriptor,
  spawn: Vec3,
  index: number,
): Vec3 {
  const angle = ((hash32(generator.seed, index, 17) % 360) * Math.PI) / 180;
  const distance = 8 + (index % 3) * 3;
  const [x, z] = clampToTerrainDisk(
    spawn[0] + Math.cos(angle) * distance,
    spawn[2] + Math.sin(angle) * distance,
    generator.radius - 2,
  );
  return [x, sampleSurfaceHeight(generator, x, z) + 1, z];
}

function stageAnchors(
  spec: DreamSpecV1,
  generator: CompiledGeneratorDescriptor,
  spawn: Vec3,
  diagnostics: DreamIssue[],
): SemanticAnchorStaging[] {
  return spec.blueprint.semanticAnchors.map((anchor, index) => {
    const structure = spec.structures.find(({ tags }) => tags.includes(anchor.id));
    const entity = spec.entities.find(({ tags }) => tags.includes(anchor.id));
    let source: SemanticAnchorStaging["source"] = "fallback";
    let position = structure === undefined ? null : sourcePositionForStructure(structure);
    if (position !== null) source = "structure";
    if (position === null && entity !== undefined) {
      position = sourcePositionForEntity(entity, spec);
      if (position !== null) source = "entity";
    }
    const tooFar =
      position !== null &&
      anchor.nearSpawn &&
      Math.hypot(position[0] - spawn[0], position[2] - spawn[2]) > 28;
    if (position === null || tooFar) {
      position = fallbackAnchorPosition(generator, spawn, index);
      source = "fallback";
      diagnostics.push(
        descriptorIssue(
          "semantic_anchor_staged",
          `blueprint.semanticAnchors[${index}]`,
          `Staged ${anchor.id} at a deterministic near-spawn fallback position`,
        ),
      );
    } else {
      const [x, z] = clampToTerrainDisk(position[0], position[2], generator.radius - 2);
      position = [x, sampleSurfaceHeight(generator, x, z) + 1, z];
    }
    return { anchorId: anchor.id, concept: anchor.concept, position, source };
  });
}

export function compileDreamDescriptor(
  spec: DreamSpecV1,
  sourceIssues: readonly DreamIssue[] = [],
): TrustedDreamManifest {
  const diagnostics = sourceIssues.map((item) => ({ ...item }));
  const solidBlockIds = spec.blocks.filter(({ solid }) => solid).map(({ id }) => id);
  const generator: CompiledGeneratorDescriptor = {
    protocol: 1,
    kind: "dreamcraft_terrain_v1",
    seed: spec.seed,
    radius: spec.world.radius,
    height: spec.world.height,
    baseHeight: spec.world.baseHeight,
    airBlockId: "air",
    terrain: structuredClone(spec.world.terrain),
    layers: structuredClone(spec.world.layers),
    solidBlockIds,
    emergencyPlatform: null,
  };
  const [x, z] = clampToTerrainDisk(
    spec.player.preferredSpawn[0],
    spec.player.preferredSpawn[2],
    generator.radius - 2,
  );
  const spawn: Vec3 = [x, sampleSurfaceHeight(generator, x, z) + 1, z];
  if (spawn.some((value, index) => value !== spec.player.preferredSpawn[index])) {
    diagnostics.push(
      descriptorIssue(
        "safe_spawn_selected",
        "player.preferredSpawn",
        "Selected a deterministic surface spawn with solid ground and headroom",
      ),
    );
  }
  if (sourceIssues.some(({ code }) => code === "solid_block_added")) {
    generator.emergencyPlatform = {
      center: [spawn[0], spawn[1] - 1, spawn[2]],
      halfSize: 3,
      blockId: solidBlockIds[0]!,
    };
    diagnostics.push(
      descriptorIssue(
        "emergency_platform_created",
        "generator.emergencyPlatform",
        "Created a bounded emergency platform for an all-air terrain request",
      ),
    );
  }

  return {
    protocol: 1,
    id: spec.id,
    title: spec.title,
    seed: spec.seed,
    spawn,
    blocks: structuredClone(spec.blocks),
    generator,
    emergencyPlatform: generator.emergencyPlatform,
    anchorStaging: stageAnchors(spec, generator, spawn, diagnostics),
    diagnostics,
    spec: structuredClone(spec),
  };
}
