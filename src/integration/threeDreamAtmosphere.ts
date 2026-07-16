import * as THREE from "three";

import type {
  AtmosphereParticlePlan,
  AtmosphereState,
  DreamAtmospherePlan,
} from "./dreamAtmosphere";

export interface ThreeDreamAtmosphereController {
  transitionTo(patchId: string, durationMs?: number): boolean;
  update(deltaSeconds: number): void;
  getParticleCount(): number;
  dispose(): void;
}

interface MutableAtmosphereState {
  sky: { top: number; bottom: number };
  fog: { color: number; near: number; far: number };
  ambient: { color: number; intensity: number };
  sun: { color: number; intensity: number };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function cloneState(state: AtmosphereState): MutableAtmosphereState {
  return {
    sky: { ...state.sky },
    fog: { ...state.fog },
    ambient: { ...state.ambient },
    sun: { ...state.sun },
  };
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function colorChannel(color: number, shift: number): number {
  return (color >>> shift) & 0xff;
}

function mixColor(from: number, to: number, amount: number): number {
  const channel = (shift: number): number => Math.round(mix(
    colorChannel(from, shift),
    colorChannel(to, shift),
    amount,
  ));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function particleColor(kind: AtmosphereParticlePlan["kind"]): number {
  switch (kind) {
    case "embers": return 0xff8a3d;
    case "fireflies": return 0xfff09a;
    case "rain": return 0x91cfff;
    case "snow": return 0xffffff;
    case "petals": return 0xff9ecb;
    case "ash": return 0xaaa7a4;
    case "mist": return 0xc5d8df;
    case "stars":
    case "sparkles": return 0xfff4bd;
    default: return 0xd9c8ff;
  }
}

/**
 * Owns only trusted Three.js atmosphere objects. The caller advances it from the
 * engine loop and disposes it with the world; no remote textures or shaders exist.
 */
export function createThreeDreamAtmosphere(
  scene: THREE.Scene,
  plan: DreamAtmospherePlan,
  seed: number,
): ThreeDreamAtmosphereController {
  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const skyGeometry = new THREE.SphereGeometry(90, 16, 8);
  const skyColors = new Float32Array(skyGeometry.getAttribute("position").count * 3);
  skyGeometry.setAttribute("color", new THREE.BufferAttribute(skyColors, 3));
  const skyMaterial = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexColors: true,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -100;

  const ambient = new THREE.HemisphereLight(
    plan.initial.ambient.color,
    plan.initial.sky.bottom,
    plan.initial.ambient.intensity,
  );
  const sun = new THREE.DirectionalLight(plan.initial.sun.color, plan.initial.sun.intensity);
  sun.position.set(-12, 22, 8);

  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(500 * 3);
  const particlePhases = new Float32Array(500);
  const random = seededRandom(seed);
  for (let index = 0; index < 500; index += 1) {
    const offset = index * 3;
    particlePositions[offset] = (random() - 0.5) * 110;
    particlePositions[offset + 1] = random() * 42 + 2;
    particlePositions[offset + 2] = (random() - 0.5) * 110;
    particlePhases[index] = random() * Math.PI * 2;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setDrawRange(0, plan.particles.count);
  const particleMaterial = new THREE.PointsMaterial({
    color: particleColor(plan.particles.kind),
    opacity: 0.78,
    size: plan.particles.pointSize,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(sky, ambient, sun, particles);

  const current = cloneState(plan.initial);
  let target = cloneState(plan.initial);
  let transitionOrigin = cloneState(plan.initial);
  let transitionDuration = 0;
  let transitionElapsed = 0;
  let particlePlan = plan.particles;
  let disposed = false;
  const topColor = new THREE.Color();
  const bottomColor = new THREE.Color();
  const backgroundColor = new THREE.Color(plan.initial.sky.bottom);
  const fog = new THREE.Fog(
    plan.initial.fog.color,
    plan.initial.fog.near,
    plan.initial.fog.far,
  );

  const applyState = (state: AtmosphereState): void => {
    topColor.setHex(state.sky.top);
    bottomColor.setHex(state.sky.bottom);
    const position = skyGeometry.getAttribute("position");
    const color = skyGeometry.getAttribute("color") as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index += 1) {
      const height = position.getY(index) / 90;
      const amount = Math.max(0, Math.min(1, (height + 1) * 0.5));
      color.setXYZ(
        index,
        mix(bottomColor.r, topColor.r, amount),
        mix(bottomColor.g, topColor.g, amount),
        mix(bottomColor.b, topColor.b, amount),
      );
    }
    color.needsUpdate = true;
    backgroundColor.setHex(state.sky.bottom);
    fog.color.setHex(state.fog.color);
    fog.near = state.fog.near;
    fog.far = state.fog.far;
    scene.background = backgroundColor;
    scene.fog = fog;
    ambient.color.setHex(state.ambient.color);
    ambient.groundColor.setHex(state.sky.bottom);
    ambient.intensity = state.ambient.intensity;
    sun.color.setHex(state.sun.color);
    sun.intensity = state.sun.intensity;
  };

  const sampleTransition = (amount: number): void => {
    current.sky.top = mixColor(transitionOrigin.sky.top, target.sky.top, amount);
    current.sky.bottom = mixColor(transitionOrigin.sky.bottom, target.sky.bottom, amount);
    current.fog.color = mixColor(transitionOrigin.fog.color, target.fog.color, amount);
    current.fog.near = mix(transitionOrigin.fog.near, target.fog.near, amount);
    current.fog.far = mix(transitionOrigin.fog.far, target.fog.far, amount);
    current.ambient.color = mixColor(transitionOrigin.ambient.color, target.ambient.color, amount);
    current.ambient.intensity = mix(
      transitionOrigin.ambient.intensity,
      target.ambient.intensity,
      amount,
    );
    current.sun.color = mixColor(transitionOrigin.sun.color, target.sun.color, amount);
    current.sun.intensity = mix(transitionOrigin.sun.intensity, target.sun.intensity, amount);
    applyState(current);
  };

  applyState(current);

  return {
    transitionTo: (patchId, durationMs = plan.transitionDurationMs) => {
      if (disposed) return false;
      const patch = plan.patches.find(({ id }) => id === patchId);
      if (!patch) return false;
      transitionOrigin = cloneState(current);
      target = cloneState(patch.state);
      transitionDuration = Math.max(0, Math.min(10, durationMs / 1_000));
      transitionElapsed = 0;
      particlePlan = patch.particles;
      particleGeometry.setDrawRange(0, particlePlan.count);
      particleMaterial.color.setHex(particleColor(particlePlan.kind));
      if (transitionDuration === 0) sampleTransition(1);
      return true;
    },
    update: (deltaSeconds) => {
      if (disposed) return;
      const delta = Math.max(0, Math.min(0.1, deltaSeconds));
      if (transitionElapsed < transitionDuration) {
        transitionElapsed = Math.min(transitionDuration, transitionElapsed + delta);
        sampleTransition(transitionDuration === 0 ? 1 : transitionElapsed / transitionDuration);
      }
      if (particlePlan.speed <= 0 || particlePlan.count <= 0) return;
      for (let index = 0; index < particlePlan.count; index += 1) {
        const offset = index * 3;
        particlePositions[offset + 1] = particlePositions[offset + 1]! - particlePlan.speed * delta;
        particlePositions[offset] = particlePositions[offset]!
          + Math.sin(particlePhases[index]! + transitionElapsed) * particlePlan.sway * delta;
        if (particlePositions[offset + 1]! < 0) particlePositions[offset + 1] = 44;
      }
      (particleGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    },
    getParticleCount: () => particlePlan.count,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      scene.remove(sky, ambient, sun, particles);
      skyGeometry.dispose();
      skyMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      if (scene.background === backgroundColor) scene.background = previousBackground;
      if (scene.fog === fog) scene.fog = previousFog;
    },
  };
}
