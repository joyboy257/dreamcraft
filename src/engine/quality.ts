export type QualityTier = "high" | "balanced" | "reduced";

export interface QualityProfile {
  tier: QualityTier;
  maximumPixelRatio: number;
  renderRadius: number;
  antialias: boolean;
}

const PROFILES: Readonly<Record<QualityTier, QualityProfile>> = {
  high: { tier: "high", maximumPixelRatio: 2, renderRadius: 3, antialias: true },
  balanced: { tier: "balanced", maximumPixelRatio: 1.5, renderRadius: 2, antialias: true },
  reduced: { tier: "reduced", maximumPixelRatio: 1.25, renderRadius: 2, antialias: false },
};

export function qualityProfile(tier: QualityTier): QualityProfile {
  return PROFILES[tier];
}

export function detectQualityTier(): QualityTier {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrowViewport = window.innerWidth < 800;
  if (coarsePointer || narrowViewport) return "reduced";
  return "balanced";
}
