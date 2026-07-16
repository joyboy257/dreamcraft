import type { SemanticAnchorStaging, TrustedDreamManifest, Vec3 } from "../dream";

export interface RuntimeStaging {
  guide: Vec3;
  objective: Vec3;
  landmark: Vec3;
  cameraTarget: Vec3;
  objectivePath: readonly [Vec3, Vec3, Vec3];
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

function selectAnchor(
  anchors: readonly SemanticAnchorStaging[],
  terms: readonly string[],
  fallback: SemanticAnchorStaging,
): SemanticAnchorStaging {
  return anchors.find(({ anchorId, concept }) => {
    const text = `${anchorId} ${concept}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  }) ?? fallback;
}

function copy(position: Vec3): Vec3 {
  return [...position] as Vec3;
}

export function compileRuntimeStaging(manifest: TrustedDreamManifest): RuntimeStaging {
  const anchors = manifest.anchorStaging;
  const fallbackAnchors = [0, 1, 2].map((index): SemanticAnchorStaging => ({
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
  }));
  const pool = [...anchors, ...fallbackAnchors];
  const guideAnchor = selectAnchor(pool, ["guide", "friend", "family", "dog", "character"], pool[0]!);
  const objectiveAnchor = selectAnchor(pool, ["beacon", "objective", "stage", "home", "heart"], pool[1]!);
  const landmarkAnchor = selectAnchor(pool, ["landscape", "landmark", "city", "school", "forest"], pool[2]!);
  // The engine opens facing negative Z. Keep the first two readable interaction
  // anchors inside that camera corridor while preserving authored anchor identity
  // for the landmark and path semantics.
  const guide: Vec3 = [manifest.spawn[0], guideAnchor.position[1], manifest.spawn[2] - 4];
  const objective: Vec3 = [manifest.spawn[0], objectiveAnchor.position[1], manifest.spawn[2] - 5.75];
  const landmark: Vec3 = [manifest.spawn[0], landmarkAnchor.position[1], manifest.spawn[2] - 10];
  const midpoint: Vec3 = [
    (guide[0] + objective[0]) / 2,
    Math.max(guide[1], objective[1]),
    (guide[2] + objective[2]) / 2,
  ];
  const hero = manifest.spec.entities.find(({ role }) => role === "hero") ?? manifest.spec.entities[0];

  return {
    guide,
    objective,
    landmark,
    cameraTarget: [landmark[0], landmark[1] + 2, landmark[2]],
    objectivePath: [copy(manifest.spawn), midpoint, copy(objective)],
    heroScale: Math.min(3, Math.max(0.5, hero?.visual.scale ?? 1)),
  };
}
