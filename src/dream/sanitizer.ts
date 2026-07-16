import { DREAM_LIMITS } from "./limits.js";
import {
  DreamSpecV1Schema,
  type DreamCondition,
  type DreamIssue,
  type DreamSpecV1,
  type Vec3,
} from "./schema.js";
import { validateDreamSpecReferences } from "./validation.js";

export type DreamSanitizeResult =
  | { success: true; spec: DreamSpecV1; issues: DreamIssue[] }
  | { success: false; issues: DreamIssue[] };

function repairedIssue(code: string, path: string, message: string): DreamIssue {
  return { code, severity: "warning", path, message, repaired: true };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.round(clamp(value, minimum, maximum));
}

function clampValue(
  value: number,
  minimum: number,
  maximum: number,
  path: string,
  issues: DreamIssue[],
): number {
  const next = clamp(value, minimum, maximum);
  if (next !== value) {
    issues.push(
      repairedIssue(
        "value_clamped",
        path,
        `Clamped ${value} to the safe range ${minimum}–${maximum}`,
      ),
    );
  }
  return next;
}

function truncate<T>(
  values: T[],
  maximum: number,
  path: string,
  issues: DreamIssue[],
): T[] {
  if (values.length <= maximum) return values;
  issues.push(
    repairedIssue(
      "array_truncated",
      path,
      `Truncated ${values.length} entries to the hard limit of ${maximum}`,
    ),
  );
  return values.slice(0, maximum);
}

function clampSpawn(position: Vec3, spec: DreamSpecV1, issues: DreamIssue[]): Vec3 {
  const horizontalLimit = Math.max(1, spec.world.radius - 2);
  let x = clamp(position[0], -horizontalLimit, horizontalLimit);
  let z = clamp(position[2], -horizontalLimit, horizontalLimit);
  const distance = Math.hypot(x, z);
  if (distance > horizontalLimit) {
    const scale = Math.max(0, horizontalLimit - 1) / distance;
    x *= scale;
    z *= scale;
  }
  const next: Vec3 = [
    x,
    clamp(position[1], 1, Math.max(1, spec.world.height - 3)),
    z,
  ];
  if (next.some((value, index) => value !== position[index])) {
    issues.push(
      repairedIssue(
        "spawn_clamped",
        "player.preferredSpawn",
        "Moved the preferred spawn inside bounded world coordinates",
      ),
    );
  }
  return next;
}

function clampPosition(position: Vec3, radius: number, height: number): Vec3 {
  let x = clamp(position[0], -radius, radius);
  let z = clamp(position[2], -radius, radius);
  const distance = Math.hypot(x, z);
  if (distance > radius) {
    const scale = Math.max(0, radius - 1) / distance;
    x *= scale;
    z *= scale;
  }
  return [
    x,
    clamp(position[1], 0, height - 1),
    z,
  ];
}

function repairConditionDepth(
  condition: DreamCondition,
  depth: number,
  path: string,
  issues: DreamIssue[],
): DreamCondition {
  if (condition.kind !== "all" && condition.kind !== "any") return condition;
  if (depth >= DREAM_LIMITS.conditionDepth) {
    issues.push(
      repairedIssue(
        "condition_depth_repaired",
        path,
        "Replaced an over-nested condition with a safe always condition",
      ),
    );
    return { kind: "always" };
  }
  return {
    ...condition,
    conditions: condition.conditions
      .slice(0, 8)
      .map((child, index) =>
        repairConditionDepth(child, depth + 1, `${path}.conditions[${index}]`, issues),
      ),
  };
}

function truncateTextDeep(value: unknown): boolean {
  if (Array.isArray(value)) {
    let changed = false;
    for (const child of value) changed = truncateTextDeep(child) || changed;
    return changed;
  }
  if (value === null || typeof value !== "object") return false;
  let changed = false;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (
      typeof child === "string" &&
      child.length > DREAM_LIMITS.textLength &&
      !key.toLowerCase().endsWith("id")
    ) {
      record[key] = child.slice(0, DREAM_LIMITS.textLength);
      changed = true;
    } else {
      changed = truncateTextDeep(child) || changed;
    }
  }
  return changed;
}

