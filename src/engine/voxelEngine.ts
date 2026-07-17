import * as THREE from "three";
import type { RuntimeMetrics } from "../contracts/runtime";
import { CHUNK_SIZE, chunkKey, worldToChunk } from "./chunkMath";
import { meshChunk } from "./chunkMesher";
import { CrumbleScheduler } from "./crumbleScheduler";
import {
  editTargetedBlock,
  resolveCenterTarget,
  type CenterTarget,
  type InteractiveEntityTarget,
} from "./interaction";
import { createLocalGenerator, type BlockId, type ChunkGenerator } from "./localGenerator";
import { PlayerMotor, type PlayerMotorConfig } from "./playerMotor";
import {
  applyPhysicsTransition as samplePhysicsTransition,
  resolvePhysicsAtPoint,
  resolveSurfaceReaction,
  type RuntimePhysicsProfile,
} from "../gameplay/physicsProfile";
import { detectQualityTier, qualityProfile, type QualityTier } from "./quality";
import { RuntimeMetricsRecorder } from "./runtimeMetrics";
import { prepareSafeSpawn } from "./spawnSafety";
import { chunksAround, shouldUnloadChunk } from "./streaming";
import { VoxelWorld, type ChunkCoordinate } from "./voxelWorld";

export interface VoxelEngineOptions {
  seed?: number;
  quality?: QualityTier;
  selectedBlock?: BlockId;
  onFailure: (message: string) => void;
  onRecovery?: () => void;
  onInteractionPrompt?: (prompt: string | null) => void;
  onEntityInteract?: (entityId: string) => void;
  onBlockEdit?: (
    action: "break" | "place",
    position: { x: number; y: number; z: number },
  ) => void;
  getInteractiveEntities?: () => readonly InteractiveEntityTarget[];
  sceneObjects?: readonly THREE.Object3D[];
  onFixedUpdate?: (
    elapsedSeconds: number,
    deltaSeconds: number,
    playerPosition: Readonly<{ x: number; y: number; z: number }>,
  ) => void;
  generator?: ChunkGenerator;
  worldRadius?: number;
  spawn?: { x: number; z: number };
  safeSpawnBlock?: BlockId;
  blockColors?: Readonly<Record<number, readonly [number, number, number]>>;
  playerConfig?: Partial<PlayerMotorConfig>;
  fieldOfView?: number;
  atmosphere?: VoxelAtmosphereState;
  particles?: VoxelParticlePlan;
  physicsProfile?: RuntimePhysicsProfile;
  blockMaterials?: Readonly<Record<number, string>>;
  initialLookAt?: { x: number; y: number; z: number };
}

export interface VoxelAtmosphereState {
  sky: { top: number; bottom: number };
  fog: { color: number; near: number; far: number };
  ambient: { color: number; intensity: number };
  sun: { color: number; intensity: number };
}

export interface VoxelParticlePlan {
  kind: string;
  count: number;
  speed: number;
  sway: number;
  pointSize: number;
}

function runtimeParticleColor(kind: string, fallback: number): number {
  if (kind === "bubbles") return 0x91cfff;
  if (kind === "mist") return 0xc5d8df;
  if (kind === "petals") return 0xff9ecb;
  if (kind === "sparkles") return 0xfff4bd;
  if (kind === "stars") return 0xe8e2ff;
  if (kind === "dust") return 0xd9b56d;
  return fallback;
}

