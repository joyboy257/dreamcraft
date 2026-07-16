import { describe, expect, it, vi } from "vitest";

import example from "../../schemas/dream-spec-v1.example.json";
import { DreamSpecV1Schema } from "../dream/schema";
import {
  compileProceduralAudio,
  createProceduralAudioController,
  type AudioContextPort,
  type AudioNodePort,
  type AudioParamPort,
} from "./proceduralAudio";

class FakeParam implements AudioParamPort {
  value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn((value: number) => { this.value = value; });
  linearRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
  exponentialRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
}

class FakeNode implements AudioNodePort {
  gain = new FakeParam();
  frequency = new FakeParam();
  Q = new FakeParam();
  type: OscillatorType | BiquadFilterType = "sine";
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeContext implements AudioContextPort {
  currentTime = 10;
  state: AudioContextState = "suspended";
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  close = vi.fn(async () => { this.state = "closed"; });
  createGain = vi.fn(() => this.node());
  createOscillator = vi.fn(() => this.node());
  createBiquadFilter = vi.fn(() => this.node());

  private node(): FakeNode {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }
}

const spec = DreamSpecV1Schema.parse(example);

describe("procedural audio", () => {
  it("compiles a bounded allowlisted sound plan with text alternatives", () => {
    const plan = compileProceduralAudio(spec.audio);

    expect(plan.cues.length).toBeLessThanOrEqual(16);
    expect(plan.ambientGain).toBeGreaterThanOrEqual(0);
    expect(plan.ambientGain).toBeLessThanOrEqual(0.35);
    expect(plan.cues.every(({ frequencies }) => frequencies.every((hz) => hz >= 40 && hz <= 2_000))).toBe(true);
    expect(plan.cues.every(({ textAlternative }) => textAlternative.length > 0)).toBe(true);
  });

  it("does not create or play an AudioContext before an explicit user gesture", async () => {
    const context = new FakeContext();
    const factory = vi.fn(() => context);
    const controller = createProceduralAudioController(spec.audio, { contextFactory: factory });

    expect(controller.playCue(spec.audio.cues[0]!.id).audible).toBe(false);
    expect(factory).not.toHaveBeenCalled();

    await controller.unlockFromGesture();

    expect(factory).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(controller.state()).toBe("running");
  });

  it("honors mute before and after unlock and closes cleanly", async () => {
    const context = new FakeContext();
    const controller = createProceduralAudioController(spec.audio, {
      contextFactory: () => context,
      initiallyMuted: true,
    });

    await controller.unlockFromGesture();
    expect(controller.state()).toBe("muted");
    expect(controller.playCue(spec.audio.cues[0]!.id).audible).toBe(false);

    controller.setMuted(false);
    expect(controller.state()).toBe("running");
    const played = controller.playCue(spec.audio.cues[0]!.id);
    expect(played.audible).toBe(true);
    expect(played.textAlternative.length).toBeGreaterThan(0);

    await controller.dispose();
    expect(context.close).toHaveBeenCalledOnce();
    expect(controller.state()).toBe("disposed");
  });

  it("refuses unknown cues safely while still returning an accessible caption", async () => {
    const context = new FakeContext();
    const controller = createProceduralAudioController(spec.audio, { contextFactory: () => context });
    await controller.unlockFromGesture();

    expect(controller.playCue("not-in-dream")).toEqual({
      audible: false,
      textAlternative: "A dream sound was unavailable.",
    });
  });
});
