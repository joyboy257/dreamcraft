import type { DreamSpecV1, TrustedDreamManifest, Vec3 } from "../dream";
import type { CompiledVoxelStructure } from "./structureMaterializer";

const MAX_RUNTIME_ENTITY_INSTANCES = 16;

export interface RuntimeEntityInstance {
  instanceId: string;
  entityId: string;
  entity: DreamSpecV1["entities"][number];
  position: Vec3;
  visibleAtEntry: boolean;
  highPriority: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isExplicitlyStagedLater(manifest: TrustedDreamManifest, entityId: string): boolean {
  return manifest.spec.playGraph.beats.some((beat) =>
    [...beat.onStart, ...beat.onProgress, ...beat.onComplete].some(
      (effect) => effect.kind === "spawn_entity" && effect.entityId === entityId,
    ));
}

function isHighPriority(manifest: TrustedDreamManifest, entity: DreamSpecV1["entities"][number]): boolean {
  return entity.tags.some((tag) => manifest.anchorStaging.some(
    (anchor) => anchor.anchorId === tag && anchor.mustAppear && anchor.importance >= 4,
  ));
}

function surfacePosition(position: Vec3, surfaceAt: (x: number, z: number) => number): Vec3 {
  const x = Math.round(position[0]);
  const z = Math.round(position[2]);
  const surface = surfaceAt(x, z);
  return [x, clamp(position[1], surface + 0.2, surface + 6), z];
}

function hash(seed: number, index: number): number {
  const value = Math.sin((seed + index * 997) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function spawnPositions(
  entity: DreamSpecV1["entities"][number],
  structures: readonly CompiledVoxelStructure[],
  zones: DreamSpecV1["world"]["zones"],
  seed: number,
): Vec3[] {
  const spawn = entity.spawn;
  switch (spawn.kind) {
    case "fixed":
      return spawn.positions.map((position) => [...position] as Vec3);
    case "surface_scatter":
      return Array.from({ length: spawn.count }, (_, index) => {
        const angle = hash(seed, index) * Math.PI * 2;
        const distance = spawn.minDistance + hash(seed, index + 43) * Math.max(0, spawn.radius - spawn.minDistance);
        return [
          spawn.center[0] + Math.cos(angle) * distance,
          spawn.center[1],
          spawn.center[2] + Math.sin(angle) * distance,
        ] as Vec3;
      });
    case "around_structure": {
      const structure = structures.find(({ id }) => id === spawn.structureId);
      const center = structure?.position ?? [0, 0, 0] as Vec3;
      return Array.from({ length: spawn.count }, (_, index) => {
        const angle = (index / Math.max(1, spawn.count)) * Math.PI * 2;
        return [
          center[0] + Math.cos(angle) * spawn.radius,
          center[1],
          center[2] + Math.sin(angle) * spawn.radius,
        ];
      });
    }
    case "in_zone": {
      const zone = zones.find(({ id }) => id === spawn.zoneId);
      if (!zone) return [];
      const radius = zone.radius ?? Math.max(1, Math.min(Math.abs(zone.size?.[0] ?? 2), Math.abs(zone.size?.[2] ?? 2)) / 2);
      return Array.from({ length: spawn.count }, (_, index) => {
        const angle = hash(seed, index) * Math.PI * 2;
        const distance = spawn.minDistance + hash(seed, index + 71) * Math.max(0, radius - spawn.minDistance);
        return [zone.center[0] + Math.cos(angle) * distance, zone.center[1], zone.center[2] + Math.sin(angle) * distance];
      });
    }
  }
}

export function compileEntityInstances(
  manifest: TrustedDreamManifest,
  structures: readonly CompiledVoxelStructure[],
  surfaceAt: (x: number, z: number) => number,
): RuntimeEntityInstance[] {
  const instances: RuntimeEntityInstance[] = [];
  for (const entity of manifest.spec.entities) {
    const stagedLater = isExplicitlyStagedLater(manifest, entity.id);
    const positions = spawnPositions(entity, structures, manifest.spec.world.zones, manifest.seed + instances.length)
      .slice(0, Math.max(0, MAX_RUNTIME_ENTITY_INSTANCES - instances.length));
    for (const [index, position] of positions.entries()) {
      instances.push({
        instanceId: `${entity.id}-${index + 1}`,
        entityId: entity.id,
        entity,
        position: surfacePosition(position, surfaceAt),
        visibleAtEntry: !stagedLater,
        highPriority: isHighPriority(manifest, entity),
      });
    }
    if (instances.length >= MAX_RUNTIME_ENTITY_INSTANCES) break;
  }
  return instances;
}
