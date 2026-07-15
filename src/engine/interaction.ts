import type { BlockId } from "./localGenerator";
import type { Vec3 } from "./playerMotor";

export interface CenterRay {
  origin: Vec3;
  direction: Vec3;
}

export interface VoxelHit {
  block: Vec3;
  normal: Vec3;
  blockId: BlockId;
  distance: number;
}

export interface InteractiveEntityTarget {
  id: string;
  position: Vec3;
  radius: number;
  prompt: string;
}

export type CenterTarget =
  | { kind: "entity"; entityId: string; prompt: string; distance: number }
  | { kind: "voxel"; hit: VoxelHit };

export interface EditableWorld {
  getBlock(x: number, y: number, z: number): BlockId;
  setBlock(x: number, y: number, z: number, block: BlockId): boolean;
}

const MAX_REACH = 8;

function normalizedDirection(direction: Vec3): Vec3 | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(length) || length < 0.000_001) return null;
  return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
}

export function raycastVoxel(
  ray: CenterRay,
  getBlock: (x: number, y: number, z: number) => BlockId,
  reach: number,
): VoxelHit | null {
  const direction = normalizedDirection(ray.direction);
  if (!direction || !Number.isFinite(ray.origin.x) || !Number.isFinite(ray.origin.y) || !Number.isFinite(ray.origin.z)) return null;
  const maxDistance = Math.max(0, Math.min(MAX_REACH, reach));
  let x = Math.floor(ray.origin.x);
  let y = Math.floor(ray.origin.y);
  let z = Math.floor(ray.origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  const deltaX = direction.x === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction.x);
  const deltaY = direction.y === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction.y);
  const deltaZ = direction.z === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction.z);
  let maxX = direction.x === 0 ? Number.POSITIVE_INFINITY : ((stepX > 0 ? x + 1 : x) - ray.origin.x) / direction.x;
  let maxY = direction.y === 0 ? Number.POSITIVE_INFINITY : ((stepY > 0 ? y + 1 : y) - ray.origin.y) / direction.y;
  let maxZ = direction.z === 0 ? Number.POSITIVE_INFINITY : ((stepZ > 0 ? z + 1 : z) - ray.origin.z) / direction.z;
  let distance = 0;
  let normal: Vec3 = { x: 0, y: 0, z: 0 };

  while (distance <= maxDistance) {
    const blockId = getBlock(x, y, z);
    if (blockId !== 0) return { block: { x, y, z }, normal, blockId, distance };

    if (maxX <= maxY && maxX <= maxZ) {
      x += stepX;
      distance = maxX;
      maxX += deltaX;
      normal = { x: -stepX, y: 0, z: 0 };
    } else if (maxY <= maxZ) {
      y += stepY;
      distance = maxY;
      maxY += deltaY;
      normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      distance = maxZ;
      maxZ += deltaZ;
      normal = { x: 0, y: 0, z: -stepZ };
    }
  }
  return null;
}

function raySphereDistance(ray: CenterRay, target: InteractiveEntityTarget): number | null {
  const direction = normalizedDirection(ray.direction);
  if (!direction) return null;
  const offsetX = ray.origin.x - target.position.x;
  const offsetY = ray.origin.y - target.position.y;
  const offsetZ = ray.origin.z - target.position.z;
  const along = offsetX * direction.x + offsetY * direction.y + offsetZ * direction.z;
  const determinant = along * along - (
    offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ - target.radius * target.radius
  );
  if (determinant < 0) return null;
  const distance = -along - Math.sqrt(determinant);
  return distance >= 0 ? distance : null;
}

export function resolveCenterTarget(
  ray: CenterRay,
  entities: readonly InteractiveEntityTarget[],
  getBlock: (x: number, y: number, z: number) => BlockId,
  reach: number,
): CenterTarget | null {
  const maxDistance = Math.max(0, Math.min(MAX_REACH, reach));
  let entityHit: { target: InteractiveEntityTarget; distance: number } | null = null;
  for (const target of entities) {
    const distance = raySphereDistance(ray, target);
    if (distance !== null && distance <= maxDistance && (!entityHit || distance < entityHit.distance)) {
      entityHit = { target, distance };
    }
  }
  if (entityHit) {
    return {
      kind: "entity",
      entityId: entityHit.target.id,
      prompt: entityHit.target.prompt,
      distance: entityHit.distance,
    };
  }

  const hit = raycastVoxel(ray, getBlock, maxDistance);
  return hit ? { kind: "voxel", hit } : null;
}

export function editTargetedBlock(
  action: "break" | "place",
  hit: VoxelHit,
  world: EditableWorld,
  selectedBlock: BlockId,
  canPlace: (x: number, y: number, z: number) => boolean = () => true,
): boolean {
  if (action === "break") {
    return world.setBlock(hit.block.x, hit.block.y, hit.block.z, 0);
  }

  const x = hit.block.x + hit.normal.x;
  const y = hit.block.y + hit.normal.y;
  const z = hit.block.z + hit.normal.z;
  if (world.getBlock(x, y, z) !== 0 || !canPlace(x, y, z)) return false;
  return world.setBlock(x, y, z, selectedBlock);
}
