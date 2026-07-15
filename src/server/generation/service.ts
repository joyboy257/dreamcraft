import {
  MockLocalGenerationProvider,
  type DreamGenerationRequest,
  type DreamGenerationResult,
  type GenerationFailureCategory,
  type DreamGenerationProgressEvent,
  type DreamGenerationProgressListener,
  type GenerationTokenUsage,
} from "../../dream/provider";
import {
  applyDreamEnrichmentPatch,
  DreamBlueprintSchema,
  DreamEnrichmentPatchSchema,
} from "../../dream/enrichment";
import { sanitizeDreamSpec } from "../../dream/sanitizer";
import type { DreamIssue, DreamSpecV1 } from "../../dream/schema";

export interface GenerationModels {
  sol: string;
  terra: string;
  luna: string;
}

export interface StructuredGenerationInput {
  kind: "single-sol" | "director" | "core" | "enrichment";
  model: string;
  dreamText: string;
  intensity: DreamGenerationRequest["intensity"];
  requestId: string;
  blueprint?: unknown;
}

export interface StructuredModelSuccess {
  type: "success";
  value: unknown;
  model: string;
  providerRequestId?: string;
  usage?: GenerationTokenUsage;
}

export interface StructuredModelFailure {
  type: "failure";
  category: GenerationFailureCategory;
  retryable: boolean;
}

export type StructuredModelOutcome =
  | StructuredModelSuccess
  | StructuredModelFailure;

export interface StructuredModelGateway {
  generate(
    input: StructuredGenerationInput,
    signal: AbortSignal,
  ): Promise<StructuredModelOutcome>;
}

export type GenerationProgressEvent = DreamGenerationProgressEvent;
export type GenerationProgressListener = DreamGenerationProgressListener;

export interface DreamGenerationServiceOptions {
  gateway: StructuredModelGateway;
  liveEnabled: boolean;
  directorEnabled?: boolean;
  models: GenerationModels;
  timeoutMs: number;
}

