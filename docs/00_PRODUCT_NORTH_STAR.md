# Product North Star

## One-line promise

Describe a dream, and seconds later step into a playable 3D world that unmistakably feels like that dream.

## User story

A user remembers a strange dream but cannot draw it, model it, or build a game. They type what happened in ordinary language. DreamCraft interprets the dream's setting, scale, emotional logic, characters, strange rules, and unresolved moment, then materializes a short first-person voxel experience.

The product is not a generic game generator with dream-themed labels. It is an **interactive dream compiler**.

## Judge moment

The strongest demonstration is:

1. A judge supplies a novel dream.
2. The app visibly interprets and materializes it.
3. The camera enters a world containing three unmistakable dream details.
4. A procedural creature or character behaves meaningfully.
5. The judge performs a dream-specific action.
6. The world transforms and resolves with a short ending.

## Experience timeline

| Time | Experience | Guarantee |
|---:|---|---|
| 0–3s | User submits dream | One obvious input and action |
| 3–10s | Materialization sequence | Shell initializes while model response validates |
| 8–15s | Camera enters spawn area | Central chunks ready; fallback if required |
| 15–30s | User recognizes the dream | Three semantic anchors near spawn |
| 30–60s | Interaction/story develops | Hero entity or landmark reacts |
| 60–90s | Climax and ending | Completable DreamPlayGraph and world transformation |

## Product invariants

### Recognizable

Every generated dream identifies at least three semantic anchors:

- Environment/terrain anchor
- Creature, person, or moving-object anchor
- Landmark, event, mystery, or objective anchor

All must appear within approximately 28 blocks of spawn unless a deliberate reveal requires a clearly readable route.

### Playable

Every dream guarantees:

- Safe spawn and headroom
- Traversable ground or intentional flight/swim controller
- Clear controls
- Visible objective
- Reachable required objects/entities
- A completion path requiring no further model call

### Dream-specific

The game should express more than nouns. It should derive:

- Player role and scale
- Emotional tone and arc
- Physics motifs
- Relationships
- Repetition/transformation logic
- A meaningful action and payoff

### Bounded

Every world has strict limits on:

- Radius and height
- Blocks and terrain operations
- Structures
- Entity definitions and instances
- Geometry parts
- Particles
- Dialogue nodes and string length
- Story beats
- Physics fields and dynamic bodies

### Resilient

Failure produces a stable dream fragment, not a broken page.

## What “fully playable” means for this hackathon

A complete short interactive experience, not a full commercial game:

- Navigation and interaction
- One primary player fantasy
- One small arc
- One or more choices/actions
- One climax
- One ending
- Replay/remix

## Emotional range

DreamCraft must support:

- Wonder
- Fear without graphic gore
- Absurdity
- Nostalgia
- Loss/search
- Celebration
- Reunion
- Flight/freedom
- Transformation
- Social rituals
- Performance
- Quiet exploration

A peaceful dream does not need an enemy. A lottery celebration can be built from sharing news, gathering family, choosing gifts, preparing a ritual, and launching a surreal finale.

## Product success metrics

### Reliability

- 100% of requests result in a playable generated world or fallback fragment
- Zero uncaught errors in the judged flow
- Safe recovery without page reload

### Latency

- Target time to validated core: under 12 seconds at p95
- Target time to playable central area: under 15 seconds at p95

### Quality

- Three semantic anchors near spawn
- One readable hero entity
- One objective and ending
- One world transformation
- Human semantic-fidelity score tracked across eval corpus

### Performance

- Desktop approximately 60 FPS on the demo machine
- Mobile reduced profile at least 30 FPS
- No runaway memory trend during a standard session

## Differentiation

DreamCraft is not:

- Text adventure with a 3D backdrop
- Fixed Minecraft map reskin
- Model-generated game source executed in the browser
- Image-to-panorama viewer
- Chatbot NPC demo

It is:

> A safe natural-language compiler from a subjective memory into a deterministic interactive world specification.
