import * as THREE from "three";

import type { DreamSpecV1 } from "../dream/schema";

export type EntityVisualSpec = DreamSpecV1["entities"][number]["visual"];
export type EntityBodyPlan = EntityVisualSpec["bodyPlan"];
export type EntityFeatureSpec = EntityVisualSpec["features"][number];
export type EntityMaterialSpec = EntityVisualSpec["materials"][number];
export type EntityAnimationStyle = EntityVisualSpec["animationStyle"];
export type EntityRole = DreamSpecV1["entities"][number]["role"];
export type EntityAnimationState = "idle" | "locomotion" | "emotion";

export interface EntityReadabilityReport {
  readonly hasRecognizableBodyPlan: boolean;
  readonly iconicFeatureCount: number;
  readonly hasContrastingFocalPoint: boolean;
  readonly hasDistinctSilhouette: boolean;
  readonly hasSemanticAnimation: boolean;
  readonly visibleAtIntendedDistance: boolean;
  readonly scaleRelativeToPlayer: number;
  readonly passed: boolean;
}

export interface ProceduralEntityOptions {
  readonly id: string;
  readonly visual: EntityVisualSpec;
  readonly role?: EntityRole;
  readonly seed?: number;
  readonly intendedDistance?: number;
}

export interface ProceduralEntity {
  readonly id: string;
  readonly root: THREE.Group;
  readonly partCount: number;
  readonly animationState: EntityAnimationState;
  setAnimationState(state: EntityAnimationState): void;
  update(context: EntityUpdateContext): void;
  getReadabilityReport(): EntityReadabilityReport;
  dispose(): void;
}

export interface EntityUpdateContext {
  readonly elapsedSeconds: number;
  readonly deltaSeconds: number;
}

export interface BodyPlanDefinition {
  readonly joints: readonly string[];
  readonly contactPoints: readonly string[];
  readonly attachmentSlots: readonly string[];
  readonly collider: {
    readonly kind: "box" | "capsule" | "sphere";
    readonly size: readonly [number, number, number];
  };
  readonly supportedLocomotion: readonly EntityAnimationStyle["locomotion"][];
  readonly supportedEmotion: readonly EntityAnimationStyle["emotion"][];
}

export const MVP_BODY_PLANS = [
  "humanoid",
  "small_humanoid",
  "humanoid_adult",
  "humanoid_child",
  "humanoid_elder",
  "quadruped",
  "dog",
  "bear",
  "bird",
  "moth",
  "fish",
  "serpent",
  "blob",
  "floating_object",
  "plant_creature",
] as const satisfies readonly EntityBodyPlan[];

export const MVP_FEATURE_FAMILIES = [
  "ear", "horn", "antenna", "snout", "beak", "wing", "tail", "fin",
  "paw", "claw", "hair", "crown", "hat", "backpack", "necklace",
  "handle", "spout", "clock_face",
] as const satisfies readonly EntityFeatureSpec["kind"][];

export const MVP_MATERIAL_PRESETS = [
  "matte", "toon", "metal", "glass", "jelly", "cloud", "paper", "stone",
  "emissive", "shadow", "hologram",
] as const satisfies readonly EntityMaterialSpec["preset"][];

export const MVP_FACE_STYLES = {
  eyes: ["round", "sleepy", "glowing", "button", "screen", "single_eye", "many_eyes"],
  mouths: ["smile", "frown", "beak", "fangs", "speaker", "none"],
  expressions: ["friendly", "curious", "afraid", "angry", "mysterious", "sleeping"],
} as const;

export const MVP_ANIMATION_VOCABULARY = {
  idle: ["breathe", "bob", "wobble", "look_around", "sleep", "float"],
  locomotion: ["walk", "waddle", "hop", "slither", "fly", "roll", "swim"],
  emotion: ["wave", "dance", "shiver", "stomp", "cheer", "bow"],
} as const satisfies {
  readonly idle: readonly EntityAnimationStyle["idle"][];
  readonly locomotion: readonly EntityAnimationStyle["locomotion"][];
  readonly emotion: readonly EntityAnimationStyle["emotion"][];
};

const STANDARD_EMOTIONS = ["wave", "dance", "shiver", "stomp", "cheer", "bow"] as const;

