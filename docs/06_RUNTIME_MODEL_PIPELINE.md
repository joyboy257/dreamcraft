# Runtime Model Pipeline

## Distinguish two model workflows

### Build-time Codex workflow

- Sol root thread: architecture, orchestration, integration, review, release
- Terra workers: engine, compiler, gameplay, QA
- Luna workers: exploration, UI, bounded transformation, release writing

### Product runtime workflow

The deployed app uses GPT-5.6 to turn a dream into DreamSpec. It does not launch a software-engineering Codex task per user dream.

## Strategy interface

```ts
type GenerationStrategy = "mock-local" | "single-sol" | "director-parallel";

interface GenerationProvider {
  generate(request: DreamGenerationRequest, signal: AbortSignal): Promise<DreamGenerationResult>;
}
```

## Strategy A — `mock-local`

Purpose:

- Build before an API key exists
- Deterministic tests
- Offline demo recovery
- Fast UI iteration

Input is mapped to a stable sample or simple local theme extractor. The result must pass exactly the same validation and compilation path as a live model response.

## Strategy B — `single-sol`

Initial production default.

One structured response contains:

```ts
interface SolDreamResponse {
  blueprint: DreamBlueprint;
  core: DreamSpecV1;
}
```

The prompt requires the model to reason about player fantasy, emotional arc, semantic anchors, play arc, and art/physics motifs before expressing the concrete spec.

Advantages:

- One network/model round trip
- Highest coherence between design and implementation
- Simplest failure handling
- Best candidate for sub-15-second path

## Strategy C — `director-parallel`

Experimental pipeline:

```text
Dream
→ Sol director blueprint
   ├── Terra core compiler
   └── Luna enrichment composer
```

Terra returns a complete playable core. Luna returns only optional content:

- Dialogue polish
- Journal/ending copy
- Ambient barks
- Loading messages
- Optional decorations
- Audio/particle direction

The application can enter once Terra's core validates. Luna's patch applies at a safe update boundary or is discarded.

## Promotion criteria

Do not prefer architectural sophistication over product latency.

Benchmark at least 30 varied dreams. Promote `director-parallel` only if:

- Human semantic/game-design score improves by at least a material threshold such as 15%
- Schema/playability success is no worse
- p95 time to playable core remains under the release target
- Added cost is acceptable for the demo and stated budget

Otherwise retain `single-sol` and keep the experiment documented.

## System prompt goals

The runtime prompt must instruct the model to:

1. Return only schema-valid data.
2. Preserve the user's most important dream details.
3. Place three semantic anchors near spawn.
4. Select a player role/fantasy and emotional arc.
5. Use only supported DSL vocabulary.
6. Produce a safe spawn and reachable completion path.
7. Keep the experience small, coherent, and 60–90 seconds long.
8. Support peaceful/social/ritual experiences, not only challenge genres.
9. Stay within hard budgets.
10. Avoid remote assets, code, HTML, URLs, and unsupported mechanics.

## Suggested single-Sol prompt skeleton

```text
You are the DreamCraft Director-Compiler.
Compile the user's dream into DreamSpec v1 using the supplied strict schema.
Return only the structured object.

First preserve the dream's emotional and semantic identity in the blueprint.
Then encode a bounded playable world whose first camera view proves it came
from this exact dream.

Requirements:
- three semantic anchors within 28 blocks of safe spawn
- one readable hero entity
- one visible objective
- one meaningful action and reaction
- one 60–90 second arc and reachable ending
- physics/atmosphere that reinforce the dream
- no code, URLs, assets, HTML, shaders, or unsupported enum values
- stay within all schema budgets
```

The actual implementation should keep the long stable schema/instruction prefix identical between requests to maximize cache usefulness.

## Request settings

Start with measured defaults rather than hard-coding assumptions:

- Model alias from environment
- Low or medium reasoning based on latency tests
- Low verbosity
- Structured output format
- Output token ceiling appropriate to the compact schema
- Abort timeout
- `store: false` unless a deliberate data-retention decision says otherwise

Do not expose model controls in the judged UI.

## Server flow

```text
Validate request body
→ normalize/cap dream text
→ choose strategy from allowlist
→ create AbortController timeout
→ call OpenAI
→ parse structured response
→ server-side schema validation
→ return normalized DreamSpec + metadata
```

## Client flow

```text
Submit dream
→ initialize shell and materialization UI
→ request generation
→ validate again client-side
→ sanitize/repair
→ compile core
→ generate spawn chunks
→ enter world
→ apply enrichment if valid
```

The client validates again because cache/storage/network boundaries remain untrusted.

## Retry/fallback

Maximum one bounded retry, and only when likely useful:

- Transient server/network failure
- Incomplete structured output
- Retry can use a shorter prompt or cheaper/faster model

Do not retry deterministic validation failures repeatedly.

When the deadline expires:

```text
“The dream resisted interpretation. A stable fragment survived.”
```

Then enter local fallback immediately.

## Enrichment patch restrictions

A patch may add or replace only explicitly patchable fields:

- Dialogue text/nodes within bounds
- Journal copy
- Optional decorations within budget
- Ambient barks
- Atmosphere/audio presets
- Ending narration

A patch may not:

- Change world dimensions
- Remove required objective objects
- Replace player spawn
- Add executable behavior
- Exceed global budgets
- Mutate active entity IDs incompatibly

## Metadata and diagnostics

Record safe operational metrics:

```ts
interface GenerationMetadata {
  strategy: GenerationStrategy;
  modelAliases: string[];
  requestDurationMs: number;
  validationDurationMs: number;
  compileDurationMs?: number;
  fallbackUsed: boolean;
  repairCount: number;
  requestId: string;
}
```

Do not log API keys. Avoid storing full dream text in production logs by default.

## Runtime eval rubric

For each prompt, score:

- Anchor recall
- Environmental recognizability
- Entity recognizability
- Emotional fidelity
- Physics relevance
- Story coherence
- Objective clarity
- Reachability
- Ending payoff
- Latency
- Manifest validity/repair count

Use both automated assertions and a compact human review form.
