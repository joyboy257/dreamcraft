import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  createProceduralEntity,
  getBodyPlanDefinition,
  MVP_ANIMATION_VOCABULARY,
  MVP_BODY_PLANS,
  MVP_FACE_STYLES,
  MVP_FEATURE_FAMILIES,
  MVP_MATERIAL_PRESETS,
  type EntityVisualSpec,
} from "./entityKit";

function isMesh(
  object: THREE.Object3D,
): object is THREE.Mesh<
  THREE.BufferGeometry,
  THREE.Material | THREE.Material[]
> {
  return object instanceof THREE.Mesh;
}

function getTextureMap(material: THREE.Material): THREE.Texture | null {
  if (!("map" in material)) return null;
  const map: unknown = material.map;
  return map instanceof THREE.Texture ? map : null;
}

const gummyGuardian: EntityVisualSpec = {
  bodyPlan: "bear",
  scale: 3.5,
  proportions: {
    headScale: [1.2, 1.1, 1],
    torsoScale: [1.25, 1.45, 1],
    limbLength: 0.65,
    limbThickness: 0.45,
    stanceWidth: 0.8,
    posture: "proud",
  },
  palette: {
    primary: 0xd72f46,
    secondary: 0xff8fa1,
    accent: 0xffd166,
    eye: 0xeaffff,
  },
  materials: [
    {
      id: "jelly_body",
      preset: "jelly",
      color: 0xd72f46,
      roughness: 0.25,
      metalness: 0,
      opacity: 0.82,
      emissive: 0,
    },
    {
      id: "gold",
      preset: "metal",
      color: 0xffd166,
      roughness: 0.25,
      metalness: 0.8,
      opacity: 1,
      emissive: 0,
    },
  ],
  features: [
    { kind: "ear", style: "round", size: 1, materialSlot: "jelly_body" },
    { kind: "snout", style: "muzzle", size: 1.1, materialSlot: "jelly_body" },
    { kind: "paw", style: "short", size: 0.9, materialSlot: "jelly_body" },
    {
      kind: "necklace",
      style: "key",
      size: 1,
      materialSlot: "gold",
      pendant: "golden_key",
    },
  ],
  face: {
    eyeStyle: "glowing",
    eyeScale: 1.1,
    eyeSpacing: 0.45,
    mouthStyle: "smile",
    defaultExpression: "friendly",
  },
  animationStyle: {
    idle: "wobble",
    locomotion: "waddle",
    emotion: "stomp",
    speedMultiplier: 1,
    exaggeration: 1.4,
  },
  recognitionFeatures: ["round ears", "muzzle", "short paws", "golden key"],
};

