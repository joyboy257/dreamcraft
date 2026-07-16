import { TypedEventBus } from "./eventBus";
import type {
  DialogueView,
  DreamArcSnapshot,
  EndingView,
  GameplayEvent,
  ObjectiveView,
  WorldTransformationView,
} from "./types";

export const DREAM_GUIDE_ID = "dream-guide";
export const DREAM_BEACON_ID = "moonwell-beacon";
export const GUIDE_DIALOGUE_ID = "guide-invitation";
export const GUIDE_RESPONSE_ID = "follow-the-light";

const MEET_OBJECTIVE: ObjectiveView = {
  id: "meet-guide",
  title: "Meet the Dream Guide",
  description: "Approach the glowing guardian and interact.",
  current: 0,
  target: 1,
  completed: false,
};

const AWAKEN_OBJECTIVE: ObjectiveView = {
  id: "awaken-beacon",
  title: "Awaken the Moonwell",
  description: "Follow the guide's light and interact with the moonwell beacon.",
  current: 0,
  target: 1,
  completed: false,
};

const GUIDE_DIALOGUE: DialogueView = {
  id: GUIDE_DIALOGUE_ID,
  speaker: "The Lantern Keeper",
  text: "The dream remembers you. Will you wake its sleeping moonwell?",
  responses: [{ id: GUIDE_RESPONSE_ID, label: "I will follow the light." }],
};

const TRANSFORMATION: WorldTransformationView = {
  id: "moonwell-awakening",
  structureId: DREAM_BEACON_ID,
  structureState: "blooming",
  physicsTransitionId: "gentle-lift",
  atmospherePatchId: "dawn-bloom",
  durationMs: 2_400,
};

const ENDING: EndingView = {
  id: "light-restored",
  title: "The Dream Remembers",
  narration:
    "The moonwell opens like a silver flower, and the quiet world rises to meet the dawn.",
};

export interface DreamArcDefinition {
  meetObjective: ObjectiveView;
  awakenObjective: ObjectiveView;
  dialogue: DialogueView;
  transformation: WorldTransformationView;
  ending: EndingView;
}

export interface DreamArcNarrativeEnrichment {
  dialogueText: string;
  endingNarration: string;
}

export const DEFAULT_DREAM_ARC_DEFINITION: DreamArcDefinition = {
  meetObjective: MEET_OBJECTIVE,
  awakenObjective: AWAKEN_OBJECTIVE,
  dialogue: GUIDE_DIALOGUE,
  transformation: TRANSFORMATION,
  ending: ENDING,
};

function copyObjective(objective: ObjectiveView): ObjectiveView {
  return { ...objective };
}

function copyDialogue(dialogue: DialogueView): DialogueView {
  return {
    ...dialogue,
    responses: dialogue.responses.map((response) => ({ ...response })),
  };
}

export class DreamArcController {
  readonly #bus: TypedEventBus<GameplayEvent>;
  readonly #definition: DreamArcDefinition;
  readonly #unsubscribe: readonly (() => void)[];
  #snapshot: DreamArcSnapshot;
  #disposed = false;

