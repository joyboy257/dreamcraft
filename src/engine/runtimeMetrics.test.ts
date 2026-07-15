import { describe, expect, it } from "vitest";
import { RuntimeMetricsRecorder } from "./runtimeMetrics";

describe("RuntimeMetricsRecorder", () => {
  it("reports bounded frame and chunk-job percentiles", () => {
    const recorder = new RuntimeMetricsRecorder(8);
    for (const sample of [10, 12, 14, 16, 18]) recorder.recordFrame(sample);
    for (const sample of [2, 4, 6]) recorder.recordChunkJob(sample);

    const metrics = recorder.snapshot({
      drawCalls: 4,
      triangles: 120,
      loadedChunks: 9,
      queuedChunks: 2,
    });

    expect(metrics.frameMsP50).toBe(14);
    expect(metrics.frameMsP95).toBe(18);
    expect(metrics.workerJobMsP95).toBe(6);
    expect(metrics.loadedChunks).toBe(9);
  });
});
