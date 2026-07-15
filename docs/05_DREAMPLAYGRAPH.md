# DreamPlayGraph

## Purpose

DreamPlayGraph is a safe composable story/gameplay language. It lets GPT-5.6 design new short experiences without inventing executable game code or selecting from a tiny fixed `gameMode` enum.

The runtime executes trusted verbs, variables, conditions, effects, beats, and endings.

## Top-level shape

```ts
interface DreamPlayGraph {
  experienceName: string;
  playerFantasy: string;
  playerRole: string;
  experienceTags: ExperienceArchetype[];
  availableVerbs: PlayerVerbSpec[];
  variables: GameVariableSpec[];
  beats: StoryBeatSpec[];
  endings: EndingSpec[];
  failurePolicy: "none" | "retry_current_beat" | "soft_reset" | "alternate_ending";
}
```

## Archetype tags

Tags describe the experience for analytics/fallback/tuning but do not implement it.

```ts
type ExperienceArchetype =
  | "adventure"
  | "pursuit"
  | "survival"
  | "mystery"
  | "social"
  | "ritual"
  | "celebration"
  | "reunion"
  | "transformation"
  | "exploration"
  | "performance"
  | "creation";
```

## Player verbs

```ts
type PlayerVerb =
  | "interact"
  | "talk"
  | "choose"
  | "collect"
  | "carry"
  | "deliver"
  | "place"
  | "activate"
  | "repair"
  | "assemble"
  | "follow"
  | "escort"
  | "hide"
  | "evade"
  | "chase"
  | "race"
  | "fly"
  | "dash"
  | "throw"
  | "perform"
  | "emote"
  | "observe";

interface PlayerVerbSpec {
  mechanic: PlayerVerb;
  label: string;
  targetTags: string[];
}
```

The engine supplies mechanics. The model supplies contextual language and target tags.

## Variables

```ts
interface GameVariableSpec {
  id: string;
  displayName?: string;
  type: "boolean" | "counter" | "meter";
  initialValue: number | boolean;
  minimum?: number;
  maximum?: number;
  showInHud: boolean;
}
```

Examples:

- Family gathered: 0/4
- Dream stability: 72%
- Fear: 35%
- Stars collected: 4/7
- Guardian trust: 2/3

## Story beats

```ts
interface StoryBeatSpec {
  id: string;
  title: string;
  objectiveText: string;
  startsWhen: GameCondition;
  completesWhen: GameCondition;
  onStart: GameEffect[];
  onProgress: GameEffect[];
  onComplete: GameEffect[];
  optional: boolean;
}
```

Beats form an acyclic progression for v1. Branching endings are allowed; arbitrary graph loops are not required.

## Conditions

```ts
type GameCondition =
  | { kind: "always" }
  | { kind: "flag"; id: string; equals: boolean }
  | { kind: "counter"; id: string; operator: ">=" | "==" | "<="; value: number }
  | { kind: "meter"; id: string; operator: ">=" | "==" | "<="; value: number }
  | { kind: "interacted"; targetId: string }
  | { kind: "dialogue_completed"; dialogueId: string }
  | { kind: "response_chosen"; dialogueId: string; responseId: string }
  | { kind: "item_collected"; itemId: string; count: number }
  | { kind: "item_delivered"; itemId: string; targetId: string }
  | { kind: "object_placed"; itemId: string; zoneId: string }
  | { kind: "zone_entered"; zoneId: string }
  | { kind: "entity_state"; entityId: string; state: string }
  | { kind: "timer_elapsed"; timerId: string; seconds: number }
  | { kind: "all"; conditions: GameCondition[] }
  | { kind: "any"; conditions: GameCondition[] };
```

Nesting depth and child counts are bounded.

## Effects

```ts
type GameEffect =
  | { kind: "set_flag"; id: string; value: boolean }
  | { kind: "change_counter"; id: string; amount: number }
  | { kind: "change_meter"; id: string; amount: number }
  | { kind: "show_message"; text: string }
  | { kind: "start_dialogue"; dialogueId: string }
  | { kind: "spawn_entity"; entityId: string; position: Vec3 }
  | { kind: "move_entity"; entityId: string; destination: Vec3 }
  | { kind: "set_entity_state"; entityId: string; state: string }
  | { kind: "transform_structure"; structureId: string; state: string }
  | { kind: "change_atmosphere"; patchId: string; durationMs: number }
  | { kind: "apply_physics_transition"; transitionId: string }
  | { kind: "play_effect"; effectId: string; targetId?: string }
  | { kind: "play_audio_cue"; cueId: string }
  | { kind: "unlock_interaction"; interactionId: string }
  | { kind: "give_item"; itemId: string; count: number }
  | { kind: "remove_item"; itemId: string; count: number }
  | { kind: "complete_experience"; endingId: string };
```

Every referenced object is validated. Text is bounded plain text.

## Endings

```ts
interface EndingSpec {
  id: string;
  title: string;
  narration: string;
  condition: GameCondition;
  effects: GameEffect[];
}
```

At least one ending must be reachable. The sanitizer may add a safe default ending after the final required beat.

## Dialogue integration

Dialogue response effects can update variables and select branches. Dialogue remains pre-generated; no model call occurs during play.

## Example: lottery-family celebration

```text
Beat 1: Find and verify the impossible ticket
Beat 2: Share the news with four family members
Beat 3: Choose symbolic gifts/wishes
Beat 4: Carry/place celebration objects and gather everyone
Beat 5: Activate the final firework
Ending: world becomes gold, confetti rises, chosen gifts appear as landmarks
```

Mechanics used:

- Interact
- Talk/choose
- Follow/escort
- Carry/place
- Activate
- Counters/flags
- Atmosphere/physics transitions
- Complete experience

No enemy or failure condition is required.

## Example: nightmare hallway

```text
Beat 1: Find a light source
Beat 2: Observe repeated room and choose which detail changed
Beat 3: Evade shadow while reaching the remembered door
Beat 4: Speak the chosen memory aloud through dialogue choice
Ending: hallway folds into daylight or loops into alternate ending
```

## Compiler checks

- Unique variable/beat/ending IDs
- No missing references
- Bounded condition depth
- Required beats progress in a valid order
- At least one reachable ending
- Required objects/entities exist and can spawn
- Objective text is non-empty
- No impossible item counts
- No timer longer than the intended experience
- No effect creates unbounded entity/structure loops

## MVP limits

- 5 required beats
- 2 optional beats
- 2 endings
- 12 variables
- 16 verbs
- 8 dialogue nodes per dialogue
- 4 choices per node
- 24 effects per beat total
- Condition nesting depth 3

## Failure philosophy

For most dreams, prefer soft recovery over a hard game-over:

- Respawn nearby
- Retry current beat
- Reduce threat intensity
- Offer alternate ending
- Reveal objective hint after inactivity

Nightmares may create tension, but the judged experience must remain finishable.
