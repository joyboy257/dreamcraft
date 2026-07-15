/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DREAMCRAFT_API_BASE?: string;
  readonly VITE_DREAMCRAFT_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