const BODY_PLAN_DEFINITIONS: Record<EntityBodyPlan, BodyPlanDefinition> = {
  humanoid: {
    joints: ["body", "head", "arm-left", "arm-right", "leg-left", "leg-right"],
    contactPoints: ["leg-left", "leg-right"],
    attachmentSlots: ["head", "body", "arm-left", "arm-right"],
    collider: { kind: "capsule", size: [0.7, 1.8, 0.7] },
    supportedLocomotion: ["walk", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  small_humanoid: {
    joints: ["body", "head", "arm-left", "arm-right", "leg-left", "leg-right"],
    contactPoints: ["leg-left", "leg-right"],
    attachmentSlots: ["head", "body", "arm-left", "arm-right"],
    collider: { kind: "capsule", size: [0.55, 1.25, 0.55] },
    supportedLocomotion: ["walk", "waddle", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  humanoid_adult: {
    joints: ["body", "head", "arm-left", "arm-right", "leg-left", "leg-right"],
    contactPoints: ["leg-left", "leg-right"],
    attachmentSlots: ["head", "body", "arm-left", "arm-right"],
    collider: { kind: "capsule", size: [0.78, 2.05, 0.72] },
    supportedLocomotion: ["walk", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  humanoid_child: {
    joints: ["body", "head", "arm-left", "arm-right", "leg-left", "leg-right"],
    contactPoints: ["leg-left", "leg-right"],
    attachmentSlots: ["head", "body", "arm-left", "arm-right"],
    collider: { kind: "capsule", size: [0.62, 1.45, 0.62] },
    supportedLocomotion: ["walk", "waddle", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  humanoid_elder: {
    joints: ["body", "head", "arm-left", "arm-right", "leg-left", "leg-right"],
    contactPoints: ["leg-left", "leg-right"],
    attachmentSlots: ["head", "body", "arm-left", "arm-right"],
    collider: { kind: "capsule", size: [0.82, 1.85, 0.78] },
    supportedLocomotion: ["walk", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  quadruped: {
    joints: ["body", "head", "leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right", "tail"],
    contactPoints: ["leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right"],
    attachmentSlots: ["head", "body", "tail"],
    collider: { kind: "box", size: [1.2, 0.9, 1.8] },
    supportedLocomotion: ["walk", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  dog: {
    joints: ["body", "head", "muzzle", "leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right", "tail"],
    contactPoints: ["leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right"],
    attachmentSlots: ["head", "muzzle", "body", "tail"],
    collider: { kind: "box", size: [1.6, 1.25, 2.5] },
    supportedLocomotion: ["walk", "waddle"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  bear: {
    joints: ["body", "head", "leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right"],
    contactPoints: ["leg-front-left", "leg-front-right", "leg-rear-left", "leg-rear-right"],
    attachmentSlots: ["head", "body"],
    collider: { kind: "capsule", size: [1.35, 1.7, 1.1] },
    supportedLocomotion: ["walk", "waddle"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  bird: {
    joints: ["body", "head", "wing-left", "wing-right", "tail"],
    contactPoints: ["body"],
    attachmentSlots: ["head", "body", "wing-left", "wing-right", "tail"],
    collider: { kind: "sphere", size: [0.8, 0.9, 0.8] },
    supportedLocomotion: ["fly", "hop", "waddle"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  moth: {
    joints: ["body", "head", "thorax", "abdomen", "wing-upper-left", "wing-upper-right", "wing-lower-left", "wing-lower-right", "antenna-left", "antenna-right"],
    contactPoints: ["body"],
    attachmentSlots: ["head", "thorax", "abdomen", "wing-upper-left", "wing-upper-right", "wing-lower-left", "wing-lower-right"],
    collider: { kind: "sphere", size: [2.3, 1.4, 0.8] },
    supportedLocomotion: ["fly"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  fish: {
    joints: ["body", "head", "fin-left", "fin-right", "tail"],
    contactPoints: ["body"],
    attachmentSlots: ["head", "body", "fin-left", "fin-right", "tail"],
    collider: { kind: "sphere", size: [0.8, 0.65, 1.5] },
    supportedLocomotion: ["swim"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  serpent: {
    joints: ["body", "head", "spine-1", "spine-2", "spine-3", "spine-4", "spine-5", "spine-6", "tail"],
    contactPoints: ["body", "spine-3", "tail"],
    attachmentSlots: ["head", "body", "tail"],
    collider: { kind: "capsule", size: [0.65, 0.65, 3.6] },
    supportedLocomotion: ["slither", "swim"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  blob: {
    joints: ["body", "head"],
    contactPoints: ["body"],
    attachmentSlots: ["head", "body"],
    collider: { kind: "sphere", size: [1, 0.85, 1] },
    supportedLocomotion: ["hop", "roll", "slither"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  floating_object: {
    joints: ["body", "head", "lid"],
    contactPoints: ["body"],
    attachmentSlots: ["head", "body", "lid"],
    collider: { kind: "sphere", size: [1.1, 0.9, 1.1] },
    supportedLocomotion: ["fly", "roll"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
  plant_creature: {
    joints: ["body", "head", "root-left", "root-right"],
    contactPoints: ["root-left", "root-right"],
    attachmentSlots: ["head", "body"],
    collider: { kind: "capsule", size: [0.8, 1.7, 0.8] },
    supportedLocomotion: ["walk", "hop"],
    supportedEmotion: STANDARD_EMOTIONS,
  },
};

export function getBodyPlanDefinition(bodyPlan: EntityBodyPlan): BodyPlanDefinition {
  return BODY_PLAN_DEFINITIONS[bodyPlan];
}

const HERO_PART_BUDGET = 32;
const BACKGROUND_PART_BUDGET = 12;
const MIN_SCALE = 0.35;
const MAX_SCALE = 4;

const BILATERAL_FEATURES = new Set([
  "ear",
  "horn",
  "antenna",
  "wing",
  "fin",
  "paw",
  "claw",
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : minimum;
}

function safeColor(value: number): number {
  return Math.floor(clamp(value, 0, 0xff_ffff));
}

function luminance(color: number): number {
  const safe = safeColor(color);
  const red = (safe >> 16) & 0xff;
  const green = (safe >> 8) & 0xff;
  const blue = safe & 0xff;
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
}

function phaseFromSeed(seed: number | undefined): number {
  const safeSeed = seed !== undefined && Number.isFinite(seed) ? seed >>> 0 : 0;
  return ((safeSeed % 65_521) / 65_521) * Math.PI * 2;
}

function isHero(role: EntityRole | undefined): boolean {
  return role === "hero" || role === "companion" || role === "threat";
}

interface MaterialResource {
  readonly material: THREE.Material;
  readonly texture?: THREE.Texture;
}

function patternTexture(
  pattern: NonNullable<EntityMaterialSpec["pattern"]> | undefined,
  baseColor: number,
): THREE.DataTexture | undefined {
  if (pattern === undefined || pattern.kind === "none") return undefined;
  const size = 8;
  const pixels = new Uint8Array(size * size * 4);
  const base = new THREE.Color(safeColor(baseColor));
  const accent = new THREE.Color(safeColor(pattern.color));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const star = (x === 2 && y >= 1 && y <= 3) || (y === 2 && x >= 1 && x <= 3) ||
        (x === 6 && y >= 5) || (y === 6 && x >= 5);
      const useAccent = pattern.kind === "stripes" ? x % 3 === 0
        : pattern.kind === "spots" ? (x - 2) ** 2 + (y - 2) ** 2 <= 2 || (x - 6) ** 2 + (y - 6) ** 2 <= 2
          : pattern.kind === "gradient" ? y >= size / 2
            : pattern.kind === "checker" ? (x + y) % 2 === 0
              : pattern.kind === "stars" ? star
                : pattern.kind === "scanlines" ? y % 2 === 0
                  : false;
      const color = useAccent ? accent : base;
      const index = (y * size + x) * 4;
      pixels[index] = Math.round(color.r * 255);
      pixels[index + 1] = Math.round(color.g * 255);
      pixels[index + 2] = Math.round(color.b * 255);
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = `entity-pattern-${pattern.kind}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(clamp(pattern.scale, 0.25, 8), clamp(pattern.scale, 0.25, 8));
  texture.needsUpdate = true;
  return texture;
}

function materialFromSpec(
  spec: EntityMaterialSpec,
  hero: boolean,
): MaterialResource {
  const color = safeColor(spec.color);
  const opacity = hero ? clamp(spec.opacity, 0.25, 1) : 1;
  const texture = patternTexture(spec.pattern, color);
  const common = {
    color: texture === undefined ? color : 0xff_ffff,
    opacity,
    transparent: opacity < 1,
    ...(texture === undefined ? {} : { map: texture }),
  };

  let material: THREE.Material;

  switch (spec.preset) {
    case "toon":
    case "paper":
      material = new THREE.MeshToonMaterial(common);
      break;
    case "glass":
      material = hero
        ? new THREE.MeshPhysicalMaterial({
            ...common,
            roughness: clamp(spec.roughness, 0, 1),
            metalness: 0,
            transmission: Math.min(0.7, 1 - opacity),
            thickness: 0.3,
          })
        : new THREE.MeshStandardMaterial({ ...common, roughness: 0.2 });
      break;
    case "jelly":
      material = hero
        ? new THREE.MeshPhysicalMaterial({
            ...common,
            roughness: Math.max(0.18, clamp(spec.roughness, 0, 1)),
            metalness: 0,
            transmission: Math.min(0.35, 1 - opacity),
            thickness: 0.45,
          })
        : new THREE.MeshStandardMaterial({ ...common, roughness: 0.35 });
      break;
    case "cloud":
      material = new THREE.MeshStandardMaterial({
        ...common,
        roughness: 1,
        metalness: 0,
      });
      break;
    case "stone":
      material = new THREE.MeshStandardMaterial({
        ...common,
        roughness: Math.max(0.78, spec.roughness),
        metalness: 0,
      });
      break;
    case "metal":
      material = new THREE.MeshStandardMaterial({
        ...common,
        roughness: clamp(spec.roughness, 0.08, 0.75),
        metalness: Math.max(0.65, spec.metalness),
      });
      break;
    case "emissive":
    case "hologram":
      material = new THREE.MeshStandardMaterial({
        ...common,
        emissive: safeColor(spec.emissive || color),
        emissiveIntensity: spec.preset === "hologram" ? 1.5 : 1,
        roughness: 0.3,
        metalness: 0,
      });
      break;
    case "shadow":
      material = new THREE.MeshBasicMaterial({ ...common });
      break;
    case "matte":
    default:
      material = new THREE.MeshStandardMaterial({
        ...common,
        roughness: clamp(spec.roughness, 0.25, 1),
        metalness: clamp(spec.metalness, 0, 0.4),
      });
      break;
  }
  return texture === undefined ? { material } : { material, texture };
}

interface BuildContext {
  readonly root: THREE.Group;
  readonly body: THREE.Group;
  readonly joints: Map<string, THREE.Group>;
  readonly geometries: Set<THREE.BufferGeometry>;
  readonly materials: Map<string, THREE.Material>;
  readonly allMaterials: Set<THREE.Material>;
  readonly textures: Set<THREE.Texture>;
  readonly budget: number;
  readonly primaryMaterial: THREE.Material;
  readonly accentMaterial: THREE.Material;
  partCount: number;
}

function makeJoint(
  context: BuildContext,
  name: string,
  parent: THREE.Object3D = context.body,
  position: readonly [number, number, number] = [0, 0, 0],
): THREE.Group {
  const joint = new THREE.Group();
  joint.name = `joint-${name}`;
  joint.position.set(...position);
  parent.add(joint);
  context.joints.set(name, joint);
  return joint;
}

function addMesh(
  context: BuildContext,
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  scale: readonly [number, number, number],
  position: readonly [number, number, number] = [0, 0, 0],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh | null {
  if (context.partCount >= context.budget) {
    geometry.dispose();
    return null;
  }
  context.geometries.add(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (name.startsWith("moth-wing")) material.side = THREE.DoubleSide;
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  context.partCount += 1;
  return mesh;
}

function sphere(): THREE.SphereGeometry {
  return new THREE.SphereGeometry(0.5, 12, 8);
}

function box(): THREE.BoxGeometry {
  return new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
}

function cone(): THREE.ConeGeometry {
  return new THREE.ConeGeometry(0.5, 1, 8);
}

function cylinder(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
}

function torus(): THREE.TorusGeometry {
  return new THREE.TorusGeometry(0.5, 0.12, 6, 12);
}

function wingGeometry(lower: boolean): THREE.BoxGeometry {
  return new THREE.BoxGeometry(lower ? 1.5 : 2.15, lower ? 0.72 : 1.2, 0.08);
}

function buildFamilyHumanoid(context: BuildContext, _visual: EntityVisualSpec, variant: "adult" | "child" | "elder"): void {
  const child = variant === "child";
  const elder = variant === "elder";
  const height = child ? 0.72 : elder ? 0.92 : 1.08;
  const shoulder = child ? 0.48 : elder ? 0.64 : 0.62;
  const limb = child ? 0.58 : elder ? 0.72 : 0.82;
  const legY = child ? -0.62 : -0.78;
  const clothingMaterial = elder ? context.accentMaterial : context.primaryMaterial;
  addMesh(context, context.body, `humanoid-${variant}-torso`, box(), clothingMaterial,
    [shoulder, height, child ? 0.34 : 0.4], [0, 0, 0]);
  const head = makeJoint(context, "head", context.body, [0, height + 0.5, 0]);
  addMesh(context, head, `humanoid-${variant}-head`, sphere(), context.primaryMaterial,
    [child ? 0.34 : 0.4, child ? 0.38 : 0.44, child ? 0.34 : 0.4]);
  const hair = makeJoint(context, "hair", head, [0, 0.24, -0.02]);
  addMesh(context, hair, `humanoid-${variant}-hair`, sphere(), context.accentMaterial,
    [child ? 0.37 : 0.43, 0.18, child ? 0.35 : 0.4], [0, 0.08, -0.18]);
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? "left" : "right";
    const arm = makeJoint(context, `arm-${label}`, context.body, [side * (shoulder + 0.16), 0.28, 0]);
    addMesh(context, arm, `humanoid-${variant}-arm-${label}`, cylinder(), context.primaryMaterial,
      [0.12, limb * 0.7, 0.12], [0, -limb * 0.3, 0], [0, 0, side * -0.08]);
    addMesh(context, arm, `humanoid-${variant}-hand-${label}`, sphere(), context.accentMaterial,
      [0.15, 0.13, 0.15], [0, -limb * 0.67, 0]);
    const leg = makeJoint(context, `leg-${label}`, context.body, [side * (child ? 0.22 : 0.28), legY, 0]);
    addMesh(context, leg, `humanoid-${variant}-leg-${label}`, cylinder(), context.primaryMaterial,
      [0.14, limb * 0.72, 0.14], [0, -limb * 0.35, 0]);
    addMesh(context, leg, `humanoid-${variant}-shoe-${label}`, box(), context.accentMaterial,
      [0.2, 0.12, 0.3], [0, -limb * 0.78, 0.1]);
  }
  if (elder) {
    const cane = makeJoint(context, "cane", context.body, [0.62, -0.06, 0.12]);
    addMesh(context, cane, "humanoid-elder-cane", cylinder(), context.accentMaterial,
      [0.06, 0.85, 0.06], [0, -0.45, 0]);
  } else if (child) {
    const hat = makeJoint(context, "hat", head, [0, 0.44, 0]);
    addMesh(context, hat, "humanoid-child-cap", cone(), context.accentMaterial,
      [0.38, 0.2, 0.38], [0, 0.1, 0]);
  }
}

function buildDog(context: BuildContext, visual: EntityVisualSpec): void {
  addMesh(context, context.body, "dog-torso", sphere(), context.primaryMaterial,
    [visual.proportions.torsoScale[0] * 1.2, visual.proportions.torsoScale[1] * 0.58, visual.proportions.torsoScale[2] * 0.95]);
  const head = makeJoint(context, "head", context.body, [0, 0.56, 0.88]);
  addMesh(context, head, "dog-head", sphere(), context.primaryMaterial,
    [visual.proportions.headScale[0] * 0.62, visual.proportions.headScale[1] * 0.58, visual.proportions.headScale[2] * 0.62]);
  const muzzle = makeJoint(context, "muzzle", head, [0, -0.08, 0.48]);
  addMesh(context, muzzle, "dog-muzzle", sphere(), context.accentMaterial, [0.38, 0.25, 0.3]);
  addMesh(context, muzzle, "dog-nose", sphere(), context.accentMaterial, [0.14, 0.12, 0.1], [0, 0, 0.28]);
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? "left" : "right";
    const ear = makeJoint(context, `ear-${label}`, head, [side * 0.34, 0.42, 0.03]);
    addMesh(context, ear, `dog-ear-${label}`, cone(), context.accentMaterial,
      [0.22, 0.5, 0.18], [0, -0.16, 0], [0, 0, side * -0.2]);
    const eye = makeJoint(context, `eye-${label}`, head, [side * 0.2, 0.12, 0.5]);
    addMesh(context, eye, `dog-eye-${label}`, sphere(), context.accentMaterial, [0.09, 0.09, 0.06]);
  }
  for (const front of [-1, 1] as const) {
    for (const side of [-1, 1] as const) {
      const label = `${front > 0 ? "front" : "rear"}-${side < 0 ? "left" : "right"}`;
      const leg = makeJoint(context, `leg-${label}`, context.body, [side * 0.58, -0.42, front * 0.55]);
      addMesh(context, leg, `dog-leg-${label}`, cylinder(), context.primaryMaterial,
        [0.16, 0.72, 0.16], [0, -0.34, 0]);
      addMesh(context, leg, `dog-paw-${label}`, sphere(), context.accentMaterial,
        [0.22, 0.14, 0.28], [0, -0.76, 0.12]);
    }
  }
  const tail = makeJoint(context, "tail", context.body, [0, 0.22, -0.98]);
  addMesh(context, tail, "dog-tail", cylinder(), context.primaryMaterial,
    [0.12, 0.8, 0.12], [0, 0.32, -0.32], [Math.PI * 0.7, 0, 0]);
  addMesh(context, tail, "dog-tail-tip", sphere(), context.accentMaterial, [0.18, 0.18, 0.18], [0, 0.66, -0.58]);
}

function buildMoth(context: BuildContext): void {
  const thorax = makeJoint(context, "thorax", context.body, [0, 0, 0]);
  addMesh(context, thorax, "moth-thorax", sphere(), context.primaryMaterial, [0.32, 0.4, 0.42]);
  const abdomen = makeJoint(context, "abdomen", context.body, [0, -0.05, -0.56]);
  addMesh(context, abdomen, "moth-abdomen", sphere(), context.primaryMaterial, [0.24, 0.28, 0.58]);
  const head = makeJoint(context, "head", context.body, [0, 0.04, 0.48]);
  addMesh(context, head, "moth-head", sphere(), context.accentMaterial, [0.3, 0.28, 0.3]);
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? "left" : "right";
    const upper = makeJoint(context, `wing-upper-${label}`, thorax, [side * 0.16, 0.08, 0]);
    addMesh(context, upper, `moth-wing-upper-${label}`, wingGeometry(false), context.primaryMaterial,
      [side, 1, 1], [side * 0.78, 0.18, 0], [0, side * 0.08, side * 0.12]);
    const lower = makeJoint(context, `wing-lower-${label}`, thorax, [side * 0.16, -0.06, -0.05]);
    addMesh(context, lower, `moth-wing-lower-${label}`, wingGeometry(true), context.accentMaterial,
      [side * 0.92, 0.88, 1], [side * 0.58, -0.12, 0], [0, side * 0.08, side * 0.14]);
    const antenna = makeJoint(context, `antenna-${label}`, head, [side * 0.15, 0.22, 0.1]);
    addMesh(context, antenna, `moth-antenna-${label}`, cylinder(), context.accentMaterial,
      [0.035, 0.5, 0.035], [0, 0.22, 0], [0, side * 0.25, side * 0.32]);
    for (let leg = 0; leg < 3; leg += 1) {
      const legJoint = makeJoint(context, `moth-leg-${label}-${leg}`, thorax, [side * (0.16 + leg * 0.04), -0.2, 0.18 - leg * 0.28]);
      addMesh(context, legJoint, `moth-leg-${label}-${leg}`, cylinder(), context.accentMaterial,
        [0.035, 0.28, 0.035], [0, -0.14, 0], [0, side * 0.28, side * 0.22]);
    }
  }
}

function buildBiped(context: BuildContext, visual: EntityVisualSpec, small: boolean): void {
  const bodyHeight = small ? 0.75 : 1;
  addMesh(context, context.body, "body-torso", sphere(), context.primaryMaterial,
    [visual.proportions.torsoScale[0] * 0.55, visual.proportions.torsoScale[1] * bodyHeight, visual.proportions.torsoScale[2] * 0.45]);
  const head = makeJoint(context, "head", context.body, [0, bodyHeight + 0.45, 0]);
  addMesh(context, head, "body-head", sphere(), context.primaryMaterial,
    [visual.proportions.headScale[0] * 0.5, visual.proportions.headScale[1] * 0.5, visual.proportions.headScale[2] * 0.5]);
  for (const side of [-1, 1] as const) {
    const arm = makeJoint(context, side < 0 ? "arm-left" : "arm-right", context.body, [side * 0.62, 0.35, 0]);
    addMesh(context, arm, `body-arm-${side < 0 ? "left" : "right"}`, cylinder(), context.primaryMaterial,
      [visual.proportions.limbThickness, visual.proportions.limbLength, visual.proportions.limbThickness], [0, -visual.proportions.limbLength * 0.45, 0], [0, 0, side * -0.12]);
    const leg = makeJoint(context, side < 0 ? "leg-left" : "leg-right", context.body, [side * visual.proportions.stanceWidth * 0.35, -0.75, 0]);
    addMesh(context, leg, `body-leg-${side < 0 ? "left" : "right"}`, cylinder(), context.primaryMaterial,
      [visual.proportions.limbThickness, visual.proportions.limbLength, visual.proportions.limbThickness], [0, -visual.proportions.limbLength * 0.42, 0]);
  }
}

function buildQuadruped(context: BuildContext, visual: EntityVisualSpec, bear: boolean): void {
  addMesh(context, context.body, "body-torso", sphere(), context.primaryMaterial,
    [visual.proportions.torsoScale[0], visual.proportions.torsoScale[1] * 0.72, visual.proportions.torsoScale[2] * 0.68]);
  const head = makeJoint(context, "head", context.body, [0, bear ? 0.75 : 0.35, bear ? 0.15 : 0.72]);
  addMesh(context, head, "body-head", sphere(), context.primaryMaterial,
    [visual.proportions.headScale[0] * 0.56, visual.proportions.headScale[1] * 0.56, visual.proportions.headScale[2] * 0.56]);
  for (const front of [-1, 1] as const) {
    for (const side of [-1, 1] as const) {
      const label = `${front > 0 ? "front" : "rear"}-${side < 0 ? "left" : "right"}`;
      const leg = makeJoint(context, `leg-${label}`, context.body, [side * 0.55, -0.45, front * 0.48]);
      addMesh(context, leg, `body-leg-${label}`, cylinder(), context.primaryMaterial,
        [visual.proportions.limbThickness, visual.proportions.limbLength * 0.65, visual.proportions.limbThickness], [0, -0.32, 0]);
    }
  }
  if (!bear) makeJoint(context, "tail", context.body, [0, 0.1, -0.78]);
}

function buildBirdOrFish(context: BuildContext, visual: EntityVisualSpec, fish: boolean): void {
  addMesh(context, context.body, "body-torso", sphere(), context.primaryMaterial,
    [fish ? 0.72 : 0.62, fish ? 0.42 : 0.78, fish ? 1.15 : 0.56]);
  const head = makeJoint(context, "head", context.body, [0, fish ? 0.1 : 0.72, fish ? 0.72 : 0.12]);
  addMesh(context, head, "body-head", sphere(), context.primaryMaterial,
    [visual.proportions.headScale[0] * 0.45, visual.proportions.headScale[1] * 0.45, visual.proportions.headScale[2] * 0.45]);
  for (const side of [-1, 1] as const) {
    makeJoint(context, `${fish ? "fin" : "wing"}-${side < 0 ? "left" : "right"}`, context.body, [side * 0.52, 0, 0]);
  }
  makeJoint(context, "tail", context.body, [0, 0, -0.85]);
}

function buildSerpent(context: BuildContext): void {
  for (let index = 0; index < 7; index += 1) {
    const joint = makeJoint(context, index === 0 ? "head" : `spine-${index}`, context.body, [0, 0, index * -0.45]);
    addMesh(context, joint, `body-segment-${index}`, sphere(), context.primaryMaterial,
      [Math.max(0.28, 0.52 - index * 0.035), Math.max(0.28, 0.52 - index * 0.035), 0.65]);
  }
  makeJoint(context, "tail", context.body, [0, 0, -3.1]);
}

function buildSimplePlan(context: BuildContext, visual: EntityVisualSpec): void {
  switch (visual.bodyPlan) {
    case "humanoid":
      buildBiped(context, visual, false);
      break;
    case "small_humanoid":
      buildBiped(context, visual, true);
      break;
    case "humanoid_adult":
      buildFamilyHumanoid(context, visual, "adult");
      break;
    case "humanoid_child":
      buildFamilyHumanoid(context, visual, "child");
      break;
    case "humanoid_elder":
      buildFamilyHumanoid(context, visual, "elder");
      break;
    case "quadruped":
      buildQuadruped(context, visual, false);
      break;
    case "dog":
      buildDog(context, visual);
      break;
    case "bear":
      buildQuadruped(context, visual, true);
      break;
    case "bird":
      buildBirdOrFish(context, visual, false);
      break;
    case "moth":
      buildMoth(context);
      break;
    case "fish":
      buildBirdOrFish(context, visual, true);
      break;
    case "serpent":
      buildSerpent(context);
      break;
    case "blob":
      addMesh(context, context.body, "body-blob", sphere(), context.primaryMaterial, [0.95, 0.78, 0.88]);
      makeJoint(context, "head", context.body, [0, 0.28, 0.35]);
      break;
    case "floating_object":
      addMesh(context, context.body, "body-object", sphere(), context.primaryMaterial, [0.95, 0.72, 0.95]);
      makeJoint(context, "head", context.body, [0, 0.1, 0.48]);
      makeJoint(context, "lid", context.body, [0, 0.72, 0]);
      break;
    case "plant_creature": {
      addMesh(context, context.body, "body-stem", cylinder(), context.primaryMaterial, [0.48, 1.2, 0.48]);
      const head = makeJoint(context, "head", context.body, [0, 0.9, 0]);
      addMesh(context, head, "body-flower", sphere(), context.accentMaterial, [0.75, 0.55, 0.75]);
      makeJoint(context, "root-left", context.body, [-0.25, -0.68, 0]);
      makeJoint(context, "root-right", context.body, [0.25, -0.68, 0]);
      break;
    }
  }
}

function featureParent(context: BuildContext, kind: EntityFeatureSpec["kind"]): THREE.Object3D {
  if (kind === "tail" || kind === "backpack") return context.joints.get("tail") ?? context.body;
  if (kind === "wing" || kind === "fin" || kind === "paw" || kind === "claw" ||
    kind === "necklace" || kind === "handle" || kind === "spout" || kind === "clock_face") return context.body;
  return context.joints.get("head") ?? context.body;
}

function featureGeometry(kind: EntityFeatureSpec["kind"]): THREE.BufferGeometry {
  switch (kind) {
    case "ear":
    case "horn":
    case "beak":
    case "crown":
    case "spout":
      return cone();
    case "antenna":
    case "tail":
    case "hair":
    case "handle":
      return cylinder();
    case "necklace":
    case "clock_face":
      return torus();
    case "wing":
    case "fin":
    case "paw":
    case "claw":
    case "backpack":
    case "hat":
      return box();
    case "snout":
    default:
      return sphere();
  }
}

function addFeaturePart(
  context: BuildContext,
  feature: EntityFeatureSpec,
  side: -1 | 0 | 1,
): boolean {
  const size = clamp(feature.size, 0.15, 3);
  const material = context.materials.get(feature.materialSlot) ?? context.accentMaterial;
  const suffix = side < 0 ? "-left" : side > 0 ? "-right" : "";
  const lateral = side * (feature.kind === "wing" || feature.kind === "fin" ? 0.72 : 0.35);
  let parent = featureParent(context, feature.kind);
  if (side !== 0 && (feature.kind === "wing" || feature.kind === "fin")) {
    const bodyJointName = `${feature.kind}${suffix}`;
    parent = context.joints.get(bodyJointName) ??
      makeJoint(context, `feature-${feature.kind}${suffix}`, context.body, [lateral, 0.08, 0]);
  } else if (side !== 0 && (feature.kind === "paw" || feature.kind === "claw")) {
    parent = context.joints.get(`leg-front${suffix}`) ??
      context.joints.get(`leg${suffix}`) ?? context.body;
  } else if (feature.kind === "hat" && feature.style === "lid") {
    parent = context.joints.get("lid") ?? parent;
  }
  const positions: Partial<Record<EntityFeatureSpec["kind"], readonly [number, number, number]>> = {
    ear: [lateral, 0.42, 0],
    horn: [lateral, 0.55, 0],
    antenna: [lateral * 0.7, 0.62, 0],
    snout: [0, -0.08, 0.52],
    beak: [0, -0.02, 0.62],
    wing: [lateral, 0.08, 0],
    tail: [0, 0, -0.25],
    fin: [lateral, 0, 0],
    paw: [lateral, -0.62, 0.25],
    claw: [lateral, -0.65, 0.35],
    hair: [0, 0.55, 0],
    crown: [0, 0.7, 0],
    hat: [0, 0.68, 0],
    backpack: [0, 0.1, -0.62],
    necklace: [0, 0.05, 0.62],
    handle: [-0.72, 0.05, 0],
    spout: [0.72, 0.12, 0],
    clock_face: [0, 0.05, 0.58],
  };
  const scales: Partial<Record<EntityFeatureSpec["kind"], readonly [number, number, number]>> = {
    ear: [0.32 * size, 0.45 * size, 0.25 * size],
    horn: [0.18 * size, 0.62 * size, 0.18 * size],
    antenna: [0.1 * size, 0.72 * size, 0.1 * size],
    snout: [0.5 * size, 0.32 * size, 0.4 * size],
    beak: [0.3 * size, 0.65 * size, 0.28 * size],
    wing: [0.75 * size, 0.15 * size, 0.5 * size],
    tail: [0.18 * size, 0.85 * size, 0.18 * size],
    fin: [0.55 * size, 0.12 * size, 0.42 * size],
    paw: [0.42 * size, 0.22 * size, 0.55 * size],
    claw: [0.12 * size, 0.42 * size, 0.12 * size],
    hair: [0.48 * size, 0.62 * size, 0.48 * size],
    crown: [0.55 * size, 0.48 * size, 0.55 * size],
    hat: [0.75 * size, 0.28 * size, 0.75 * size],
    backpack: [0.62 * size, 0.75 * size, 0.3 * size],
    necklace: [0.48 * size, 0.55 * size, 0.2 * size],
    handle: [0.65 * size, 0.8 * size, 0.18 * size],
    spout: [0.28 * size, 0.9 * size, 0.28 * size],
    clock_face: [0.52 * size, 0.52 * size, 0.12 * size],
  };
  const rotations: Partial<Record<EntityFeatureSpec["kind"], readonly [number, number, number]>> = {
    ear: [0, 0, side * -0.2],
    horn: [0, 0, side * -0.15],
    beak: [Math.PI / 2, 0, 0],
    wing: [0, 0, side * 0.25],
    tail: [Math.PI / 2, 0, 0],
    handle: [0, 0, Math.PI / 2],
    spout: [0, 0, -Math.PI / 2],
  };
  return addMesh(
    context,
    parent,
    `feature-${feature.kind}${suffix}`,
    featureGeometry(feature.kind),
    material,
    scales[feature.kind] ?? [size, size, size],
    positions[feature.kind] ?? [lateral, 0, 0],
    rotations[feature.kind] ?? [0, 0, 0],
  ) !== null;
}

function addFeatures(context: BuildContext, features: readonly EntityFeatureSpec[]): number {
  const representedFamilies = new Set<EntityFeatureSpec["kind"]>();
  for (const feature of features) {
    const sides = BILATERAL_FEATURES.has(feature.kind) ? ([-1, 1] as const) : ([0] as const);
    let represented = false;
    for (const side of sides) {
      represented = addFeaturePart(context, feature, side) || represented;
    }
    if (represented) representedFamilies.add(feature.kind);
  }
  return representedFamilies.size;
}

function addFace(context: BuildContext, visual: EntityVisualSpec): number {
  if (visual.face === undefined) return 0;
  const head = context.joints.get("head") ?? context.body;
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: safeColor(visual.palette.eye),
    emissive: visual.face.eyeStyle === "glowing" ? safeColor(visual.palette.eye) : 0,
    emissiveIntensity: visual.face.eyeStyle === "glowing" ? 1.4 : 0,
    roughness: visual.face.eyeStyle === "button" ? 0.7 : 0.3,
  });
  context.allMaterials.add(eyeMaterial);
  const eyeCount = visual.face.eyeStyle === "single_eye" ? 1 : visual.face.eyeStyle === "many_eyes" ? 5 : 2;
  for (let index = 0; index < eyeCount; index += 1) {
    const centered = index - (eyeCount - 1) / 2;
    addMesh(context, head, `face-eye-${index + 1}`, visual.face.eyeStyle === "screen" ? box() : sphere(), eyeMaterial,
      [0.11 * visual.face.eyeScale, 0.13 * visual.face.eyeScale, 0.07], [centered * visual.face.eyeSpacing * 0.42, 0.08 + (eyeCount > 2 && index % 2 === 1 ? 0.16 : 0), 0.53]);
  }
  if (visual.face.mouthStyle !== "none" && context.partCount < context.budget) {
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x21182b, roughness: 0.8 });
    context.allMaterials.add(mouthMaterial);
    addMesh(context, head, `face-mouth-${visual.face.mouthStyle}`, visual.face.mouthStyle === "beak" ? cone() : torus(), mouthMaterial,
      visual.face.mouthStyle === "beak" ? [0.18, 0.35, 0.18] : [0.2, 0.14, 0.08], [0, -0.18, 0.54], visual.face.mouthStyle === "beak" ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI]);
  }
  return eyeCount;
}

function postureRotation(posture: EntityVisualSpec["proportions"]["posture"]): number {
  if (posture === "hunched" || posture === "sleepy") return 0.15;
  if (posture === "proud") return -0.06;
  return 0;
}

/**
 * Compiles a validated DreamSpec entity visual into trusted, bounded primitives.
 * The visual data selects grammar tokens only; it never supplies executable code.
 */
export function createProceduralEntity(options: ProceduralEntityOptions): ProceduralEntity {
  const hero = isHero(options.role);
  const visual = options.visual;
  const root = new THREE.Group();
  root.name = options.id;
  const entityScale = clamp(visual.scale, MIN_SCALE, MAX_SCALE);
  root.scale.setScalar(entityScale);

  const body = new THREE.Group();
  body.name = "joint-body";
  body.rotation.x = postureRotation(visual.proportions.posture);
  root.add(body);

  const allMaterials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const materialSlots = new Map<string, THREE.Material>();
  for (const spec of visual.materials.slice(0, 8)) {
    const resource = materialFromSpec(spec, hero);
    const material = resource.material;
    materialSlots.set(spec.id, material);
    allMaterials.add(material);
    if (resource.texture !== undefined) textures.add(resource.texture);
  }
  const primaryMaterial = materialSlots.values().next().value ?? new THREE.MeshStandardMaterial({ color: safeColor(visual.palette.primary), roughness: 0.65 });
  if (materialSlots.size === 0) allMaterials.add(primaryMaterial);
  const accentMaterial = [...materialSlots.values()][1] ?? new THREE.MeshStandardMaterial({ color: safeColor(visual.palette.accent), roughness: 0.4 });
  if (materialSlots.size < 2) allMaterials.add(accentMaterial);

  const context: BuildContext = {
    root,
    body,
    joints: new Map([["body", body]]),
    geometries: new Set(),
    materials: materialSlots,
    allMaterials,
    textures,
    budget: hero ? HERO_PART_BUDGET : BACKGROUND_PART_BUDGET,
    primaryMaterial,
    accentMaterial,
    partCount: 0,
  };

  buildSimplePlan(context, visual);
  const representedFeatureFamilies = addFeatures(context, visual.features.slice(0, HERO_PART_BUDGET));
  const eyeCount = addFace(context, visual);
  const phase = phaseFromSeed(options.seed);
  const intendedDistance = clamp(options.intendedDistance ?? 10, 0, 100);
  const dedicatedFeatureFamilies = visual.bodyPlan === "moth" ? 4
    : visual.bodyPlan === "dog" ? 4
      : visual.bodyPlan === "humanoid_adult" || visual.bodyPlan === "humanoid_child" || visual.bodyPlan === "humanoid_elder" ? 4
        : 0;
  const iconicFeatureCount = Math.min(
    Math.max(representedFeatureFamilies, dedicatedFeatureFamilies),
    visual.recognitionFeatures.length,
  );
  const focalContrast = visual.face !== undefined &&
    (Math.abs(luminance(visual.palette.eye) - luminance(visual.palette.primary)) >= 0.22 ||
      visual.face.eyeStyle === "glowing" || visual.face.eyeStyle === "screen");
  const distinctSilhouette = representedFeatureFamilies >= 2 || dedicatedFeatureFamilies >= 3 ||
    visual.bodyPlan === "serpent" || visual.bodyPlan === "plant_creature";
  const visibleAtDistance = intendedDistance <= Math.max(8, entityScale * 12);
  const bodyPlanDefinition = getBodyPlanDefinition(visual.bodyPlan);
  const hasSemanticAnimation = visual.animationStyle.speedMultiplier > 0 &&
    bodyPlanDefinition.supportedLocomotion.includes(visual.animationStyle.locomotion) &&
    bodyPlanDefinition.supportedEmotion.includes(visual.animationStyle.emotion);
  const report: EntityReadabilityReport = {
    hasRecognizableBodyPlan: context.partCount > 0 && context.joints.has("head"),
    iconicFeatureCount,
    hasContrastingFocalPoint: focalContrast && eyeCount > 0,
    hasDistinctSilhouette: distinctSilhouette,
    hasSemanticAnimation,
    visibleAtIntendedDistance: visibleAtDistance,
    scaleRelativeToPlayer: entityScale,
    passed: false,
  };
  const passed = report.hasRecognizableBodyPlan && report.iconicFeatureCount >= 3 &&
    report.hasContrastingFocalPoint && report.hasDistinctSilhouette &&
    report.hasSemanticAnimation && report.visibleAtIntendedDistance;
  const finalReport = { ...report, passed };

  let animationState: EntityAnimationState = "idle";
  let disposed = false;

  return {
    id: options.id,
    root,
    get partCount() {
      return context.partCount;
    },
    get animationState() {
      return animationState;
    },
    setAnimationState(state) {
      if (!disposed) animationState = state;
    },
    update(updateContext) {
      if (disposed || !Number.isFinite(updateContext.elapsedSeconds)) return;
      const style = visual.animationStyle;
      const time = updateContext.elapsedSeconds * clamp(style.speedMultiplier, 0, 4) + phase;
      const amount = clamp(style.exaggeration, 0, 3);
      const activeAmount = animationState === "emotion" ? amount : animationState === "locomotion" ? amount * 0.7 : amount * 0.35;
      if (style.idle === "bob" || style.idle === "float") root.position.y = Math.sin(time * 1.6) * 0.09 * activeAmount;
      if (style.idle === "breathe") body.scale.y = 1 + Math.sin(time * 1.8) * 0.025 * activeAmount;
      if (style.idle === "wobble") body.rotation.z = Math.sin(time * 1.7) * 0.08 * activeAmount;
      if (style.idle === "look_around") context.joints.get("head")?.rotation.set(0, Math.sin(time) * 0.35 * activeAmount, 0);
      if (style.idle === "sleep") context.joints.get("head")?.rotation.set(0, 0, -0.18);

      const locomotion = style.locomotion;
      const legSwing = locomotion === "walk" || locomotion === "waddle" || locomotion === "hop";
      if (legSwing) {
        for (const [name, joint] of context.joints) {
          if (name.startsWith("leg-")) joint.rotation.x = Math.sin(time * 4 + (name.includes("left") ? 0 : Math.PI)) * 0.35 * activeAmount;
        }
      }
      if (locomotion === "fly" || locomotion === "swim") {
        for (const [name, joint] of context.joints) {
          if (name.includes("wing-") || name.includes("fin-")) joint.rotation.z = Math.sin(time * 5) * 0.65 * activeAmount;
        }
      }
      if (visual.bodyPlan === "moth") {
        for (const [name, joint] of context.joints) {
          if (name.startsWith("wing-")) joint.rotation.z += Math.sin(time * 5 + (name.includes("left") ? 0 : Math.PI)) * 0.22 * activeAmount;
        }
        body.rotation.y = Math.sin(time * 1.4) * 0.08 * activeAmount;
      }
      if (visual.bodyPlan === "dog") {
        const tail = context.joints.get("tail");
        const dogHead = context.joints.get("head");
        if (tail) tail.rotation.y = Math.sin(time * 4.5) * 0.5 * activeAmount;
        if (dogHead) dogHead.rotation.y = Math.sin(time * 1.2) * 0.08 * activeAmount;
      }
      if (locomotion === "slither") body.rotation.y = Math.sin(time * 2.4) * 0.16 * activeAmount;
      if (locomotion === "roll") body.rotation.z = time;

      if (animationState === "emotion") {
        if (style.emotion === "dance" || style.emotion === "cheer") body.rotation.y = Math.sin(time * 3) * 0.3 * amount;
        if (style.emotion === "shiver") body.position.x = Math.sin(time * 18) * 0.035 * amount;
        if (style.emotion === "stomp") root.position.y = Math.max(0, Math.sin(time * 5)) * 0.08 * amount;
        if (style.emotion === "bow") body.rotation.x = 0.3 * amount;
        if (style.emotion === "wave") context.joints.get("arm-right")?.rotation.set(0, 0, -0.8 + Math.sin(time * 5) * 0.3);
      }
    },
    getReadabilityReport() {
      return { ...finalReport };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      for (const geometry of context.geometries) geometry.dispose();
      for (const material of allMaterials) material.dispose();
      for (const texture of textures) texture.dispose();
      context.geometries.clear();
      allMaterials.clear();
      textures.clear();
    },
  };
}
