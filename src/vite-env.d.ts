/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DREAMCRAFT_API_BASE?: string;
  readonly VITE_DREAMCRAFT_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __DREAMCRAFT_TEST__?: {
    getPlayerPosition(): Readonly<{ x: number; y: number; z: number }> | null;
    getViewRotation(): Readonly<{ yaw: number; pitch: number }> | null;
    getComfortSettings(): Readonly<{
      fieldOfView: number;
      mouseSensitivity: number;
      reducedMotion: boolean;
    }> | null;
    getQualityProfile(): Readonly<{
      tier: "high" | "balanced" | "reduced";
      maximumPixelRatio: number;
      renderRadius: number;
      antialias: boolean;
    }> | null;
    getMetrics(): import("./contracts/runtime").RuntimeMetrics | null;
    getRendererDiagnostics(): import("./engine/voxelEngine").RendererDiagnostics | null;
    getEntityDiagnostics(): readonly { id: string; meshNames: readonly string[]; partCount: number; position: Readonly<{ x: number; y: number; z: number }>; bounds: Readonly<{ x: number; y: number; z: number }> }[];
    focusActiveInteraction(): boolean;
    playAudioCaption(): string;
  };
}
