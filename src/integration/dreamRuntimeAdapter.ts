import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_VOLUME, voxelIndex } from "../engine/chunkMath";
import type { BlockId, ChunkGenerator } from "../engine/localGenerator";
import type { PlayerMotorConfig } from "../engine/playerMotor";
import type { DreamGuideOptions } from "../entitykit";
import {
  DREAM_BEACON_ID,
  GUIDE_DIALOGUE_ID,
  GUIDE_RESPONSE_ID,
  createSafePhysicsProfile,
  compileDreamScenario,
  type DreamArcDefinition,
  type DreamScenario,
  type RuntimePhysicsProfile,
} from "../gameplay";
import { sampleSurfaceHeight, type DreamSpecV1, type TrustedDreamManifest } from "../dream";
import { compileDreamAtmosphere, type DreamAtmospherePlan } from "./dreamAtmosphere";
import { compileRuntimeStaging, type RuntimeStaging } from "./semanticStaging";
import {
  compileVoxelStructures,
  materializeVoxelStructures,
  type CompiledVoxelStructure,
} from "./structureMaterializer";

export interface AdaptedDreamRuntime {
  generator: ChunkGenerator;
  blockColors: Readonly<Record<number, readonly [number, number, number]>>;
  blockMaterials: Readonly<Record<number, string>>;
  safeSpawnBlock: BlockId;
  worldRadius: number;
  spawn: { x: number; z: number };
  story: DreamArcDefinition;
  guideOptions: DreamGuideOptions;
  playerConfig: Partial<PlayerMotorConfig>;
  fieldOfView: number;
  scenario: DreamScenario;
  staging: RuntimeStaging;
  atmosphere: DreamAtmospherePlan;
  audio: DreamSpecV1["audio"];
  physicsProfile: RuntimePhysicsProfile;
  heroEntity: DreamSpecV1["entities"][number] | null;
  voxelStructures: readonly CompiledVoxelStructure[];
}

function colorChannels(color: number): readonly [number, number, number] {
  return [
    ((color >>> 16) & 0xff) / 255,
    ((color >>> 8) & 0xff) / 255,
    (color & 0xff) / 255,
  ];
}