function quantizeWorldRadius(value: number): 32 | 48 | 64 {
  if (value <= 32) return 32;
  if (value <= 48) return 48;
  return 64;
}

function quantizeWorldHeight(value: number): 48 | 64 {
  return value <= 48 ? 48 : 64;
}

function applyBudgetRepairs(spec: DreamSpecV1, issues: DreamIssue[]): void {
  const numericLimits = {
    worldRadius: DREAM_LIMITS.worldRadius,
    worldHeight: DREAM_LIMITS.worldHeight,
    blockTypes: DREAM_LIMITS.blockTypes,
    terrainOperations: DREAM_LIMITS.terrainOperations,
    structures: DREAM_LIMITS.structures,
    entityDefinitions: DREAM_LIMITS.entityDefinitions,
    entityInstances: DREAM_LIMITS.entityInstances,
    meshPartsPerHero: DREAM_LIMITS.meshPartsPerHero,
    physicsFields: DREAM_LIMITS.physicsFields,
    dialogueNodes: DREAM_LIMITS.dialogueNodes,
    storyBeats: DREAM_LIMITS.storyBeats,
    particles: DREAM_LIMITS.particles,
  } as const;
  for (const key of Object.keys(numericLimits) as (keyof typeof numericLimits)[]) {
    const original = spec.budgets[key];
    const next = clampInteger(original, 0, numericLimits[key]);
    if (next !== original) {
      issues.push(
        repairedIssue(
          "budget_clamped",
          `budgets.${key}`,
          `Clamped requested ${key} budget to ${next}`,
        ),
      );
      spec.budgets[key] = next;
    }
  }
  if (spec.budgets.blockTypes < 2) {
    spec.budgets.blockTypes = 2;
    issues.push(
      repairedIssue(
        "budget_raised",
        "budgets.blockTypes",
        "Raised the block budget to the minimum air-and-ground registry size",
      ),
    );
  }

  const requestedRadius = Math.min(spec.world.radius, spec.budgets.worldRadius || 32);
  const requestedHeight = Math.min(spec.world.height, spec.budgets.worldHeight || 48);
  const radius = quantizeWorldRadius(clampInteger(requestedRadius, 32, DREAM_LIMITS.worldRadius));
  const height = quantizeWorldHeight(clampInteger(requestedHeight, 48, DREAM_LIMITS.worldHeight));
  if (radius !== spec.world.radius) {
    issues.push(repairedIssue("world_radius_repaired", "world.radius", `Set world radius to ${radius}`));
  }
  if (height !== spec.world.height) {
    issues.push(repairedIssue("world_height_repaired", "world.height", `Set world height to ${height}`));
  }
  spec.world.radius = radius;
  spec.world.height = height;
  spec.budgets.worldRadius = radius;
  spec.budgets.worldHeight = height;

  spec.blocks = truncate(spec.blocks, Math.max(2, spec.budgets.blockTypes), "blocks", issues);
  spec.world.terrain = truncate(spec.world.terrain, spec.budgets.terrainOperations, "world.terrain", issues);
  spec.world.layers = truncate(spec.world.layers, DREAM_LIMITS.terrainLayers, "world.layers", issues);
  spec.world.zones = truncate(spec.world.zones, DREAM_LIMITS.zones, "world.zones", issues);
  spec.structures = truncate(spec.structures, spec.budgets.structures, "structures", issues);
  spec.entities = truncate(spec.entities, spec.budgets.entityDefinitions, "entities", issues);
  spec.physics.fields = truncate(spec.physics.fields, spec.budgets.physicsFields, "physics.fields", issues);
  spec.physics.transitions = truncate(spec.physics.transitions, DREAM_LIMITS.physicsTransitions, "physics.transitions", issues);
  spec.physics.materials = truncate(spec.physics.materials, DREAM_LIMITS.physicsMaterials, "physics.materials", issues);
  spec.blueprint.semanticAnchors = truncate(spec.blueprint.semanticAnchors, DREAM_LIMITS.semanticAnchors, "blueprint.semanticAnchors", issues);
  spec.atmosphere.patches = truncate(spec.atmosphere.patches, DREAM_LIMITS.atmospherePatches, "atmosphere.patches", issues);
  spec.audio.cues = truncate(spec.audio.cues, DREAM_LIMITS.audioCues, "audio.cues", issues);
  spec.playGraph.variables = truncate(spec.playGraph.variables, DREAM_LIMITS.variables, "playGraph.variables", issues);
  spec.playGraph.availableVerbs = truncate(spec.playGraph.availableVerbs, DREAM_LIMITS.verbs, "playGraph.availableVerbs", issues);
  spec.playGraph.beats = truncate(spec.playGraph.beats, spec.budgets.storyBeats, "playGraph.beats", issues);
  spec.playGraph.endings = truncate(spec.playGraph.endings, DREAM_LIMITS.endings, "playGraph.endings", issues);
}

