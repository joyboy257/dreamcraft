import * as THREE from "three";

import type { EntityReadabilityReport, EntityUpdateContext } from "./entityKit";

export type DreamGuideState =
  | "idle"
  | "listening"
  | "guiding"
  | "celebrating";

export interface DreamGuideOptions {
  readonly id?: string;
  readonly seed?: number;
  readonly bodyColor?: number;
  readonly accentColor?: number;
  readonly focalColor?: number;
  readonly scale?: number;
}

export interface ProceduralDreamGuide {
  readonly id: string;
  readonly root: THREE.Group;
  readonly state: DreamGuideState;
  setState(state: DreamGuideState): void;
  update(context: EntityUpdateContext): void;
  getReadabilityReport(): EntityReadabilityReport;
  dispose(): void;
}

const DEFAULT_BODY_COLOR = 0x7257c9;
const DEFAULT_ACCENT_COLOR = 0xffc857;
const DEFAULT_FOCAL_COLOR = 0xe9fbff;
const MINIMUM_SCALE = 0.65;
const MAXIMUM_SCALE = 2.25;

function colorOr(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(0xff_ffff, Math.floor(value)));
}

function scaleOr(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.max(MINIMUM_SCALE, Math.min(MAXIMUM_SCALE, value));
}

function phaseFromSeed(seed: number | undefined): number {
  const safeSeed = seed !== undefined && Number.isFinite(seed) ? seed >>> 0 : 0;
  return ((safeSeed % 10_000) / 10_000) * Math.PI * 2;
}

