export const DREAM_LIBRARY_VERSION = "0.1.0" as const;

export type DreamLibraryCategory =
  | "material" | "element" | "environment" | "structure" | "prop"
  | "entity" | "gameplay" | "dialogue" | "atmosphere" | "audio";

export interface DreamLibraryCapability {
  readonly id: string;
  readonly category: DreamLibraryCategory;
  readonly label: string;
  readonly tags: readonly string[];
  readonly mobileSafe: boolean;
  readonly rendered: boolean;
}

export interface CapabilitySelection {
  readonly libraryVersion: typeof DREAM_LIBRARY_VERSION;
  readonly environmentId: string;
  readonly capabilityIds: readonly string[];
}
