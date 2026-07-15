# Demo and Submission Package

## Submission-critical facts to preserve

The final package needs:

- Working project
- Selected category
- Project description
- Public demo video under three minutes
- English voiceover explaining the product, Codex use, and GPT-5.6 use
- Repository link with setup instructions and license, or correctly shared private repository
- `/feedback` Codex session ID from the primary build session

The owner should verify final rules at submission time.

## Category

Recommended: **Apps for Your Life**.

Position DreamCraft as creative expression and accessible game creation. Avoid unsupported therapy/medical claims.

## Product statement

> DreamCraft 3D turns a dream described in plain English into an explorable voxel game in seconds. GPT-5.6 compiles the dream into a safe procedural world specification—terrain, entities, physics, atmosphere, dialogue, and story—while a browser-native shell materializes it into a playable experience.

## Technical statement

> Codex built and tested the full product through a Sol-led multi-agent workflow. At runtime, GPT-5.6 generates DreamSpec, a bounded declarative language. Trusted TypeScript compilers turn DreamSpec into deterministic terrain, procedural EntityKit characters, Dream Physics, and a DreamPlayGraph. No generated JavaScript is executed.

## Demo structure — target 2:35 to 2:50

### 0:00–0:15 — Hook

Show input and type a vivid live dream:

> I was a tiny robot in a candy-cane forest where licorice trees whispered and a giant gummy bear guarded a singing treasure chest.

Submit.

### 0:15–0:35 — Materialization

Narrate the pipeline while real status phases appear.

### 0:35–1:20 — Play

- Enter world
- Show candy/licorice environment
- Show unusual physics
- Approach readable gummy guardian
- Trigger dialogue/choice
- Complete action
- Open chest
- Show world transformation and ending

### 1:20–1:45 — Prove variability

Show a sharply contrasting cached or live world, such as:

- Flooded repeated-school nightmare
- Lottery family celebration
- Flying city with sky whales

### 1:45–2:20 — Explain implementation

Show a compact visual of:

```text
Dream → GPT-5.6 DreamSpec → validators/compilers → Three.js shell
```

Mention:

- Sol-led Codex build workflow
- Terra/Luna workers
- Structured DreamSpec
- Physics DSL
- EntityKit
- DreamPlayGraph
- Local fallback

### 2:20–2:45 — Impact and close

> Most people can imagine a world but cannot build a game. DreamCraft collapses that gap: describe a memory, fear, celebration, or impossible place—and step inside it.

End on project name and public URL.

## Backup demo path

Prepare:

1. Live generation path
2. Cached version of the same prompt
3. Contrasting cached dream
4. API-disabled fragment demonstration
5. Local recording of the complete judged flow

The application should use live generation first but must never depend on perfect network conditions to remain demonstrable.

## Recording checklist

- 16:9 resolution
- Cursor and text legible
- No secrets, API dashboards, emails, or personal notifications visible
- Browser console closed unless intentionally shown
- Voiceover in English
- Product sound lower than narration
- Real interaction, not only slides
- Under three minutes after upload processing

## README sections

- What DreamCraft is
- Live demo
- Demo video
- Architecture
- Why DreamSpec instead of generated JS
- Codex build workflow
- GPT-5.6 runtime flow
- Local setup
- Environment variables
- Sample prompts
- Testing/evals
- Fallback behavior
- Security/privacy
- Performance limits
- Deployment
- License/notices

## Judge test guide

Provide a five-step path:

1. Open URL
2. Select a sample or type a dream
3. Click Enter Dream
4. Use exact controls
5. Follow the HUD objective

Include expected time and fallback messaging.

## Evidence to capture during development

- Sol root orchestration screenshot
- Subagent activity screenshot
- First vertical slice
- First live generated world
- Eval/automated test output
- Performance metrics
- Offline fallback
- Final public deployment

## Submission placeholders

- Public app URL: `TBD`
- Repository URL: `TBD`
- Public video URL: `TBD`
- `/feedback` session ID: `TBD`
- Team members: `TBD`
- License: `TBD — MIT recommended`
