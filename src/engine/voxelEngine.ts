import * as THREE from "three";
import type { RuntimeMetrics } from "../contracts/runtime";
import { CHUNK_SIZE, chunkKey, worldToChunk } from "./chunkMath";
import { meshChunk } from "./chunkMesher";
import {
  editTargetedBlock,
  resolveCenterTarget,
  type CenterTarget,
  type InteractiveEntityTarget,
} from "./interaction";
import { createLocalGenerator, type BlockId, type ChunkGenerator } from "./localGenerator";
import { PlayerMotor, type PlayerMotorConfig } from "./playerMotor";
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
  onInteractionPrompt?: (prompt: string | null) => void;
  onEntityInteract?: (entityId: string) => void;
  getInteractiveEntities?: () => readonly InteractiveEntityTarget[];
  sceneObjects?: readonly THREE.Object3D[];
  onFixedUpdate?: (elapsedSeconds: number, deltaSeconds: number) => void;
  generator?: ChunkGenerator;
  worldRadius?: number;
  spawn?: { x: number; z: number };
  safeSpawnBlock?: BlockId;
  blockColors?: Readonly<Record<number, readonly [number, number, number]>>;
  playerConfig?: Partial<PlayerMotorConfig>;
  fieldOfView?: number;
}

export interface VoxelEngine {
  start(): void;
  pause(): void;
  dispose(): void;
  getMetrics(): RuntimeMetrics;
  readonly world: VoxelWorld;
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
  scene.background = new THREE.Color(0x151126);
  scene.fog = new THREE.Fog(0x211b35, 18, 58);

  const camera = new THREE.PerspectiveCamera(
    Math.max(55, Math.min(95, options.fieldOfView ?? 72)),
    1,
    0.05,
    100,
  );
  camera.rotation.order = "YXZ";
  const hemisphere = new THREE.HemisphereLight(0xcbbfff, 0x181225, 1.65);
  const sun = new THREE.DirectionalLight(0xffdfb8, 2.1);
  sun.position.set(-12, 22, 8);
  scene.add(hemisphere, sun);
  for (const object of options.sceneObjects ?? []) scene.add(object);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

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
  let yaw = 0;
  let pitch = 0;
  let disposed = false;
  let desiredRunning = false;
  let contextLost = false;
  let previousFrameAt = 0;
  let accumulator = 0;
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
    const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    const strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    player.step(
      {
        moveX: strafe * Math.cos(yaw) - forward * Math.sin(yaw),
        moveZ: -strafe * Math.sin(yaw) - forward * Math.cos(yaw),
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
        jump: keys.has("Space"),
      },
      FIXED_DELTA_SECONDS,
      performance.now(),
      world,
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
    renderer.render(scene, camera);
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
    keys.add(event.code);
    if (event.code === "Digit1") selectedBlock = 2;
    if (event.code === "Digit2") selectedBlock = 5;
    if (event.code === "KeyE" && target?.kind === "entity") {
      options.onEntityInteract?.(target.entityId);
    }
    if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault();
  };
  const handleKeyUp = (event: KeyboardEvent): void => {
    keys.delete(event.code);
  };
  const handleMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= event.movementX * 0.0022;
    pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitch - event.movementY * 0.0022));
  };
  const handleCanvasClick = (): void => {
    if (document.pointerLockElement === canvas) return;
    try {
      void canvas.requestPointerLock().catch(() => undefined);
    } catch {
      // Pointer lock is optional in embedded and automated browser contexts.
    }
  };
  const handleMouseDown = (event: MouseEvent): void => {
    if (document.pointerLockElement !== canvas || !target) return;
    if (event.button === 0 && target.kind === "entity") {
      options.onEntityInteract?.(target.entityId);
      return;
    }
    if (target.kind !== "voxel" || (event.button !== 0 && event.button !== 2)) return;
    const playerPosition = player.state.position;
    editTargetedBlock(
      event.button === 0 ? "break" : "place",
      target.hit,
      world,
      selectedBlock,
      (x, y, z) => !(
        x + 1 > playerPosition.x - 0.32 && x < playerPosition.x + 0.32 &&
        y + 1 > playerPosition.y && y < playerPosition.y + 1.75 &&
        z + 1 > playerPosition.z - 0.32 && z < playerPosition.z + 0.32
      ),
    );
  };
  const handleContextMenu = (event: MouseEvent): void => event.preventDefault();
  const handleVisibility = (): void => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
      keys.clear();
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
    options.onFailure("The 3D context paused while the browser attempts recovery.");
  };
  const handleContextRestore = (): void => {
    contextLost = false;
    resize();
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
    getMetrics: () => metrics.snapshot({
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      loadedChunks: chunkMeshes.size,
      queuedChunks: streamQueue.length + meshQueue.size,
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
      renderer.dispose();
      world.clear();
      scene.clear();
    },
  };
}
