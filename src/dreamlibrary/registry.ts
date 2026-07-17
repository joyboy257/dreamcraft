import {
  DREAM_LIBRARY_VERSION,
  type CapabilitySelection,
  type DreamLibraryCapability,
  type DreamLibraryCategory,
} from "./capabilities";

const define = (
  category: DreamLibraryCategory,
  id: string,
  label: string,
  tags: readonly string[],
  mobileSafe = true,
): DreamLibraryCapability => ({ id, category, label, tags, mobileSafe, rendered: true });

export const DREAM_LIBRARY: readonly DreamLibraryCapability[] = [
  ...["grass", "dirt", "stone", "brick", "concrete", "school-tile", "kitchen-tile", "wood", "metal", "glass", "water", "ice", "sand", "paper", "fabric", "candy", "porcelain", "cloud", "shadow", "emissive", "fire", "lava"].map((id) => define("material", id, id.replaceAll("-", " "), [id])),
  ...["water", "fire", "wind", "ice", "atmosphere"].map((id) => define("element", id, id, [id])),
  ...["school", "kitchen", "celebration", "forest", "bedroom", "underwater", "sky", "nightmare", "library", "cloud-garden", "candy-fragment"].map((id) => define("environment", id, id, [id])),
  ...["corridor", "classroom", "lockers", "stairs", "exit-stairwell", "kitchen-counter", "moon-window", "moon-door", "stage", "celebration-stage", "golden-house", "jackpot-board"].map((id) => define("structure", id, id.replaceAll("-", " "), [id])),
  ...["giant-cup", "sugar-bowl", "paper-boat", "written-message", "desk", "school-board", "banner", "instrument", "family-instruments", "lottery-ticket", "golden-rain", "objective-beacon", "treasure-chest"].map((id) => define("prop", id, id.replaceAll("-", " "), [id])),
  ...["moth", "dog", "family", "shadow", "paper-boat-character", "procedural-guide", "gummy-bear"].map((id) => define("entity", id, id.replaceAll("-", " "), [id])),
  ...["scale-traversal", "swimming-route", "message-arc", "ticket-verification", "performance"].map((id) => define("gameplay", id, id.replaceAll("-", " "), [id])),
  define("dialogue", "relationship-arc", "relationship arc", ["opening", "middle", "ending"]),
  define("atmosphere", "underwater-fog", "underwater fog", ["water", "fog"]),
  define("audio", "dream-motif", "dream motif", ["music", "ending"]),
];

const byId = new Map(DREAM_LIBRARY.map((capability) => [capability.id, capability]));

export function getDreamLibraryCapability(id: string): DreamLibraryCapability | null {
  return byId.get(id) ?? null;
}

export function selectDreamLibraryCapabilities(
  environmentId: string,
  capabilityIds: readonly string[],
): CapabilitySelection {
  const uniqueIds = [...new Set([environmentId, ...capabilityIds])];
  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`DreamLibrary capability unavailable: ${missing.join(", ")}`);
  if (byId.get(environmentId)?.category !== "environment") {
    throw new Error(`DreamLibrary environment unavailable: ${environmentId}`);
  }
  return { libraryVersion: DREAM_LIBRARY_VERSION, environmentId, capabilityIds: uniqueIds };
}
