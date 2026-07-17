import type { TrustedDreamManifest } from "../dream";
import type { AdaptedDreamRuntime } from "./dreamRuntimeAdapter";

export interface SemanticEvidence {
  anchorId: string;
  sourcePhrase: string;
  representation: string;
  gameplayRole: string;
  importance: number;
  sourceId: string | null;
  visiblyRepresented: boolean;
  reason: string;
}

export interface SemanticFidelityReport {
  highPriorityCoverage: number;
  centralObjectCovered: boolean;
  mechanicAligned: boolean;
  objectiveAligned: boolean;
  entitiesRecognizable: boolean;
  endingAligned: boolean;
  unrelatedGenericBeacon: boolean;
  evidence: readonly SemanticEvidence[];
  unsupported: readonly string[];
}

function visibleRepresentation(
  manifest: TrustedDreamManifest,
  runtime: AdaptedDreamRuntime,
  anchor: TrustedDreamManifest["anchorStaging"][number],
): { visible: boolean; reason: string } {
  const libraryBinding = runtime.dreamLibrary.anchors.find(
    ({ anchorId }) => anchorId === anchor.anchorId,
  );
  if (libraryBinding) {
    return {
      visible: true,
      reason: `DreamLibrary capability: ${libraryBinding.capabilityId}`,
    };
  }
  if (anchor.source === "structure") {
    const visible = runtime.voxelStructures.some(({ id }) => id === anchor.sourceId);
    return { visible, reason: visible ? "bounded voxel archetype" : "structure missing from voxel plan" };
  }
  if (anchor.source === "entity") {
    const visible = runtime.entityInstances.some(({ entityId, visibleAtEntry }) => entityId === anchor.sourceId && visibleAtEntry);
    return { visible, reason: visible ? "procedural entity instance" : "entity has no entry instance" };
  }
  if (anchor.source === "zone") {
    const visible = manifest.spec.world.zones.some(({ id }) => id === anchor.sourceId);
    return { visible, reason: visible ? "bounded gameplay zone" : "zone missing" };
  }
  return { visible: false, reason: "compiler fallback staging" };
}

function endingMentionsObjective(manifest: TrustedDreamManifest, objectivePhrase: string): boolean {
  const words = objectivePhrase.toLowerCase().split(/\s+/).filter((word) => word.length >= 4);
  const ending = manifest.spec.playGraph.endings[0];
  const source = `${ending?.title ?? ""} ${ending?.narration ?? ""} ${manifest.spec.playGraph.beats[0]?.objectiveText ?? ""}`.toLowerCase();
  return words.some((word) => source.includes(word));
}

export function evaluateSemanticFidelity(
  manifest: TrustedDreamManifest,
  runtime: AdaptedDreamRuntime,
): SemanticFidelityReport {
  const evidence = manifest.anchorStaging.map((anchor) => {
    const representation = visibleRepresentation(manifest, runtime, anchor);
    return {
      anchorId: anchor.anchorId,
      sourcePhrase: anchor.sourcePhrase,
      representation: anchor.representation,
      gameplayRole: anchor.gameplayRole,
      importance: anchor.importance,
      sourceId: anchor.sourceId,
      visiblyRepresented: representation.visible,
      reason: representation.reason,
    };
  });
  const highPriority = manifest.anchorStaging.filter(({ importance, mustAppear }) => importance >= 4 && mustAppear);
  const coveredHighPriority = evidence.filter((item) =>
    highPriority.some((anchor) => anchor.anchorId === item.anchorId) && item.visiblyRepresented,
  ).length;
  const highPriorityCoverage = highPriority.length === 0 ? 1 : coveredHighPriority / highPriority.length;
  const objective = runtime.staging.objectiveAnchor;
  const objectiveEvidence = evidence.find(({ sourcePhrase }) => sourcePhrase === objective.sourcePhrase);
  const supportedObjective = manifest.spec.blueprint.semanticAnchors.some((anchor) =>
    anchor.gameplayRole === "objective" && (
      manifest.spec.structures.some(({ tags }) => tags.includes(anchor.id))
      || manifest.spec.entities.some(({ tags }) => tags.includes(anchor.id))
      || manifest.spec.world.zones.some(({ tags }) => tags.includes(anchor.id))
    ),
  );
  const unrelatedGenericBeacon = supportedObjective && objective.source === "fallback";
  const objectiveAligned = objectiveEvidence?.visiblyRepresented === true
    && runtime.story.transformation.structureId === (objective.sourceId ?? runtime.story.transformation.structureId)
    && !unrelatedGenericBeacon;
  const entityAnchors = manifest.anchorStaging.filter(({ representation, importance, mustAppear }) =>
    representation === "entity" && importance >= 4 && mustAppear,
  );
  const entitiesRecognizable = entityAnchors.every((anchor) =>
    runtime.entityInstances.some(({ entityId, visibleAtEntry }) => entityId === anchor.sourceId && visibleAtEntry),
  );
  const mechanicAligned = runtime.scenario.mechanic.length > 0
    && manifest.spec.playGraph.availableVerbs.some(({ targetTags }) =>
      targetTags.some((tag) => evidence.some((item) =>
        item.anchorId === tag && item.gameplayRole === "objective" && item.visiblyRepresented,
      )),
    );
  const ending = manifest.spec.playGraph.endings[0];
  const endingAligned = Boolean(ending)
    && manifest.spec.playGraph.beats.some((beat) => beat.onComplete.some(
      (effect) => effect.kind === "complete_experience" && effect.endingId === ending?.id,
    ))
    && endingMentionsObjective(manifest, objective.sourcePhrase);
  const centralObjectCovered = objectiveEvidence?.visiblyRepresented === true && objective.sourceId !== null;

  return {
    highPriorityCoverage,
    centralObjectCovered,
    mechanicAligned,
    objectiveAligned,
    entitiesRecognizable,
    endingAligned,
    unrelatedGenericBeacon,
    evidence,
    unsupported: evidence.filter(({ visiblyRepresented }) => !visiblyRepresented).map(({ sourcePhrase }) => sourcePhrase),
  };
}