export function adaptDreamManifest(manifest: TrustedDreamManifest): AdaptedDreamRuntime {
  const spec = manifest.spec;
  const scenario = compileDreamScenario(spec);
  const staging = compileRuntimeStaging(manifest);
  const numericIds = new Map<string, BlockId>([["air", 0]]);
  const blockColors: Record<number, readonly [number, number, number]> = {};
  const blockMaterials: Record<number, string> = {};
  let nextId = 1;
  for (const block of manifest.blocks) {
    if (block.id === "air" || numericIds.has(block.id)) continue;
    if (!block.solid) {
      numericIds.set(block.id, 0);
      continue;
    }
    numericIds.set(block.id, nextId);
    blockColors[nextId] = colorChannels(block.color);
    blockMaterials[nextId] = block.materialPhysicsId;
    nextId += 1;
  }
  const safeSpawnBlock = manifest.generator.solidBlockIds
    .map((id) => numericIds.get(id))
    .find((id): id is number => id !== undefined) ?? 1;
  const hero = spec.entities.find(({ role }) => role === "hero") ?? spec.entities[0];
  const voxelStructures = compileVoxelStructures(spec.structures, {
    seed: spec.seed,
    radius: manifest.generator.radius,
    height: manifest.generator.height,
    spawn: manifest.spawn,
    surfaceAt: (x, z) => sampleSurfaceHeight(manifest.generator, x, z),
  });
  const beat = spec.playGraph.beats.find(({ optional }) => !optional) ?? spec.playGraph.beats[0]!;
  const fallbackEnding = spec.playGraph.endings[0]!;
  const sourceDialogue = hero
    ? spec.dialogues.find(({ speakerEntityId }) => speakerEntityId === hero.id)
    : undefined;
  const sourceNode = sourceDialogue?.nodes.find(({ id }) => id === sourceDialogue.startNodeId);
  const story: DreamArcDefinition = {
    meetObjective: {
      id: "meet-guide",
      title: `Meet ${hero?.displayName ?? "the Dream Guide"}`,
      description: "Approach the dream's guide and interact.",
      current: 0,
      target: 1,
      completed: false,
    },
    awakenObjective: {
      id: beat.id,
      title: beat.title,
      description: `${scenario.actionLabel}: ${beat.objectiveText} · ${scenario.movementSignature}`,
      current: 0,
      target: Math.max(1, spec.playGraph.beats.filter(({ optional }) => !optional).length),
      completed: false,
    },
    dialogue: {
      id: sourceDialogue?.id ?? GUIDE_DIALOGUE_ID,
      speaker: hero?.displayName ?? "The Dream Guide",
      text: sourceNode?.text ?? `${scenario.guidePrompt}. Will you help complete ${spec.playGraph.experienceName}?`,
      responses: sourceNode?.responses.length
        ? sourceNode.responses.map(({ id, text }) => ({ id, label: text }))
        : [{ id: GUIDE_RESPONSE_ID, label: "I will follow the dream." }],
    },
    transformation: {
      id: `${beat.id}-transformation`,
      structureId: DREAM_BEACON_ID,
      structureState: "complete",
      physicsTransitionId: spec.physics.transitions[0]?.id ?? "stable-transition",
      atmospherePatchId: spec.atmosphere.patches[0]?.id ?? "stable-atmosphere",
      durationMs: spec.physics.transitions[0]?.durationMs ?? 1_200,
    },
    ending: {
      id: fallbackEnding.id,
      title: fallbackEnding.title,
      narration: fallbackEnding.narration,
    },
  };
  const profile = createSafePhysicsProfile({
    player: {
      radius: spec.physics.player.body.radius,
      height: spec.physics.player.body.height,
      walkSpeed: spec.physics.player.movement.walkSpeed,
      sprintSpeed: spec.physics.player.movement.sprintSpeed,
      jumpVelocity: spec.physics.player.jump.jumpVelocity,
      coyoteTimeMs: spec.physics.player.jump.coyoteTimeMs,
      jumpBufferMs: spec.physics.player.jump.jumpBufferMs,
      abilities: {
        ...(spec.physics.player.abilities.dash
          ? { dash: { ...spec.physics.player.abilities.dash, cooldownMs: 700 } }
          : {}),
        ...(spec.physics.player.abilities.glide
          ? { glide: { ...spec.physics.player.abilities.glide, gravityScale: 0.25 } }
          : {}),
        ...(spec.physics.player.abilities.flight
          ? { flight: { ...spec.physics.player.abilities.flight } }
          : {}),
        ...(spec.physics.player.abilities.swim
          ? {
              swim: {
                ...spec.physics.player.abilities.swim,
                buoyancy: spec.physics.world.defaultBuoyancy,
                drag: Math.max(1, spec.physics.world.globalDrag),
              },
            }
          : {}),
      },
    },
    world: {
      gravity: spec.physics.world.gravity,
      terminalVelocity: spec.physics.world.terminalVelocity,
      globalTimeScale: spec.physics.world.globalTimeScale,
      globalDrag: spec.physics.world.globalDrag,
      windDirection: spec.physics.world.wind.direction,
      windStrength: spec.physics.world.wind.strength,
      windTurbulence: spec.physics.world.wind.turbulence,
      defaultBuoyancy: spec.physics.world.defaultBuoyancy,
    },
    gameFeel: {
      headBob: spec.physics.gameFeel.headBob,
      fieldOfView: spec.physics.gameFeel.fieldOfView,
      sprintFovIncrease: spec.physics.gameFeel.sprintFovIncrease,
      cameraRollResponse: spec.physics.gameFeel.cameraRollResponse,
      cameraShake: spec.physics.gameFeel.cameraShake,
    },
    materials: spec.physics.materials.map((material) => {
      const { crumbleAfterMs, respawnAfterMs, ...required } = material;
      return {
        ...required,
        ...(crumbleAfterMs === undefined ? {} : { crumbleAfterMs }),
        ...(respawnAfterMs === undefined ? {} : { respawnAfterMs }),
      };
    }),
    fields: structuredClone(spec.physics.fields),
    transitions: structuredClone(spec.physics.transitions),
  });

  const generator: ChunkGenerator = {
    generate: ({ chunkX, chunkZ }) => {
      const voxels = new Uint16Array(CHUNK_VOLUME);
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
        for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
          const x = chunkX * CHUNK_SIZE + localX;
          const z = chunkZ * CHUNK_SIZE + localZ;
          if (Math.hypot(x, z) <= manifest.generator.radius) {
            const surface = sampleSurfaceHeight(manifest.generator, x, z);
            for (let y = 0; y <= Math.min(surface, CHUNK_HEIGHT - 1); y += 1) {
              const depth = surface - y;
              let accumulated = 0;
              let blockId = manifest.generator.layers.at(-1)?.block ?? "air";
              for (const layer of manifest.generator.layers) {
                accumulated += layer.depth;
                if (depth < accumulated) {
                  blockId = layer.block;
                  break;
                }
              }
              voxels[voxelIndex(localX, y, localZ)] = numericIds.get(blockId) ?? 0;
            }
          }
          const platform = manifest.generator.emergencyPlatform;
          if (
            platform &&
            Math.abs(x - platform.center[0]) <= platform.halfSize &&
            Math.abs(z - platform.center[2]) <= platform.halfSize &&
            platform.center[1] >= 0 && platform.center[1] < CHUNK_HEIGHT
          ) {
            voxels[voxelIndex(localX, platform.center[1], localZ)] =
              numericIds.get(platform.blockId) ?? safeSpawnBlock;
          }
        }
      }
      materializeVoxelStructures(
        voxels,
        chunkX,
        chunkZ,
        voxelStructures,
        numericIds,
        safeSpawnBlock,
      );
      return { chunkX, chunkZ, voxels };
    },
  };

  return {
    generator,
    blockColors,
    blockMaterials,
    safeSpawnBlock,
    worldRadius: manifest.generator.radius,
    spawn: { x: manifest.spawn[0], z: manifest.spawn[2] },
    story,
    guideOptions: hero ? {
      bodyColor: hero.visual.palette.primary,
      accentColor: hero.visual.palette.accent,
      focalColor: hero.visual.palette.eye,
      scale: hero.visual.scale,
    } : {},
    playerConfig: {
      radius: profile.player.radius,
      height: profile.player.height,
      walkSpeed: profile.player.walkSpeed,
      sprintSpeed: profile.player.sprintSpeed,
      jumpVelocity: profile.player.jumpVelocity,
      coyoteTimeMs: profile.player.coyoteTimeMs,
      jumpBufferMs: profile.player.jumpBufferMs,
      terminalVelocity: profile.world.terminalVelocity,
      gravity: Math.max(1, Math.abs(profile.world.gravity[1])),
      globalDrag: profile.world.globalDrag,
      ...profile.player.abilities,
    },
    fieldOfView: profile.gameFeel.fieldOfView,
    scenario,
    staging,
    atmosphere: compileDreamAtmosphere(spec, { quality: "balanced" }),
    audio: structuredClone(spec.audio),
    physicsProfile: profile,
    heroEntity: hero ? structuredClone(hero) : null,
    voxelStructures,
  };
}
