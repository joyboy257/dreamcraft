import type { RuntimeMetrics } from "../contracts/runtime";
import { createVoxelEngine } from "./voxelEngine";

export interface BootstrapScene {
  start: () => void;
  pause: () => void;
  dispose: () => void;
  getMetrics: () => RuntimeMetrics;
}

interface BootstrapSceneOptions {
  onFailure: (message: string) => void;
}

const EMPTY_METRICS: RuntimeMetrics = {
  fps: 0,
  frameMsP50: 0,
  frameMsP95: 0,
  drawCalls: 0,
  triangles: 0,
  loadedChunks: 0,
  queuedChunks: 0,
  activeEntities: 0,
  activeDynamicBodies: 0,
  particles: 0,
  workerJobMsP95: 0,
};

export function createBootstrapScene(
  canvas: HTMLCanvasElement,
  options: BootstrapSceneOptions,
): BootstrapScene {
  const engine = createVoxelEngine(canvas, {
    seed: 0x5eed,
    onFailure: options.onFailure,
  });
  if (!engine) {
    return {
      start: () => undefined,
      pause: () => undefined,
      dispose: () => undefined,
      getMetrics: () => EMPTY_METRICS,
    };
  }
  engine.start();
  return engine;
}
