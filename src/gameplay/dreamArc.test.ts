import { describe, expect, it } from "vitest";

import {
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
