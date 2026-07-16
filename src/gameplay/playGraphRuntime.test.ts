import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, type DreamCondition } from "../dream";
import { createPlayGraphRuntime, type PlayGraphEvent } from "./playGraphRuntime";

function eventFor(condition: DreamCondition): PlayGraphEvent {
  switch (condition.kind) {
    case "interacted": return { kind: "interacted", targetId: condition.targetId };
    case "dialogue_completed": return { kind: "dialogue_completed", dialogueId: condition.dialogueId };
    case "response_chosen": return { kind: "response_chosen", dialogueId: condition.dialogueId, responseId: condition.responseId };
    case "item_collected": return { kind: "item_collected", itemId: condition.itemId, count: condition.count };
    case "item_delivered": return { kind: "item_delivered", itemId: condition.itemId, targetId: condition.targetId };
    case "object_placed": return { kind: "object_placed", itemId: condition.itemId, zoneId: condition.zoneId };
    case "zone_entered": return { kind: "zone_entered", zoneId: condition.zoneId };
    case "entity_state": return { kind: "entity_state", entityId: condition.entityId, state: condition.state };
    case "timer_elapsed": return { kind: "timer_elapsed", timerId: condition.timerId, seconds: condition.seconds };
    default: throw new Error(`Condition ${condition.kind} has no external event.`);
  }
}

