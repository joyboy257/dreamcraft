import type { DreamCondition, DreamSpecV1 } from "../dream";

type PlayGraph = DreamSpecV1["playGraph"];
type GameEffect = PlayGraph["beats"][number]["onComplete"][number];

export type PlayGraphEvent =
  | { kind: "interacted"; targetId: string }
  | { kind: "dialogue_completed"; dialogueId: string }
  | { kind: "response_chosen"; dialogueId: string; responseId: string }
  | { kind: "item_collected"; itemId: string; count: number }
  | { kind: "item_delivered"; itemId: string; targetId: string }
  | { kind: "object_placed"; itemId: string; zoneId: string }
  | { kind: "zone_entered"; zoneId: string }
  | { kind: "entity_state"; entityId: string; state: string }
  | { kind: "timer_elapsed"; timerId: string; seconds: number };

export interface PlayGraphRuntimeSnapshot {
  readonly activeBeat: {
    readonly id: string;
    readonly title: string;
    readonly objectiveText: string;
  } | null;
  readonly activeBeatIds: readonly string[];
  readonly completedBeatIds: readonly string[];
  readonly pendingConditions: readonly DreamCondition[];
  readonly variables: Readonly<Record<string, boolean | number>>;
  readonly endingId: string | null;
  readonly emittedEffects: readonly GameEffect[];
  readonly inventory: Readonly<Record<string, number>>;
  readonly unlockedInteractionIds: readonly string[];
}

export interface PlayGraphRuntime {
  applyEffects(effects: readonly GameEffect[]): PlayGraphRuntimeSnapshot;
  record(event: PlayGraphEvent): PlayGraphRuntimeSnapshot;
  recordWithEffects(event: PlayGraphEvent, effects: readonly GameEffect[]): PlayGraphRuntimeSnapshot;
  getSnapshot(): PlayGraphRuntimeSnapshot;
}

