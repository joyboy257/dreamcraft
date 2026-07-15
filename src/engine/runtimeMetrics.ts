import type { RuntimeMetrics } from "../contracts/runtime";

export interface RenderMetricSnapshot {
  drawCalls: number;
  triangles: number;
  loadedChunks: number;
  queuedChunks: number;
  activeEntities?: number;
  activeDynamicBodies?: number;
  particles?: number;
}

function percentile(samples: Float32Array, count: number, quantile: number): number {
  if (count === 0) return 0;
  const sorted = Array.from(samples.subarray(0, count)).sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1));
  return Math.round((sorted[index] ?? 0) * 100) / 100;
}

export class RuntimeMetricsRecorder {
  private readonly frameSamples: Float32Array;
  private readonly chunkSamples: Float32Array;
  private frameCount = 0;
  private chunkCount = 0;
  private frameCursor = 0;
  private chunkCursor = 0;
  private playableMs: number | undefined;

  constructor(capacity = 120) {
    const boundedCapacity = Math.max(8, Math.min(600, Math.trunc(capacity)));
    this.frameSamples = new Float32Array(boundedCapacity);
    this.chunkSamples = new Float32Array(boundedCapacity);
  }

  recordFrame(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    this.frameSamples[this.frameCursor] = frameMs;
    this.frameCursor = (this.frameCursor + 1) % this.frameSamples.length;
    this.frameCount = Math.min(this.frameSamples.length, this.frameCount + 1);
  }

  recordChunkJob(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    this.chunkSamples[this.chunkCursor] = durationMs;
    this.chunkCursor = (this.chunkCursor + 1) % this.chunkSamples.length;
    this.chunkCount = Math.min(this.chunkSamples.length, this.chunkCount + 1);
  }

  markPlayable(durationMs: number): void {
    if (this.playableMs === undefined && Number.isFinite(durationMs) && durationMs >= 0) {
      this.playableMs = Math.round(durationMs);
    }
  }

  snapshot(render: RenderMetricSnapshot): RuntimeMetrics {
    const p50 = percentile(this.frameSamples, this.frameCount, 0.5);
    const metrics: RuntimeMetrics = {
      fps: p50 > 0 ? Math.round(1_000 / p50) : 0,
      frameMsP50: p50,
      frameMsP95: percentile(this.frameSamples, this.frameCount, 0.95),
      drawCalls: render.drawCalls,
      triangles: render.triangles,
      loadedChunks: render.loadedChunks,
      queuedChunks: render.queuedChunks,
      activeEntities: render.activeEntities ?? 0,
      activeDynamicBodies: render.activeDynamicBodies ?? 0,
      particles: render.particles ?? 0,
      workerJobMsP95: percentile(this.chunkSamples, this.chunkCount, 0.95),
    };
    if (this.playableMs !== undefined) metrics.timeToPlayableMs = this.playableMs;
    return metrics;
  }
}
