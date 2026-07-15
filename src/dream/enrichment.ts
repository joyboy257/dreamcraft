import { z } from "zod";

import { DREAM_LIMITS } from "./limits";
import { sanitizeDreamSpec } from "./sanitizer";
import { DreamSpecV1Schema, type DreamSpecV1 } from "./schema";

const boundedText = z.string().trim().min(1).max(DREAM_LIMITS.textLength);

export const DreamBlueprintSchema = DreamSpecV1Schema.shape.blueprint;

export const DreamEnrichmentPatchSchema = z.strictObject({
  version: z.literal(1),
  dialogueText: z
    .array(
      z.strictObject({
        dialogueIndex: z.number().int().min(0).max(DREAM_LIMITS.dialogueNodes - 1),
        nodeIndex: z.number().int().min(0).max(DREAM_LIMITS.dialogueNodes - 1),
        text: boundedText,
      }),
    )
    .max(DREAM_LIMITS.dialogueNodes),
  endingNarration: z
    .array(
      z.strictObject({
        endingIndex: z.number().int().min(0).max(DREAM_LIMITS.endings - 1),
        narration: boundedText,
      }),
    )
    .max(DREAM_LIMITS.endings),
});

export type DreamEnrichmentPatch = z.infer<typeof DreamEnrichmentPatchSchema>;

export type EnrichmentResult =
  | { success: true; spec: DreamSpecV1 }
  | { success: false; reason: "invalid_reference" | "invalid_result" };

export function applyDreamEnrichmentPatch(
  core: DreamSpecV1,
  patch: DreamEnrichmentPatch,
): EnrichmentResult {
  const spec = structuredClone(core);
  for (const replacement of patch.dialogueText) {
    const dialogue = spec.dialogues[replacement.dialogueIndex];
    const node = dialogue?.nodes[replacement.nodeIndex];
    if (!node) return { success: false, reason: "invalid_reference" };
    node.text = replacement.text;
  }
  for (const replacement of patch.endingNarration) {
    const ending = spec.playGraph.endings[replacement.endingIndex];
    if (!ending) return { success: false, reason: "invalid_reference" };
    ending.narration = replacement.narration;
  }
  const sanitized = sanitizeDreamSpec(spec);
  return sanitized.success
    ? { success: true, spec: sanitized.spec }
    : { success: false, reason: "invalid_result" };
}
