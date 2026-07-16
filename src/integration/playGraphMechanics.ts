import type { DreamCondition, DreamSpecV1 } from "../dream";
import type { PlayGraphEvent } from "../gameplay";

type DreamZone = DreamSpecV1["world"]["zones"][number];
type DreamDialogue = DreamSpecV1["dialogues"][number];
type DreamDialogueResponse = DreamDialogue["nodes"][number]["responses"][number];

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const PLAY_GRAPH_INTERACTION_ID = "play-graph-physical-action";

export function resolveDialogueResponse(
  dialogues: readonly DreamDialogue[],
  dialogueId: string,
  nodeId: string | undefined,
  responseId: string,
): { readonly nodeId: string; readonly response: DreamDialogueResponse } | null {
  const dialogue = dialogues.find(({ id }) => id === dialogueId);
  const activeNodeId = nodeId ?? dialogue?.startNodeId;
  const node = dialogue?.nodes.find(({ id }) => id === activeNodeId);
  const response = node?.responses.find(({ id }) => id === responseId);
  return node && response ? { nodeId: node.id, response } : null;
}

export function pointIsInsideZone(point: WorldPoint, zone: DreamZone): boolean {
  const dx = point.x - zone.center[0];
  const dy = point.y - zone.center[1];
  const dz = point.z - zone.center[2];
  if (zone.kind === "sphere") return Math.hypot(dx, dy, dz) <= (zone.radius ?? 1);
  if (zone.kind === "cylinder") {
    const height = Math.abs(zone.size?.[1] ?? (zone.radius ?? 1) * 2);
    return Math.hypot(dx, dz) <= (zone.radius ?? 1) && Math.abs(dy) <= height / 2;
  }
  const size = zone.size ?? [2, 2, 2];
  return Math.abs(dx) <= Math.abs(size[0]) / 2
    && Math.abs(dy) <= Math.abs(size[1]) / 2
    && Math.abs(dz) <= Math.abs(size[2]) / 2;
}

export function interactionEventFor(condition: DreamCondition): PlayGraphEvent | null {
  switch (condition.kind) {
    case "interacted": return { kind: "interacted", targetId: condition.targetId };
    case "entity_state": return { kind: "entity_state", entityId: condition.entityId, state: condition.state };
    case "item_collected": return { kind: "item_collected", itemId: condition.itemId, count: 1 };
    case "item_delivered": return { kind: "item_delivered", itemId: condition.itemId, targetId: condition.targetId };
    default: return null;
  }
}

export function zoneEntryEventsFor(
  conditions: readonly DreamCondition[],
  zones: readonly DreamZone[],
  point: WorldPoint,
): PlayGraphEvent[] {
  return conditions.flatMap((condition) => {
    if (condition.kind !== "zone_entered") return [];
    const zone = zones.find(({ id }) => id === condition.zoneId);
    return zone && pointIsInsideZone(point, zone)
      ? [{ kind: "zone_entered" as const, zoneId: condition.zoneId }]
      : [];
  });
}

export function placedObjectEventFor(
  conditions: readonly DreamCondition[],
  zones: readonly DreamZone[],
  point: WorldPoint,
): PlayGraphEvent | null {
  for (const condition of conditions) {
    if (condition.kind !== "object_placed") continue;
    const zone = zones.find(({ id }) => id === condition.zoneId);
    if (zone && pointIsInsideZone(point, zone)) {
      return { kind: "object_placed", itemId: condition.itemId, zoneId: condition.zoneId };
    }
  }
  return null;
}

export function objectiveWorldTarget(
  condition: DreamCondition | undefined,
  zones: readonly DreamZone[],
): readonly [number, number, number] | null {
  if (condition?.kind !== "zone_entered" && condition?.kind !== "object_placed") return null;
  return zones.find(({ id }) => id === condition.zoneId)?.center ?? null;
}
