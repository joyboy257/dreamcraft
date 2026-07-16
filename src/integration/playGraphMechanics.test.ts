import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, type DreamSpecV1 } from "../dream";
import { createPlayGraphRuntime } from "../gameplay";
import {
  interactionEventFor,
  objectiveWorldTarget,
  placedObjectEventFor,
  pointIsInsideZone,
  resolveDialogueResponse,
  zoneEntryEventsFor,
} from "./playGraphMechanics";

const zones: DreamSpecV1["world"]["zones"] = [
  { id: "stage", kind: "box", center: [4, 2, -3], size: [4, 4, 4], tags: [] },
  { id: "sky", kind: "sphere", center: [0, 10, 0], radius: 3, tags: [] },
];

describe("physical PlayGraph mechanics", () => {
  it("derives zone progress from the player's real world position", () => {
    expect(pointIsInsideZone({ x: 4, y: 2, z: -3 }, zones[0]!)).toBe(true);
    expect(zoneEntryEventsFor(
      [{ kind: "zone_entered", zoneId: "sky" }],
      zones,
      { x: 0, y: 11, z: 1 },
    )).toEqual([{ kind: "zone_entered", zoneId: "sky" }]);
    expect(objectiveWorldTarget({ kind: "zone_entered", zoneId: "stage" }, zones)).toEqual([4, 2, -3]);
  });

  it("counts only a successful block placement inside the required zone", () => {
    const condition = { kind: "object_placed", itemId: "sugar-note", zoneId: "stage" } as const;
    expect(placedObjectEventFor([condition], zones, { x: 5, y: 2, z: -2 })).toEqual({
      kind: "object_placed",
      itemId: "sugar-note",
      zoneId: "stage",
    });
    expect(placedObjectEventFor([condition], zones, { x: 20, y: 2, z: -2 })).toBeNull();
  });

  it("maps a physical interaction to only the single pending condition", () => {
    expect(interactionEventFor({ kind: "entity_state", entityId: "teapot", state: "handle-fixed" }))
      .toEqual({ kind: "entity_state", entityId: "teapot", state: "handle-fixed" });
    expect(interactionEventFor({ kind: "zone_entered", zoneId: "stage" })).toBeNull();
  });

  it("resolves duplicate response IDs only inside the displayed dialogue node", () => {
    const dialogues: DreamSpecV1["dialogues"] = [{
      id: "guide",
      speakerEntityId: "hero",
      trigger: "interact",
      startNodeId: "first",
      nodes: [
        {
          id: "first",
          text: "First question",
          responses: [{
            id: "yes",
            text: "First yes",
            nextNodeId: "second",
            effects: [{ kind: "set_flag", id: "first-choice", value: true }],
          }],
        },
        {
          id: "second",
          text: "Second question",
          responses: [{
            id: "yes",
            text: "Second yes",
            effects: [{ kind: "set_flag", id: "second-choice", value: true }],
          }],
        },
      ],
    }];

    const selected = resolveDialogueResponse(dialogues, "guide", "second", "yes");
    expect(selected).toMatchObject({
      nodeId: "second",
      response: { text: "Second yes", effects: [{ id: "second-choice" }] },
    });
  });

  it("completes all six G4 dreams through their real physical input adapters", async () => {
    const cases = [
      ["A candy forest where every jump bounces and sugar trees sing.", "object_placed", 3],
      ["A flying city threaded by strong sky winds above the clouds.", "zone_entered", 2],
      ["A flooded school nightmare where I escape a hallway shadow.", "zone_entered", 3],
      ["A talking moon teapot guarded by a grumpy silver spoon.", "entity_state", 2],
      ["A memory where I find my lost dog and bring him home.", "zone_entered", 2],
      ["My family wins the lottery and dances on a bright stage.", "zone_entered", 4],
    ] as const;
    const provider = new MockLocalGenerationProvider();

    for (const [dreamText, expectedKind, expectedActions] of cases) {
      const generated = await provider.generate({
        dreamText,
        intensity: "vivid",
        strategy: "mock-local",
        clientRequestId: `physical-${expectedKind}-${expectedActions}`,
      }, new AbortController().signal);
      const runtime = createPlayGraphRuntime(generated.core.playGraph);
      let actions = 0;

      while (runtime.getSnapshot().endingId === null && actions < 8) {
        const condition = runtime.getSnapshot().pendingConditions[0];
        expect(condition?.kind).toBe(expectedKind);
        if (!condition) break;
        if (condition.kind === "zone_entered") {
          const target = objectiveWorldTarget(condition, generated.core.world.zones);
          expect(target).not.toBeNull();
          const event = zoneEntryEventsFor(
            [condition],
            generated.core.world.zones,
            { x: target![0], y: target![1], z: target![2] },
          )[0];
          expect(event).toBeDefined();
          runtime.record(event!);
        } else if (condition.kind === "object_placed") {
          const target = objectiveWorldTarget(condition, generated.core.world.zones);
          expect(target).not.toBeNull();
          const event = placedObjectEventFor(
            [condition],
            generated.core.world.zones,
            { x: target![0], y: target![1], z: target![2] },
          );
          expect(event).not.toBeNull();
          runtime.record(event!);
        } else {
          const event = interactionEventFor(condition);
          expect(event).not.toBeNull();
          runtime.record(event!);
        }
        actions += 1;
      }

      expect(actions).toBe(expectedActions);
      expect(runtime.getSnapshot().endingId).toBe(generated.core.playGraph.endings[0]!.id);
    }
  });

  it("routes a physical branch when a nonphysical branch appears first in any", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a fork with a hidden flag or a visible exit",
      intensity: "calm",
      strategy: "mock-local",
      clientRequestId: "physical-any",
    }, new AbortController().signal);
    const graph = structuredClone(generated.core.playGraph);
    graph.variables.push({
      id: "hidden-route",
      displayName: "Hidden route",
      type: "boolean",
      initialValue: false,
      showInHud: false,
    });
    graph.beats[0]!.completesWhen = {
      kind: "any",
      conditions: [
        { kind: "flag", id: "hidden-route", equals: true },
        { kind: "zone_entered", zoneId: "visible-exit" },
      ],
    };
    graph.beats[0]!.onComplete = [{
      kind: "complete_experience",
      endingId: graph.endings[0]!.id,
    }];
    graph.endings[0]!.condition = graph.beats[0]!.completesWhen;
    const runtime = createPlayGraphRuntime(graph);
    const branchZones: DreamSpecV1["world"]["zones"] = [{
      id: "visible-exit",
      kind: "sphere",
      center: [3, 4, 5],
      radius: 2,
      tags: [],
    }];

    expect(runtime.getSnapshot().pendingConditions.map(({ kind }) => kind)).toEqual(["flag", "zone_entered"]);
    const event = zoneEntryEventsFor(
      runtime.getSnapshot().pendingConditions,
      branchZones,
      { x: 3, y: 4, z: 5 },
    )[0];
    expect(event).toEqual({ kind: "zone_entered", zoneId: "visible-exit" });
    expect(runtime.record(event!).endingId).toBe(graph.endings[0]!.id);
  });
});