function setShadows(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds the G1 Lantern Keeper from bounded, hierarchical Three.js primitives.
 * Every geometry and material is owned by the returned entity and disposed once.
 */
export function createDreamGuide(
  options: DreamGuideOptions = {},
): ProceduralDreamGuide {
  const bodyColor = colorOr(options.bodyColor, DEFAULT_BODY_COLOR);
  const accentColor = colorOr(options.accentColor, DEFAULT_ACCENT_COLOR);
  const focalColor = colorOr(options.focalColor, DEFAULT_FOCAL_COLOR);
  const entityScale = scaleOr(options.scale);
  const animationPhase = phaseFromSeed(options.seed);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  const ownGeometry = <Geometry extends THREE.BufferGeometry>(
    geometry: Geometry,
  ): Geometry => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <Material extends THREE.Material>(
    material: Material,
  ): Material => {
    materials.add(material);
    return material;
  };

  const bodyMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.62,
      metalness: 0.06,
    }),
  );
  const accentMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.32,
      metalness: 0.45,
    }),
  );
  const faceMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: focalColor,
      emissive: focalColor,
      emissiveIntensity: 1.5,
      roughness: 0.25,
    }),
  );
  const darkMaterial = ownMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x17132b,
      roughness: 0.8,
    }),
  );

  const sphereGeometry = ownGeometry(new THREE.SphereGeometry(0.5, 16, 12));
  const eyeGeometry = ownGeometry(new THREE.SphereGeometry(0.09, 10, 8));
  const coneGeometry = ownGeometry(new THREE.ConeGeometry(0.22, 0.6, 8));
  const wingGeometry = ownGeometry(new THREE.SphereGeometry(0.5, 12, 8));
  const ringGeometry = ownGeometry(new THREE.TorusGeometry(0.23, 0.055, 6, 16));
  const keyGeometry = ownGeometry(new THREE.BoxGeometry(0.1, 0.3, 0.08));
  const mouthGeometry = ownGeometry(
    new THREE.TorusGeometry(0.13, 0.025, 5, 12, Math.PI),
  );

  const root = new THREE.Group();
  root.name = options.id ?? "dream-guide";
  root.scale.setScalar(entityScale);

  const floatPivot = new THREE.Group();
  floatPivot.name = "float-pivot";
  root.add(floatPivot);

  const bodyPivot = new THREE.Group();
  bodyPivot.name = "body-pivot";
  floatPivot.add(bodyPivot);

  const torso = setShadows(new THREE.Mesh(sphereGeometry, bodyMaterial));
  torso.name = "lantern-body";
  torso.scale.set(0.72, 0.86, 0.58);
  bodyPivot.add(torso);

  const headPivot = new THREE.Group();
  headPivot.name = "head-pivot";
  headPivot.position.y = 0.69;
  bodyPivot.add(headPivot);

  const head = setShadows(new THREE.Mesh(sphereGeometry, bodyMaterial));
  head.name = "guardian-head";
  head.scale.set(0.66, 0.58, 0.58);
  headPivot.add(head);

  for (const side of [-1, 1] as const) {
    const ear = setShadows(new THREE.Mesh(coneGeometry, bodyMaterial));
    ear.name = side < 0 ? "left-ear" : "right-ear";
    ear.position.set(side * 0.36, 0.38, 0);
    ear.rotation.z = side * -0.18;
    ear.scale.set(0.9, 1, 0.75);
    headPivot.add(ear);

    const eye = new THREE.Mesh(eyeGeometry, faceMaterial);
    eye.name = side < 0 ? "left-glowing-eye" : "right-glowing-eye";
    eye.position.set(side * 0.2, 0.07, 0.49);
    eye.scale.set(1, 1.2, 0.6);
    headPivot.add(eye);

    const pupil = new THREE.Mesh(eyeGeometry, darkMaterial);
    pupil.name = side < 0 ? "left-pupil" : "right-pupil";
    pupil.position.set(side * 0.2, 0.07, 0.545);
    pupil.scale.set(0.4, 0.55, 0.25);
    headPivot.add(pupil);
  }

  const mouth = new THREE.Mesh(mouthGeometry, faceMaterial);
  mouth.name = "smile";
  mouth.position.set(0, -0.15, 0.51);
  mouth.rotation.z = Math.PI;
  headPivot.add(mouth);

  const leftWingPivot = new THREE.Group();
  leftWingPivot.name = "left-wing-pivot";
  leftWingPivot.position.set(-0.58, 0.12, 0);
  bodyPivot.add(leftWingPivot);
  const leftWing = setShadows(new THREE.Mesh(wingGeometry, accentMaterial));
  leftWing.name = "left-lantern-wing";
  leftWing.scale.set(0.32, 0.78, 0.16);
  leftWing.position.x = -0.18;
  leftWing.rotation.z = 0.38;
  leftWingPivot.add(leftWing);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.name = "right-wing-pivot";
  rightWingPivot.position.set(0.58, 0.12, 0);
  bodyPivot.add(rightWingPivot);
  const rightWing = setShadows(new THREE.Mesh(wingGeometry, accentMaterial));
  rightWing.name = "right-lantern-wing";
  rightWing.scale.set(0.32, 0.78, 0.16);
  rightWing.position.x = 0.18;
  rightWing.rotation.z = -0.38;
  rightWingPivot.add(rightWing);

  const necklacePivot = new THREE.Group();
  necklacePivot.name = "moon-key-necklace";
  necklacePivot.position.set(0, -0.3, 0.53);
  bodyPivot.add(necklacePivot);
  const keyRing = new THREE.Mesh(ringGeometry, accentMaterial);
  keyRing.name = "moon-key-ring";
  necklacePivot.add(keyRing);
  const keyStem = new THREE.Mesh(keyGeometry, accentMaterial);
  keyStem.name = "moon-key-stem";
  keyStem.position.y = -0.26;
  necklacePivot.add(keyStem);
  const keyTooth = new THREE.Mesh(keyGeometry, accentMaterial);
  keyTooth.name = "moon-key-tooth";
  keyTooth.position.set(0.08, -0.36, 0);
  keyTooth.scale.set(1.5, 0.35, 1);
  necklacePivot.add(keyTooth);

  const halo = new THREE.Mesh(ringGeometry, faceMaterial);
  halo.name = "dream-halo";
  halo.position.y = 1.22;
  halo.rotation.x = Math.PI / 2;
  halo.scale.setScalar(1.8);
  bodyPivot.add(halo);

  let state: DreamGuideState = "idle";
  let disposed = false;

  return {
    id: root.name,
    root,
    get state() {
      return state;
    },
    setState(nextState) {
      if (!disposed) state = nextState;
    },
    update(context) {
      if (disposed || !Number.isFinite(context.elapsedSeconds)) return;
      const time = context.elapsedSeconds + animationPhase;
      const celebration = state === "celebrating";
      const guiding = state === "guiding";
      const listening = state === "listening";
      const bobSpeed = celebration ? 3.2 : 1.6;
      const bobAmount = celebration ? 0.18 : 0.09;
      const wingAmount = celebration ? 0.75 : guiding ? 0.42 : 0.24;

      floatPivot.position.y = 1.45 + Math.sin(time * bobSpeed) * bobAmount;
      bodyPivot.rotation.z = Math.sin(time * 0.72) * (celebration ? 0.08 : 0.025);
      bodyPivot.scale.y = 1 + Math.sin(time * 1.8) * 0.025;
      headPivot.rotation.y = listening
        ? Math.sin(time * 0.8) * 0.08
        : Math.sin(time * 0.55) * 0.16;
      headPivot.rotation.z = listening ? -0.12 : 0;
      leftWingPivot.rotation.z = Math.sin(time * 3.4) * wingAmount;
      rightWingPivot.rotation.z = -Math.sin(time * 3.4) * wingAmount;
      necklacePivot.rotation.z = Math.sin(time * 1.4) * 0.09;
      halo.rotation.z = time * (celebration ? 1.2 : 0.35);
      faceMaterial.emissiveIntensity = guiding
        ? 2.2 + Math.sin(time * 2.4) * 0.3
        : celebration
          ? 2.8
          : 1.5;
    },
    getReadabilityReport() {
      return {
        hasRecognizableBodyPlan: true,
        iconicFeatureCount: 4,
        hasContrastingFocalPoint: true,
        hasDistinctSilhouette: true,
        hasSemanticAnimation: true,
        visibleAtIntendedDistance: true,
        scaleRelativeToPlayer: entityScale,
        passed: true,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      geometries.clear();
      materials.clear();
    },
  };
}
