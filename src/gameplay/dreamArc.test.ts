import { describe, expect, it } from "vitest";

import {
  DEFAULT_DREAM_ARC_DEFINITION,
  DREAM_BEACON_ID,
  DREAM_GUIDE_ID,
  GUIDE_DIALOGUE_ID,
  GUIDE_RESPONSE_ID,
  createDreamArc,
} from "./dreamArc";
import { TypedEventBus } from "./eventBus";
import type { GameplayEvent } from "./types";

describe("DreamArcController", () => {
  it("starts with a visible, incomplete objective", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);

    expect(arc.getSnapshot()).toMatchObject({
      phase: "meet_guide",
      objective: {
        id: "meet-guide",
        current: 0,
        target: 1,
        completed: false,
      },
      dialogue: null,
      ending: null,
    });
  });

  it("applies late narrative enrichment at safe pre-event boundaries", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    expect(
      arc.applyNarrativeEnrichment({
        dialogueText: "The enriched guide remembers your paper boat.",
        endingNarration: "The enriched river carries every message home.",
      }),
    ).toBe(true);

    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    expect(arc.getSnapshot().dialogue?.text).toBe(
      "The enriched guide remembers your paper boat.",
    );
    bus.emit({
      type: "dialogue_response",
      dialogueId: GUIDE_DIALOGUE_ID,
      responseId: GUIDE_RESPONSE_ID,
    });
    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    expect(arc.getSnapshot().ending?.narration).toBe(
      "The enriched river carries every message home.",
    );
  });

  it("progresses deterministically from interaction to transformed ending", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    const emittedTypes: string[] = [];
    const outputTypes = [
      "entity_state_changed",
      "objective_changed",
      "dialogue_opened",
      "dialogue_closed",
      "world_transformation_started",
      "ending_reached",
    ] as const;
    for (const type of outputTypes) {
      bus.on(type, (event) => emittedTypes.push(event.type));
    }

    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "meet_guide",
      objective: { completed: true },
      dialogue: { id: GUIDE_DIALOGUE_ID },
    });

    bus.emit({
      type: "dialogue_response",
      dialogueId: GUIDE_DIALOGUE_ID,
      responseId: GUIDE_RESPONSE_ID,
    });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "awaken_beacon",
      objective: { id: "awaken-beacon", completed: false },
      dialogue: null,
    });

    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    const completed = arc.getSnapshot();
    expect(completed).toMatchObject({
      phase: "completed",
      objective: { id: "awaken-beacon", completed: true },
      transformation: {
        id: "moonwell-awakening",
        structureState: "blooming",
      },
      ending: { id: "light-restored" },
    });
    expect(emittedTypes).toEqual([
      "entity_state_changed",
      "objective_changed",
      "dialogue_opened",
      "dialogue_closed",
      "objective_changed",
      "entity_state_changed",
      "objective_changed",
      "world_transformation_started",
      "entity_state_changed",
      "ending_reached",
    ]);
  });

  it("ignores out-of-order, duplicate, and post-disposal events", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    const initialRevision = arc.getSnapshot().revision;

    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    bus.emit({
      type: "dialogue_response",
      dialogueId: GUIDE_DIALOGUE_ID,
      responseId: GUIDE_RESPONSE_ID,
    });
    expect(arc.getSnapshot().revision).toBe(initialRevision);

    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    const openedRevision = arc.getSnapshot().revision;
    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    expect(arc.getSnapshot().revision).toBe(openedRevision);

    arc.dispose();
    bus.emit({
      type: "dialogue_response",
      dialogueId: GUIDE_DIALOGUE_ID,
      responseId: GUIDE_RESPONSE_ID,
    });
    expect(arc.getSnapshot().revision).toBe(openedRevision);
  });

  it("supports contextual multi-action objectives before the climax", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus, {
      ...DEFAULT_DREAM_ARC_DEFINITION,
      awakenObjective: { ...DEFAULT_DREAM_ARC_DEFINITION.awakenObjective, target: 3 },
    });
    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    bus.emit({ type: "dialogue_response", dialogueId: GUIDE_DIALOGUE_ID, responseId: GUIDE_RESPONSE_ID });
    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "awaken_beacon",
      objective: { current: 2, target: 3, completed: false },
    });
    bus.emit({ type: "entity_interacted", entityId: DREAM_BEACON_ID });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "completed",
      objective: { current: 3, target: 3, completed: true },
    });
  });

  it("uses PlayGraph objective progress and the ending selected at runtime", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    bus.emit({ type: "dialogue_response", dialogueId: GUIDE_DIALOGUE_ID, responseId: GUIDE_RESPONSE_ID });

    arc.syncAwakenObjective({
      id: "find-home",
      title: "Follow the pawprints",
      description: "Reach the remembered doorway.",
      current: 1,
      target: 2,
      completed: false,
    });
    expect(arc.getSnapshot().objective).toMatchObject({ id: "find-home", current: 1, target: 2 });

    arc.completeFromPlayGraph({
      id: "reunion-ending",
      title: "Home Again",
      narration: "The remembered dog crosses the doorway.",
    });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "completed",
      objective: { completed: true },
      ending: { id: "reunion-ending", title: "Home Again" },
    });
  });

  it("keeps multi-node contextual dialogue open until its terminal response", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });
    bus.emit({ type: "dialogue_response", dialogueId: GUIDE_DIALOGUE_ID, responseId: GUIDE_RESPONSE_ID });
    arc.openContextDialogue({
      id: "teapot-dialogue",
      speaker: "Moon Teapot",
      text: "Will you mend my handle?",
      responses: [{ id: "mend", label: "I will." }],
    });
    expect(arc.getSnapshot()).toMatchObject({
      phase: "awaken_beacon",
      dialogue: { id: "teapot-dialogue" },
    });

    bus.emit({ type: "dialogue_response", dialogueId: "teapot-dialogue", responseId: "mend" });
    expect(arc.getSnapshot()).toMatchObject({ phase: "awaken_beacon", dialogue: null });
  });

  it("returns defensive snapshot copies", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    bus.emit({ type: "entity_interacted", entityId: DREAM_GUIDE_ID });

    const first = arc.getSnapshot();
    const second = arc.getSnapshot();
    expect(first).not.toBe(second);
    expect(first.objective).not.toBe(second.objective);
    expect(first.dialogue).not.toBe(second.dialogue);
  });

  it("emits the initial objective when reset", () => {
    const bus = new TypedEventBus<GameplayEvent>();
    const arc = createDreamArc(bus);
    let objectiveId: string | null = null;
    bus.on("objective_changed", (event) => {
      objectiveId = event.objective.id;
    });

    arc.reset();

    expect(objectiveId).toBe("meet-guide");
  });
});
