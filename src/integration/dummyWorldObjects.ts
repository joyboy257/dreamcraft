import * as THREE from "three";

export interface DreamBeacon {
  readonly root: THREE.Group;
  setAwakened(awakened: boolean): void;
  dispose(): void;
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
