import { useEffect, useRef, useState } from "react";
import {
  createLocalPreview,
  SAMPLE_DREAMS,
  type LocalPreview,
} from "./app/localPreview";
import { DreamExperience } from "./integration/DreamExperience";
import {
  FallbackGenerationProvider,
  HttpDreamGenerationProvider,
  LastKnownGoodGenerationProvider,
  SafeDreamCache,
  warmBundledSampleCache,
  compileDreamDescriptor,
  type GenerationMetadata,
  type TrustedDreamManifest,
} from "./dream";
import { publicEnv } from "./config/publicEnv";
import { prepareDreamRuntime } from "./app/materialization";
import { DreamLibraryGallery } from "./dreamlibrary";
import {
  createDreamLibraryShowcases,
  DREAM_LIBRARY_SHOWCASE_CARDS,
} from "./dreamlibrary";
import {
  DreamInputForm,
  FragmentNotice,
  MaterializationOverlay,
  type DreamIntensity,
  type MaterializationStep,
} from "./ui";

interface MaterializedDream {
  preview: LocalPreview;
  manifest: TrustedDreamManifest;
  metadata: GenerationMetadata;
}

const memoryStorage = new Map<string, string>();
const safeCache = new SafeDreamCache({
  storage: {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
});
const generationProvider = new FallbackGenerationProvider(
  new LastKnownGoodGenerationProvider(
    new HttpDreamGenerationProvider({ endpoint: `${publicEnv.apiBase}/dream` }),
    safeCache,
  ),
);
const dreamLibraryShowcases = createDreamLibraryShowcases();

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

export default function App(): React.JSX.Element {
  const [dreamText, setDreamText] = useState<string>(SAMPLE_DREAMS[0]);
  const [intensity, setIntensity] = useState<DreamIntensity>("vivid");
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [manifest, setManifest] = useState<TrustedDreamManifest | null>(null);
  const [enrichmentManifest, setEnrichmentManifest] =
    useState<TrustedDreamManifest | null>(null);
  const [materialization, setMaterialization] = useState<MaterializationStep | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [pendingFragment, setPendingFragment] = useState<MaterializedDream | null>(null);
  const [showcaseId, setShowcaseId] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const generationController = useRef<AbortController | null>(null);

  useEffect(() => {
    const sampleController = new AbortController();
    void warmBundledSampleCache(
      safeCache,
      SAMPLE_DREAMS,
      sampleController.signal,
    ).catch(() => {
      // Sample warming is optional; the deterministic generator remains available.
    });
    return () => {
      sampleController.abort();
      generationController.current?.abort();
    };
  }, []);

  if (window.location.pathname === "/dreamlibrary") return <DreamLibraryGallery />;

  const enterDream = async (): Promise<void> => {
    generationController.current?.abort();
    const controller = new AbortController();
    generationController.current = controller;
    try {
      setShowcaseId(null);
      const localPreview = createLocalPreview(dreamText);
      let enteredProgressiveCore = false;
      let progressiveCompileDurationMs: number | undefined;
      setIssue(null);
      setPendingFragment(null);
      setEnrichmentManifest(null);
      setMaterialization("requesting");
      const result = await generationProvider.generate(
        {
          dreamText: localPreview.normalizedDream,
          intensity,
          strategy: publicEnv.generationStrategy,
          clientRequestId: `dream-${localPreview.seed.toString(16)}-${Date.now().toString(36)}`,
        },
        controller.signal,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.phase === "blueprint-ready") {
            setMaterialization("validating");
            return;
          }
          if (
            event.phase !== "core-ready" ||
            event.result.metadata.actualStrategy !== "director-parallel"
          ) {
            return;
          }
          const compileStartedAt = performance.now();
          const trustedManifest = compileDreamDescriptor(
            event.result.core,
            event.result.issues,
          );
          prepareDreamRuntime(trustedManifest);
          const progressiveMetadata: GenerationMetadata = {
            ...event.result.metadata,
            compileDurationMs: Math.max(
              0,
              Math.round(performance.now() - compileStartedAt),
            ),
          };
          progressiveCompileDurationMs = progressiveMetadata.compileDurationMs;
          setManifest(trustedManifest);
          setPreview({
            ...localPreview,
            title: trustedManifest.title,
            seed: trustedManifest.seed,
          });
          setMetadata(progressiveMetadata);
          setMaterialization(null);
          setSession((current) => current + 1);
          enteredProgressiveCore = true;
        },
      );
      if (controller.signal.aborted) return;
      if (enteredProgressiveCore) {
        setEnrichmentManifest(
          compileDreamDescriptor(result.core, result.issues),
        );
        setMetadata({
          ...result.metadata,
          ...(progressiveCompileDurationMs === undefined
            ? {}
            : { compileDurationMs: progressiveCompileDurationMs }),
        });
        return;
      }
      setMaterialization("validating");
      await yieldToBrowser();
      if (controller.signal.aborted) return;
      setMaterialization("compiling");
      const compileStartedAt = performance.now();
      const trustedManifest = compileDreamDescriptor(result.core, result.issues);
      const resultMetadata: GenerationMetadata = {
        ...result.metadata,
        compileDurationMs: Math.max(0, Math.round(performance.now() - compileStartedAt)),
      };
      setMaterialization("generating-spawn");
      await yieldToBrowser();
      if (controller.signal.aborted) return;
      prepareDreamRuntime(trustedManifest);
      setMaterialization("staging");
      await yieldToBrowser();
      if (controller.signal.aborted) return;
      const materialized: MaterializedDream = {
        manifest: trustedManifest,
        metadata: resultMetadata,
        preview: {
        ...localPreview,
        title: trustedManifest.title,
        seed: trustedManifest.seed,
        },
      };
      setMaterialization("entering");
      await yieldToBrowser();
      if (controller.signal.aborted) return;
      if (resultMetadata.fallbackUsed) {
        setPendingFragment(materialized);
      } else {
        setManifest(materialized.manifest);
        setPreview(materialized.preview);
        setMetadata(materialized.metadata);
        setSession((current) => current + 1);
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) return;
      setIssue(error instanceof Error ? error.message : "The dream is empty.");
    } finally {
      if (generationController.current === controller) {
        generationController.current = null;
        setMaterialization(null);
      }
    }
  };

  const enterShowcase = async (id: string): Promise<void> => {
    generationController.current?.abort();
    generationController.current = null;
    setIssue(null);
    setPendingFragment(null);
    setEnrichmentManifest(null);
    setMaterialization("validating");

    try {
      const showcase = (await dreamLibraryShowcases).find((candidate) => candidate.id === id);
      if (!showcase) throw new Error("That DreamLibrary showcase is unavailable.");

      const compileStartedAt = performance.now();
      const trustedManifest = compileDreamDescriptor(showcase.spec, []);
      prepareDreamRuntime(trustedManifest);
      setDreamText(showcase.prompt);
      setManifest(trustedManifest);
      setPreview({
        ...createLocalPreview(showcase.prompt),
        title: trustedManifest.title,
        seed: trustedManifest.seed,
      });
      setMetadata({
        strategy: "mock-local",
        requestedStrategy: "mock-local",
        actualStrategy: "mock-local",
        modelAliases: [],
        requestDurationMs: 0,
        validationDurationMs: 0,
        compileDurationMs: Math.max(0, Math.round(performance.now() - compileStartedAt)),
        fallbackUsed: false,
        repairCount: 0,
        requestId: `dreamlibrary-showcase-${showcase.id}`,
      });
      setShowcaseId(showcase.id);
      setSession((current) => current + 1);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "The showcase could not be prepared.");
    } finally {
      setMaterialization(null);
    }
  };

  if (preview && manifest) {
    return (
      <DreamExperience
        key={`${preview.seed}-${session}`}
        preview={preview}
        manifest={manifest}
        enrichmentManifest={enrichmentManifest}
        isShowcase={showcaseId !== null}
        generationLabel={showcaseId
          ? "DreamLibrary showcase"
          : metadata?.fallbackUsed ? "Stable local fragment" : "GPT-5.6 generated dream"}
        onReplay={() => setSession((current) => current + 1)}
        onRemix={() => {
          generationController.current?.abort();
          generationController.current = null;
          setManifest(null);
          setPreview(null);
          setMetadata(null);
          setEnrichmentManifest(null);
          setShowcaseId(null);
        }}
        onNewDream={() => {
          generationController.current?.abort();
          generationController.current = null;
          setDreamText("");
          setManifest(null);
          setPreview(null);
          setMetadata(null);
          setEnrichmentManifest(null);
          setShowcaseId(null);
        }}
      />
    );
  }

  if (materialization) {
    return (
      <main className="app-shell">
        <MaterializationOverlay
          step={materialization}
          onCancel={() => {
            generationController.current?.abort();
            generationController.current = null;
            setMaterialization(null);
          }}
        />
      </main>
    );
  }

  if (pendingFragment) {
    return (
      <main className="app-shell">
        <FragmentNotice
          issueCode={pendingFragment.metadata.fallbackReason ?? null}
          onEnterFragment={() => {
            setManifest(pendingFragment.manifest);
            setPreview(pendingFragment.preview);
            setMetadata(pendingFragment.metadata);
            setShowcaseId(null);
            setPendingFragment(null);
            setSession((current) => current + 1);
          }}
          onTryAgain={() => {
            setPendingFragment(null);
            void enterDream();
          }}
          onReturn={() => setPendingFragment(null)}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="DreamCraft home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          DreamCraft
        </a>
        <span className="build-chip">Playable dream compiler</span>
      </header>

      <div className="hero-grid" id="top">
        <section className="dream-panel" aria-labelledby="hero-title">
          <p className="eyebrow">A safe compiler for impossible places</p>
          <h1 id="hero-title">
            Describe a dream.
            <span> Step inside it.</span>
          </h1>
          <p className="lede">
            DreamCraft turns remembered details into a bounded first-person voxel
            fragment with movement, block editing, a procedural guide, dialogue,
            an objective, and an ending through a server-only generator with a
            deterministic local fallback.
          </p>
          <DreamInputForm
            value={dreamText}
            intensity={intensity}
            issue={issue}
            samples={DREAM_LIBRARY_SHOWCASE_CARDS.map(({ id, label, prompt, summary }) => ({
              id,
              label,
              text: prompt,
              description: summary,
            }))}
            onSampleSelect={(sample) => {
              void enterShowcase(sample.id);
            }}
            onValueChange={setDreamText}
            onIntensityChange={setIntensity}
            onSubmit={() => {
              void enterDream();
            }}
          />
        </section>

        <aside className="world-panel world-promise" aria-label="Current playable promise">
          <div className="promise-orbit" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">A different rulebook for every memory</p>
          <h2>Your details shape the terrain, movement, guide, objective, and ending.</h2>
          <p>
            Explore on desktop or touch controls, follow the objective in the
            world, and finish a short playable arc. If generation is unavailable,
            a deterministic local fragment remains ready.
          </p>
          <dl>
            <div><dt>World</dt><dd>Bounded</dd></div>
            <div><dt>Controls</dt><dd>Desktop + touch</dd></div>
            <div><dt>Fallback</dt><dd>Always local</dd></div>
          </dl>
        </aside>
      </div>

      <footer>
        <span>Deterministic by seed</span>
        <span>Declarative data only</span>
        <span>No account required</span>
      </footer>
    </main>
  );
}
