import { z } from "zod";

import { DreamGenerationResultSchema } from "./generationWire";
import {
  MockLocalGenerationProvider,
  type DreamGenerationProgressListener,
  type DreamGenerationProvider,
  type DreamGenerationRequest,
  type DreamGenerationResult,
  type GenerationFailureCategory,
} from "./provider";
import type { DreamIssue } from "./schema";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const CACHE_KEY = "dreamcraft:g3:last-known-good:v1";
const CacheEntrySchema = z.strictObject({
  version: z.literal(1),
  fingerprint: z.string().regex(/^[a-f0-9]{8}$/),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  result: DreamGenerationResultSchema,
});
const CacheFileSchema = z.array(CacheEntrySchema).max(10);
type CacheEntry = z.infer<typeof CacheEntrySchema>;

function fingerprint(request: DreamGenerationRequest): string {
  const value = [
    request.dreamText.replace(/\s+/g, " ").trim().toLocaleLowerCase("en"),
    request.intensity,
    request.strategy,
  ].join("|");
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function resultFromEntry(entry: CacheEntry): DreamGenerationResult {
  return {
    core: entry.result.core,
    issues: entry.result.issues,
    metadata: entry.result.metadata,
  };
}

export class SafeDreamCache {
  private readonly storage: StorageLike;
  private readonly now: () => number;
  private readonly capacity: number;
  private readonly ttlMs: number;

  constructor(options: {
    storage: StorageLike;
    now?: () => number;
    capacity?: number;
    ttlMs?: number;
  }) {
    this.storage = options.storage;
    this.now = options.now ?? Date.now;
    this.capacity = Math.min(5, Math.max(1, options.capacity ?? 3));
    this.ttlMs = Math.min(
      7 * 24 * 60 * 60 * 1_000,
      Math.max(60_000, options.ttlMs ?? 24 * 60 * 60 * 1_000),
    );
  }

  private entries(): CacheEntry[] {
    try {
      const raw = this.storage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed = CacheFileSchema.safeParse(JSON.parse(raw) as unknown);
      if (!parsed.success) return [];
      return parsed.data.filter(({ expiresAt }) => expiresAt > this.now());
    } catch {
      return [];
    }
  }

  read(request: DreamGenerationRequest): DreamGenerationResult | null {
    const match = this.entries().find(
      (entry) => entry.fingerprint === fingerprint(request),
    );
    return match ? resultFromEntry(match) : null;
  }

  write(
    request: DreamGenerationRequest,
    result: DreamGenerationResult,
  ): void {
    const validated = DreamGenerationResultSchema.safeParse(result);
    if (!validated.success) return;
    const now = this.now();
    const entry: CacheEntry = {
      version: 1,
      fingerprint: fingerprint(request),
      savedAt: now,
      expiresAt: now + this.ttlMs,
      result: validated.data,
    };
    const next = [
      entry,
      ...this.entries().filter(
        (candidate) => candidate.fingerprint !== entry.fingerprint,
      ),
    ].slice(0, this.capacity);
    try {
      this.storage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      // Storage is optional; private browsing and quotas can reject writes.
    }
  }
}

export async function warmBundledSampleCache(
  cache: SafeDreamCache,
  dreamTexts: readonly string[],
  signal: AbortSignal,
): Promise<number> {
  const local = new MockLocalGenerationProvider();
  const uniqueSamples = [...new Set(dreamTexts.map((value) => value.trim()))]
    .filter((value) => value.length >= 12)
    .slice(0, 3);
  let warmed = 0;
  for (const [index, dreamText] of uniqueSamples.entries()) {
    if (signal.aborted) return warmed;
    const request: DreamGenerationRequest = {
      dreamText,
      intensity: "vivid",
      strategy: "single-sol",
      clientRequestId: `bundled-sample-${index + 1}`,
    };
    let result: DreamGenerationResult;
    try {
      result = await local.generate(
        { ...request, strategy: "mock-local" },
        signal,
      );
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        return warmed;
      }
      throw error;
    }
    cache.write(request, {
      ...result,
      metadata: {
        ...result.metadata,
        requestedStrategy: "single-sol",
        actualStrategy: "mock-local",
      },
    });
    warmed += 1;
  }
  return warmed;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function recoveryCategory(error: unknown): GenerationFailureCategory {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "invalid_response" || code === "invalid_json") return "invalid_output";
  if (code === "http_401") return "authentication";
  if (code === "http_429") return "rate_limit";
  if (error instanceof TypeError) return "network";
  return "unknown";
}

export class LastKnownGoodGenerationProvider
  implements DreamGenerationProvider
{
  constructor(
    private readonly primary: DreamGenerationProvider,
    private readonly cache: SafeDreamCache,
  ) {}

  async generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    try {
      const result = await this.primary.generate(request, signal, onProgress);
      if (!result.metadata.fallbackUsed) this.cache.write(request, result);
      return result;
    } catch (error) {
      if (signal.aborted || isAbortError(error)) throw error;
      const cached = this.cache.read(request);
      if (!cached) throw error;
      const fallbackIssue: DreamIssue = {
        code: "provider_fallback",
        severity: "warning",
        path: "generation.cache",
        message: "The live route was unavailable; a validated last-known-good dream was restored",
        repaired: true,
      };
      const recovered: DreamGenerationResult = {
        core: cached.core,
        issues: [
          ...cached.issues.filter(({ code }) => code !== "provider_fallback"),
          fallbackIssue,
        ],
        metadata: {
          ...cached.metadata,
          requestedStrategy: request.strategy,
          fallbackUsed: true,
          fallbackReason: recoveryCategory(error),
          repairCount: cached.metadata.repairCount + 1,
          requestId: request.clientRequestId,
        },
      };
      onProgress?.({ phase: "core-ready", result: recovered });
      return recovered;
    }
  }
}
