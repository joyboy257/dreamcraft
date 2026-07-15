import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_VOLUME, voxelIndex } from "../engine/chunkMath";
import type { BlockId, ChunkGenerator } from "../engine/localGenerator";
import type { PlayerMotorConfig } from "../engine/playerMotor";
import type { DreamGuideOptions } from "../entitykit";
import {
  DREAM_BEACON_ID,
  GUIDE_DIALOGUE_ID,
  GUIDE_RESPONSE_ID,
  createSafePhysicsProfile,
  type DreamArcDefinition,
} from "../gameplay";
import { sampleSurfaceHeight, type TrustedDreamManifest } from "../dream";

export interface AdaptedDreamRuntime {
  generator: ChunkGenerator;
  blockColors: Readonly<Record<number, readonly [number, number, number]>>;
  safeSpawnBlock: BlockId;
  worldRadius: number;
  spawn: { x: number; z: number };
  story: DreamArcDefinition;
  guideOptions: DreamGuideOptions;
  playerConfig: Partial<PlayerMotorConfig>;
  fieldOfView: number;
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
  const numericIds = new Map<string, BlockId>([["air", 0]]);
  const blockColors: Record<number, readonly [number, number, number]> = {};
  let nextId = 1;
  for (const block of manifest.blocks) {
    if (block.id === "air" || numericIds.has(block.id)) continue;
    if (!block.solid) {
      numericIds.set(block.id, 0);
      continue;
    }
    numericIds.set(block.id, nextId);
    blockColors[nextId] = colorChannels(block.color);
    nextId += 1;
  }
  const safeSpawnBlock = manifest.generator.solidBlockIds
    .map((id) => numericIds.get(id))
    .find((id): id is number => id !== undefined) ?? 1;
  const hero = spec.entities.find(({ role }) => role === "hero") ?? spec.entities[0];
  const completionBeats = spec.playGraph.beats.filter(({ onComplete }) =>
    onComplete.some(({ kind }) => kind === "complete_experience"),
  );
  const beat = completionBeats.find(({ startsWhen, completesWhen }) =>
    startsWhen.kind === "always" && completesWhen.kind === "always",
  ) ?? completionBeats[0] ?? spec.playGraph.beats[0]!;
  const completionEffect = beat.onComplete.find(({ kind }) => kind === "complete_experience");
  const ending = completionEffect?.kind === "complete_experience"
    ? spec.playGraph.endings.find(({ id }) => id === completionEffect.endingId) ?? spec.playGraph.endings[0]!
    : spec.playGraph.endings[0]!;
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
      description: beat.objectiveText,
      current: 0,
      target: 1,
      completed: false,
    },
    dialogue: {
      id: sourceDialogue?.id ?? GUIDE_DIALOGUE_ID,
      speaker: hero?.displayName ?? "The Dream Guide",
      text: sourceNode?.text ?? `Will you help complete ${spec.playGraph.experienceName}?`,
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
      id: ending.id,
      title: ending.title,
      narration: ending.narration,
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
    },
    world: {
      gravity: spec.physics.world.gravity,
      terminalVelocity: spec.physics.world.terminalVelocity,
      globalTimeScale: spec.physics.world.globalTimeScale,
      globalDrag: spec.physics.world.globalDrag,
      windDirection: spec.physics.world.wind.direction,
      windStrength: spec.physics.world.wind.strength,
    },
    gameFeel: {
      headBob: spec.physics.gameFeel.headBob,
      fieldOfView: spec.physics.gameFeel.fieldOfView,
      sprintFovIncrease: spec.physics.gameFeel.sprintFovIncrease,
      cameraRollResponse: spec.physics.gameFeel.cameraRollResponse,
      cameraShake: spec.physics.gameFeel.cameraShake,
    },
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
      return { chunkX, chunkZ, voxels };
    },
  };

  return {
    generator,
    blockColors,
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
    },
    fieldOfView: profile.gameFeel.fieldOfView,
  };
}