  constructor(
    bus: TypedEventBus<GameplayEvent>,
    definition: DreamArcDefinition = DEFAULT_DREAM_ARC_DEFINITION,
  ) {
    this.#bus = bus;
    this.#definition = {
      meetObjective: copyObjective(definition.meetObjective),
      awakenObjective: copyObjective(definition.awakenObjective),
      dialogue: copyDialogue(definition.dialogue),
      transformation: { ...definition.transformation },
      ending: { ...definition.ending },
    };
    this.#snapshot = {
      phase: "meet_guide",
      objective: copyObjective(this.#definition.meetObjective),
      dialogue: null,
      transformation: null,
      ending: null,
      revision: 0,
    };
    this.#unsubscribe = [
      bus.on("entity_interacted", (event) => {
        this.#handleInteraction(event.entityId);
      }),
      bus.on("dialogue_response", (event) => {
        this.#handleDialogueResponse(event.dialogueId, event.responseId);
      }),
    ];
  }

  getSnapshot(): DreamArcSnapshot {
    return {
      ...this.#snapshot,
      objective: copyObjective(this.#snapshot.objective),
      dialogue: this.#snapshot.dialogue
        ? copyDialogue(this.#snapshot.dialogue)
        : null,
      transformation: this.#snapshot.transformation
        ? { ...this.#snapshot.transformation }
        : null,
      ending: this.#snapshot.ending ? { ...this.#snapshot.ending } : null,
    };
  }

  reset(): void {
    if (this.#disposed) return;
    this.#snapshot = {
      phase: "meet_guide",
      objective: copyObjective(this.#definition.meetObjective),
      dialogue: null,
      transformation: null,
      ending: null,
      revision: this.#snapshot.revision + 1,
    };
    this.#bus.emit({
      type: "objective_changed",
      objective: copyObjective(this.#snapshot.objective),
    });
  }

  applyNarrativeEnrichment(
    enrichment: DreamArcNarrativeEnrichment,
  ): boolean {
    if (this.#disposed) return false;
    let applied = false;
    if (this.#snapshot.phase === "meet_guide" && !this.#snapshot.dialogue) {
      this.#definition.dialogue = {
        ...this.#definition.dialogue,
        text: enrichment.dialogueText,
      };
      applied = true;
    }
    if (this.#snapshot.phase !== "completed") {
      this.#definition.ending = {
        ...this.#definition.ending,
        narration: enrichment.endingNarration,
      };
      applied = true;
    }
    return applied;
  }

  syncAwakenObjective(objective: ObjectiveView): void {
    if (this.#disposed || this.#snapshot.phase !== "awaken_beacon") return;
    const next = copyObjective(objective);
    this.#snapshot = {
      ...this.#snapshot,
      objective: next,
      revision: this.#snapshot.revision + 1,
    };
    this.#bus.emit({ type: "objective_changed", objective: next });
  }

  completeFromPlayGraph(ending: EndingView): void {
    if (this.#disposed || this.#snapshot.phase !== "awaken_beacon") return;
    this.#completeArc(ending);
  }

  openContextDialogue(dialogue: DialogueView): void {
    if (this.#disposed || this.#snapshot.phase !== "awaken_beacon" || this.#snapshot.dialogue) return;
    const next = copyDialogue(dialogue);
    this.#snapshot = {
      ...this.#snapshot,
      dialogue: next,
      revision: this.#snapshot.revision + 1,
    };
    this.#bus.emit({ type: "dialogue_opened", dialogue: next });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const unsubscribe of this.#unsubscribe) unsubscribe();
  }

  #handleInteraction(entityId: string): void {
    if (this.#disposed) return;

    if (this.#snapshot.phase === "meet_guide" && entityId === DREAM_GUIDE_ID) {
      if (this.#snapshot.dialogue) return;
      const objective = { ...this.#definition.meetObjective, current: 1, completed: true };
      const dialogue = copyDialogue(this.#definition.dialogue);
      this.#snapshot = {
        ...this.#snapshot,
        objective,
        dialogue,
        revision: this.#snapshot.revision + 1,
      };
      this.#bus.emit({
        type: "entity_state_changed",
        entityId: DREAM_GUIDE_ID,
        state: "listening",
      });
      this.#bus.emit({ type: "objective_changed", objective });
      this.#bus.emit({ type: "dialogue_opened", dialogue });
      return;
    }

    if (
      this.#snapshot.phase === "awaken_beacon" &&
      entityId === DREAM_BEACON_ID
    ) {
      const current = Math.min(
        this.#definition.awakenObjective.target,
        this.#snapshot.objective.current + 1,
      );
      if (current < this.#definition.awakenObjective.target) {
        const objective = { ...this.#snapshot.objective, current };
        this.#snapshot = {
          ...this.#snapshot,
          objective,
          revision: this.#snapshot.revision + 1,
        };
        this.#bus.emit({ type: "objective_changed", objective });
      } else {
        this.#completeArc();
      }
    }
  }

  #handleDialogueResponse(dialogueId: string, responseId: string): void {
    if (
      !this.#disposed &&
      this.#snapshot.phase === "awaken_beacon" &&
      this.#snapshot.dialogue?.id === dialogueId &&
      this.#snapshot.dialogue.responses.some(({ id }) => id === responseId)
    ) {
      this.#snapshot = {
        ...this.#snapshot,
        dialogue: null,
        revision: this.#snapshot.revision + 1,
      };
      this.#bus.emit({ type: "dialogue_closed", dialogueId });
      return;
    }
    if (
      this.#disposed ||
      this.#snapshot.phase !== "meet_guide" ||
      this.#snapshot.dialogue?.id !== dialogueId ||
      dialogueId !== this.#definition.dialogue.id ||
      !this.#definition.dialogue.responses.some(({ id }) => id === responseId)
    ) {
      return;
    }

    const objective = copyObjective(this.#definition.awakenObjective);
    this.#snapshot = {
      ...this.#snapshot,
      phase: "awaken_beacon",
      objective,
      dialogue: null,
      revision: this.#snapshot.revision + 1,
    };
    this.#bus.emit({ type: "dialogue_closed", dialogueId });
    this.#bus.emit({ type: "objective_changed", objective });
    this.#bus.emit({
      type: "entity_state_changed",
      entityId: DREAM_GUIDE_ID,
      state: "guiding",
    });
  }

  #completeArc(endingOverride?: EndingView): void {
    const objective = {
      ...this.#snapshot.objective,
      current: this.#snapshot.objective.target,
      completed: true,
    };
    const transformation = { ...this.#definition.transformation };
    const ending = { ...(endingOverride ?? this.#definition.ending) };
    this.#snapshot = {
      phase: "completed",
      objective,
      dialogue: null,
      transformation,
      ending,
      revision: this.#snapshot.revision + 1,
    };

    this.#bus.emit({ type: "objective_changed", objective });
    this.#bus.emit({
      type: "world_transformation_started",
      transformation,
    });
    this.#bus.emit({
      type: "entity_state_changed",
      entityId: DREAM_GUIDE_ID,
      state: "celebrating",
    });
    this.#bus.emit({ type: "ending_reached", ending });
  }
}

export function createDreamArc(
  bus: TypedEventBus<GameplayEvent>,
  definition?: DreamArcDefinition,
): DreamArcController {
  return new DreamArcController(bus, definition);
}