function ensureTerrainMaterials(spec: DreamSpecV1, issues: DreamIssue[]): void {
  if (spec.physics.materials.length === 0) {
    spec.physics.materials.push({
      id: "dreamcraft_default",
      friction: 0.8,
      restitution: 0,
      movementMultiplier: 1,
      jumpMultiplier: 1,
      sinkDepth: 0,
      sinkSpeed: 0,
      conveyorVelocity: [0, 0, 0],
      damagePerSecond: 0,
      healingPerSecond: 0,
      contactEffect: "none",
    });
    issues.push(repairedIssue("material_added", "physics.materials", "Added a safe default surface material"));
  }
  const materialIds = new Set(spec.physics.materials.map(({ id }) => id));
  const safeMaterial = spec.physics.materials[0]!.id;
  spec.blocks.forEach((block, index) => {
    if (!materialIds.has(block.materialPhysicsId)) {
      block.materialPhysicsId = safeMaterial;
      issues.push(repairedIssue("material_reference_repaired", `blocks[${index}].materialPhysicsId`, "Replaced a missing material reference"));
    }
  });
}

function ensureAirAndGround(spec: DreamSpecV1, issues: DreamIssue[]): string {
  const blockBudget = Math.max(2, spec.budgets.blockTypes);
  let airIndex = spec.blocks.findIndex(({ id }) => id === "air");
  if (airIndex < 0) {
    const template = spec.blocks[0];
    if (template === undefined) {
      spec.blocks.push({
        id: "air",
        displayName: "Air",
        color: 0,
        emissive: 0,
        opacity: 0,
        solid: false,
        breakable: false,
        materialPhysicsId: spec.physics.materials[0]!.id,
        visualPattern: "none",
        tags: ["air"],
      });
      airIndex = 0;
    } else {
      const replacementIndex = spec.blocks.length >= blockBudget
        ? spec.blocks.length - 1
        : spec.blocks.length;
      const air = {
        ...template,
        id: "air",
        displayName: "Air",
        color: 0,
        emissive: 0,
        opacity: 0,
        solid: false,
        breakable: false,
        visualPattern: "none" as const,
        tags: ["air"],
      };
      if (replacementIndex === spec.blocks.length) spec.blocks.push(air);
      else spec.blocks[replacementIndex] = air;
      airIndex = replacementIndex;
    }
    issues.push(repairedIssue("air_block_added", "blocks", "Added a reserved non-solid air block"));
  }
  const air = spec.blocks[airIndex]!;
  if (air.solid || air.opacity !== 0) {
    air.solid = false;
    air.opacity = 0;
    air.breakable = false;
    issues.push(repairedIssue("air_block_repaired", `blocks[${airIndex}]`, "Made the reserved air block non-solid"));
  }

  let ground = spec.blocks.find((block) => block.solid);
  if (ground === undefined) {
    const replaceableIndex = spec.blocks.findIndex(({ id }) => id !== "air");
    const replacementIndex = spec.blocks.length >= blockBudget
      ? Math.max(0, replaceableIndex)
      : spec.blocks.length;
    const safeGround = {
      id: "dreamcraft_safe_ground",
      displayName: "Stable Dream Ground",
      color: 0x8b78aa,
      emissive: 0,
      opacity: 1,
      solid: true,
      breakable: true,
      materialPhysicsId: spec.physics.materials[0]!.id,
      visualPattern: "checker" as const,
      tags: ["ground", "fallback"],
    };
    if (replacementIndex === spec.blocks.length) spec.blocks.push(safeGround);
    else spec.blocks[replacementIndex] = safeGround;
    ground = safeGround;
    issues.push(repairedIssue("solid_block_added", "blocks", "Added emergency solid ground for an all-air request"));
  }
  if (spec.blocks.length > blockBudget) spec.blocks = spec.blocks.slice(0, blockBudget);
  return ground.id;
}