describe("play graph runtime", () => {
  it("executes trusted beat conditions and effects rather than treating them as copy", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a talking moon teapot guarded by a spoon",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "play-graph",
    }, new AbortController().signal);
    generated.core.playGraph.endings[0]!.effects.push({ kind: "show_message", text: "Ending effect applied." });
    const runtime = createPlayGraphRuntime(generated.core.playGraph);

    expect(runtime.getSnapshot().activeBeatIds).toHaveLength(1);
    let completed = runtime.getSnapshot();
    while (completed.endingId === null) {
      const pending = completed.pendingConditions[0];
      if (!pending) throw new Error("PlayGraph has no physical event pending.");
      completed = runtime.record(eventFor(pending));
    }
    expect(completed.completedBeatIds).toEqual(generated.core.playGraph.beats.map(({ id }) => id));
    expect(completed.endingId).toBe(generated.core.playGraph.endings[0]!.id);
    expect(completed.emittedEffects.some(({ kind }) => kind === "transform_structure")).toBe(true);
    expect(completed.emittedEffects).toContainEqual({ kind: "show_message", text: "Ending effect applied." });
  });

  it("accepts the bounded external event vocabulary", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a stable event test",
      intensity: "calm",
      strategy: "mock-local",
      clientRequestId: "events",
    }, new AbortController().signal);
    const cases: Array<[DreamCondition, PlayGraphEvent]> = [
      [{ kind: "dialogue_completed", dialogueId: "dialogue" }, { kind: "dialogue_completed", dialogueId: "dialogue" }],
      [{ kind: "response_chosen", dialogueId: "dialogue", responseId: "yes" }, { kind: "response_chosen", dialogueId: "dialogue", responseId: "yes" }],
      [{ kind: "item_collected", itemId: "star", count: 2 }, { kind: "item_collected", itemId: "star", count: 2 }],
      [{ kind: "item_delivered", itemId: "star", targetId: "home" }, { kind: "item_delivered", itemId: "star", targetId: "home" }],
      [{ kind: "object_placed", itemId: "star", zoneId: "stage" }, { kind: "object_placed", itemId: "star", zoneId: "stage" }],
      [{ kind: "zone_entered", zoneId: "stage" }, { kind: "zone_entered", zoneId: "stage" }],
      [{ kind: "entity_state", entityId: "dog", state: "home" }, { kind: "entity_state", entityId: "dog", state: "home" }],
      [{ kind: "timer_elapsed", timerId: "escape", seconds: 3 }, { kind: "timer_elapsed", timerId: "escape", seconds: 3 }],
    ];
    for (const [condition, event] of cases) {
      const graph = structuredClone(generated.core.playGraph);
      graph.beats[0]!.completesWhen = condition;
      graph.endings[0]!.condition = condition;
      expect(createPlayGraphRuntime(graph).record(event).endingId).toBe(graph.endings[0]!.id);
    }
  });

  it("recomputes primary actions for later beats and satisfies composite all conditions", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a two chapter delivery ritual",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "sequence",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    const first = graph.beats[0]!;
    first.onComplete = [];
    graph.beats.push({
      ...structuredClone(first),
      id: "second_ritual",
      startsWhen: { kind: "interacted", targetId: "activate_beacon" },
      completesWhen: {
        kind: "all",
        conditions: [
          { kind: "item_delivered", itemId: "memory", targetId: "home" },
          { kind: "zone_entered", zoneId: "festival" },
        ],
      },
      onComplete: [{ kind: "complete_experience", endingId: graph.endings[0]!.id }],
    });
    graph.endings[0]!.condition = graph.beats[1]!.completesWhen;
    const runtime = createPlayGraphRuntime(graph);

    runtime.record(eventFor(runtime.getSnapshot().pendingConditions[0]!));
    runtime.record({ kind: "interacted", targetId: "activate_beacon" });
    expect(runtime.getSnapshot().activeBeatIds).toEqual(["second_ritual"]);
    runtime.record({ kind: "item_delivered", itemId: "memory", targetId: "home" });
    const completed = runtime.record({ kind: "zone_entered", zoneId: "festival" });
    expect(completed.completedBeatIds).toEqual([first.id, "second_ritual"]);
    expect(completed.endingId).toBe(graph.endings[0]!.id);
  });

  it("starts dialogue-gated beats only after the real dialogue events arrive", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a dialogue-gated dream",
      intensity: "calm",
      strategy: "mock-local",
      clientRequestId: "dialogue-gate",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    graph.beats[0]!.startsWhen = {
      kind: "response_chosen",
      dialogueId: "guide-dialogue",
      responseId: "yes",
    };
    const runtime = createPlayGraphRuntime(graph);

    expect(runtime.getSnapshot().activeBeatIds).toEqual([]);
    runtime.record({ kind: "dialogue_completed", dialogueId: "guide-dialogue" });
    expect(runtime.getSnapshot().activeBeatIds).toEqual([]);
    runtime.record({ kind: "response_chosen", dialogueId: "guide-dialogue", responseId: "yes" });
    expect(runtime.getSnapshot().activeBeatIds).toEqual([graph.beats[0]!.id]);
  });

  it("selects the ending whose real condition or completion effect resolved", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a branching ending dream",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "branching-ending",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    graph.beats[0]!.completesWhen = { kind: "interacted", targetId: "left-door" };
    graph.beats[0]!.onComplete = [{ kind: "complete_experience", endingId: "left-ending" }];
    graph.endings = [
      { ...graph.endings[0]!, id: "right-ending", condition: { kind: "interacted", targetId: "right-door" } },
      { ...graph.endings[0]!, id: "left-ending", condition: { kind: "interacted", targetId: "left-door" } },
    ];

    expect(createPlayGraphRuntime(graph).record({ kind: "interacted", targetId: "left-door" }).endingId)
      .toBe("left-ending");
  });

  it("applies trusted dialogue effects to graph state before continuing", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a dialogue effect dream",
      intensity: "calm",
      strategy: "mock-local",
      clientRequestId: "dialogue-effects",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    graph.variables.push({
      id: "accepted",
      displayName: "Accepted",
      type: "boolean",
      initialValue: false,
      showInHud: false,
    });
    graph.beats[0]!.startsWhen = { kind: "flag", id: "accepted", equals: true };
    const runtime = createPlayGraphRuntime(graph);

    const snapshot = runtime.applyEffects([
      { kind: "set_flag", id: "accepted", value: true },
      { kind: "unlock_interaction", interactionId: "moon-door" },
      { kind: "give_item", itemId: "silver-key", count: 1 },
    ]);

    expect(snapshot.activeBeatIds).toEqual([graph.beats[0]!.id]);
    expect(snapshot.unlockedInteractionIds).toContain("moon-door");
    expect(snapshot.inventory["silver-key"]).toBe(1);
  });

  it("never lets an optional concurrent beat block the required objective", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a required route with an optional secret",
      intensity: "calm",
      strategy: "mock-local",
      clientRequestId: "optional-priority",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    const base = graph.beats[0]!;
    graph.beats = [
      {
        ...structuredClone(base),
        id: "optional-secret",
        startsWhen: { kind: "always" },
        completesWhen: { kind: "interacted", targetId: "secret" },
        onComplete: [],
        optional: true,
      },
      {
        ...structuredClone(base),
        id: "required-route",
        startsWhen: { kind: "always" },
        completesWhen: { kind: "zone_entered", zoneId: "exit" },
        onComplete: [{ kind: "complete_experience", endingId: graph.endings[0]!.id }],
        optional: false,
      },
    ];
    graph.endings[0]!.condition = { kind: "zone_entered", zoneId: "exit" };
    const runtime = createPlayGraphRuntime(graph);

    expect(runtime.getSnapshot().activeBeatIds).toEqual(["optional-secret", "required-route"]);
    expect(runtime.getSnapshot().activeBeat?.id).toBe("required-route");
    expect(runtime.getSnapshot().pendingConditions[0]).toEqual({ kind: "zone_entered", zoneId: "exit" });
    expect(runtime.record({ kind: "zone_entered", zoneId: "exit" }).endingId)
      .toBe(graph.endings[0]!.id);
  });

  it("commits a dialogue response and its branch effects before selecting an ending", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a dialogue choice with two endings",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "atomic-response",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    graph.variables.push({
      id: "chose-kindness",
      displayName: "Kindness",
      type: "boolean",
      initialValue: false,
      showInHud: false,
    });
    graph.beats[0]!.completesWhen = {
      kind: "response_chosen",
      dialogueId: "guide",
      responseId: "kind",
    };
    graph.beats[0]!.onComplete = [];
    graph.endings = [
      {
        ...graph.endings[0]!,
        id: "kind-ending",
        condition: { kind: "flag", id: "chose-kindness", equals: true },
      },
      {
        ...graph.endings[0]!,
        id: "fallback-ending",
        condition: {
          kind: "response_chosen",
          dialogueId: "guide",
          responseId: "kind",
        },
      },
    ];
    const runtime = createPlayGraphRuntime(graph);

    const snapshot = runtime.recordWithEffects(
      { kind: "response_chosen", dialogueId: "guide", responseId: "kind" },
      [{ kind: "set_flag", id: "chose-kindness", value: true }],
    );

    expect(snapshot.endingId).toBe("kind-ending");
  });
});
