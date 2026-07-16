import type { SemanticAnchorStaging, TrustedDreamManifest, Vec3 } from "../dream";

export interface RuntimeStaging {
  guide: Vec3;
  objective: Vec3;
  landmark: Vec3;
  cameraTarget: Vec3;
  objectivePath: readonly [Vec3, Vec3, Vec3];
  objectiveAnchor: SemanticAnchorStaging;
  cameraAnchor: SemanticAnchorStaging;
  heroScale: number;
}

function fallbackPosition(manifest: TrustedDreamManifest, index: number): Vec3 {
  const angle = ((manifest.seed + index * 137) % 360) * Math.PI / 180;
  const distance = 5 + index * 3;
  return [
    manifest.spawn[0] + Math.cos(angle) * distance,
    manifest.spawn[1],
    manifest.spawn[2] + Math.sin(angle) * distance,
  ];
}

function fallbackAnchor(manifest: TrustedDreamManifest, index: number): SemanticAnchorStaging {
  return {
    anchorId: `runtime_fallback_${index}`,
    concept: "runtime staging",
    sourcePhrase: "runtime fallback",
    representation: "structure",
    gameplayRole: "landmark",
    importance: 1,
    mustAppear: false,
    position: fallbackPosition(manifest, index),
    source: "fallback",
    sourceId: null,
  };
}

function copy(position: Vec3): Vec3 {
  return [...position] as Vec3;
}

function priority(anchor: SemanticAnchorStaging): number {
  return anchor.importance * 10
    + (anchor.mustAppear ? 5 : 0)
    + (anchor.source === "fallback" ? 0 : 1)
    // An entry guide is the most readable opening anchor: facing it preserves
    // the first interaction without moving any authored positions.
    + (anchor.gameplayRole === "guide" ? 15 : 0);
}

function selectAnchor(
  anchors: readonly SemanticAnchorStaging[],
  predicate: (anchor: SemanticAnchorStaging) => boolean,
  fallback: SemanticAnchorStaging,
): SemanticAnchorStaging {
  return anchors
    .filter(predicate)
    .sort((left, right) => priority(right) - priority(left))[0] ?? fallback;
}

export function compileRuntimeStaging(manifest: TrustedDreamManifest): RuntimeStaging {
  const fallbacks = [0, 1, 2].map((index) => fallbackAnchor(manifest, index));
  const anchors = [...manifest.anchorStaging, ...fallbacks];
  const guideAnchor = selectAnchor(
    anchors,
    ({ gameplayRole, representation }) => gameplayRole === "guide" || representation === "entity",
    fallbacks[0]!,
  );
  const objectiveAnchor = selectAnchor(
    anchors,
    ({ gameplayRole, representation }) => gameplayRole === "objective" || representation === "objective" || representation === "prop",
    fallbacks[1]!,
  );
  const landmarkAnchor = selectAnchor(
    anchors,
    ({ gameplayRole }) => gameplayRole === "landmark",
    objectiveAnchor,
  );
  const cameraAnchor = selectAnchor(
    anchors,
    ({ source }) => source !== "fallback",
    landmarkAnchor,
  );
  const guide = copy(guideAnchor.position);
  const objective = copy(objectiveAnchor.position);
  const landmark = copy(landmarkAnchor.position);
  const midpoint: Vec3 = [
    (manifest.spawn[0] + objective[0]) / 2,
    Math.max(manifest.spawn[1], objective[1]),
    (manifest.spawn[2] + objective[2]) / 2,
  ];
  const hero = manifest.spec.entities.find(({ role }) => role === "hero") ?? manifest.spec.entities[0];

  return {
    guide,
    objective,
    landmark,
    cameraTarget: [cameraAnchor.position[0], cameraAnchor.position[1] + 2, cameraAnchor.position[2]],
    objectivePath: [copy(manifest.spawn), midpoint, copy(objective)],
    objectiveAnchor,
    cameraAnchor,
    heroScale: Math.min(3, Math.max(0.5, hero?.visual.scale ?? 1)),
  };
}