function repairBlockReferences(spec: DreamSpecV1, safeGroundId: string, issues: DreamIssue[]): void {
  const blockIds = new Set(spec.blocks.map(({ id }) => id));
  spec.world.layers.forEach((layer, index) => {
    if (!blockIds.has(layer.block) || layer.block === "air") {
      layer.block = safeGroundId;
      issues.push(repairedIssue("block_reference_repaired", `world.layers[${index}].block`, "Replaced an unsafe terrain layer block"));
    }
  });
  if (spec.world.layers.length === 0) {
    spec.world.layers.push({ depth: spec.world.height, block: safeGroundId });
    issues.push(repairedIssue("terrain_layer_added", "world.layers", "Added an emergency ground layer"));
  }
  spec.structures.forEach((structure, index) => {
    for (const key of ["block", "trunkBlock", "canopyBlock"] as const) {
      if (structure[key] !== undefined && !blockIds.has(structure[key])) {
        structure[key] = safeGroundId;
        issues.push(repairedIssue("block_reference_repaired", `structures[${index}].${key}`, "Replaced a missing structure block"));
      }
    }
  });
}

function applyGameplayLimits(spec: DreamSpecV1, issues: DreamIssue[]): void {
  let remainingDialogueNodes = spec.budgets.dialogueNodes;
  spec.dialogues = spec.dialogues.filter((dialogue, dialogueIndex) => {
    if (remainingDialogueNodes <= 0) {
      issues.push(repairedIssue("array_truncated", `dialogues[${dialogueIndex}]`, "Removed dialogue beyond the global node budget"));
      return false;
    }
    dialogue.nodes = truncate(dialogue.nodes, remainingDialogueNodes, `dialogues[${dialogueIndex}].nodes`, issues);
    remainingDialogueNodes -= dialogue.nodes.length;
    const nodeIds = new Set(dialogue.nodes.map(({ id }) => id));
    if (!nodeIds.has(dialogue.startNodeId) && dialogue.nodes[0] !== undefined) {
      dialogue.startNodeId = dialogue.nodes[0].id;
      issues.push(repairedIssue("dialogue_start_repaired", `dialogues[${dialogueIndex}].startNodeId`, "Moved dialogue start to an existing node"));
    }
    dialogue.nodes.forEach((node, nodeIndex) => {
      node.responses = truncate(node.responses, DREAM_LIMITS.dialogueChoicesPerNode, `dialogues[${dialogueIndex}].nodes[${nodeIndex}].responses`, issues);
      node.responses.forEach((response, responseIndex) => {
        if (response.nextNodeId !== undefined && !nodeIds.has(response.nextNodeId)) {
          delete response.nextNodeId;
          issues.push(repairedIssue("dialogue_link_repaired", `dialogues[${dialogueIndex}].nodes[${nodeIndex}].responses[${responseIndex}].nextNodeId`, "Removed a missing dialogue node link"));
        }
      });
    });
    return dialogue.nodes.length > 0;
  });

  spec.playGraph.beats.forEach((beat, beatIndex) => {
    beat.startsWhen = repairConditionDepth(beat.startsWhen, 1, `playGraph.beats[${beatIndex}].startsWhen`, issues);
    beat.completesWhen = repairConditionDepth(beat.completesWhen, 1, `playGraph.beats[${beatIndex}].completesWhen`, issues);
    let remainingEffects = DREAM_LIMITS.effectsPerBeat;
    beat.onStart = truncate(beat.onStart, remainingEffects, `playGraph.beats[${beatIndex}].onStart`, issues);
    remainingEffects -= beat.onStart.length;
    beat.onProgress = truncate(beat.onProgress, remainingEffects, `playGraph.beats[${beatIndex}].onProgress`, issues);
    remainingEffects -= beat.onProgress.length;
    beat.onComplete = truncate(beat.onComplete, remainingEffects, `playGraph.beats[${beatIndex}].onComplete`, issues);
  });
  spec.playGraph.endings.forEach((ending, endingIndex) => {
    ending.condition = repairConditionDepth(ending.condition, 1, `playGraph.endings[${endingIndex}].condition`, issues);
  });
}

