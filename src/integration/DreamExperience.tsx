import { useEffect, useRef, useState } from "react";
import type { LocalPreview } from "../app/localPreview";
import type { TrustedDreamManifest } from "../dream";
import { createVoxelEngine, type VoxelEngine } from "../engine/voxelEngine";
import type { InteractiveEntityTarget } from "../engine/interaction";
import { createDreamGuide, type DreamGuideState } from "../entitykit";
import {
  DREAM_BEACON_ID,
  DREAM_GUIDE_ID,
  TypedEventBus,
  createDreamArc,
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
import { createDreamBeacon } from "./dummyWorldObjects";
import { adaptDreamManifest } from "./dreamRuntimeAdapter";

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
  const suppressPointerPauseRef = useRef(false);
  const wasPointerLockedRef = useRef(false);
  const enteredRef = useRef(false);
  const [snapshot, setSnapshot] = useState<DreamArcSnapshot | null>(null);
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
    const arc = createDreamArc(bus, runtime.story);
    arcRef.current = arc;
    const guide = createDreamGuide({ seed: preview.seed, ...runtime.guideOptions });
    const beacon = createDreamBeacon();
    const unsubscribers: Array<() => void> = [];
    busRef.current = bus;
    setSnapshot(arc.getSnapshot());
    setReady(false);
    setFailure(null);

    const releasePointerForModal = (): void => {
      if (document.pointerLockElement) {
        suppressPointerPauseRef.current = true;
        document.exitPointerLock();
      }
    };

    let engine: VoxelEngine | null = null;
    const getInteractiveEntities = (): readonly InteractiveEntityTarget[] => {
      const phase = arc.getSnapshot().phase;
      if (phase === "meet_guide") {
        return [{
          id: DREAM_GUIDE_ID,
          position: {
            x: guide.root.position.x,
            y: guide.root.position.y + 1.55,
            z: guide.root.position.z,
          },
          radius: 1.55,
          prompt: `Speak with ${runtime.story.dialogue.speaker}`,
        }];
      }
      if (phase === "awaken_beacon") {
        return [{
          id: DREAM_BEACON_ID,
          position: {
            x: beacon.root.position.x,
            y: beacon.root.position.y + 1.8,
            z: beacon.root.position.z,
          },
          radius: 1.75,
          prompt: runtime.story.awakenObjective.title,
        }];
      }
      return [];
    };

    engine = createVoxelEngine(canvas, {
      seed: preview.seed,
      onFailure: setFailure,
      onInteractionPrompt: setPrompt,
      onEntityInteract: (entityId) => {
        bus.emit({ type: "entity_interacted", entityId });
      },
      getInteractiveEntities,
      sceneObjects: [guide.root, beacon.root],
      onFixedUpdate: (elapsedSeconds, deltaSeconds) => {
        guide.update({ elapsedSeconds, deltaSeconds });
      },
      generator: runtime.generator,
      blockColors: runtime.blockColors,
      safeSpawnBlock: runtime.safeSpawnBlock,
      worldRadius: runtime.worldRadius,
      spawn: runtime.spawn,
      playerConfig: runtime.playerConfig,
      fieldOfView: runtime.fieldOfView,
    });
    if (!engine) {
      arc.dispose();
      bus.clear();
      guide.dispose();
      beacon.dispose();
      busRef.current = null;
      arcRef.current = null;
      return;
    }
    engineRef.current = engine;

    const guideX = Math.floor(runtime.spawn.x);
    const guideZ = Math.floor(runtime.spawn.z) - 4;
    const guideSurface = engine.world.getSurfaceY(guideX, guideZ) ?? 6;
    guide.root.position.set(guideX + 0.5, guideSurface + 0.2, guideZ + 0.5);
    beacon.root.position.set(guideX + 0.5, guideSurface + 0.2, guideZ - 1.75);

    const syncSnapshot = (): void => setSnapshot(arc.getSnapshot());
    unsubscribers.push(
      bus.on("objective_changed", syncSnapshot),
      bus.on("dialogue_opened", () => {
        engine?.pause();
        releasePointerForModal();
        syncSnapshot();
      }),
      bus.on("dialogue_closed", syncSnapshot),
      bus.on("entity_state_changed", (event) => {
        if (event.entityId === DREAM_GUIDE_ID && isGuideState(event.state)) {
          guide.setState(event.state);
        }
        syncSnapshot();
      }),
      bus.on("world_transformation_started", () => {
        beacon.setAwakened(true);
        setToast("The moonwell opens and the world begins to rise.");
        syncSnapshot();
      }),
      bus.on("ending_reached", () => {
        engine?.pause();
        releasePointerForModal();
        syncSnapshot();
      }),
    );

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
      for (const unsubscribe of unsubscribers) unsubscribe();
      engine?.dispose();
      arc.dispose();
      bus.clear();
      guide.dispose();
      beacon.dispose();
      engineRef.current = null;
      busRef.current = null;
      arcRef.current = null;
    };
  }, [manifest, preview.seed]);

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
    requestCanvasPointerLock(canvas);
  };

  const openPause = (): void => {
    engineRef.current?.pause();
    setPaused(true);
    if (document.pointerLockElement) {
      suppressPointerPauseRef.current = true;
      document.exitPointerLock();
    }
  };

  const resume = (): void => {
    setPaused(false);
    engineRef.current?.start();
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
  const ending = snapshot?.ending
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
