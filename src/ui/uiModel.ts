import type { MaterializationStep } from "./types";

export const MATERIALIZATION_COPY: Readonly<
  Record<MaterializationStep, { label: string; detail: string }>
> = {
  requesting: {
    label: "Remembering the important details…",
    detail: "Reading the places, people, and strange rules you described.",
  },
  validating: {
    label: "Choosing the laws of this dream…",
    detail: "Making sure every part can become a safe, playable world.",
  },
  compiling: {
    label: "Teaching its inhabitants how to move…",
    detail: "Preparing the characters, physics, and story.",
  },
  "generating-spawn": {
    label: "Building the place where you wake up…",
    detail: "Opening the central path first so you can enter sooner.",
  },
  staging: {
    label: "Stabilizing the dream…",
    detail: "Placing your guide and the first thing to remember.",
  },
  entering: {
    label: "The dream is ready.",
    detail: "Step inside when you are ready to look around.",
  },
};

export interface FragmentCopy {
  heading: string;
  message: string;
}

const FRAGMENT_COPY: Readonly<Record<string, FragmentCopy>> = {
  timeout: {
    heading: "The dream took too long to settle.",
    message: "A stable fragment survived, so there is still somewhere to explore.",
  },
  refused: {
    heading: "That dream could not take this shape.",
    message: "A safe, stable fragment is ready in its place.",
  },
  invalid: {
    heading: "The dream would not hold its shape.",
    message: "A stable fragment survived and is ready to enter.",
  },
  offline: {
    heading: "The distant dream went quiet.",
    message: "A local fragment is ready and does not need a connection.",
  },
};

const DEFAULT_FRAGMENT_COPY: FragmentCopy = {
  heading: "The dream would not hold its shape.",
  message: "A stable fragment survived and is ready to enter.",
};

export function getFragmentCopy(code: string | null | undefined): FragmentCopy {
  if (!code) return DEFAULT_FRAGMENT_COPY;
  return FRAGMENT_COPY[code] ?? DEFAULT_FRAGMENT_COPY;
}

export function clampDialogueChoiceIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}