function conditionHasReachableTrigger(condition: DreamCondition, spec: DreamSpecV1): boolean {
  const interactions = new Set([
    ...spec.structures.flatMap(({ interactionId }) => interactionId ? [interactionId] : []),
    ...spec.entities.flatMap(({ interactionId }) => interactionId ? [interactionId] : []),
  ]);
  switch (condition.kind) {
    case "always":
      return true;
    case "interacted":
      return interactions.has(condition.targetId);
    case "dialogue_completed":
    case "response_chosen":
      return spec.dialogues.some(({ id }) => id === condition.dialogueId);
    case "zone_entered":
    case "object_placed":
      return spec.world.zones.some(({ id }) => id === condition.zoneId);
    case "entity_state":
      return spec.entities.some(({ id }) => id === condition.entityId);
    case "all":
      return condition.conditions.every((child) => conditionHasReachableTrigger(child, spec));
    case "any":
      return condition.conditions.some((child) => conditionHasReachableTrigger(child, spec));
    case "flag":
    case "counter":
    case "meter":
    case "item_collected":
    case "item_delivered":
    case "timer_elapsed":
      return false;
  }
}

function ensureCompletionPath(spec: DreamSpecV1, issues: DreamIssue[]): void {
  const endingIds = new Set(spec.playGraph.endings.map(({ id }) => id));
  const reachableEnding = spec.playGraph.endings.find(({ condition }) =>
    conditionHasReachableTrigger(condition, spec),
  );
  const reachableBeatCompletion = spec.playGraph.beats.some((beat) =>
    conditionHasReachableTrigger(beat.startsWhen, spec) &&
    conditionHasReachableTrigger(beat.completesWhen, spec) &&
    beat.onComplete.some((effect) =>
      effect.kind === "complete_experience" && endingIds.has(effect.endingId),
    ),
  );
  if (reachableBeatCompletion) return;

  let endingId = reachableEnding?.id ?? "dreamcraft_safe_ending";
  let suffix = 1;
  while (reachableEnding === undefined && endingIds.has(endingId)) {
    endingId = `dreamcraft_safe_ending_${suffix}`;
    suffix += 1;
  }
  const safeEnding = {
    id: endingId,
    title: "The Dream Holds",
    narration: "The fragment steadies, leaving a safe path back to waking.",
    condition: { kind: "always" as const },
    effects: [],
  };
  if (reachableEnding === undefined) {
    if (spec.playGraph.endings.length >= DREAM_LIMITS.endings) {
      spec.playGraph.endings[spec.playGraph.endings.length - 1] = safeEnding;
    } else {
      spec.playGraph.endings.push(safeEnding);
    }
  }
  const beatIds = new Set(spec.playGraph.beats.map(({ id }) => id));
  let beatId = "dreamcraft_safe_completion";
  suffix = 1;
  while (beatIds.has(beatId)) {
    beatId = `dreamcraft_safe_completion_${suffix}`;
    suffix += 1;
  }
  const safeBeat = {
    id: beatId,
    title: "Stabilize the Fragment",
    objectiveText: "Take a breath and let the stable fragment settle.",
    startsWhen: { kind: "always" as const },
    completesWhen: { kind: "always" as const },
    onStart: [],
    onProgress: [],
    onComplete: [{ kind: "complete_experience" as const, endingId }],
    optional: false,
  };
  if (spec.playGraph.beats.length >= DREAM_LIMITS.storyBeats) {
    spec.playGraph.beats[spec.playGraph.beats.length - 1] = safeBeat;
  } else {
    spec.playGraph.beats.push(safeBeat);
  }
  spec.budgets.storyBeats = Math.min(
    DREAM_LIMITS.storyBeats,
    Math.max(spec.budgets.storyBeats, spec.playGraph.beats.length),
  );
  issues.push(repairedIssue(
    "completion_path_added",
    "playGraph",
    "Added a deterministic safe beat and ending because no completion path was reachable",
  ));
}

