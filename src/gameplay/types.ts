export interface DialogueResponseView {
  readonly id: string;
  readonly label: string;
}

export interface DialogueView {
  readonly id: string;
  readonly speaker: string;
  readonly text: string;
  readonly responses: readonly DialogueResponseView[];
}

export interface ObjectiveView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

export interface WorldTransformationView {
  readonly id: string;
  readonly structureId: string;
  readonly structureState: string;
  readonly physicsTransitionId: string;
  readonly atmospherePatchId: string;
  readonly durationMs: number;
}

export interface EndingView {
  readonly id: string;
  readonly title: string;
  readonly narration: string;
}

export type DreamArcPhase =
  | "meet_guide"
  | "awaken_beacon"
  | "completed";

export interface DreamArcSnapshot {
  readonly phase: DreamArcPhase;
  readonly objective: ObjectiveView;
  readonly dialogue: DialogueView | null;
  readonly transformation: WorldTransformationView | null;
  readonly ending: EndingView | null;
  readonly revision: number;
}

export type GameplayEvent =
  | { readonly type: "entity_interacted"; readonly entityId: string }
  | {
      readonly type: "dialogue_response";
      readonly dialogueId: string;
      readonly responseId: string;
    }
  | {
      readonly type: "entity_state_changed";
      readonly entityId: string;
      readonly state: string;
    }
  | { readonly type: "dialogue_opened"; readonly dialogue: DialogueView }
  | { readonly type: "dialogue_closed"; readonly dialogueId: string }
  | { readonly type: "objective_changed"; readonly objective: ObjectiveView }
  | {
      readonly type: "world_transformation_started";
      readonly transformation: WorldTransformationView;
    }
  | { readonly type: "ending_reached"; readonly ending: EndingView };