export function createPlayGraphRuntime(graph: PlayGraph): PlayGraphRuntime {
  const variables = new Map<string, boolean | number>(
    graph.variables.map(({ id, initialValue }) => [id, initialValue]),
  );
  const facts = new Set<string>();
  const counts = new Map<string, number>();
  const active = new Set<string>();
  const completed = new Set<string>();
  const emitted: GameEffect[] = [];
  const inventory = new Map<string, number>();
  const unlocked = new Set<string>();
  let endingId: string | null = null;
  let endingEffectsApplied = false;

  const key = (...parts: string[]): string => parts.join(":");
  const compare = (actual: number, operator: ">=" | "==" | "<=", expected: number): boolean =>
    operator === ">=" ? actual >= expected : operator === "<=" ? actual <= expected : actual === expected;
  const matches = (condition: DreamCondition): boolean => {
    switch (condition.kind) {
      case "always": return true;
      case "flag": return variables.get(condition.id) === condition.equals;
      case "counter":
      case "meter": return compare(Number(variables.get(condition.id) ?? 0), condition.operator, condition.value);
      case "interacted": return facts.has(key("interacted", condition.targetId));
      case "dialogue_completed": return facts.has(key("dialogue", condition.dialogueId));
      case "response_chosen": return facts.has(key("response", condition.dialogueId, condition.responseId));
      case "item_collected": return (counts.get(key("collected", condition.itemId)) ?? 0) >= condition.count;
      case "item_delivered": return facts.has(key("delivered", condition.itemId, condition.targetId));
      case "object_placed": return facts.has(key("placed", condition.itemId, condition.zoneId));
      case "zone_entered": return facts.has(key("zone", condition.zoneId));
      case "entity_state": return facts.has(key("entity", condition.entityId, condition.state));
      case "timer_elapsed": return (counts.get(key("timer", condition.timerId)) ?? 0) >= condition.seconds;
      case "all": return condition.conditions.every(matches);
      case "any": return condition.conditions.some(matches);
    }
  };
  const apply = (effect: GameEffect): void => {
    emitted.push(structuredClone(effect));
    if (effect.kind === "set_flag") variables.set(effect.id, effect.value);
    if (effect.kind === "change_counter" || effect.kind === "change_meter") {
      variables.set(effect.id, Number(variables.get(effect.id) ?? 0) + effect.amount);
    }
    if (effect.kind === "set_entity_state") facts.add(key("entity", effect.entityId, effect.state));
    if (effect.kind === "give_item") inventory.set(effect.itemId, (inventory.get(effect.itemId) ?? 0) + effect.count);
    if (effect.kind === "remove_item") inventory.set(effect.itemId, Math.max(0, (inventory.get(effect.itemId) ?? 0) - effect.count));
    if (effect.kind === "unlock_interaction") unlocked.add(effect.interactionId);
    if (effect.kind === "complete_experience") endingId = effect.endingId;
  };
  const advance = (): void => {
    for (const beat of graph.beats) {
      if (!active.has(beat.id) && !completed.has(beat.id) && matches(beat.startsWhen)) {
        active.add(beat.id);
        beat.onStart.forEach(apply);
      }
      if (active.has(beat.id) && matches(beat.completesWhen)) {
        active.delete(beat.id);
        completed.add(beat.id);
        beat.onComplete.forEach(apply);
      } else if (active.has(beat.id)) {
        beat.onProgress.forEach(apply);
      }
    }
    const ending = graph.endings.find(({ condition }) => matches(condition));
    if (ending && !endingEffectsApplied) {
      endingEffectsApplied = true;
      ending.effects.forEach(apply);
      if (endingId === null) endingId = ending.id;
    }
  };
  const activeBeats = () => graph.beats
    .filter(({ id }) => active.has(id))
    .sort((left, right) => Number(left.optional) - Number(right.optional));
  const activeBeat = () => activeBeats()[0] ?? null;
  const pendingFor = (condition: DreamCondition): DreamCondition[] => {
    if (matches(condition)) return [];
    if (condition.kind === "all") return condition.conditions.flatMap(pendingFor);
    if (condition.kind === "any") return condition.conditions.flatMap(pendingFor);
    return [structuredClone(condition)];
  };
  const snapshot = (): PlayGraphRuntimeSnapshot => ({
    activeBeat: activeBeat()
      ? {
          id: activeBeat()!.id,
          title: activeBeat()!.title,
          objectiveText: activeBeat()!.objectiveText,
        }
      : null,
    activeBeatIds: [...active],
    completedBeatIds: [...completed],
    pendingConditions: activeBeats().flatMap(({ completesWhen }) => pendingFor(completesWhen)),
    variables: Object.fromEntries(variables),
    endingId,
    emittedEffects: emitted.map((effect) => structuredClone(effect)),
    inventory: Object.fromEntries(inventory),
    unlockedInteractionIds: [...unlocked],
  });
  advance();
  const ingestEvent = (event: PlayGraphEvent): void => {
    switch (event.kind) {
      case "interacted": facts.add(key("interacted", event.targetId)); break;
      case "dialogue_completed": facts.add(key("dialogue", event.dialogueId)); break;
      case "response_chosen": facts.add(key("response", event.dialogueId, event.responseId)); break;
      case "item_collected": counts.set(key("collected", event.itemId), (counts.get(key("collected", event.itemId)) ?? 0) + event.count); break;
      case "item_delivered": facts.add(key("delivered", event.itemId, event.targetId)); break;
      case "object_placed": facts.add(key("placed", event.itemId, event.zoneId)); break;
      case "zone_entered": facts.add(key("zone", event.zoneId)); break;
      case "entity_state": facts.add(key("entity", event.entityId, event.state)); break;
      case "timer_elapsed": counts.set(key("timer", event.timerId), event.seconds); break;
    }
  };
  const recordEvent = (event: PlayGraphEvent): PlayGraphRuntimeSnapshot => {
    ingestEvent(event);
    advance();
    return snapshot();
  };
  return {
    applyEffects(effects) {
      effects.forEach(apply);
      advance();
      return snapshot();
    },
    record: recordEvent,
    recordWithEffects(event, effects) {
      ingestEvent(event);
      effects.forEach(apply);
      advance();
      return snapshot();
    },
    getSnapshot: snapshot,
  };
}
