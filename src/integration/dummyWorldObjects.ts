import * as THREE from "three";
import type { SemanticAnchorStaging } from "../dream";

export interface DreamBeacon {
  readonly root: THREE.Group;
  setAwakened(awakened: boolean): void;
  dispose(): void;
}

export interface SemanticObjective extends DreamBeacon {
  readonly kind: "entity" | "structure" | "prop" | "zone" | "fallback";
}

export interface SemanticWorldMarkers {
  readonly root: THREE.Group;
  dispose(): void;
}

export function createSemanticWorldMarkers(
  landmark: readonly [number, number, number],
  path: readonly (readonly [number, number, number])[],
  color: number,
): SemanticWorldMarkers {
  const root = new THREE.Group();
  root.name = "semantic-world-staging";
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.45,
    roughness: 0.5,
  });
  const landmarkGeometry = new THREE.ConeGeometry(1.4, 7, 6);
  const markerGeometry = new THREE.OctahedronGeometry(0.16, 0);
  const tower = new THREE.Mesh(landmarkGeometry, material);
  tower.position.set(landmark[0], landmark[1] + 3.5, landmark[2]);
  tower.name = "camera-facing-landmark";
  root.add(tower);
  for (const [index, point] of path.entries()) {
    const marker = new THREE.Mesh(markerGeometry, material);
    marker.position.set(point[0], point[1] + 0.2, point[2]);
    marker.scale.setScalar(index === path.length - 1 ? 1.5 : 1);
    marker.name = `objective-path-${index}`;
    root.add(marker);
  }
  return {
    root,
    dispose() {
      root.removeFromParent();
      root.clear();
      landmarkGeometry.dispose();
      markerGeometry.dispose();
      material.dispose();
    },
  };
}

export function createDreamBeacon(): DreamBeacon {
  const root = new THREE.Group();
  root.name = "moonwell-beacon";

  const baseGeometry = new THREE.CylinderGeometry(0.72, 0.92, 0.55, 12);
  const crystalGeometry = new THREE.OctahedronGeometry(0.58, 0);
  const ringGeometry = new THREE.TorusGeometry(0.92, 0.07, 8, 24);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b3d78,
    roughness: 0.72,
  });
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0x9edcff,
    emissive: 0x4676a8,
    emissiveIntensity: 0.8,
    roughness: 0.22,
  });
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4d58d,
    emissive: 0x8e6d23,
    emissiveIntensity: 0.55,
    roughness: 0.32,
    metalness: 0.45,
  });

  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.28;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
  crystal.position.y = 1.08;
  crystal.rotation.y = Math.PI / 4;
  crystal.castShadow = true;
  root.add(crystal);

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 1.08;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  let disposed = false;
  return {
    root,
    setAwakened(awakened) {
      if (disposed) return;
      crystalMaterial.emissiveIntensity = awakened ? 3.2 : 0.8;
      ringMaterial.emissiveIntensity = awakened ? 2.4 : 0.55;
      crystal.scale.setScalar(awakened ? 1.65 : 1);
      ring.scale.setScalar(awakened ? 1.45 : 1);
      root.rotation.y = awakened ? Math.PI / 6 : 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      baseGeometry.dispose();
      crystalGeometry.dispose();
      ringGeometry.dispose();
      baseMaterial.dispose();
      crystalMaterial.dispose();
      ringMaterial.dispose();
    },
  };
}

function objectiveKind(anchor: SemanticAnchorStaging): SemanticObjective["kind"] {
  if (anchor.source === "fallback") return "fallback";
  if (anchor.representation === "prop") return "prop";
  if (anchor.source === "entity" || anchor.representation === "entity") return "entity";
  if (anchor.source === "zone" || anchor.representation === "zone") return "zone";
  return "structure";
}

/** Creates a small semantic highlight around an authored target, never a generic replacement. */
export function createSemanticObjective(
  anchor: SemanticAnchorStaging,
  color: number,
): SemanticObjective {
  const kind = objectiveKind(anchor);
  if (kind === "fallback") return { ...createDreamBeacon(), kind };

  const root = new THREE.Group();
  root.name = `semantic-objective-${anchor.sourceId ?? anchor.anchorId}`;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    roughness: 0.36,
    metalness: 0.12,
  });
  materials.push(material);
  const add = (geometry: THREE.BufferGeometry, position: readonly [number, number, number]): THREE.Mesh => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  const words = `${anchor.sourcePhrase} ${anchor.concept} ${anchor.sourceId ?? ""}`.toLowerCase();

  if (kind === "prop" && words.includes("cup")) {
    add(new THREE.CylinderGeometry(0.75, 0.95, 1.25, 10, 1, true), [0, 0.85, 0]);
    add(new THREE.TorusGeometry(0.38, 0.09, 6, 12), [0.9, 0.9, 0]);
  } else if (kind === "prop" && words.includes("bowl")) {
    add(new THREE.TorusGeometry(0.9, 0.16, 8, 16), [0, 0.42, 0]);
    add(new THREE.CylinderGeometry(0.75, 0.95, 0.28, 12), [0, 0.22, 0]);
  } else if (kind === "prop" && (words.includes("sign") || words.includes("jackpot") || words.includes("board"))) {
    add(new THREE.BoxGeometry(1.6, 0.9, 0.12), [0, 1.35, 0]);
    add(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6), [0, 0.55, 0]);
  } else if (kind === "prop" && words.includes("instrument")) {
    add(new THREE.BoxGeometry(1.2, 0.26, 0.65), [0, 0.65, 0]);
    add(new THREE.CylinderGeometry(0.12, 0.14, 1.55, 8), [0, 1.35, 0]);
  } else if (kind === "zone") {
    add(new THREE.TorusGeometry(1.2, 0.08, 8, 24), [0, 0.08, 0]).rotation.x = Math.PI / 2;
  } else if (kind === "entity") {
    add(new THREE.TorusGeometry(0.75, 0.07, 8, 18), [0, 1.8, 0]).rotation.x = Math.PI / 2;
  } else {
    add(new THREE.TorusGeometry(1.05, 0.08, 8, 24), [0, 0.1, 0]).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.12, 1.35, 0.12), [0, 0.72, 0]);
  }

  let disposed = false;
  return {
    kind,
    root,
    setAwakened(awakened) {
      if (disposed) return;
      material.emissiveIntensity = awakened ? 2.5 : 0.5;
      root.scale.setScalar(awakened ? 1.25 : 1);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const item of materials) item.dispose();
    },
  };
}
