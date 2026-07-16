import type { DreamSpecV1 } from "../dream";

export type DreamScenarioKind =
  | "exploration"
  | "pursuit"
  | "guarded_objective"
  | "flight"
  | "social_reunion"
  | "celebration_ritual"
  | "transformation"
  | "performance";

export interface DreamScenario {
  kind: DreamScenarioKind;
  mechanic: string;
  actionLabel: string;
  guidePrompt: string;
  transformationMessage: string;
  movementSignature: string;
  visualSignature: string;
  actionCount: number;
}

const SCENARIOS: Readonly<Record<DreamScenarioKind, Omit<DreamScenario, "kind">>> = {
  exploration: {
    mechanic: "observe",
    actionLabel: "Reveal the landmark",
    guidePrompt: "Ask where the dream is hiding its secret",
    transformationMessage: "The hidden path answers and the horizon opens.",
    movementSignature: "grounded-search",
    visualSignature: "landmark-path",
    actionCount: 1,
  },
  pursuit: {
    mechanic: "evade",
    actionLabel: "Reach the refuge",
    guidePrompt: "Steady yourself before the chase",
    transformationMessage: "The pursuing shadow breaks into harmless light.",
    movementSignature: "sprint-escape",
    visualSignature: "threat-refuge",
    actionCount: 3,
  },
  guarded_objective: {
    mechanic: "repair",
    actionLabel: "Restore the guarded heart",
    guidePrompt: "Learn how to pass the guardian",
    transformationMessage: "The guardian yields and the protected heart blooms.",
    movementSignature: "approach-and-repair",
    visualSignature: "guardian-gate",
    actionCount: 2,
  },
  flight: {
    mechanic: "fly",
    actionLabel: "Land at the sky beacon",
    guidePrompt: "Learn the wind route",
    transformationMessage: "The skyways ignite from island to island.",
    movementSignature: "aerial-traverse",
    visualSignature: "vertical-skyway",
    actionCount: 1,
  },
  social_reunion: {
    mechanic: "deliver",
    actionLabel: "Bring everyone home",
    guidePrompt: "Ask who is still missing",
    transformationMessage: "Recognition ripples through the dream like warm sunlight.",
    movementSignature: "search-and-return",
    visualSignature: "companion-home",
    actionCount: 2,
  },
  celebration_ritual: {
    mechanic: "emote",
    actionLabel: "Begin the celebration",
    guidePrompt: "Gather the dreamers for the ritual",
    transformationMessage: "Color, confetti, and music roll across the world.",
    movementSignature: "gather-and-celebrate",
    visualSignature: "festival-circle",
    actionCount: 3,
  },
  transformation: {
    mechanic: "activate",
    actionLabel: "Complete the transformation",
    guidePrompt: "Listen for what the world wants to become",
    transformationMessage: "The dream changes shape around your choice.",
    movementSignature: "activate-and-transform",
    visualSignature: "before-after-landmark",
    actionCount: 1,
  },
  performance: {
    mechanic: "perform",
    actionLabel: "Take the dream stage",
    guidePrompt: "Learn the final cue",
    transformationMessage: "The world joins the rhythm and becomes the audience.",
    movementSignature: "timed-performance",
    visualSignature: "stage-audience",
    actionCount: 4,
  },
};

function hasAny(values: ReadonlySet<string>, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}

export function compileDreamScenario(spec: DreamSpecV1): DreamScenario {
  const tags = new Set(spec.playGraph.experienceTags);
  const verbs = new Set(spec.playGraph.availableVerbs.map(({ mechanic }) => mechanic));
  const behaviorKinds = new Set(spec.entities.map(({ behavior }) => behavior.kind));

  let kind: DreamScenarioKind;
  if (hasAny(verbs, ["fly"]) || spec.physics.player.abilities.flight || spec.physics.player.abilities.glide) {
    kind = "flight";
  } else if (hasAny(tags, ["pursuit", "survival"]) || hasAny(verbs, ["evade", "chase", "race"])) {
    kind = "pursuit";
  } else if (behaviorKinds.has("guard") || hasAny(verbs, ["repair", "assemble"])) {
    kind = "guarded_objective";
  } else if (hasAny(tags, ["reunion", "social"]) || hasAny(verbs, ["deliver", "escort"])) {
    kind = "social_reunion";
  } else if (tags.has("performance") || hasAny(verbs, ["perform"])) {
    kind = "performance";
  } else if (hasAny(tags, ["celebration", "ritual"]) || hasAny(verbs, ["emote"])) {
    kind = "celebration_ritual";
  } else if (tags.has("transformation")) {
    kind = "transformation";
  } else {
    kind = "exploration";
  }

  return { kind, ...SCENARIOS[kind] };
}
