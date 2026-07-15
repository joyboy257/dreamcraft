# EntityKit — Procedural Character Grammar

## Goal

Dream entities must be recognizable to a human at gameplay distance without requiring downloaded models or fixed thematic assets.

EntityKit provides a semantic grammar:

```text
Body plan
+ proportions/posture
+ named procedural features
+ material language
+ face/focal point
+ articulated animation
+ dream-specific accessory
```

It is not a library of finished gummy bears, owls, robots, or family members.

## Entity visual specification

```ts
interface EntityVisualSpec {
  bodyPlan: BodyPlan;
  scale: number;
  proportions: EntityProportions;
  palette: EntityPalette;
  materials: MaterialSlotSpec[];
  features: EntityFeatureSpec[];
  face?: FaceSpec;
  animationStyle: AnimationStyleSpec;
  recognitionFeatures: string[];
}
```

## MVP body plans

```ts
type BodyPlan =
  | "humanoid"
  | "small_humanoid"
  | "quadruped"
  | "bear"
  | "bird"
  | "fish"
  | "serpent"
  | "blob"
  | "floating_object"
  | "plant_creature";
```

Each body plan defines:

- Named joints/pivots
- Default proportions
- Ground/contact points
- Legal attachment slots
- Basic collider
- Supported locomotion and emotion animations

Use hierarchical `Object3D` pivots for the MVP. Skinned meshes are optional later; an articulated puppet is sufficient and easier to generate procedurally.

## Geometry vocabulary

Trusted procedural builders may use:

- Box and rounded box
- Sphere/ellipsoid
- Capsule
- Cylinder/cone
- Torus/ring
- Lathe profile
- Tube along bounded control points
- Extruded bounded 2D outline
- Simple metaball/blob only if performance permits

Every geometry has segment caps and dimensions are clamped.

## Feature library

```ts
type EntityFeatureSpec =
  | EarFeature
  | HornFeature
  | AntennaFeature
  | SnoutFeature
  | BeakFeature
  | WingFeature
  | TailFeature
  | FinFeature
  | PawFeature
  | ClawFeature
  | HairFeature
  | CrownFeature
  | HatFeature
  | BackpackFeature
  | NecklaceFeature
  | HandleFeature
  | SpoutFeature
  | ClockFaceFeature
  | CustomAttachmentFeature;
```

A `CustomAttachmentFeature` still uses the bounded geometry vocabulary, a named joint, a transform, and a material slot. It never contains code.

## Proportions and silhouette

```ts
interface EntityProportions {
  headScale: Vec3;
  torsoScale: Vec3;
  limbLength: number;
  limbThickness: number;
  stanceWidth: number;
  posture: "upright" | "hunched" | "proud" | "sleepy" | "floating";
}
```

Recognition should survive silhouette rendering. A bear needs visible ears, a muzzle/belly, and short limbs; a bird needs wings/beak/tail; a teapot needs a body/handle/spout/lid.

## Materials

```ts
type MaterialPreset =
  | "matte"
  | "toon"
  | "metal"
  | "glass"
  | "jelly"
  | "cloud"
  | "paper"
  | "stone"
  | "emissive"
  | "shadow"
  | "hologram";
```

```ts
interface MaterialSlotSpec {
  id: string;
  preset: MaterialPreset;
  color: number;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive: number;
  pattern?: {
    kind: "none" | "stripes" | "spots" | "gradient" | "checker" | "stars" | "scanlines";
    color: number;
    scale: number;
  };
}
```

Reserve expensive transparent/transmissive materials for hero entities. Background entities should use simpler materials or instancing.

## Face and expression

```ts
interface FaceSpec {
  eyeStyle: "round" | "sleepy" | "glowing" | "button" | "screen" | "single_eye" | "many_eyes";
  eyeScale: number;
  eyeSpacing: number;
  mouthStyle: "smile" | "frown" | "beak" | "fangs" | "speaker" | "none";
  defaultExpression: "friendly" | "curious" | "afraid" | "angry" | "mysterious" | "sleeping";
}
```

