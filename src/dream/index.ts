export {
  compileDreamDescriptor,
  sampleCompiledBlock,
  sampleSurfaceHeight,
  type CompiledGeneratorDescriptor,
  type EmergencyPlatformDescriptor,
  type SemanticAnchorStaging,
  type TrustedDreamManifest,
} from "./compiler";
export { DREAM_LIMITS, STRUCTURAL_LIMITS } from "./limits";
export {
  FallbackGenerationProvider,
  MockLocalGenerationProvider,
  type DreamGenerationProvider,
  type DreamGenerationRequest,
  type DreamGenerationResult,
  type DreamIntensity,
  type GenerationMetadata,
  type GenerationStrategy,
} from "./provider";
export {
  DreamIssueSchema,
  DreamSpecV1Schema,
  GameConditionSchema,
  Vec2Schema,
  Vec3Schema,
  type DreamCondition,
  type DreamIssue,
  type DreamSpecV1,
  type Vec2,
  type Vec3,
} from "./schema";
export { sanitizeDreamSpec, type DreamSanitizeResult } from "./sanitizer";
export { validateDreamSpecReferences } from "./validation";