export interface VoxelEngine {
  start(): void;
  pause(): void;
  dispose(): void;
  setControl(control: VoxelControl, pressed: boolean): void;
  setMoveVector(x: number, y: number): void;
  setInputEnabled(enabled: boolean): void;
  refreshInteractionTarget(): void;
  lookBy(deltaX: number, deltaY: number): void;
  setFieldOfView(fieldOfView: number): void;
  setMouseSensitivity(sensitivity: number): void;
  getPlayerPosition(): Readonly<{ x: number; y: number; z: number }>;
  getViewRotation(): Readonly<{ yaw: number; pitch: number }>;
  getComfortSettings(): Readonly<{ fieldOfView: number; mouseSensitivity: number; reducedMotion: boolean }>;
  getQualityProfile(): Readonly<ReturnType<typeof qualityProfile>>;
  getMetrics(): RuntimeMetrics;
  getRendererDiagnostics(): RendererDiagnostics;
  applyAtmosphere(
    state: VoxelAtmosphereState,
    durationMs?: number,
    particles?: VoxelParticlePlan,
  ): void;
  setReducedMotion(reduced: boolean): void;
  applyPhysicsTransition(transitionId: string): void;
  readonly world: VoxelWorld;
}

export type VoxelControl = "forward" | "back" | "left" | "right" | "jump" | "interact";

export interface RendererDiagnostics {
  readonly classification: "hardware" | "software" | "unknown";
  readonly renderer: string | null;
  readonly vendor: string | null;
}

export function cameraRotationToward(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
): { yaw: number; pitch: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horizontal = Math.max(0.001, Math.hypot(dx, dz));
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, Math.atan2(dy, horizontal))),
  };
}

const FIXED_DELTA_SECONDS = 1 / 60;
const MAX_FIXED_STEPS = 5;
const PLAYER_REACH = 6;

