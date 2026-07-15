import { DREAM_LIMITS } from "./limits";
import type { DreamCondition, DreamIssue, DreamSpecV1 } from "./schema";

type GameEffect = DreamSpecV1["playGraph"]["beats"][number]["onStart"][number];

function issue(code: string, path: string, message: string): DreamIssue {
  return { code, severity: "error", path, message, repaired: false };
}

function reportDuplicates(
  values: readonly string[],
  path: string,
  issues: DreamIssue[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push(issue("duplicate_id", path, `Duplicate identifier: ${value}`));
    }
    seen.add(value);
  }
}

function requireReference(
  id: string,
  known: ReadonlySet<string>,
  code: string,
  path: string,
  label: string,
  issues: DreamIssue[],
): void {
  if (!known.has(id)) {
    issues.push(issue(code, path, `Unknown ${label}: ${id}`));
  }
}

interface ReferenceSets {
  variables: ReadonlySet<string>;
  zones: ReadonlySet<string>;
  entities: ReadonlySet<string>;
  structures: ReadonlySet<string>;
  dialogues: ReadonlySet<string>;
  dialogueResponses: ReadonlySet<string>;
  dialogueResponsePairs: ReadonlySet<string>;
  interactions: ReadonlySet<string>;
  transitions: ReadonlySet<string>;
  atmospherePatches: ReadonlySet<string>;
  audioCues: ReadonlySet<string>;
  endings: ReadonlySet<string>;
}

function validateCondition(
  condition: DreamCondition,
  path: string,
  refs: ReferenceSets,
  issues: DreamIssue[],
  depth = 1,
): void {
  if (depth > DREAM_LIMITS.conditionDepth) {
    issues.push(
      issue(
        "condition_depth_exceeded",
        path,
        `Condition nesting exceeds ${DREAM_LIMITS.conditionDepth}`,
      ),
    );
    return;
  }

  switch (condition.kind) {
    case "always":
    case "item_collected":
    case "item_delivered":
    case "timer_elapsed":
      return;
    case "flag":
    case "counter":
    case "meter":
      requireReference(
        condition.id,
        refs.variables,
        "missing_variable_reference",
        `${path}.id`,
        "variable",
        issues,
      );
      return;
    case "interacted":
      requireReference(
        condition.targetId,
        refs.interactions,
        "missing_interaction_reference",
        `${path}.targetId`,
        "interaction",
        issues,
      );
      return;
    case "dialogue_completed":
      requireReference(
        condition.dialogueId,
        refs.dialogues,
        "missing_dialogue_reference",
        `${path}.dialogueId`,
        "dialogue",
        issues,
      );
      return;
    case "response_chosen":
      requireReference(
        condition.dialogueId,
        refs.dialogues,
        "missing_dialogue_reference",
        `${path}.dialogueId`,
        "dialogue",
        issues,
      );
      requireReference(
        condition.responseId,
        refs.dialogueResponses,
        "missing_dialogue_response_reference",
        `${path}.responseId`,
        "dialogue response",
        issues,
      );
      requireReference(
        `${condition.dialogueId}:${condition.responseId}`,
        refs.dialogueResponsePairs,
        "mismatched_dialogue_response_reference",
        `${path}.responseId`,
        "response for the selected dialogue",
        issues,
      );
      return;
    case "object_placed":
    case "zone_entered":
      requireReference(
        condition.zoneId,
        refs.zones,
        "missing_zone_reference",
        `${path}.zoneId`,
        "zone",
        issues,
      );
      return;
    case "entity_state":
      requireReference(
        condition.entityId,
        refs.entities,
        "missing_entity_reference",
        `${path}.entityId`,
        "entity",
        issues,
      );
      return;
    case "all":
    case "any":
      condition.conditions.forEach((child, index) => {
        validateCondition(child, `${path}.conditions[${index}]`, refs, issues, depth + 1);
      });
  }
}

function validateEffect(
  effect: GameEffect,
  path: string,
  refs: ReferenceSets,
  issues: DreamIssue[],
): void {
  switch (effect.kind) {
    case "set_flag":
    case "change_counter":
    case "change_meter":
      requireReference(
        effect.id,
        refs.variables,
        "missing_variable_reference",
        `${path}.id`,
        "variable",
        issues,
      );
      return;
    case "start_dialogue":
      requireReference(effect.dialogueId, refs.dialogues, "missing_dialogue_reference", `${path}.dialogueId`, "dialogue", issues);
      return;
    case "spawn_entity":
    case "move_entity":
    case "set_entity_state":
      requireReference(effect.entityId, refs.entities, "missing_entity_reference", `${path}.entityId`, "entity", issues);
      return;
    case "transform_structure":
      requireReference(effect.structureId, refs.structures, "missing_structure_reference", `${path}.structureId`, "structure", issues);
      return;
    case "change_atmosphere":
      requireReference(effect.patchId, refs.atmospherePatches, "missing_atmosphere_patch_reference", `${path}.patchId`, "atmosphere patch", issues);
      return;
    case "apply_physics_transition":
      requireReference(effect.transitionId, refs.transitions, "missing_physics_transition_reference", `${path}.transitionId`, "physics transition", issues);
      return;
    case "play_audio_cue":
      requireReference(effect.cueId, refs.audioCues, "missing_audio_cue_reference", `${path}.cueId`, "audio cue", issues);
      return;
    case "unlock_interaction":
      requireReference(effect.interactionId, refs.interactions, "missing_interaction_reference", `${path}.interactionId`, "interaction", issues);
      return;
    case "complete_experience":
      requireReference(effect.endingId, refs.endings, "missing_ending_reference", `${path}.endingId`, "ending", issues);
      return;
    case "show_message":
    case "play_effect":
    case "give_item":
    case "remove_item":
      return;
  }
}