function applyPhysicsLimits(spec: DreamSpecV1, issues: DreamIssue[]): void {
  const movement = spec.physics.player.movement;
  movement.walkSpeed = clampValue(movement.walkSpeed, 1.5, 14, "physics.player.movement.walkSpeed", issues);
  movement.sprintSpeed = clampValue(movement.sprintSpeed, 2, 22, "physics.player.movement.sprintSpeed", issues);
  spec.physics.player.jump.jumpVelocity = clampValue(spec.physics.player.jump.jumpVelocity, 2, 22, "physics.player.jump.jumpVelocity", issues);
  spec.physics.world.terminalVelocity = clampValue(spec.physics.world.terminalVelocity, 5, 80, "physics.world.terminalVelocity", issues);
  spec.physics.world.globalTimeScale = clampValue(spec.physics.world.globalTimeScale, 0.35, 1.75, "physics.world.globalTimeScale", issues);
  const magnitude = Math.hypot(...spec.physics.world.gravity);
  if (magnitude > 50) {
    const scale = 50 / magnitude;
    spec.physics.world.gravity = spec.physics.world.gravity.map((component) => component * scale) as Vec3;
    issues.push(repairedIssue("gravity_clamped", "physics.world.gravity", "Clamped gravity magnitude to 50"));
  }
  spec.physics.dynamicBodies.maximumActiveBodies = clampInteger(spec.physics.dynamicBodies.maximumActiveBodies, 0, 32);
  spec.physics.transitions.forEach((transition, index) => {
    transition.durationMs = clampValue(transition.durationMs, 100, 12_000, `physics.transitions[${index}].durationMs`, issues);
  });
}

