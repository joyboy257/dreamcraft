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
  };
}