interface RequestAttemptBudget {
  attempts: number;
  retriesRemaining: number;
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function combineUsage(
  outcomes: readonly StructuredModelSuccess[],
): GenerationTokenUsage | undefined {
  const usage = outcomes.flatMap((outcome) => outcome.usage ?? []);
  if (usage.length === 0) return undefined;
  return usage.reduce(
    (total, item) => ({
      inputTokens: total.inputTokens + item.inputTokens,
      outputTokens: total.outputTokens + item.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
}

function providerRequestIds(
  outcomes: readonly StructuredModelSuccess[],
): string | undefined {
  const ids = outcomes.flatMap((outcome) => outcome.providerRequestId ?? []);
  return ids.length > 0 ? ids.join(":") : undefined;
}

export class DreamGenerationService {
  private readonly local = new MockLocalGenerationProvider();

  constructor(private readonly options: DreamGenerationServiceOptions) {}

  private async fallback(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    category: GenerationFailureCategory,
    attemptCount: number,
    startedAt: number,
    onProgress?: GenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    const local = await this.local.generate(
      { ...request, strategy: "mock-local" },
      signal,
    );
    const fallbackIssue: DreamIssue = {
      code: "provider_fallback",
      severity: "warning",
      path: "generation.strategy",
      message: "The remote generator was unavailable; a deterministic stable fragment was used",
      repaired: true,
    };
    const result: DreamGenerationResult = {
      ...local,
      issues: [
        ...local.issues.filter(({ code }) => code !== "provider_fallback"),
        fallbackIssue,
      ],
      metadata: {
        ...local.metadata,
        requestedStrategy: request.strategy,
        actualStrategy: "mock-local",
        requestDurationMs: elapsedSince(startedAt),
        fallbackUsed: true,
        fallbackReason: category,
        repairCount: local.metadata.repairCount + 1,
        requestId: request.clientRequestId,
        attemptCount,
      },
    };
    onProgress?.({ phase: "core-ready", result });
    return result;
  }

  private async invoke(
    input: StructuredGenerationInput,
    combinedSignal: AbortSignal,
    userSignal: AbortSignal,
    timeoutSignal: AbortSignal,
    budget: RequestAttemptBudget,
  ): Promise<StructuredModelOutcome> {
    const execute = async (): Promise<StructuredModelOutcome> => {
      budget.attempts += 1;
      try {
        return await this.options.gateway.generate(input, combinedSignal);
      } catch (error) {
        if (userSignal.aborted) {
          throw userSignal.reason instanceof Error
            ? userSignal.reason
            : new DOMException("Dream generation was aborted", "AbortError");
        }
        if (timeoutSignal.aborted) {
          return { type: "failure", category: "timeout", retryable: true };
        }
        throw error;
      }
    };

    let outcome = await execute();
    if (
      outcome.type === "failure" &&
      outcome.retryable &&
      budget.retriesRemaining > 0 &&
      !combinedSignal.aborted
    ) {
      budget.retriesRemaining -= 1;
      outcome = await execute();
    }
    return outcome;
  }

  private resultFromCore(options: {
    request: DreamGenerationRequest;
    strategy: "single-sol" | "director-parallel";
    spec: DreamSpecV1;
    issues: DreamIssue[];
    outcomes: StructuredModelSuccess[];
    attemptCount: number;
    startedAt: number;
    validationDurationMs: number;
  }): DreamGenerationResult {
    const providerRequestId = providerRequestIds(options.outcomes);
    const usage = combineUsage(options.outcomes);
    return {
      core: options.spec,
      issues: options.issues,
      metadata: {
        strategy: options.strategy,
        requestedStrategy: options.request.strategy,
        actualStrategy: options.strategy,
        modelAliases: options.outcomes.map(({ model }) => model),
        requestDurationMs: elapsedSince(options.startedAt),
        validationDurationMs: options.validationDurationMs,
        fallbackUsed: false,
        repairCount: options.issues.filter(({ repaired }) => repaired).length,
        requestId: options.request.clientRequestId,
        attemptCount: options.attemptCount,
        ...(providerRequestId ? { providerRequestId } : {}),
        ...(usage ? { usage } : {}),
      },
    };
  }

  private async generateSingle(
    request: DreamGenerationRequest,
    userSignal: AbortSignal,
    timeoutSignal: AbortSignal,
    combinedSignal: AbortSignal,
    budget: RequestAttemptBudget,
    startedAt: number,
    onProgress?: GenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    const outcome = await this.invoke(
      {
        kind: "single-sol",
        model: this.options.models.sol,
        dreamText: request.dreamText,
        intensity: request.intensity,
        requestId: request.clientRequestId,
      },
      combinedSignal,
      userSignal,
      timeoutSignal,
      budget,
    );
    if (outcome.type === "failure") {
      return this.fallback(
        request,
        userSignal,
        outcome.category,
        budget.attempts,
        startedAt,
        onProgress,
      );
    }

    const validationStartedAt = performance.now();
    const sanitized = sanitizeDreamSpec(outcome.value);
    const validationDurationMs = elapsedSince(validationStartedAt);
    if (!sanitized.success) {
      return this.fallback(
        request,
        userSignal,
        "invalid_output",
        budget.attempts,
        startedAt,
        onProgress,
      );
    }
    return this.resultFromCore({
      request,
      strategy: "single-sol",
      spec: sanitized.spec,
      issues: sanitized.issues,
      outcomes: [outcome],
      attemptCount: budget.attempts,
      startedAt,
      validationDurationMs,
    });
  }

  private async generateDirector(
    request: DreamGenerationRequest,
    userSignal: AbortSignal,
    timeoutSignal: AbortSignal,
    combinedSignal: AbortSignal,
    budget: RequestAttemptBudget,
    startedAt: number,
    onProgress?: GenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    const director = await this.invoke(
      {
        kind: "director",
        model: this.options.models.sol,
        dreamText: request.dreamText,
        intensity: request.intensity,
        requestId: request.clientRequestId,
      },
      combinedSignal,
      userSignal,
      timeoutSignal,
      budget,
    );
    if (director.type === "failure") {
      return this.fallback(
        request,
        userSignal,
        director.category,
        budget.attempts,
        startedAt,
        onProgress,
      );
    }
    const blueprint = DreamBlueprintSchema.safeParse(director.value);
    if (!blueprint.success) {
      return this.fallback(
        request,
        userSignal,
        "invalid_output",
        budget.attempts,
        startedAt,
        onProgress,
      );
    }
    onProgress?.({ phase: "blueprint-ready" });

    const branchController = new AbortController();
    const branchSignal = AbortSignal.any([
      combinedSignal,
      branchController.signal,
    ]);
    const corePromise = this.invoke(
      {
        kind: "core",
        model: this.options.models.terra,
        dreamText: request.dreamText,
        intensity: request.intensity,
        requestId: request.clientRequestId,
        blueprint: blueprint.data,
      },
      branchSignal,
      userSignal,
      timeoutSignal,
      budget,
    );
    const enrichmentPromise = this.invoke(
      {
        kind: "enrichment",
        model: this.options.models.luna,
        dreamText: request.dreamText,
        intensity: request.intensity,
        requestId: request.clientRequestId,
        blueprint: blueprint.data,
      },
      branchSignal,
      userSignal,
      timeoutSignal,
      budget,
    );

    const core = await corePromise;
    if (core.type === "failure") {
      branchController.abort(
        new DOMException("Playable core generation failed", "AbortError"),
      );
      void enrichmentPromise.catch(() => undefined);
      return this.fallback(
        request,
        userSignal,
        core.category,
        budget.attempts,
        startedAt,
        onProgress,
      );
    }
    const validationStartedAt = performance.now();
    const sanitized = sanitizeDreamSpec(
      typeof core.value === "object" && core.value !== null
        ? { ...core.value, blueprint: blueprint.data }
        : core.value,
    );
    const validationDurationMs = elapsedSince(validationStartedAt);
    if (!sanitized.success) {
      branchController.abort(
        new DOMException("Playable core validation failed", "AbortError"),
      );
      void enrichmentPromise.catch(() => undefined);
      return this.fallback(
        request,
        userSignal,
        "invalid_output",
        budget.attempts,
        startedAt,
        onProgress,
      );
    }

    const coreResult = this.resultFromCore({
      request,
      strategy: "director-parallel",
      spec: sanitized.spec,
      issues: sanitized.issues,
      outcomes: [director, core],
      attemptCount: budget.attempts,
      startedAt,
      validationDurationMs,
    });
    onProgress?.({ phase: "core-ready", result: coreResult });

    const enrichment = await enrichmentPromise;
    if (enrichment.type === "failure") return coreResult;
    const patch = DreamEnrichmentPatchSchema.safeParse(enrichment.value);
    if (!patch.success) return coreResult;
    const enriched = applyDreamEnrichmentPatch(sanitized.spec, patch.data);
    if (!enriched.success) return coreResult;
    onProgress?.({ phase: "enrichment-ready" });
    return this.resultFromCore({
      request,
      strategy: "director-parallel",
      spec: enriched.spec,
      issues: sanitized.issues,
      outcomes: [director, core, enrichment],
      attemptCount: budget.attempts,
      startedAt,
      validationDurationMs,
    });
  }

  async generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: GenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    if (signal.aborted) {
      throw new DOMException("Dream generation was aborted", "AbortError");
    }

    const startedAt = performance.now();
    onProgress?.({ phase: "requesting" });
    if (request.strategy === "mock-local") {
      return this.local.generate(
        { ...request, strategy: "mock-local" },
        signal,
        onProgress,
      );
    }
    if (!this.options.liveEnabled) {
      return this.fallback(
        request,
        signal,
        "api_disabled",
        0,
        startedAt,
        onProgress,
      );
    }
    if (request.strategy === "director-parallel" && !this.options.directorEnabled) {
      return this.fallback(
        request,
        signal,
        "api_disabled",
        0,
        startedAt,
        onProgress,
      );
    }

    const timeoutSignal = AbortSignal.timeout(this.options.timeoutMs);
    const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
    const budget: RequestAttemptBudget = { attempts: 0, retriesRemaining: 1 };
    return request.strategy === "director-parallel"
      ? this.generateDirector(
          request,
          signal,
          timeoutSignal,
          combinedSignal,
          budget,
          startedAt,
          onProgress,
        )
      : this.generateSingle(
          request,
          signal,
          timeoutSignal,
          combinedSignal,
          budget,
          startedAt,
          onProgress,
        );
  }
}