function applySpatialRepairs(spec: DreamSpecV1, issues: DreamIssue[]): void {
  const maximumBaseHeight = Math.max(1, spec.world.height - 4);
  spec.world.baseHeight = clampValue(spec.world.baseHeight, 1, maximumBaseHeight, "world.baseHeight", issues);
  spec.player.preferredSpawn = clampSpawn(spec.player.preferredSpawn, spec, issues);
  const radius = Math.max(1, spec.world.radius - 2);
  spec.world.zones.forEach((zone) => {
    zone.center = clampPosition(zone.center, radius, spec.world.height);
    if (zone.radius !== undefined) {
      zone.radius = clampValue(zone.radius, 0.5, DREAM_LIMITS.fieldDimension, "world.zones.radius", issues);
    }
    if (zone.size !== undefined) {
      zone.size = zone.size.map((value) =>
        clamp(value, 0.5, DREAM_LIMITS.fieldDimension),
      ) as Vec3;
    }
  });
  spec.structures.forEach((structure, structureIndex) => {
    if (structure.position !== undefined) structure.position = clampPosition(structure.position, radius, spec.world.height);
    if (structure.center !== undefined) structure.center = clampPosition(structure.center, radius, spec.world.height);
    if (structure.from !== undefined) structure.from = clampPosition(structure.from, radius, spec.world.height);
    if (structure.to !== undefined) structure.to = clampPosition(structure.to, radius, spec.world.height);
    for (const key of ["width", "height", "depth", "radius"] as const) {
      if (structure[key] !== undefined) {
        structure[key] = clampValue(
          structure[key],
          0.25,
          DREAM_LIMITS.structureDimension,
          `structures[${structureIndex}].${key}`,
          issues,
        );
      }
    }
    if (structure.count !== undefined) {
      structure.count = clampInteger(structure.count, 1, DREAM_LIMITS.structureCount);
    }
    if (structure.states !== undefined) {
      structure.states = truncate(
        structure.states,
        DREAM_LIMITS.structureStates,
        `structures[${structureIndex}].states`,
        issues,
      );
    }
  });
  let remainingInstances = spec.budgets.entityInstances;
  spec.entities.forEach((entity, entityIndex) => {
    entity.visual.scale = clampValue(
      entity.visual.scale,
      0.25,
      DREAM_LIMITS.entityScale,
      `entities[${entityIndex}].visual.scale`,
      issues,
    );
    entity.visual.features = truncate(entity.visual.features, DREAM_LIMITS.entityFeatures, `entities[${entityIndex}].visual.features`, issues);
    entity.visual.features.forEach((feature, featureIndex) => {
      feature.size = clampValue(
        feature.size,
        0.1,
        DREAM_LIMITS.entityFeatureSize,
        `entities[${entityIndex}].visual.features[${featureIndex}].size`,
        issues,
      );
    });
    entity.visual.materials = truncate(entity.visual.materials, DREAM_LIMITS.entityMaterials, `entities[${entityIndex}].visual.materials`, issues);
    entity.visual.recognitionFeatures = truncate(entity.visual.recognitionFeatures, DREAM_LIMITS.recognitionFeatures, `entities[${entityIndex}].visual.recognitionFeatures`, issues);
    if (entity.spawn.kind === "fixed") {
      entity.spawn.positions = truncate(entity.spawn.positions, remainingInstances, `entities[${entityIndex}].spawn.positions`, issues).map((position) => clampPosition(position, radius, spec.world.height));
      remainingInstances -= entity.spawn.positions.length;
    } else {
      const nextCount = Math.min(entity.spawn.count, remainingInstances);
      if (nextCount !== entity.spawn.count) {
        issues.push(repairedIssue("entity_count_clamped", `entities[${entityIndex}].spawn.count`, "Clamped entity instances to the global budget"));
        entity.spawn.count = nextCount;
      }
      remainingInstances -= nextCount;
      if (entity.spawn.kind === "surface_scatter") {
        entity.spawn.center = clampPosition(entity.spawn.center, radius, spec.world.height);
      }
    }
  });

  spec.world.terrain.forEach((operation, operationIndex) => {
    const path = `world.terrain[${operationIndex}]`;
    switch (operation.kind) {
      case "fbm_height":
      case "ridge_height":
        operation.scale = clampValue(operation.scale, 0.001, 1, `${path}.scale`, issues);
        operation.amplitude = clampValue(operation.amplitude, -64, 64, `${path}.amplitude`, issues);
        break;
      case "terrace":
        operation.stepHeight = clampValue(operation.stepHeight, 0.25, 16, `${path}.stepHeight`, issues);
        break;
      case "radial_island":
        operation.radius = clampValue(operation.radius, 0.5, spec.world.radius * 2, `${path}.radius`, issues);
        operation.falloff = clampValue(operation.falloff, 0.25, 128, `${path}.falloff`, issues);
        break;
      case "floating_islands":
        operation.frequency = clampValue(operation.frequency, 0, 1, `${path}.frequency`, issues);
        operation.minY = clampValue(operation.minY, 0, spec.world.height - 1, `${path}.minY`, issues);
        operation.maxY = clampValue(operation.maxY, operation.minY, spec.world.height - 1, `${path}.maxY`, issues);
        break;
      case "caves":
        operation.scale = clampValue(operation.scale, 0.001, 1, `${path}.scale`, issues);
        operation.threshold = clampValue(operation.threshold, -1, 1, `${path}.threshold`, issues);
        break;
      case "waves":
        operation.direction = operation.direction.map((value) => clamp(value, -1, 1)) as [number, number];
        operation.wavelength = clampValue(operation.wavelength, 0.25, 128, `${path}.wavelength`, issues);
        operation.amplitude = clampValue(operation.amplitude, -64, 64, `${path}.amplitude`, issues);
        break;
      case "crater":
        operation.center = operation.center.map((value) =>
          clamp(value, -spec.world.radius, spec.world.radius),
        ) as [number, number];
        operation.radius = clampValue(operation.radius, 0.5, spec.world.radius * 2, `${path}.radius`, issues);
        operation.depth = clampValue(operation.depth, 0, spec.world.height, `${path}.depth`, issues);
        break;
      case "path_bias":
        operation.points = truncate(
          operation.points,
          DREAM_LIMITS.pathPoints,
          `${path}.points`,
          issues,
        ).map((point) => point.map((value) =>
          clamp(value, -spec.world.radius, spec.world.radius),
        ) as [number, number]);
        operation.width = clampValue(operation.width, 0.25, 64, `${path}.width`, issues);
        break;
    }
  });

  spec.physics.fields.forEach((field, fieldIndex) => {
    if (field.shape.kind === "sphere" || field.shape.kind === "cylinder") {
      field.shape.radius = clampValue(
        field.shape.radius,
        0.25,
        DREAM_LIMITS.fieldDimension,
        `physics.fields[${fieldIndex}].shape.radius`,
        issues,
      );
    }
    if (field.shape.kind === "box") {
      field.shape.size = field.shape.size.map((value) =>
        clamp(value, 0.25, DREAM_LIMITS.fieldDimension),
      ) as Vec3;
    }
    if (field.shape.kind === "cylinder") {
      field.shape.height = clampValue(
        field.shape.height,
        0.25,
        DREAM_LIMITS.fieldDimension,
        `physics.fields[${fieldIndex}].shape.height`,
        issues,
      );
    }
  });
}

