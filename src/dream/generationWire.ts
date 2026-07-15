import { z } from "zod";

import { DreamIssueSchema, DreamSpecV1Schema } from "./schema";

export const GenerationStrategySchema = z.enum([
  "mock-local",
  "single-sol",
  "director-parallel",
]);

export const DreamIntensitySchema = z.enum(["calm", "vivid", "fever"]);

export const GenerationFailureCategorySchema = z.enum([
  "api_disabled",
  "authentication",
  "cancelled",
  "incomplete",
  "invalid_output",
  "network",
  "quota",
  "rate_limit",
  "refusal",
  "server",
  "timeout",
  "unknown",
]);

const duration = z.number().finite().nonnegative().max(120_000);
const requestId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const GenerationMetadataSchema = z.strictObject({
  strategy: GenerationStrategySchema,
  requestedStrategy: GenerationStrategySchema.optional(),
  actualStrategy: GenerationStrategySchema.optional(),
  modelAliases: z.array(z.string().min(1).max(100)).max(3),
  requestDurationMs: duration,
  validationDurationMs: duration,
  compileDurationMs: duration.optional(),
  fallbackUsed: z.boolean(),
  fallbackReason: GenerationFailureCategorySchema.optional(),
  repairCount: z.number().int().nonnegative().max(10_000),
  requestId,
  providerRequestId: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9._:-]+$/)
    .optional(),
  attemptCount: z.number().int().min(0).max(4).optional(),
  usage: z
    .strictObject({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
    })
    .optional(),
});

export const DreamGenerationResultSchema = z.strictObject({
  core: DreamSpecV1Schema,
  metadata: GenerationMetadataSchema,
  issues: z.array(DreamIssueSchema).max(1_000),
});

export const DreamGenerationStreamFrameSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("progress"),
    phase: z.enum(["requesting", "blueprint-ready", "enrichment-ready"]),
  }),
  z.strictObject({
    type: z.literal("core"),
    result: DreamGenerationResultSchema,
  }),
  z.strictObject({
    type: z.literal("result"),
    result: DreamGenerationResultSchema,
  }),
  z.strictObject({
    type: z.literal("error"),
    code: z.enum(["cancelled", "generation_failed"]),
  }),
]);