export function validateDreamSpecReferences(spec: DreamSpecV1): DreamIssue[] {
  const issues: DreamIssue[] = [];

  reportDuplicates(spec.blueprint.semanticAnchors.map(({ id }) => id), "blueprint.semanticAnchors", issues);
  reportDuplicates(spec.blocks.map(({ id }) => id), "blocks", issues);
  reportDuplicates(spec.structures.map(({ id }) => id), "structures", issues);
  reportDuplicates(spec.world.zones.map(({ id }) => id), "world.zones", issues);
  reportDuplicates(spec.physics.materials.map(({ id }) => id), "physics.materials", issues);
  reportDuplicates(spec.physics.fields.map(({ id }) => id), "physics.fields", issues);
  reportDuplicates(spec.physics.transitions.map(({ id }) => id), "physics.transitions", issues);
  reportDuplicates(spec.entities.map(({ id }) => id), "entities", issues);
  reportDuplicates(spec.dialogues.map(({ id }) => id), "dialogues", issues);
  reportDuplicates(spec.playGraph.variables.map(({ id }) => id), "playGraph.variables", issues);
  reportDuplicates(spec.playGraph.beats.map(({ id }) => id), "playGraph.beats", issues);
  reportDuplicates(spec.playGraph.endings.map(({ id }) => id), "playGraph.endings", issues);
  reportDuplicates(spec.atmosphere.patches.map(({ id }) => id), "atmosphere.patches", issues);
  reportDuplicates(spec.audio.cues.map(({ id }) => id), "audio.cues", issues);

  const blocks = new Set(spec.blocks.map(({ id }) => id));
  const materials = new Set(spec.physics.materials.map(({ id }) => id));
  const structures = new Set(spec.structures.map(({ id }) => id));
  const zones = new Set(spec.world.zones.map(({ id }) => id));
  const entities = new Set(spec.entities.map(({ id }) => id));
  const dialogues = new Set(spec.dialogues.map(({ id }) => id));
  const variables = new Set(spec.playGraph.variables.map(({ id }) => id));
  const dialogueResponses = new Set(
    spec.dialogues.flatMap(({ nodes }) =>
      nodes.flatMap(({ responses }) => responses.map(({ id }) => id)),
    ),
  );
  const dialogueResponsePairs = new Set(
    spec.dialogues.flatMap(({ id, nodes }) =>
      nodes.flatMap(({ responses }) =>
        responses.map(({ id: responseId }) => `${id}:${responseId}`),
      ),
    ),
  );
  const interactions = new Set([
    ...spec.structures.flatMap(({ interactionId }) =>
      interactionId === undefined ? [] : [interactionId],
    ),
    ...spec.entities.flatMap(({ interactionId }) =>
      interactionId === undefined ? [] : [interactionId],
    ),
  ]);
  const refs: ReferenceSets = {
    variables,
    zones,
    entities,
    structures,
    dialogues,
    dialogueResponses,
    dialogueResponsePairs,
    interactions,
    transitions: new Set(spec.physics.transitions.map(({ id }) => id)),
    atmospherePatches: new Set(spec.atmosphere.patches.map(({ id }) => id)),
    audioCues: new Set(spec.audio.cues.map(({ id }) => id)),
    endings: new Set(spec.playGraph.endings.map(({ id }) => id)),
  };

  spec.world.layers.forEach((layer, index) => {
    requireReference(layer.block, blocks, "missing_block_reference", `world.layers[${index}].block`, "block", issues);
  });
  spec.blocks.forEach((block, index) => {
    requireReference(block.materialPhysicsId, materials, "missing_material_reference", `blocks[${index}].materialPhysicsId`, "physics material", issues);
  });
  spec.structures.forEach((structure, index) => {
    for (const key of ["block", "trunkBlock", "canopyBlock"] as const) {
      const block = structure[key];
      if (block !== undefined) {
        requireReference(block, blocks, "missing_block_reference", `structures[${index}].${key}`, "block", issues);
      }
    }
  });

  spec.entities.forEach((entity, index) => {
    if (entity.dialogueId !== undefined) {
      requireReference(entity.dialogueId, dialogues, "missing_dialogue_reference", `entities[${index}].dialogueId`, "dialogue", issues);
    }
    const materialSlotIds = entity.visual.materials.map(({ id }) => id);
    const materialSlots = new Set(materialSlotIds);
    reportDuplicates(materialSlotIds, `entities[${index}].visual.materials`, issues);
    entity.visual.features.forEach((feature, featureIndex) => {
      requireReference(feature.materialSlot, materialSlots, "missing_material_slot_reference", `entities[${index}].visual.features[${featureIndex}].materialSlot`, "entity material slot", issues);
    });
    if (entity.spawn.kind === "around_structure") {
      requireReference(entity.spawn.structureId, structures, "missing_structure_reference", `entities[${index}].spawn.structureId`, "structure", issues);
    } else if (entity.spawn.kind === "in_zone") {
      requireReference(entity.spawn.zoneId, zones, "missing_zone_reference", `entities[${index}].spawn.zoneId`, "zone", issues);
    }
    if (entity.behavior.kind === "guard" || entity.behavior.kind === "orbit") {
      const targets = new Set([...structures, ...entities]);
      requireReference(entity.behavior.targetId, targets, "missing_behavior_target_reference", `entities[${index}].behavior.targetId`, "behavior target", issues);
    } else if (entity.behavior.kind === "follow" && entity.behavior.target !== "player") {
      requireReference(entity.behavior.target, entities, "missing_entity_reference", `entities[${index}].behavior.target`, "entity", issues);
    } else if (entity.behavior.kind === "escort") {
      requireReference(entity.behavior.destinationZoneId, zones, "missing_zone_reference", `entities[${index}].behavior.destinationZoneId`, "zone", issues);
    } else if (entity.behavior.kind === "perform") {
      requireReference(entity.behavior.triggerFlag, variables, "missing_variable_reference", `entities[${index}].behavior.triggerFlag`, "variable", issues);
    }
  });

  spec.dialogues.forEach((dialogue, dialogueIndex) => {
    requireReference(dialogue.speakerEntityId, entities, "missing_entity_reference", `dialogues[${dialogueIndex}].speakerEntityId`, "entity", issues);
    const nodeIds = new Set(dialogue.nodes.map(({ id }) => id));
    reportDuplicates(dialogue.nodes.map(({ id }) => id), `dialogues[${dialogueIndex}].nodes`, issues);
    requireReference(dialogue.startNodeId, nodeIds, "missing_dialogue_node_reference", `dialogues[${dialogueIndex}].startNodeId`, "dialogue node", issues);
    dialogue.nodes.forEach((node, nodeIndex) => {
      reportDuplicates(node.responses.map(({ id }) => id), `dialogues[${dialogueIndex}].nodes[${nodeIndex}].responses`, issues);
      node.responses.forEach((response, responseIndex) => {
        if (response.nextNodeId !== undefined) {
          requireReference(response.nextNodeId, nodeIds, "missing_dialogue_node_reference", `dialogues[${dialogueIndex}].nodes[${nodeIndex}].responses[${responseIndex}].nextNodeId`, "dialogue node", issues);
        }
        response.effects.forEach((effect, effectIndex) => {
          validateEffect(effect, `dialogues[${dialogueIndex}].nodes[${nodeIndex}].responses[${responseIndex}].effects[${effectIndex}]`, refs, issues);
        });
      });
    });
  });

  spec.playGraph.beats.forEach((beat, beatIndex) => {
    validateCondition(beat.startsWhen, `playGraph.beats[${beatIndex}].startsWhen`, refs, issues);
    validateCondition(beat.completesWhen, `playGraph.beats[${beatIndex}].completesWhen`, refs, issues);
    const effects = [...beat.onStart, ...beat.onProgress, ...beat.onComplete];
    effects.forEach((effect, effectIndex) => {
      validateEffect(effect, `playGraph.beats[${beatIndex}].effects[${effectIndex}]`, refs, issues);
    });
  });
  spec.playGraph.endings.forEach((ending, endingIndex) => {
    validateCondition(ending.condition, `playGraph.endings[${endingIndex}].condition`, refs, issues);
    ending.effects.forEach((effect, effectIndex) => {
      validateEffect(effect, `playGraph.endings[${endingIndex}].effects[${effectIndex}]`, refs, issues);
    });
  });

  const representedAnchors = new Set([
    ...spec.structures.flatMap(({ tags: structureTags }) => structureTags),
    ...spec.entities.flatMap(({ tags: entityTags }) => entityTags),
  ]);
  spec.blueprint.semanticAnchors.forEach((anchor, index) => {
    if (!representedAnchors.has(anchor.id)) {
      issues.push({
        code: "unstaged_semantic_anchor",
        severity: "warning",
        path: `blueprint.semanticAnchors[${index}]`,
        message: `Semantic anchor ${anchor.id} has no tagged structure or entity`,
        repaired: false,
      });
    }
  });

  return issues;
}
