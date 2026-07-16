import type { DreamSpecV1 } from "../dream/schema";

export type AtmosphereQuality = "high" | "balanced" | "reduced";

export interface AtmosphereCompileOptions {
  readonly quality: AtmosphereQuality;
  readonly reducedMotion?: boolean;
}

export interface AtmosphereState {
  readonly sky: { readonly top: number; readonly bottom: number };
  readonly fog: { readonly color: number; readonly near: number; readonly far: number };
  readonly ambient: { readonly color: number; readonly intensity: number };
  readonly sun: { readonly color: number; readonly intensity: number };
}

export interface AtmosphereParticlePlan {
  readonly kind: ParticleKind;
  readonly count: number;
  readonly speed: number;
  readonly sway: number;
  readonly pointSize: number;
}

export interface DreamAtmospherePlan {
  readonly initial: AtmosphereState;
  readonly patches: readonly {
    readonly id: string;
    readonly state: AtmosphereState;
    readonly particles: AtmosphereParticlePlan;
  }[];
  readonly particles: AtmosphereParticlePlan;
  readonly motion: { readonly wobbleStrength: number; readonly pulseHz: number };
  readonly transitionDurationMs: number;
}

const PARTICLE_KINDS = [
  "ash", "bubbles", "dust", "embers", "fireflies", "mist", "motes", "petals",
  "rain", "snow", "sparkles", "stars",
] as const;
type ParticleKind = typeof PARTICLE_KINDS[number];

const QUALITY_PARTICLE_CAP: Readonly<Record<AtmosphereQuality, number>> = {
  high: 500,
  balanced: 250,
  reduced: 150,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : minimum;
}

function clampColor(value: number): number {
  return Math.round(clamp(value, 0, 0xffffff));
}

function particleKind(value: string): ParticleKind {
  const normalized = value.toLowerCase();
  return PARTICLE_KINDS.find((candidate) => normalized.includes(candidate)) ?? "motes";
}

function createParticlePlan(
  kind: string,
  density: number,
  requestedBudget: number,
  options: AtmosphereCompileOptions,
): AtmosphereParticlePlan {
  const hardCap = Math.min(500, QUALITY_PARTICLE_CAP[options.quality]);
  const comfortCap = options.reducedMotion ? Math.min(48, hardCap) : hardCap;
  const budget = Math.floor(clamp(requestedBudget, 0, comfortCap));
  const normalizedDensity = clamp(density, 0, 1);
  const count = Math.floor(normalizedDensity * budget);
  return {
    kind: particleKind(kind),
    count,
    speed: options.reducedMotion ? 0 : clamp(0.12 + normalizedDensity * 0.58, 0, 0.7),
    sway: options.reducedMotion ? 0 : clamp(normalizedDensity * 0.4, 0, 0.4),
    pointSize: options.quality === "high" ? 0.12 : 0.1,
  };
}

function createState(
  atmosphere: DreamSpecV1["atmosphere"],
  patch?: DreamSpecV1["atmosphere"]["patches"][number],
): AtmosphereState {
  const fogNear = clamp(atmosphere.fogNear, 1, 128);
  const fogFar = clamp(atmosphere.fogFar, fogNear + 8, 192);
  return {
    sky: {
      top: clampColor(patch?.skyTop ?? atmosphere.skyTop),
      bottom: clampColor(patch?.skyBottom ?? atmosphere.skyBottom),
    },
    fog: {
      color: clampColor(patch?.fogColor ?? atmosphere.fogColor),
      near: fogNear,
      far: fogFar,
    },
    ambient: {
      color: clampColor(atmosphere.ambientLight),
      intensity: clamp(atmosphere.ambientIntensity, 0, 3),
    },
    sun: {
      color: clampColor(atmosphere.sunColor),
      intensity: clamp(atmosphere.sunIntensity, 0, 4),
    },
  };
}

/** Compiles model-authored values into renderer-safe, allocation-free descriptors. */
export function compileDreamAtmosphere(
  spec: DreamSpecV1,
  options: AtmosphereCompileOptions,
): DreamAtmospherePlan {
  const atmosphere = spec.atmosphere;
  const requestedBudget = Math.min(spec.budgets.particles, 500);
  const initial = createState(atmosphere);
  return {
    initial,
    particles: createParticlePlan(
      atmosphere.particleKind,
      atmosphere.particleDensity,
      requestedBudget,
      options,
    ),
    patches: atmosphere.patches.slice(0, 8).map((patch) => ({
      id: patch.id,
      state: createState(atmosphere, patch),
      particles: createParticlePlan(
        patch.particleKind ?? atmosphere.particleKind,
        patch.particleDensity ?? atmosphere.particleDensity,
        requestedBudget,
        options,
      ),
    })),
    motion: {
      wobbleStrength: options.reducedMotion ? 0 : clamp(atmosphere.wobbleStrength, 0, 0.25),
      pulseHz: options.reducedMotion ? 0 : clamp(atmosphere.pulseSpeed, 0, 2),
    },
    transitionDurationMs: options.reducedMotion ? 0 : 1_200,
  };
}

function interpolate(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function interpolateColor(from: number, to: number, amount: number): number {
  const channel = (shift: number): number => Math.round(interpolate(
    (from >>> shift) & 0xff,
    (to >>> shift) & 0xff,
    amount,
  ));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Samples a trusted transition; callers retain ownership of Three.js objects. */
export function sampleAtmosphereTransition(
  from: AtmosphereState,
  to: AtmosphereState,
  progress: number,
): AtmosphereState {
  const amount = clamp(progress, 0, 1);
  return {
    sky: {
      top: interpolateColor(from.sky.top, to.sky.top, amount),
      bottom: interpolateColor(from.sky.bottom, to.sky.bottom, amount),
    },
    fog: {
      color: interpolateColor(from.fog.color, to.fog.color, amount),
      near: interpolate(from.fog.near, to.fog.near, amount),
      far: interpolate(from.fog.far, to.fog.far, amount),
    },
    ambient: {
      color: interpolateColor(from.ambient.color, to.ambient.color, amount),
      intensity: interpolate(from.ambient.intensity, to.ambient.intensity, amount),
    },
    sun: {
      color: interpolateColor(from.sun.color, to.sun.color, amount),
      intensity: interpolate(from.sun.intensity, to.sun.intensity, amount),
    },
  };
}