export function sanitizeDreamSpec(input: unknown): DreamSanitizeResult {
  const structural = DreamSpecV1Schema.safeParse(input);
  if (!structural.success) {
    return {
      success: false,
      issues: structural.error.issues.map((zodIssue) => ({
        code: "invalid_structure",
        severity: "error" as const,
        path: zodIssue.path.join("."),
        message: zodIssue.message,
        repaired: false,
      })),
    };
  }

  const spec = structural.data;
  const issues: DreamIssue[] = [];
  if (truncateTextDeep(spec)) {
    issues.push(repairedIssue("text_truncated", "dream", `Truncated text to ${DREAM_LIMITS.textLength} characters`));
  }
  applyBudgetRepairs(spec, issues);
  ensureTerrainMaterials(spec, issues);
  const safeGroundId = ensureAirAndGround(spec, issues);
  repairBlockReferences(spec, safeGroundId, issues);
  applySpatialRepairs(spec, issues);
  applyPhysicsLimits(spec, issues);
  applyGameplayLimits(spec, issues);
  ensureCompletionPath(spec, issues);

  const postRepairShape = DreamSpecV1Schema.safeParse(spec);
  if (!postRepairShape.success) {
    return {
      success: false,
      issues: [
        ...issues,
        ...postRepairShape.error.issues.map((zodIssue) => ({
          code: "repair_failed",
          severity: "error" as const,
          path: zodIssue.path.join("."),
          message: zodIssue.message,
          repaired: false,
        })),
      ],
    };
  }

  const referenceIssues = validateDreamSpecReferences(postRepairShape.data);
  const blocking = referenceIssues.some(({ severity }) => severity === "error");
  if (blocking) return { success: false, issues: [...issues, ...referenceIssues] };
  return { success: true, spec: postRepairShape.data, issues: [...issues, ...referenceIssues] };
}
