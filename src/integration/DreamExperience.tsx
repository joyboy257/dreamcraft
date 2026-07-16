import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createProceduralAudioController, type ProceduralAudioController } from "../audio";
import type { LocalPreview } from "../app/localPreview";
import type { TrustedDreamManifest } from "../dream";
import { createVoxelEngine, type VoxelEngine } from "../engine/voxelEngine";
import type { InteractiveEntityTarget } from "../engine/interaction";
import {
  createDreamGuide,
  createProceduralEntity,
  type DreamGuideState,
} from "../entitykit";
import {
  DREAM_GUIDE_ID,
  TypedEventBus,
  createDreamArc,
  createPlayGraphRuntime,
  type DreamArcController,
  type DreamArcSnapshot,
  type GameplayEvent,
} from "../gameplay";
import {
  CanvasEntry,
  ControlsOverlay,
  DialogueOverlay,
  DreamHud,
  EndingOverlay,
} from "../ui";
import type { ComfortSettings } from "../ui";
import { createDreamBeacon, createSemanticWorldMarkers } from "./dummyWorldObjects";
import { adaptDreamManifest } from "./dreamRuntimeAdapter";
import {
  PLAY_GRAPH_INTERACTION_ID,
  interactionEventFor,
  objectiveWorldTarget,
  placedObjectEventFor,
  resolveDialogueResponse,
  zoneEntryEventsFor,
} from "./playGraphMechanics";

interface DreamExperienceProps {
  preview: LocalPreview;
  manifest: TrustedDreamManifest;
  enrichmentManifest: TrustedDreamManifest | null;
  generationLabel: string;
  onReplay: () => void;
  onRemix: () => void;
  onNewDream: () => void;
}

const DEFAULT_COMFORT: ComfortSettings = {
  muted: true,
  reducedMotion: false,
  cameraShake: false,
  cameraRoll: false,
  highContrast: false,
  fov: 72,
  mouseSensitivity: 1,
};

const GUIDE_STATES: readonly DreamGuideState[] = [
  "idle",
  "listening",
  "guiding",
  "celebrating",
];

function isGuideState(value: string): value is DreamGuideState {
  return GUIDE_STATES.some((state) => state === value);
}

function requestCanvasPointerLock(canvas: HTMLCanvasElement): void {
  try {
    void canvas.requestPointerLock().catch(() => undefined);
  } catch {
    // Pointer lock is optional in embedded and automated browser contexts.
  }
}

