import type { TrustedDreamManifest } from "../dream";
import { DREAM_LIBRARY_VERSION } from "./capabilities";
import { getDreamLibraryCapability, selectDreamLibraryCapabilities } from "./registry";

export interface DreamLibraryAnchorBinding {
  readonly anchorId: string;
  readonly capabilityId: string;
  readonly sourceId: string | null;
  readonly renderedInstanceId: string;
}

export interface DreamLibraryBinding {
  readonly libraryVersion: typeof DREAM_LIBRARY_VERSION;
  readonly environmentId: string;
  readonly capabilityIds: readonly string[];
  readonly anchors: readonly DreamLibraryAnchorBinding[];
}

function capabilityFor(text: string): string | null {
  const source = text.toLowerCase();
  const match = ([
    ["cloud garden", "cloud-garden"], ["kitchen", "kitchen"], ["school", "school"], ["forest", "forest"], ["library", "library"], ["stage", "celebration-stage"],
    ["golden house", "golden-house"], ["cup", "giant-cup"], ["sugar", "sugar-bowl"],
    ["moth", "moth"], ["dog", "dog"], ["bear", "gummy-bear"], ["shadow", "shadow"], ["guide", "procedural-guide"], ["boat", "paper-boat"],
    ["stair", "exit-stairwell"], ["door", "moon-door"], ["board", "jackpot-board"],
    ["instrument", "family-instruments"], ["family", "family"], ["ticket", "lottery-ticket"], ["chest", "treasure-chest"], ["beacon", "objective-beacon"],
  ] as const).find(([needle]) => source.includes(needle));
  return match?.[1] ?? null;
}

function environmentFor(text: string): string {
  const source = text.toLowerCase();
  if (source.includes("cloud garden")) return "cloud-garden";
  if (source.includes("kitchen")) return "kitchen";
  if (source.includes("school")) return "school";
  if (source.includes("stage") || source.includes("celebrat") || source.includes("lottery")) return "celebration";
  if (source.includes("library")) return "library";
  if (source.includes("water") || source.includes("ocean")) return "underwater";
  if (source.includes("sky") || source.includes("cloud")) return "sky";
  if (source.includes("bedroom")) return "bedroom";
  if (source.includes("nightmare")) return "nightmare";
  return "forest";
}

export function compileDreamLibraryBinding(manifest: TrustedDreamManifest): DreamLibraryBinding {
  const environmentId = environmentFor(`${manifest.spec.title} ${manifest.spec.blueprint.summary} ${manifest.spec.blueprint.semanticAnchors.find(({ role }) => role === "environment")?.sourcePhrase ?? ""}`);
  const anchors = manifest.anchorStaging.map((anchor) => {
    const capabilityId = capabilityFor(`${anchor.sourcePhrase} ${anchor.sourceId ?? ""}`);
    if (!capabilityId && anchor.mustAppear && anchor.importance >= 4) {
      throw new Error(`DreamLibrary cannot render high-priority anchor: ${anchor.sourcePhrase}`);
    }
    return capabilityId ? {
      anchorId: anchor.anchorId, capabilityId, sourceId: anchor.sourceId,
      renderedInstanceId: `dreamlibrary-${capabilityId}-${anchor.anchorId}`,
    } : null;
  }).filter((binding): binding is DreamLibraryAnchorBinding => binding !== null);
  const selection = selectDreamLibraryCapabilities(environmentId, anchors.map(({ capabilityId }) => capabilityId));
  return { libraryVersion: selection.libraryVersion, environmentId, capabilityIds: selection.capabilityIds, anchors };
}

export function isDreamLibraryRenderable(binding: DreamLibraryBinding, anchorId: string): boolean {
  const anchor = binding.anchors.find((item) => item.anchorId === anchorId);
  return Boolean(anchor && getDreamLibraryCapability(anchor.capabilityId)?.rendered);
}