export function createVoxelEngine(
  canvas: HTMLCanvasElement,
  options: VoxelEngineOptions,
): VoxelEngine | null {
  const profile = qualityProfile(options.quality ?? detectQualityTier());
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: profile.antialias,
      powerPreference: "high-performance",
    });
  } catch {
    options.onFailure("WebGL could not initialize on this device.");
    return null;
  }

  const scene = new THREE.Scene();
  const initialAtmosphere = options.atmosphere;
  scene.background = new THREE.Color(initialAtmosphere?.sky.bottom ?? 0x151126);
  scene.fog = new THREE.Fog(
    initialAtmosphere?.fog.color ?? 0x211b35,
    initialAtmosphere?.fog.near ?? 18,
    initialAtmosphere?.fog.far ?? 58,
  );

  const camera = new THREE.PerspectiveCamera(
    Math.max(55, Math.min(95, options.fieldOfView ?? 72)),
    1,
    0.05,
    100,
  );
  camera.rotation.order = "YXZ";
  const hemisphere = new THREE.HemisphereLight(
    initialAtmosphere?.ambient.color ?? 0xcbbfff,
    initialAtmosphere?.sky.top ?? 0x181225,
    initialAtmosphere?.ambient.intensity ?? 1.65,
  );
  const sun = new THREE.DirectionalLight(
    initialAtmosphere?.sun.color ?? 0xffdfb8,
    initialAtmosphere?.sun.intensity ?? 2.1,
  );
  sun.position.set(-12, 22, 8);
  scene.add(hemisphere, sun);
  for (const object of options.sceneObjects ?? []) scene.add(object);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  let particlePlan = options.particles;
  const particleLimit = profile.tier === "reduced" ? 120 : 500;
  const particleCount = Math.max(0, Math.min(particleLimit, Math.floor(particlePlan?.count ?? 0)));
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(500 * 3);
  for (let index = 0; index < 500; index += 1) {
    const phase = (options.seed ?? 1) * 0.001 + index * 12.9898;
    const radial = 4 + ((Math.sin(phase) + 1) / 2) * 28;
    const angle = phase * 4.123;
    particlePositions[index * 3] = Math.cos(angle) * radial;
    particlePositions[index * 3 + 1] = 3 + ((Math.sin(phase * 2.17) + 1) / 2) * 22;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radial;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setDrawRange(0, particleCount);
  const particleMaterial = new THREE.PointsMaterial({
    color: runtimeParticleColor(particlePlan?.kind ?? "motes", initialAtmosphere?.sky.top ?? 0xffffff),
    size: Math.max(0.03, Math.min(0.3, particlePlan?.pointSize ?? 0.1)),
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.visible = particleCount > 0;
  scene.add(particles);

  const world = new VoxelWorld(options.generator ?? createLocalGenerator(options.seed ?? 0x5eed), {
    radius: options.worldRadius ?? 64,
  });
  const spawnX = Math.floor(options.spawn?.x ?? 0);
  const spawnZ = Math.floor(options.spawn?.z ?? 0);
  const surfaceY = world.getSurfaceY(spawnX, spawnZ) ?? 6;
  prepareSafeSpawn(world, surfaceY, {
    centerX: spawnX,
    centerZ: spawnZ,
    ...(options.safeSpawnBlock === undefined ? {} : { blockId: options.safeSpawnBlock }),
  });
  const player = new PlayerMotor(
    { x: spawnX + 0.5, y: surfaceY + 1, z: spawnZ + 0.5 },
    options.playerConfig,
  );
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const chunkMeshes = new Map<string, THREE.Mesh>();
  const meshQueue = new Map<string, ChunkCoordinate>();
  let streamQueue: ChunkCoordinate[] = [];
  let centerChunk: ChunkCoordinate = { x: 0, z: 0 };
  const metrics = new RuntimeMetricsRecorder();
  const initializedAt = performance.now();
  let target: CenterTarget | null = null;
  let lastPrompt: string | null = null;
  let selectedBlock = Math.max(1, Math.min(65_535, Math.trunc(options.selectedBlock ?? 5)));

  const selectionBoxGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
  const selectionGeometry = new THREE.EdgesGeometry(selectionBoxGeometry);
  selectionBoxGeometry.dispose();
  const selectionMaterial = new THREE.LineBasicMaterial({ color: 0xfff0a6, depthTest: false });
  const selection = new THREE.LineSegments(selectionGeometry, selectionMaterial);
  selection.visible = false;
  selection.renderOrder = 10;
  scene.add(selection);

  const keys = new Set<string>();
  const externalControls = new Set<VoxelControl>();
  let moveVector = { x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;
  let mouseSensitivity = 1;
  if (options.initialLookAt) {
    const rotation = cameraRotationToward(
      { x: player.state.position.x, y: player.state.position.y + 1.62, z: player.state.position.z },
      options.initialLookAt,
    );
    yaw = rotation.yaw;
    pitch = rotation.pitch;
  }
  let disposed = false;
  let desiredRunning = false;
  let inputEnabled = false;
  let contextLost = false;
  let previousFrameAt = 0;
  let accumulator = 0;
  let reducedMotion = false;
  let physicsProfile = options.physicsProfile;
  let physicsTransitionBase = physicsProfile;
  let physicsTransitionId: string | null = null;
  let physicsTransitionElapsedMs = 0;
  const crumbleScheduler = new CrumbleScheduler();
  const copyAtmosphere = (state: VoxelAtmosphereState): VoxelAtmosphereState => ({
    sky: { ...state.sky },
    fog: { ...state.fog },
    ambient: { ...state.ambient },
    sun: { ...state.sun },
  });
  const defaultAtmosphere: VoxelAtmosphereState = {
    sky: { top: 0x181225, bottom: 0x151126 },
    fog: { color: 0x211b35, near: 18, far: 58 },
    ambient: { color: 0xcbbfff, intensity: 1.65 },
    sun: { color: 0xffdfb8, intensity: 2.1 },
  };
  let currentAtmosphere = copyAtmosphere(initialAtmosphere ?? defaultAtmosphere);
  let atmosphereOrigin = copyAtmosphere(currentAtmosphere);
  let atmosphereTarget = copyAtmosphere(currentAtmosphere);
  let atmosphereElapsedMs = 0;
  let atmosphereDurationMs = 0;
  const rayDirection = new THREE.Vector3();

  function isWithinRenderRadius(chunk: ChunkCoordinate): boolean {
    return Math.max(
      Math.abs(chunk.x - centerChunk.x),
      Math.abs(chunk.z - centerChunk.z),
    ) <= profile.renderRadius;
  }

  function disposeChunkMesh(key: string): void {
    const existing = chunkMeshes.get(key);
    if (!existing) return;
    scene.remove(existing);
    existing.geometry.dispose();
    chunkMeshes.delete(key);
  }

  function buildChunkMesh(chunk: ChunkCoordinate): void {
    if (!isWithinRenderRadius(chunk)) return;
    const startedAt = performance.now();
    const data = world.ensureChunk(chunk.x, chunk.z);
    const payload = meshChunk({
      chunkX: chunk.x,
      chunkZ: chunk.z,
      voxels: data.voxels,
      getNeighbor: (x, y, z) => world.getBlock(x, y, z),
      ...(options.blockColors === undefined ? {} : { blockColors: options.blockColors }),
    });
    const key = chunkKey(chunk.x, chunk.z);
    disposeChunkMesh(key);

    if (payload.indices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(payload.positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(payload.normals, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(payload.colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(payload.indices, 1));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
      chunkMeshes.set(key, mesh);
    }
    metrics.recordChunkJob(performance.now() - startedAt);
  }

  function scheduleAroundPlayer(): void {
    streamQueue = chunksAround(centerChunk, profile.renderRadius).filter(
      (chunk) => !chunkMeshes.has(chunkKey(chunk.x, chunk.z)),
    );
    for (const chunk of world.getLoadedChunks()) {
      const coordinate = { x: chunk.chunkX, z: chunk.chunkZ };
      if (!shouldUnloadChunk(coordinate, centerChunk, profile.renderRadius, 1)) continue;
      disposeChunkMesh(chunkKey(chunk.chunkX, chunk.chunkZ));
      world.unloadChunk(chunk.chunkX, chunk.chunkZ);
    }
  }

  function enqueueDirtyChunks(): void {
    for (const chunk of world.consumeDirtyChunks()) {
      if (isWithinRenderRadius(chunk)) meshQueue.set(chunkKey(chunk.x, chunk.z), chunk);
    }
  }

  function processOneChunk(): void {
    const dirtyEntry = meshQueue.entries().next();
    if (!dirtyEntry.done) {
      const [key, chunk] = dirtyEntry.value;
      meshQueue.delete(key);
      buildChunkMesh(chunk);
      return;
    }
    const next = streamQueue.shift();
    if (next) buildChunkMesh(next);
  }

  function updateTarget(): void {
    camera.getWorldDirection(rayDirection);
    target = resolveCenterTarget(
      {
        origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z },
      },
      options.getInteractiveEntities?.() ?? [],
      (x, y, z) => world.getBlock(x, y, z),
      PLAYER_REACH,
    );
    const prompt = target?.kind === "entity"
      ? target.prompt
      : target?.kind === "voxel"
        ? "Break / place block"
        : null;
    if (prompt !== lastPrompt) {
      lastPrompt = prompt;
      options.onInteractionPrompt?.(prompt);
    }
    if (target?.kind === "voxel") {
      selection.visible = true;
      selection.position.set(
        target.hit.block.x + 0.5,
        target.hit.block.y + 0.5,
        target.hit.block.z + 0.5,
      );
    } else {
      selection.visible = false;
    }
  }

  function update(): void {
    const forward = Number(keys.has("KeyW") || externalControls.has("forward"))
      - Number(keys.has("KeyS") || externalControls.has("back")) - moveVector.y;
    const strafe = Number(keys.has("KeyD") || externalControls.has("right"))
      - Number(keys.has("KeyA") || externalControls.has("left")) + moveVector.x;
    if (physicsTransitionId && physicsTransitionBase) {
      physicsTransitionElapsedMs += FIXED_DELTA_SECONDS * 1_000;
      physicsProfile = samplePhysicsTransition(
        physicsTransitionBase,
        physicsTransitionId,
        physicsTransitionElapsedMs,
      );
    }
    const physics = physicsProfile
      ? resolvePhysicsAtPoint(
          physicsProfile,
          [player.state.position.x, player.state.position.y, player.state.position.z],
          performance.now() - initializedAt,
        )
      : null;
    const surfaceBlock = world.getBlock(
      Math.floor(player.state.position.x),
      Math.floor(player.state.position.y - 0.04),
      Math.floor(player.state.position.z),
    );
    const materialId = options.blockMaterials?.[surfaceBlock];
    const surface = physicsProfile && materialId
      ? resolveSurfaceReaction(physicsProfile, materialId)
      : undefined;
    const nowMs = performance.now();
    const surfaceX = Math.floor(player.state.position.x);
    const surfaceY = Math.floor(player.state.position.y - 0.04);
    const surfaceZ = Math.floor(player.state.position.z);
    if (surface?.crumbleAfterMs !== undefined && surfaceBlock !== 0) {
      crumbleScheduler.schedule(
        [surfaceX, surfaceY, surfaceZ],
        surfaceBlock,
        nowMs,
        surface.crumbleAfterMs,
        surface.respawnAfterMs ?? 2_000,
      );
    }
    crumbleScheduler.update(world, nowMs);
    const jumpPressed = keys.has("Space") || externalControls.has("jump");
    const vertical = Number(jumpPressed) - Number(keys.has("ControlLeft") || keys.has("ControlRight"));
    player.step(
      {
        moveX: strafe * Math.cos(yaw) - forward * Math.sin(yaw),
        moveZ: -strafe * Math.sin(yaw) - forward * Math.cos(yaw),
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
        jump: jumpPressed,
        moveY: vertical,
        dash: keys.has("KeyQ"),
        glide: jumpPressed,
        fly: Boolean(physicsProfile?.player.abilities.flight),
        swim: Boolean(physicsProfile?.player.abilities.swim),
      },
      FIXED_DELTA_SECONDS,
      performance.now(),
      world,
      {
        ...(physics
          ? {
              gravity: physics.gravity,
              wind: physics.wind,
              force: physics.force,
              timeScale: physics.timeScale,
              buoyancy: physics.buoyancy,
              drag: physics.drag,
              movementScale: physics.movementScale,
            }
          : {}),
        ...(surface ? { surface } : {}),
        swimming: Boolean(physicsProfile?.player.abilities.swim),
      },
    );
    camera.position.set(
      player.state.position.x,
      player.state.position.y + 1.62,
      player.state.position.z,
    );
    camera.rotation.set(pitch, yaw, 0);

    const nextCenter = {
      x: worldToChunk(Math.floor(player.state.position.x)).chunk,
      z: worldToChunk(Math.floor(player.state.position.z)).chunk,
    };
    if (nextCenter.x !== centerChunk.x || nextCenter.z !== centerChunk.z) {
      centerChunk = nextCenter;
      scheduleAroundPlayer();
    }
    enqueueDirtyChunks();
    processOneChunk();
    updateTarget();
    options.onFixedUpdate?.(
      (performance.now() - initializedAt) / 1_000,
      FIXED_DELTA_SECONDS,
      {
        x: player.state.position.x,
        y: player.state.position.y,
        z: player.state.position.z,
      },
    );
  }

  function frame(now: number): void {
    if (disposed || contextLost) return;
    const frameMs = previousFrameAt === 0 ? 16.67 : Math.min(100, now - previousFrameAt);
    previousFrameAt = now;
    metrics.recordFrame(frameMs);
    accumulator = Math.min(FIXED_DELTA_SECONDS * MAX_FIXED_STEPS, accumulator + frameMs / 1_000);
    let steps = 0;
    while (accumulator >= FIXED_DELTA_SECONDS && steps < MAX_FIXED_STEPS) {
      update();
      accumulator -= FIXED_DELTA_SECONDS;
      steps += 1;
    }
    if (atmosphereElapsedMs < atmosphereDurationMs) {
      atmosphereElapsedMs = Math.min(atmosphereDurationMs, atmosphereElapsedMs + frameMs);
      sampleAtmosphere(atmosphereDurationMs === 0 ? 1 : atmosphereElapsedMs / atmosphereDurationMs);
    }
    if (!reducedMotion && particles.visible) {
      const speed = Math.max(0, Math.min(0.7, particlePlan?.speed ?? 0));
      const sway = Math.max(0, Math.min(0.4, particlePlan?.sway ?? 0));
      particles.rotation.y = now * 0.00004 * speed;
      particles.position.x = Math.sin(now * 0.0003) * sway;
    }
    renderer.render(scene, camera);
  }

  function mix(from: number, to: number, amount: number): number {
    return from + (to - from) * amount;
  }

  function mixColor(from: number, to: number, amount: number): number {
    const channel = (shift: number): number => Math.round(mix(
      (from >>> shift) & 0xff,
      (to >>> shift) & 0xff,
      amount,
    ));
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
  }

  function applyAtmosphereState(state: VoxelAtmosphereState): void {
    scene.background = new THREE.Color(state.sky.bottom);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(state.fog.color);
      scene.fog.near = state.fog.near;
      scene.fog.far = state.fog.far;
    }
    hemisphere.color.setHex(state.ambient.color);
    hemisphere.groundColor.setHex(state.sky.top);
    hemisphere.intensity = state.ambient.intensity;
    sun.color.setHex(state.sun.color);
    sun.intensity = state.sun.intensity;
  }

  function sampleAtmosphere(amount: number): void {
    currentAtmosphere = {
      sky: {
        top: mixColor(atmosphereOrigin.sky.top, atmosphereTarget.sky.top, amount),
        bottom: mixColor(atmosphereOrigin.sky.bottom, atmosphereTarget.sky.bottom, amount),
      },
      fog: {
        color: mixColor(atmosphereOrigin.fog.color, atmosphereTarget.fog.color, amount),
        near: mix(atmosphereOrigin.fog.near, atmosphereTarget.fog.near, amount),
        far: mix(atmosphereOrigin.fog.far, atmosphereTarget.fog.far, amount),
      },
      ambient: {
        color: mixColor(atmosphereOrigin.ambient.color, atmosphereTarget.ambient.color, amount),
        intensity: mix(atmosphereOrigin.ambient.intensity, atmosphereTarget.ambient.intensity, amount),
      },
      sun: {
        color: mixColor(atmosphereOrigin.sun.color, atmosphereTarget.sun.color, amount),
        intensity: mix(atmosphereOrigin.sun.intensity, atmosphereTarget.sun.intensity, amount),
      },
    };
    applyAtmosphereState(currentAtmosphere);
  }

  function applyAtmosphere(
    state: VoxelAtmosphereState,
    durationMs = 0,
    nextParticles?: VoxelParticlePlan,
  ): void {
    atmosphereOrigin = copyAtmosphere(currentAtmosphere);
    atmosphereTarget = copyAtmosphere(state);
    atmosphereElapsedMs = 0;
    atmosphereDurationMs = Math.max(0, Math.min(10_000, durationMs));
    if (nextParticles) {
      particlePlan = nextParticles;
      particleMaterial.color.setHex(runtimeParticleColor(nextParticles.kind, state.sky.top));
      particleMaterial.size = Math.max(0.03, Math.min(0.3, nextParticles.pointSize));
      const count = Math.max(0, Math.min(particleLimit, Math.floor(nextParticles.count)));
      particleGeometry.setDrawRange(0, reducedMotion ? Math.min(48, count) : count);
      particles.visible = count > 0;
    }
    if (atmosphereDurationMs === 0) sampleAtmosphere(1);
  }

  function setReducedMotion(value: boolean): void {
    reducedMotion = value;
    const count = Math.max(0, Math.min(particleLimit, Math.floor(particlePlan?.count ?? 0)));
    particleGeometry.setDrawRange(0, value ? Math.min(48, count) : count);
    if (value) {
      particles.rotation.set(0, 0, 0);
      particles.position.set(0, 0, 0);
    }
  }

  function applyPhysicsTransition(transitionId: string): void {
    if (!physicsProfile || !physicsProfile.transitions.some(({ id }) => id === transitionId)) return;
    physicsTransitionBase = physicsProfile;
    physicsTransitionId = transitionId;
    physicsTransitionElapsedMs = 0;
  }

  function start(): void {
    if (disposed) return;
    desiredRunning = true;
    if (!contextLost && !document.hidden) {
      previousFrameAt = 0;
      renderer.setAnimationLoop(frame);
    }
  }

  function pause(): void {
    desiredRunning = false;
    renderer.setAnimationLoop(null);
    keys.clear();
    externalControls.clear();
  }

  function setInputEnabled(enabled: boolean): void {
    inputEnabled = enabled;
    if (!enabled) {
      keys.clear();
      externalControls.clear();
    }
  }

  function refreshInteractionTarget(): void {
    if (disposed) return;
    updateTarget();
  }

  function getRendererDiagnostics(): RendererDiagnostics {
    const context = renderer.getContext();
    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      return { classification: "unknown", renderer: null, vendor: null };
    }
    const rendererName = String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "");
    const vendorName = String(context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "");
    const identity = `${vendorName} ${rendererName}`;
    const softwareRenderer = /swiftshader|llvmpipe|software rasterizer|mesa offscreen|\bwarp\b|osmesa/i
      .test(identity);
    const hardwareRenderer = /apple|nvidia|amd|radeon|intel|adreno|mali|powervr|qualcomm|imagination|\barm\b/i
      .test(identity);
    return {
      classification: softwareRenderer ? "software" : hardwareRenderer ? "hardware" : "unknown",
      renderer: rendererName || null,
      vendor: vendorName || null,
    };
  }

  function interactWithTarget(): void {
    if (target?.kind === "entity") options.onEntityInteract?.(target.entityId);
  }

  function lookBy(deltaX: number, deltaY: number): void {
    if (disposed) return;
    const scale = 0.0022 * mouseSensitivity;
    yaw -= deltaX * scale;
    pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch - deltaY * scale));
  }

  function setFieldOfView(fieldOfView: number): void {
    camera.fov = Math.max(55, Math.min(95, fieldOfView));
    camera.updateProjectionMatrix();
  }

  function setMouseSensitivity(sensitivity: number): void {
    mouseSensitivity = Math.max(0.2, Math.min(2, sensitivity));
  }

  function setControl(control: VoxelControl, pressed: boolean): void {
    if (disposed || !inputEnabled) return;
    if (control === "interact") {
      if (pressed) interactWithTarget();
      return;
    }
    if (pressed) externalControls.add(control);
    else externalControls.delete(control);
  }

  function setMoveVector(x: number, y: number): void {
    if (disposed || !inputEnabled) return;
    const magnitude = Math.hypot(x, y);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    moveVector = { x: Number.isFinite(x) ? x * scale : 0, y: Number.isFinite(y) ? y * scale : 0 };
  }

  const resize = (): void => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maximumPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!inputEnabled) return;
    keys.add(event.code);
    if (event.code === "Digit1") selectedBlock = 2;
    if (event.code === "Digit2") selectedBlock = 5;
    if (event.code === "KeyE") interactWithTarget();
    if (["Space", "ControlLeft", "ControlRight", "KeyQ", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault();
  };
  const handleKeyUp = (event: KeyboardEvent): void => {
    keys.delete(event.code);
  };
  const handleMouseMove = (event: MouseEvent): void => {
    if (!inputEnabled || document.pointerLockElement !== canvas) return;
    lookBy(event.movementX, event.movementY);
  };
  const handleCanvasClick = (): void => {
    if (!inputEnabled || document.pointerLockElement === canvas) return;
    try {
      void canvas.requestPointerLock().catch(() => undefined);
    } catch {
      // Pointer lock is optional in embedded and automated browser contexts.
    }
  };
  const handleMouseDown = (event: MouseEvent): void => {
    if (!inputEnabled || document.pointerLockElement !== canvas || !target) return;
    if (event.button === 0 && target.kind === "entity") {
      options.onEntityInteract?.(target.entityId);
      return;
    }
    if (target.kind !== "voxel" || (event.button !== 0 && event.button !== 2)) return;
    const playerPosition = player.state.position;
    const action = event.button === 0 ? "break" : "place";
    const editedPosition = action === "break"
      ? { ...target.hit.block }
      : {
          x: target.hit.block.x + target.hit.normal.x,
          y: target.hit.block.y + target.hit.normal.y,
          z: target.hit.block.z + target.hit.normal.z,
        };
    const edited = editTargetedBlock(
      action,
      target.hit,
      world,
      selectedBlock,
      (x, y, z) => !(
        x + 1 > playerPosition.x - 0.32 && x < playerPosition.x + 0.32 &&
        y + 1 > playerPosition.y && y < playerPosition.y + 1.75 &&
        z + 1 > playerPosition.z - 0.32 && z < playerPosition.z + 0.32
      ),
    );
    if (edited) options.onBlockEdit?.(action, editedPosition);
  };
  const handleContextMenu = (event: MouseEvent): void => event.preventDefault();
  const handleVisibility = (): void => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
      keys.clear();
      externalControls.clear();
    } else if (desiredRunning && !contextLost) {
      previousFrameAt = 0;
      renderer.setAnimationLoop(frame);
    }
  };
  const handleContextLoss = (event: Event): void => {
    event.preventDefault();
    contextLost = true;
    renderer.setAnimationLoop(null);
    keys.clear();
    externalControls.clear();
    options.onFailure("The 3D context paused while the browser attempts recovery.");
  };
  const handleContextRestore = (): void => {
    contextLost = false;
    resize();
    options.onRecovery?.();
    if (desiredRunning && !document.hidden) start();
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("contextmenu", handleContextMenu);
  canvas.addEventListener("webglcontextlost", handleContextLoss);
  canvas.addEventListener("webglcontextrestored", handleContextRestore);

  buildChunkMesh(centerChunk);
  metrics.markPlayable(performance.now() - initializedAt);
  meshQueue.clear();
  world.consumeDirtyChunks();
  scheduleAroundPlayer();
  camera.position.set(player.state.position.x, player.state.position.y + 1.62, player.state.position.z);

  return {
    world,
    start,
    pause,
    setInputEnabled,
    setControl,
    setMoveVector,
    refreshInteractionTarget,
    lookBy,
    setFieldOfView,
    setMouseSensitivity,
    getPlayerPosition: () => ({ ...player.state.position }),
    getViewRotation: () => ({ yaw, pitch }),
    getComfortSettings: () => ({ fieldOfView: camera.fov, mouseSensitivity, reducedMotion }),
    getQualityProfile: () => ({ ...profile }),
    getRendererDiagnostics,
    applyAtmosphere,
    setReducedMotion,
    applyPhysicsTransition,
    getMetrics: () => metrics.snapshot({
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      loadedChunks: world.getLoadedChunks().length,
      queuedChunks: streamQueue.length + meshQueue.size,
      activeEntities: options.getInteractiveEntities?.().length ?? 0,
      particles: particles.visible ? particleGeometry.drawRange.count : 0,
    }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      desiredRunning = false;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      canvas.removeEventListener("webglcontextrestored", handleContextRestore);
      for (const key of [...chunkMeshes.keys()]) disposeChunkMesh(key);
      selectionGeometry.dispose();
      selectionMaterial.dispose();
      material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      world.clear();
      crumbleScheduler.clear();
      scene.clear();
    },
  };
}