export function DreamExperience({
  preview,
  manifest,
  enrichmentManifest,
  generationLabel,
  onReplay,
  onRemix,
  onNewDream,
}: DreamExperienceProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const busRef = useRef<TypedEventBus<GameplayEvent> | null>(null);
  const arcRef = useRef<DreamArcController | null>(null);
  const audioRef = useRef<ProceduralAudioController | null>(null);
  const suppressPointerPauseRef = useRef(false);
  const wasPointerLockedRef = useRef(false);
  const enteredRef = useRef(false);
  const [snapshot, setSnapshot] = useState<DreamArcSnapshot | null>(null);
  const [endingRevealed, setEndingRevealed] = useState(false);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [comfort, setComfort] = useState(DEFAULT_COMFORT);

  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bus = new TypedEventBus<GameplayEvent>();
    const runtime = adaptDreamManifest(manifest);
    const audio = createProceduralAudioController(runtime.audio, { initiallyMuted: true });
    audioRef.current = audio;
    const arc = createDreamArc(bus, runtime.story);
    const playGraph = createPlayGraphRuntime(manifest.spec.playGraph);
    const requiredPlayGraphBeats = manifest.spec.playGraph.beats.filter(({ optional }) => !optional);
    const requiredPlayGraphBeatIds = new Set(
      (requiredPlayGraphBeats.length ? requiredPlayGraphBeats : manifest.spec.playGraph.beats.slice(0, 1))
        .map(({ id }) => id),
    );
    const gatedInteractionIds = new Set(
      manifest.spec.playGraph.beats.flatMap((beat) => [
        ...beat.onStart,
        ...beat.onProgress,
        ...beat.onComplete,
      ]).flatMap((effect) => effect.kind === "unlock_interaction" ? [effect.interactionId] : []),
    );
    let playGraphEffectCursor = 0;
    const timerProgress = new Map<string, number>();
    const timerReportedSeconds = new Map<string, number>();
    arcRef.current = arc;
    const proceduralGuide = runtime.heroEntity
      ? createProceduralEntity({
          id: DREAM_GUIDE_ID,
          visual: { ...runtime.heroEntity.visual, scale: runtime.staging.heroScale },
          role: runtime.heroEntity.role,
          seed: preview.seed,
          intendedDistance: 10,
        })
      : null;
    const legacyGuide = proceduralGuide
      ? null
      : createDreamGuide({ seed: preview.seed, ...runtime.guideOptions });
    const guideRoot = new THREE.Group();
    guideRoot.name = "dream-guide-staging";
    guideRoot.add((proceduralGuide ?? legacyGuide)!.root);
    const entityRoots = new Map<string, THREE.Group>();
    if (runtime.heroEntity) entityRoots.set(runtime.heroEntity.id, guideRoot);
    const auxiliaryEntities = manifest.spec.entities
      .filter(({ id }) => id !== runtime.heroEntity?.id)
      .map((entity) => {
        const actor = createProceduralEntity({
          id: entity.id,
          visual: entity.visual,
          role: entity.role,
          seed: preview.seed,
          intendedDistance: 12,
        });
        const stagingRoot = new THREE.Group();
        stagingRoot.name = `staged-${entity.id}`;
        stagingRoot.visible = false;
        stagingRoot.add(actor.root);
        entityRoots.set(entity.id, stagingRoot);
        return { actor, stagingRoot };
      });
    const updateGuide = (elapsedSeconds: number, deltaSeconds: number): void => {
      (proceduralGuide ?? legacyGuide)?.update({ elapsedSeconds, deltaSeconds });
      for (const { actor } of auxiliaryEntities) actor.update({ elapsedSeconds, deltaSeconds });
    };
    const setGuideState = (state: DreamGuideState): void => {
      if (proceduralGuide) {
        proceduralGuide.setAnimationState(
          state === "celebrating" ? "emotion" : state === "guiding" ? "locomotion" : "idle",
        );
      } else {
        legacyGuide?.setState(state);
      }
    };
    const beacon = createDreamBeacon();
    const markers = createSemanticWorldMarkers(
      runtime.staging.landmark,
      runtime.staging.objectivePath,
      runtime.heroEntity?.visual.palette.accent ?? 0xf4d58d,
    );
    const unsubscribers: Array<() => void> = [];
    busRef.current = bus;
    setSnapshot(arc.getSnapshot());
    setEndingRevealed(false);
    setReady(false);
    setFailure(null);

    const releasePointerForModal = (): void => {
      if (document.pointerLockElement) {
        suppressPointerPauseRef.current = true;
        document.exitPointerLock();
      }
    };

    let engine: VoxelEngine | null = null;
    let transformationDurationMs = 0;
    let endingRevealTimer: number | null = null;
    const deferredDialogueIds: string[] = [];
    const activeDialogueNodeIds = new Map<string, string>();
    const openContextDialogue = (dialogueId: string, nodeId?: string): void => {
      const definition = manifest.spec.dialogues.find(({ id }) => id === dialogueId);
      const node = definition?.nodes.find(({ id }) => id === (nodeId ?? definition.startNodeId));
      if (!definition || !node) return;
      activeDialogueNodeIds.set(dialogueId, node.id);
      const speaker = manifest.spec.entities.find(({ id }) => id === definition.speakerEntityId)?.displayName
        ?? runtime.story.dialogue.speaker;
      arc.openContextDialogue({
        id: definition.id,
        speaker,
        text: node.text,
        responses: node.responses.length
          ? node.responses.map(({ id, text }) => ({ id, label: text }))
          : [{ id: "continue", label: "Continue" }],
      });
    };
    const syncPlayGraph = (graph = playGraph.getSnapshot()): void => {
      for (const effect of graph.emittedEffects.slice(playGraphEffectCursor)) {
        if (effect.kind === "show_message") setToast(effect.text);
        if (effect.kind === "start_dialogue") {
          if (arc.getSnapshot().phase === "awaken_beacon") openContextDialogue(effect.dialogueId);
          else deferredDialogueIds.push(effect.dialogueId);
        }
        if (effect.kind === "play_audio_cue") audio.playCue(effect.cueId);
        if (effect.kind === "transform_structure") beacon.setAwakened(true);
        if (effect.kind === "apply_physics_transition") engine?.applyPhysicsTransition(effect.transitionId);
        if (effect.kind === "change_atmosphere") {
          const patch = runtime.atmosphere.patches.find(({ id }) => id === effect.patchId);
          if (patch) engine?.applyAtmosphere(patch.state, effect.durationMs, patch.particles);
        }
        if (effect.kind === "set_entity_state") {
          bus.emit({ type: "entity_state_changed", entityId: effect.entityId, state: effect.state });
        }
        if (effect.kind === "move_entity") entityRoots.get(effect.entityId)?.position.set(...effect.destination);
        if (effect.kind === "spawn_entity") {
          const root = entityRoots.get(effect.entityId);
          if (root) {
            root.visible = true;
            root.position.set(...effect.position);
          }
        }
        if (effect.kind === "play_effect") setToast(`Dream effect: ${effect.effectId}`);
        if (effect.kind === "unlock_interaction") setToast(`Interaction unlocked: ${effect.interactionId}.`);
        if (effect.kind === "give_item") setToast(`Received ${effect.count} ${effect.itemId}.`);
        if (effect.kind === "remove_item") setToast(`Used ${effect.count} ${effect.itemId}.`);
      }
      playGraphEffectCursor = graph.emittedEffects.length;

      const physicalTarget = graph.pendingConditions
        .map((condition) => objectiveWorldTarget(condition, manifest.spec.world.zones))
        .find((target) => target !== null) ?? null;
      if (physicalTarget) beacon.root.position.set(...physicalTarget);

      if (arc.getSnapshot().phase !== "awaken_beacon") return;
      const deferredDialogueId = deferredDialogueIds.shift();
      if (deferredDialogueId) openContextDialogue(deferredDialogueId);
      const requiredCompleted = graph.completedBeatIds.filter((id) => requiredPlayGraphBeatIds.has(id)).length;
      const active = graph.activeBeat;
      arc.syncAwakenObjective({
        id: active?.id ?? runtime.story.awakenObjective.id,
        title: active?.title ?? runtime.story.awakenObjective.title,
        description: active
          ? `${active.objectiveText} · ${runtime.scenario.movementSignature}`
          : runtime.story.awakenObjective.description,
        current: requiredCompleted,
        target: Math.max(1, requiredPlayGraphBeatIds.size),
        completed: graph.endingId !== null,
      });
      if (graph.endingId) {
        const selected = manifest.spec.playGraph.endings.find(({ id }) => id === graph.endingId);
        if (selected) {
          arc.completeFromPlayGraph({
            id: selected.id,
            title: selected.title,
            narration: selected.narration,
          });
        }
      }
    };
    const recordPlayGraphEvent = (event: Parameters<typeof playGraph.record>[0]): void => {
      syncPlayGraph(playGraph.record(event));
      if (event.kind === "entity_state") {
        proceduralGuide?.setAnimationState("emotion");
        bus.emit({ type: "entity_state_changed", entityId: event.entityId, state: event.state });
      }
      if (event.kind === "item_collected") setToast(`Collected ${event.count} ${event.itemId}.`);
      if (event.kind === "item_delivered") setToast(`Delivered ${event.itemId}.`);
    };
    const getInteractiveEntities = (): readonly InteractiveEntityTarget[] => {
      const phase = arc.getSnapshot().phase;
      if (phase === "meet_guide") {
        return [{
          id: DREAM_GUIDE_ID,
          position: {
            x: guideRoot.position.x,
            y: guideRoot.position.y + 1.55,
            z: guideRoot.position.z,
          },
          radius: 1.55,
          prompt: `Speak with ${runtime.story.dialogue.speaker}`,
        }];
      }
      if (phase === "awaken_beacon") {
        const graph = playGraph.getSnapshot();
        const condition = graph.pendingConditions.find((pending) => interactionEventFor(pending) !== null);
        if (!condition) return [];
        if (
          condition.kind === "interacted" &&
          gatedInteractionIds.has(condition.targetId) &&
          !graph.unlockedInteractionIds.includes(condition.targetId)
        ) return [];
        const position = condition.kind === "entity_state" ? guideRoot.position : beacon.root.position;
        return [{
          id: PLAY_GRAPH_INTERACTION_ID,
          position: {
            x: position.x,
            y: position.y + 1.55,
            z: position.z,
          },
          radius: 1.75,
          prompt: graph.activeBeat?.title ?? runtime.story.awakenObjective.title,
        }];
      }
      return [];
    };

    engine = createVoxelEngine(canvas, {
      seed: preview.seed,
      onFailure: setFailure,
      onInteractionPrompt: setPrompt,
      onEntityInteract: (entityId) => {
        if (entityId === PLAY_GRAPH_INTERACTION_ID) {
          const condition = playGraph.getSnapshot().pendingConditions
            .find((pending) => interactionEventFor(pending) !== null);
          const event = condition ? interactionEventFor(condition) : null;
          if (event) recordPlayGraphEvent(event);
          return;
        }
        bus.emit({ type: "entity_interacted", entityId });
      },
      onBlockEdit: (action, position) => {
        if (action !== "place" || arc.getSnapshot().phase !== "awaken_beacon") return;
        const event = placedObjectEventFor(
          playGraph.getSnapshot().pendingConditions,
          manifest.spec.world.zones,
          position,
        );
        if (event) recordPlayGraphEvent(event);
      },
      getInteractiveEntities,
      sceneObjects: [guideRoot, beacon.root, markers.root, ...auxiliaryEntities.map(({ stagingRoot }) => stagingRoot)],
      onFixedUpdate: (elapsedSeconds, deltaSeconds, playerPosition) => {
        updateGuide(elapsedSeconds, deltaSeconds);
        if (arc.getSnapshot().phase !== "awaken_beacon") return;
        for (let step = 0; step < 8; step += 1) {
          const graph = playGraph.getSnapshot();
          const zoneEvent = zoneEntryEventsFor(
            graph.pendingConditions,
            manifest.spec.world.zones,
            playerPosition,
          )[0];
          if (!zoneEvent) break;
          recordPlayGraphEvent(zoneEvent);
        }
        for (const condition of playGraph.getSnapshot().pendingConditions) {
          if (condition.kind !== "timer_elapsed") continue;
          const elapsed = (timerProgress.get(condition.timerId) ?? 0) + deltaSeconds;
          timerProgress.set(condition.timerId, elapsed);
          const wholeSeconds = Math.floor(elapsed);
          if (wholeSeconds <= (timerReportedSeconds.get(condition.timerId) ?? -1)) continue;
          timerReportedSeconds.set(condition.timerId, wholeSeconds);
          recordPlayGraphEvent({ kind: "timer_elapsed", timerId: condition.timerId, seconds: wholeSeconds });
        }
      },
      generator: runtime.generator,
      blockColors: runtime.blockColors,
      blockMaterials: runtime.blockMaterials,
      safeSpawnBlock: runtime.safeSpawnBlock,
      worldRadius: runtime.worldRadius,
      spawn: runtime.spawn,
      playerConfig: runtime.playerConfig,
      fieldOfView: runtime.fieldOfView,
      atmosphere: runtime.atmosphere.initial,
      particles: runtime.atmosphere.particles,
      physicsProfile: runtime.physicsProfile,
      initialLookAt: {
        x: runtime.staging.cameraTarget[0],
        y: runtime.staging.cameraTarget[1],
        z: runtime.staging.cameraTarget[2],
      },
    });
    if (!engine) {
      arc.dispose();
      bus.clear();
      (proceduralGuide ?? legacyGuide)?.dispose();
      for (const { actor } of auxiliaryEntities) actor.dispose();
      beacon.dispose();
      markers.dispose();
      busRef.current = null;
      arcRef.current = null;
      return;
    }
    engineRef.current = engine;

    const guideX = Math.floor(runtime.staging.guide[0]);
    const guideZ = Math.floor(runtime.staging.guide[2]);
    const guideSurface = engine.world.getSurfaceY(guideX, guideZ) ?? 6;
    guideRoot.position.set(guideX + 0.5, guideSurface + 0.2, guideZ + 0.5);
    const beaconX = Math.floor(runtime.staging.objective[0]);
    const beaconZ = Math.floor(runtime.staging.objective[2]);
    const beaconSurface = engine.world.getSurfaceY(beaconX, beaconZ) ?? guideSurface;
    beacon.root.position.set(beaconX + 0.5, beaconSurface + 0.2, beaconZ + 0.5);

    const syncSnapshot = (): void => setSnapshot(arc.getSnapshot());
    unsubscribers.push(
      bus.on("dialogue_response", (event) => {
        const selected = resolveDialogueResponse(
          manifest.spec.dialogues,
          event.dialogueId,
          activeDialogueNodeIds.get(event.dialogueId),
          event.responseId,
        );
        const response = selected?.response;
        syncPlayGraph(playGraph.recordWithEffects({
          kind: "response_chosen",
          dialogueId: event.dialogueId,
          responseId: event.responseId,
        }, response?.effects ?? []));
        if (response?.nextNodeId) openContextDialogue(event.dialogueId, response.nextNodeId);
        else {
          activeDialogueNodeIds.delete(event.dialogueId);
          recordPlayGraphEvent({ kind: "dialogue_completed", dialogueId: event.dialogueId });
        }
      }),
      bus.on("objective_changed", syncSnapshot),
      bus.on("dialogue_opened", () => {
        engine?.pause();
        releasePointerForModal();
        syncSnapshot();
      }),
      bus.on("dialogue_closed", syncSnapshot),
      bus.on("entity_state_changed", (event) => {
        if (event.entityId === DREAM_GUIDE_ID && isGuideState(event.state)) {
          setGuideState(event.state);
        }
        syncSnapshot();
      }),
      bus.on("world_transformation_started", (event) => {
        beacon.setAwakened(true);
        transformationDurationMs = Math.max(0, Math.min(5_000, event.transformation.durationMs));
        setEndingRevealed(false);
        const patch = runtime.atmosphere.patches.find(
          ({ id }) => id === event.transformation.atmospherePatchId,
        );
        engine?.applyAtmosphere(
          patch?.state ?? runtime.atmosphere.initial,
          event.transformation.durationMs,
          patch?.particles ?? runtime.atmosphere.particles,
        );
        engine?.applyPhysicsTransition(event.transformation.physicsTransitionId);
        const cueId = runtime.audio.cues[0]?.id;
        if (cueId) audio.playCue(cueId);
        setToast(runtime.scenario.transformationMessage);
        syncSnapshot();
      }),
      bus.on("ending_reached", () => {
        if (endingRevealTimer !== null) window.clearTimeout(endingRevealTimer);
        endingRevealTimer = window.setTimeout(() => {
          engine?.pause();
          void audio.suspend();
          releasePointerForModal();
          setEndingRevealed(true);
          syncSnapshot();
        }, transformationDurationMs);
      }),
    );
    syncPlayGraph();

    const handlePointerLockChange = (): void => {
      if (document.pointerLockElement === canvas) {
        wasPointerLockedRef.current = true;
        return;
      }
      if (suppressPointerPauseRef.current) {
        suppressPointerPauseRef.current = false;
        return;
      }
      if (wasPointerLockedRef.current && enteredRef.current) {
        engine?.pause();
        setPaused(true);
      }
    };
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    setReady(true);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      if (endingRevealTimer !== null) window.clearTimeout(endingRevealTimer);
      for (const unsubscribe of unsubscribers) unsubscribe();
      engine?.dispose();
      arc.dispose();
      bus.clear();
      (proceduralGuide ?? legacyGuide)?.dispose();
      for (const { actor } of auxiliaryEntities) actor.dispose();
      beacon.dispose();
      markers.dispose();
      void audio.dispose();
      engineRef.current = null;
      busRef.current = null;
      arcRef.current = null;
      audioRef.current = null;
    };
  }, [manifest, preview.seed]);

  useEffect(() => {
    audioRef.current?.setMuted(comfort.muted);
    engineRef.current?.setReducedMotion(comfort.reducedMotion);
  }, [comfort.muted, comfort.reducedMotion]);

  useEffect(() => {
    if (!enrichmentManifest) return;
    const enrichment = adaptDreamManifest(enrichmentManifest);
    arcRef.current?.applyNarrativeEnrichment({
      dialogueText: enrichment.story.dialogue.text,
      endingNarration: enrichment.story.ending.narration,
    });
  }, [enrichmentManifest]);

  const enter = (): void => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    setEntered(true);
    setPaused(false);
    engine.start();
    void audioRef.current?.unlockFromGesture();
    requestCanvasPointerLock(canvas);
  };

  const openPause = (): void => {
    engineRef.current?.pause();
    void audioRef.current?.suspend();
    setPaused(true);
    if (document.pointerLockElement) {
      suppressPointerPauseRef.current = true;
      document.exitPointerLock();
    }
  };

  const resume = (): void => {
    setPaused(false);
    engineRef.current?.start();
    void audioRef.current?.resumeFromGesture();
    if (canvasRef.current) requestCanvasPointerLock(canvasRef.current);
  };

  const chooseDialogue = (responseId: string): void => {
    const dialogueId = snapshot?.dialogue?.id;
    if (!dialogueId) return;
    busRef.current?.emit({
      type: "dialogue_response",
      dialogueId,
      responseId,
    });
    if (arcRef.current?.getSnapshot().dialogue) return;
    setPaused(false);
    engineRef.current?.start();
    if (canvasRef.current) requestCanvasPointerLock(canvasRef.current);
  };

  const objective = snapshot
    ? {
        title: snapshot.objective.title,
        detail: snapshot.objective.description,
        progress: snapshot.objective.completed
          ? "Complete"
          : `${snapshot.objective.current}/${snapshot.objective.target}`,
      }
    : null;
  const dialogue = snapshot?.dialogue
    ? {
        speaker: snapshot.dialogue.speaker,
        text: snapshot.dialogue.text,
        choices: snapshot.dialogue.responses,
        canClose: false,
      }
    : null;
  const ending = snapshot?.ending && endingRevealed
    ? {
        title: snapshot.ending.title,
        narration: snapshot.ending.narration,
      }
    : null;

  return (
    <main className={`experience-shell${comfort.highContrast ? " is-high-contrast" : ""}`}>
      <header className="experience-header">
        <a className="brand" href="#dream-world" aria-label="DreamCraft dream world">
          <span className="brand-mark" aria-hidden="true">✦</span>
          DreamCraft
        </a>
        <span className="build-chip">{generationLabel}</span>
      </header>
      <section className="experience-world" id="dream-world" aria-label="Playable dream world">
        <CanvasEntry isReady={ready} isEntered={entered} onEnter={enter}>
          <canvas
            ref={canvasRef}
            className="dream-game-canvas"
            data-testid="dream-canvas"
            aria-label="DreamCraft playable voxel world"
          />
          {ready ? (
            <DreamHud
              title={preview.title}
              objective={objective}
              interactionPrompt={prompt}
              toast={toast}
              paused={paused}
              onOpenPause={openPause}
            />
          ) : null}
          {failure ? <p className="experience-failure" role="alert">{failure}</p> : null}
          {dialogue ? (
            <DialogueOverlay dialogue={dialogue} onChoose={chooseDialogue} />
          ) : null}
          {paused && !dialogue && !ending ? (
            <ControlsOverlay
              settings={comfort}
              onSettingsChange={setComfort}
              onResume={resume}
              onExitDream={onRemix}
            />
          ) : null}
          {ending ? (
            <EndingOverlay
              ending={ending}
              onReplay={onReplay}
              onRemix={onRemix}
              onNewDream={onNewDream}
            />
          ) : null}
        </CanvasEntry>
      </section>
      <p className="experience-help">
        WASD move · Mouse look · Space jump · E interact · Left click break · Right click place · Escape pause
      </p>
    </main>
  );
}