describe("createProceduralEntity", () => {
  it("compiles a distinctive readable bear from a bounded DreamSpec visual", () => {
    const entity = createProceduralEntity({
      id: "gummy_guardian",
      visual: gummyGuardian,
      seed: 42,
      role: "hero",
      intendedDistance: 14,
    });

    expect(entity.root).toBeInstanceOf(THREE.Group);
    expect(entity.root.getObjectByName("joint-head")).toBeDefined();
    expect(entity.root.getObjectByName("feature-ear-left")).toBeDefined();
    expect(entity.root.getObjectByName("feature-ear-right")).toBeDefined();
    expect(entity.root.getObjectByName("feature-snout")).toBeDefined();
    expect(entity.root.getObjectByName("feature-necklace")).toBeDefined();
    expect(entity.partCount).toBeLessThanOrEqual(32);
    expect(entity.getReadabilityReport()).toMatchObject({
      hasRecognizableBodyPlan: true,
      iconicFeatureCount: 4,
      hasContrastingFocalPoint: true,
      hasDistinctSilhouette: true,
      hasSemanticAnimation: true,
      visibleAtIntendedDistance: true,
      scaleRelativeToPlayer: 3.5,
      passed: true,
    });
  });

  it("defines and compiles every MVP body plan with bounded rig semantics", () => {
    expect(MVP_BODY_PLANS).toHaveLength(15);

    for (const bodyPlan of MVP_BODY_PLANS) {
      const definition = getBodyPlanDefinition(bodyPlan);
      const entity = createProceduralEntity({
        id: `example_${bodyPlan}`,
        visual: {
          ...gummyGuardian,
          bodyPlan,
          features: [],
          recognitionFeatures: [],
        },
        role: "ambient",
      });

      expect(definition.joints).toContain("head");
      expect(definition.contactPoints.length).toBeGreaterThan(0);
      expect(definition.attachmentSlots.length).toBeGreaterThan(0);
      expect(definition.supportedLocomotion.length).toBeGreaterThan(0);
      expect(definition.collider.size.every(Number.isFinite)).toBe(true);
      for (const joint of definition.joints) {
        expect(entity.root.getObjectByName(`joint-${joint}`)).toBeDefined();
      }
      expect(entity.partCount).toBeLessThanOrEqual(12);
      entity.dispose();
    }
  });

  it("builds a moth silhouette with four wings, antennae, abdomen, and fluttering joints", () => {
    const moth = createProceduralEntity({
      id: "luna-moth",
      role: "hero",
      seed: 7,
      intendedDistance: 10,
      visual: {
        ...gummyGuardian,
        bodyPlan: "moth",
        scale: 1.85,
        features: [
          { kind: "antenna", size: 1, materialSlot: "jelly_body" },
          { kind: "wing", size: 1, materialSlot: "jelly_body" },
          { kind: "tail", size: 1, materialSlot: "jelly_body" },
        ],
        recognitionFeatures: ["wings", "antennae", "abdomen"],
        animationStyle: { idle: "float", locomotion: "fly", emotion: "wave", speedMultiplier: 1, exaggeration: 1 },
      },
    });
    expect(moth.root.getObjectByName("moth-thorax")).toBeDefined();
    expect(moth.root.getObjectByName("moth-abdomen")).toBeDefined();
    expect(moth.root.getObjectByName("moth-wing-upper-left")).toBeDefined();
    expect(moth.root.getObjectByName("moth-wing-upper-right")).toBeDefined();
    expect(moth.root.getObjectByName("moth-wing-lower-left")).toBeDefined();
    expect(moth.root.getObjectByName("moth-wing-lower-right")).toBeDefined();
    expect(moth.root.getObjectByName("moth-antenna-left")).toBeDefined();
    const wing = moth.root.getObjectByName("joint-wing-upper-left");
    const before = wing?.rotation.z;
    moth.setAnimationState("locomotion");
    moth.update({ elapsedSeconds: 0.4, deltaSeconds: 1 / 60 });
    expect(wing?.rotation.z).not.toBe(before);
    expect(moth.getReadabilityReport().passed).toBe(true);
    moth.dispose();
  });

  it("builds a dog silhouette with muzzle, ears, four paws, and a wagging tail", () => {
    const dog = createProceduralEntity({
      id: "childhood-dog",
      role: "hero",
      seed: 11,
      intendedDistance: 12,
      visual: {
        ...gummyGuardian,
        bodyPlan: "dog",
        scale: 1.55,
        features: [
          { kind: "ear", size: 1, materialSlot: "jelly_body" },
          { kind: "snout", size: 1, materialSlot: "jelly_body" },
          { kind: "paw", size: 1, materialSlot: "jelly_body" },
          { kind: "tail", size: 1, materialSlot: "jelly_body" },
        ],
        recognitionFeatures: ["muzzle", "ears", "paws", "tail"],
        animationStyle: { idle: "breathe", locomotion: "walk", emotion: "cheer", speedMultiplier: 1, exaggeration: 1 },
      },
    });
    for (const name of ["dog-torso", "dog-head", "dog-muzzle", "dog-ear-left", "dog-ear-right", "dog-paw-front-left", "dog-paw-front-right", "dog-paw-rear-left", "dog-paw-rear-right", "dog-tail"]) {
      expect(dog.root.getObjectByName(name)).toBeDefined();
    }
    const tail = dog.root.getObjectByName("joint-tail");
    const before = tail?.rotation.y;
    dog.setAnimationState("emotion");
    dog.update({ elapsedSeconds: 0.4, deltaSeconds: 1 / 60 });
    expect(tail?.rotation.y).not.toBe(before);
    expect(dog.getReadabilityReport().passed).toBe(true);
    dog.dispose();
  });

  it("builds visually distinct family humanoid variants", () => {
    const entities = (['humanoid_adult', 'humanoid_child', 'humanoid_elder'] as const).map((bodyPlan) => createProceduralEntity({
      id: bodyPlan,
      role: "companion",
      visual: { ...gummyGuardian, bodyPlan, features: [{ kind: "hair", size: 1, materialSlot: "jelly_body" }], recognitionFeatures: ["head", "torso", "clothing"], animationStyle: { idle: "breathe", locomotion: "walk", emotion: "dance", speedMultiplier: 1, exaggeration: 1 } },
    }));
    expect(entities.every((entity) => entity.root.getObjectByName("joint-head") && entity.root.getObjectByName("joint-arm-left") && entity.root.getObjectByName("joint-leg-left"))).toBe(true);
    const meshes = entities.map((entity) => {
      const box = new THREE.Box3().setFromObject(entity.root);
      return box.max.y - box.min.y;
    });
    expect(new Set(meshes.map((height) => Math.round(height * 100))).size).toBe(3);
    expect(entities.every((entity) => entity.getReadabilityReport().passed)).toBe(true);
    for (const entity of entities) entity.dispose();
  });

  it("articulates a distinctive flying teapot through semantic feature joints", () => {
    const teapot = createProceduralEntity({
      id: "star_teapot",
      role: "hero",
      seed: 8,
      intendedDistance: 8,
      visual: {
        ...gummyGuardian,
        bodyPlan: "floating_object",
        scale: 1.4,
        materials: [
          {
            id: "porcelain",
            preset: "toon",
            color: 0xf5f0ff,
            roughness: 0.4,
            metalness: 0,
            opacity: 1,
            emissive: 0,
            pattern: { kind: "stars", color: 0x7457d9, scale: 1.2 },
          },
        ],
        features: [
          { kind: "handle", style: "loop", size: 1, materialSlot: "porcelain" },
          { kind: "spout", style: "curved", size: 1, materialSlot: "porcelain" },
          { kind: "hat", style: "lid", size: 0.7, materialSlot: "porcelain" },
          { kind: "wing", style: "small", size: 0.8, materialSlot: "porcelain" },
        ],
        animationStyle: {
          idle: "float",
          locomotion: "fly",
          emotion: "cheer",
          speedMultiplier: 1.2,
          exaggeration: 1.1,
        },
        recognitionFeatures: ["handle", "spout", "lid", "small wings"],
      },
    });
    const leftWingJoint = teapot.root.getObjectByName("joint-feature-wing-left");
    const before = leftWingJoint?.rotation.z;

    teapot.setAnimationState("locomotion");
    teapot.update({ elapsedSeconds: 0.4, deltaSeconds: 1 / 60 });

    expect(teapot.root.getObjectByName("feature-handle")).toBeDefined();
    expect(teapot.root.getObjectByName("feature-spout")).toBeDefined();
    expect(teapot.root.getObjectByName("feature-hat")).toBeDefined();
    expect(leftWingJoint).toBeDefined();
    expect(leftWingJoint?.rotation.z).not.toBe(before);
    expect(teapot.getReadabilityReport().passed).toBe(true);

    let patternMap: THREE.Texture | null = null;
    teapot.root.traverse((object) => {
      if (!isMesh(object)) return;
      const material = Array.isArray(object.material)
        ? object.material[0]
        : object.material;
      if (material === undefined) return;
      patternMap = getTextureMap(material) ?? patternMap;
    });
    expect(patternMap).toBeInstanceOf(THREE.DataTexture);
    const disposePattern = vi.spyOn(patternMap as unknown as THREE.Texture, "dispose");
    teapot.dispose();
    teapot.dispose();
    expect(disposePattern).toHaveBeenCalledOnce();
  });

  it("reports missing readability evidence instead of rubber-stamping an entity", () => {
    const unreadableFish = createProceduralEntity({
      id: "unreadable_fish",
      role: "ambient",
      intendedDistance: 90,
      visual: {
        ...gummyGuardian,
        bodyPlan: "fish",
        scale: 0.4,
        features: [],
        palette: {
          ...gummyGuardian.palette,
          eye: gummyGuardian.palette.primary,
        },
        face: {
          eyeStyle: "round",
          eyeScale: 1,
          eyeSpacing: 0.4,
          mouthStyle: "none",
          defaultExpression: "mysterious",
        },
        recognitionFeatures: [],
        animationStyle: {
          ...gummyGuardian.animationStyle,
          locomotion: "waddle",
        },
      },
    });

    expect(unreadableFish.getReadabilityReport()).toMatchObject({
      iconicFeatureCount: 0,
      hasContrastingFocalPoint: false,
      hasDistinctSilhouette: false,
      hasSemanticAnimation: false,
      visibleAtIntendedDistance: false,
      passed: false,
    });
  });

  it("counts distinct iconic feature families instead of duplicate decorations", () => {
    const repetitiveBear = createProceduralEntity({
      id: "repetitive_bear",
      role: "hero",
      visual: {
        ...gummyGuardian,
        features: [
          { kind: "ear", style: "round", size: 1, materialSlot: "jelly_body" },
          { kind: "ear", style: "small", size: 0.8, materialSlot: "jelly_body" },
          { kind: "ear", style: "tiny", size: 0.6, materialSlot: "jelly_body" },
        ],
        recognitionFeatures: ["round ears", "small ears", "tiny ears"],
      },
    });

    expect(repetitiveBear.getReadabilityReport()).toMatchObject({
      iconicFeatureCount: 1,
      passed: false,
    });
  });

  it("renders every bounded feature, material, face, and animation family", () => {
    expect(MVP_FEATURE_FAMILIES).toHaveLength(18);
    expect(MVP_MATERIAL_PRESETS).toHaveLength(11);
    expect(MVP_FACE_STYLES.eyes).toHaveLength(7);
    expect(MVP_FACE_STYLES.mouths).toHaveLength(6);
    expect(MVP_ANIMATION_VOCABULARY.idle).toHaveLength(6);
    expect(MVP_ANIMATION_VOCABULARY.locomotion).toHaveLength(7);
    expect(MVP_ANIMATION_VOCABULARY.emotion).toHaveLength(6);

    for (const kind of MVP_FEATURE_FAMILIES) {
      const entity = createProceduralEntity({
        id: `feature_${kind}`,
        role: "hero",
        visual: {
          ...gummyGuardian,
          bodyPlan: "blob",
          features: [{ kind, size: 1, materialSlot: "jelly_body" }],
          recognitionFeatures: [kind],
        },
      });
      const suffix = new Set(["ear", "horn", "antenna", "wing", "fin", "paw", "claw"]).has(kind)
        ? "-left"
        : "";
      expect(entity.root.getObjectByName(`feature-${kind}${suffix}`)).toBeDefined();
      entity.dispose();
    }

    for (const preset of MVP_MATERIAL_PRESETS) {
      const entity = createProceduralEntity({
        id: `material_${preset}`,
        role: "hero",
        visual: {
          ...gummyGuardian,
          materials: [{
            id: "jelly_body",
            preset,
            color: 0x7777aa,
            roughness: 0.4,
            metalness: 0.3,
            opacity: 0.7,
            emissive: 0x222244,
          }],
        },
      });
      let renderedMaterial: THREE.Material | null = null;
      entity.root.traverse((object) => {
        if (renderedMaterial === null && isMesh(object)) {
          renderedMaterial = Array.isArray(object.material) ? object.material[0] ?? null : object.material;
        }
      });
      expect(renderedMaterial).toBeInstanceOf(THREE.Material);
      entity.dispose();
    }

    for (const eyeStyle of MVP_FACE_STYLES.eyes) {
      const entity = createProceduralEntity({
        id: `face_${eyeStyle}`,
        role: "hero",
        visual: {
          ...gummyGuardian,
          face: {
            eyeStyle,
            eyeScale: 1,
            eyeSpacing: 0.4,
            mouthStyle: "smile",
            defaultExpression: "friendly",
          },
        },
      });
      expect(entity.root.getObjectByName("face-eye-1")).toBeDefined();
      entity.dispose();
    }

    const supportedLocomotion = new Set(
      MVP_BODY_PLANS.flatMap((bodyPlan) => getBodyPlanDefinition(bodyPlan).supportedLocomotion),
    );
    const supportedEmotion = new Set(
      MVP_BODY_PLANS.flatMap((bodyPlan) => getBodyPlanDefinition(bodyPlan).supportedEmotion),
    );
    expect([...supportedLocomotion].sort()).toEqual([...MVP_ANIMATION_VOCABULARY.locomotion].sort());
    expect([...supportedEmotion].sort()).toEqual([...MVP_ANIMATION_VOCABULARY.emotion].sort());
  });
});