Expressions can map to entity states using trusted transforms/material changes.

## Animation vocabulary

```ts
interface AnimationStyleSpec {
  idle: "breathe" | "bob" | "wobble" | "look_around" | "sleep" | "float";
  locomotion: "walk" | "waddle" | "hop" | "slither" | "fly" | "roll" | "swim";
  emotion: "wave" | "dance" | "shiver" | "stomp" | "cheer" | "bow";
  speedMultiplier: number;
  exaggeration: number;
}
```

Animation functions target named joints and use deterministic phase offsets. Background instances can share geometry/material and use lightweight transforms.

## Behavior vocabulary

Visuals and behavior are separate.

```ts
type EntityBehaviorSpec =
  | { kind: "idle" }
  | { kind: "idle_bob"; amplitude: number; speed: number }
  | { kind: "wander"; radius: number; speed: number }
  | { kind: "patrol"; points: Vec3[]; speed: number }
  | { kind: "guard"; targetId: string; warningRadius: number; chaseRadius: number; speed: number }
  | { kind: "orbit"; targetId: string; radius: number; speed: number }
  | { kind: "flee"; triggerRadius: number; speed: number }
  | { kind: "follow"; target: "player" | string; distance: number; speed: number }
  | { kind: "escort"; destinationZoneId: string; speed: number }
  | { kind: "perform"; animation: string; triggerFlag: string };
```

More complex behavior uses a bounded state machine built from these primitives, not generated update code.

## Spawn recipes

```ts
type EntitySpawnSpec =
  | { kind: "fixed"; positions: Vec3[] }
  | { kind: "surface_scatter"; center: Vec3; radius: number; count: number; minDistance: number }
  | { kind: "around_structure"; structureId: string; count: number; radius: number }
  | { kind: "in_zone"; zoneId: string; count: number; minDistance: number };
```

The shell resolves safe ground/air positions. It does not evaluate a generated spawn predicate for every block.

## Recognizability contract

A hero entity must satisfy:

- Recognizable body plan
- Distinct silhouette
- At least three iconic features
- Contrasting face or focal point
- Dream-specific material or accessory
- Characteristic animation
- Appropriate scale relative to player
- Visible staging near the intended encounter

```ts
interface EntityReadabilityReport {
  hasRecognizableBodyPlan: boolean;
  iconicFeatureCount: number;
  hasContrastingFocalPoint: boolean;
  hasDistinctSilhouette: boolean;
  hasSemanticAnimation: boolean;
  visibleAtIntendedDistance: boolean;
  scaleRelativeToPlayer: number;
  passed: boolean;
}
```

## Examples

### Giant gummy guardian

- Body plan: bear
- Scale: 3.5× player
- Silhouette: round ears, belly, short limbs, muzzle
- Material: translucent red jelly
- Accessory: golden key necklace
- Face: glowing eyes
- Animation: heavy waddle + belly wobble + stomp/cheer states

### Flying teapot

- Body plan: floating object
- Features: lathed body, tube handle, curved spout, lid, small wings, face
- Material: porcelain/toon with star pattern
- Animation: hover, tilt-turn, happy steam puffs

### Family celebration NPC

- Body plan: humanoid
- Differentiation: body proportions, palette, hair/hat/accessory, expression
- Behavior: talk, follow, gather, cheer/dance
- Important: do not claim photorealistic identity or recreate a real person from text alone

## Budgets

Suggested initial limits:

- Hero definitions: 3
- Total entity definitions: 6
- Active instances: 12
- Hero parts/features: 32
- Background parts: 12
- Tube control points: 8
- Lathe profile points: 12
- Extruded outline points: 12
- Geometry segments capped by quality tier

## Disposal

EntityKit owns disposal or reference counting for generated geometry/materials. Shared cached geometry must not be disposed while instances remain. Dream reload must return memory close to baseline.
