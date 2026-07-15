export type AppPhase =
  | "input"
  | "requesting"
  | "validating"
  | "materializing"
  | "playing"
  | "completed"
  | "fragment"
  | "fatal";

export type GenerationStrategy =
  | "mock-local"
  | "single-sol"
  | "director-parallel";

export interface UserSafeIssue {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface GenerationMetadata {
  strategy: GenerationStrategy;
  requestDurationMs: number;
  validationDurationMs: number;
  fallbackUsed: boolean;
  repairCount: number;
  requestId: string;
}

export interface AppState {
  phase: AppPhase;
  dreamText: string;
  generation?: GenerationMetadata;
  issue?: UserSafeIssue;
}

export interface RuntimeMetrics {
  fps: number;
  frameMsP50: number;
  frameMsP95: number;
  drawCalls: number;
  triangles: number;
  loadedChunks: number;
  queuedChunks: number;
  activeEntities: number;
  activeDynamicBodies: number;
  particles: number;
  workerJobMsP95: number;
  timeToPlayableMs?: number;
}
