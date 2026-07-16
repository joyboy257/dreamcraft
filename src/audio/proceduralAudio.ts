import type { DreamSpecV1 } from "../dream/schema";

type AudioSpec = DreamSpecV1["audio"];
type AudioCue = AudioSpec["cues"][number];

export interface AudioParamPort {
  value: number;
  cancelScheduledValues(time: number): void;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

export interface AudioNodePort {
  readonly gain?: AudioParamPort;
  readonly frequency?: AudioParamPort;
  readonly Q?: AudioParamPort;
  type?: OscillatorType | BiquadFilterType;
  connect(destination: AudioNodePort): AudioNodePort;
  disconnect(): void;
  start?(time?: number): void;
  stop?(time?: number): void;
}

export interface AudioContextPort {
  readonly currentTime: number;
  readonly destination: AudioNodePort;
  readonly state: AudioContextState;
  createGain(): AudioNodePort;
  createOscillator(): AudioNodePort;
  createBiquadFilter(): AudioNodePort;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
}

export interface ProceduralCuePlan {
  readonly id: string;
  readonly kind: AudioCue["kind"];
  readonly frequencies: readonly number[];
  readonly durationSeconds: number;
  readonly gain: number;
  readonly textAlternative: string;
}

export interface ProceduralAudioPlan {
  readonly mood: "airy" | "celebratory" | "dreamlike" | "eerie" | "gentle" | "rhythmic" | "urgent";
  readonly ambientGain: number;
  readonly ambientFrequencies: readonly [number, number];
  readonly footstepFrequency: number;
  readonly cues: readonly ProceduralCuePlan[];
}

export type ProceduralAudioState = "locked" | "muted" | "running" | "suspended" | "disposed";

export interface ProceduralAudioController {
  state(): ProceduralAudioState;
  unlockFromGesture(): Promise<void>;
  resumeFromGesture(): Promise<void>;
  suspend(): Promise<void>;
  setMuted(muted: boolean): void;
  playCue(cueId: string): { readonly audible: boolean; readonly textAlternative: string };
  playFootstep(intensity?: number): { readonly audible: boolean; readonly textAlternative: string };
  dispose(): Promise<void>;
}

export interface ProceduralAudioControllerOptions {
  readonly initiallyMuted?: boolean;
  readonly contextFactory?: () => AudioContextPort;
}

const MAX_CUES = 16;

function clamp(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : minimum;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function classifyMood(value: string): ProceduralAudioPlan["mood"] {
  const mood = value.toLowerCase();
  if (/rhythm|dance|groove/.test(mood)) return "rhythmic";
  if (/celebr|joy|play|party|triumph/.test(mood)) return "celebratory";
  if (/fear|night|eerie|haunt|tense|dark/.test(mood)) return "eerie";
  if (/urgent|chase|danger|alarm/.test(mood)) return "urgent";
  if (/calm|soft|gentle|quiet|memory/.test(mood)) return "gentle";
  if (/air|sky|flight|wind|cloud/.test(mood)) return "airy";
  return "dreamlike";
}

function cueIntervals(kind: AudioCue["kind"]): readonly number[] {
  switch (kind) {
    case "chord": return [0, 4, 7];
    case "arpeggio": return [0, 3, 7, 12];
    case "pulse": return [0, 12];
    case "noise": return [0, -12];
    case "tone": return [0];
  }
}

function cueCaption(kind: AudioCue["kind"]): string {
  switch (kind) {
    case "chord": return "A warm dream chord sounds.";
    case "arpeggio": return "A sequence of dream notes rises.";
    case "pulse": return "A rhythmic dream pulse sounds.";
    case "noise": return "A soft rush of dream noise sounds.";
    case "tone": return "A clear dream tone sounds.";
  }
}

function frequencyForSemitone(root: number, semitone: number): number {
  return clamp(root * 2 ** (semitone / 12), 40, 2_000);
}

/** Converts open-ended mood/preset identifiers to a small deterministic synthesis vocabulary. */
export function compileProceduralAudio(audio: AudioSpec): ProceduralAudioPlan {
  const mood = classifyMood(audio.mood);
  const moodRoots: Readonly<Record<ProceduralAudioPlan["mood"], number>> = {
    airy: 220,
    celebratory: 261.63,
    dreamlike: 196,
    eerie: 110,
    gentle: 174.61,
    rhythmic: 246.94,
    urgent: 146.83,
  };
  const root = moodRoots[mood];
  const footstepFrequency = 90 + stableHash(audio.footstepProfile) % 90;
  const cues = audio.cues.slice(0, MAX_CUES).map((cue): ProceduralCuePlan => {
    const transposition = (stableHash(cue.preset) % 7) - 3;
    return {
      id: cue.id,
      kind: cue.kind,
      frequencies: cueIntervals(cue.kind).map((interval) =>
        frequencyForSemitone(root * 2, interval + transposition)),
      durationSeconds: cue.kind === "arpeggio" ? 1.2 : cue.kind === "chord" ? 1 : 0.45,
      gain: cue.kind === "noise" ? 0.045 : 0.085,
      textAlternative: cueCaption(cue.kind),
    };
  });
  return {
    mood,
    ambientGain: clamp(audio.ambientIntensity * 0.2, 0, 0.35),
    ambientFrequencies: [root, frequencyForSemitone(root, 7)],
    footstepFrequency,
    cues,
  };
}

function browserAudioContext(): AudioContextPort {
  const Constructor = globalThis.AudioContext;
  if (!Constructor) throw new Error("Web Audio is unavailable in this browser");
  return new Constructor();
}

function requireParam(node: AudioNodePort, name: "gain" | "frequency" | "Q"): AudioParamPort {
  const param = node[name];
  if (!param) throw new Error(`Audio node is missing ${name}`);
  return param;
}

export function createProceduralAudioController(
  audio: AudioSpec,
  options: ProceduralAudioControllerOptions = {},
): ProceduralAudioController {
  const plan = compileProceduralAudio(audio);
  const cueById = new Map(plan.cues.map((cue) => [cue.id, cue]));
  const factory = options.contextFactory ?? browserAudioContext;
  let muted = options.initiallyMuted ?? false;
  let context: AudioContextPort | null = null;
  let master: AudioNodePort | null = null;
  let unlocked = false;
  let disposed = false;
  let ambientStarted = false;
  const persistentNodes: AudioNodePort[] = [];

  const updateMaster = (): void => {
    if (!context || !master) return;
    const gain = requireParam(master, "gain");
    const now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.03);
  };

  const startAmbient = (): void => {
    if (!context || !master || ambientStarted) return;
    ambientStarted = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    requireParam(filter, "frequency").setValueAtTime(850, context.currentTime);
    requireParam(filter, "Q").setValueAtTime(0.7, context.currentTime);
    const bedGain = context.createGain();
    requireParam(bedGain, "gain").setValueAtTime(plan.ambientGain, context.currentTime);
    filter.connect(bedGain).connect(master);
    persistentNodes.push(filter, bedGain);
    for (const frequency of plan.ambientFrequencies) {
      const oscillator = context.createOscillator();
      oscillator.type = plan.mood === "eerie" ? "triangle" : "sine";
      requireParam(oscillator, "frequency").setValueAtTime(frequency, context.currentTime);
      oscillator.connect(filter);
      oscillator.start?.(context.currentTime);
      persistentNodes.push(oscillator);
    }
  };

  const playTone = (frequencies: readonly number[], duration: number, gainValue: number): boolean => {
    if (!context || !master || muted || context.state !== "running") return false;
    const now = context.currentTime;
    const cueGain = context.createGain();
    const gain = requireParam(cueGain, "gain");
    gain.setValueAtTime(0.0001, now);
    gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
    gain.exponentialRampToValueAtTime(0.0001, now + duration);
    cueGain.connect(master);
    frequencies.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      oscillator.type = index % 2 === 0 ? "sine" : "triangle";
      requireParam(oscillator, "frequency").setValueAtTime(frequency, now);
      oscillator.connect(cueGain);
      oscillator.start?.(now + index * 0.045);
      oscillator.stop?.(now + duration + 0.05);
    });
    return true;
  };

  return {
    state: () => {
      if (disposed) return "disposed";
      if (!unlocked) return "locked";
      if (muted) return "muted";
      return context?.state === "suspended" ? "suspended" : "running";
    },
    unlockFromGesture: async () => {
      if (disposed) return;
      if (!context) {
        context = factory();
        master = context.createGain();
        requireParam(master, "gain").setValueAtTime(muted ? 0 : 1, context.currentTime);
        master.connect(context.destination);
      }
      await context.resume();
      unlocked = true;
      startAmbient();
      updateMaster();
    },
    resumeFromGesture: async () => {
      if (!context || disposed) return;
      await context.resume();
    },
    suspend: async () => {
      if (!context || disposed || context.state !== "running") return;
      await context.suspend();
    },
    setMuted: (nextMuted) => {
      muted = nextMuted;
      updateMaster();
    },
    playCue: (cueId) => {
      const cue = cueById.get(cueId);
      if (!cue) return { audible: false, textAlternative: "A dream sound was unavailable." };
      return {
        audible: playTone(cue.frequencies, cue.durationSeconds, cue.gain),
        textAlternative: cue.textAlternative,
      };
    },
    playFootstep: (intensity = 1) => ({
      audible: playTone(
        [plan.footstepFrequency],
        0.06,
        clamp(intensity, 0, 1) * 0.035,
      ),
      textAlternative: "A soft footstep sounds.",
    }),
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      for (const node of persistentNodes) {
        try { node.stop?.(); } catch { /* A stopped oscillator is already harmless. */ }
        try { node.disconnect(); } catch { /* A disconnected graph is already released. */ }
      }
      persistentNodes.length = 0;
      if (context && context.state !== "closed") await context.close();
      context = null;
      master = null;
    },
  };
}
