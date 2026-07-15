import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { createDreamGuide } from "./dreamGuide";

function isMesh(
  object: THREE.Object3D,
): object is THREE.Mesh<
  THREE.BufferGeometry,
  THREE.Material | THREE.Material[]
> {
  return object instanceof THREE.Mesh;
}

describe("createDreamGuide", () => {
  it("builds a readable named hierarchy with deterministic animation", () => {
    const guide = createDreamGuide({ seed: 42, scale: 99 });
    const before = guide.root.getObjectByName("float-pivot")?.position.y;

    guide.setState("guiding");
    guide.update({ elapsedSeconds: 2, deltaSeconds: 1 / 60 });

    expect(guide.state).toBe("guiding");
    expect(guide.root.getObjectByName("left-ear")).toBeDefined();
    expect(guide.root.getObjectByName("right-lantern-wing")).toBeDefined();
    expect(guide.root.getObjectByName("left-glowing-eye")).toBeDefined();
    expect(guide.root.getObjectByName("moon-key-necklace")).toBeDefined();
    expect(guide.root.getObjectByName("float-pivot")?.position.y).not.toBe(
      before,
    );
    expect(guide.getReadabilityReport()).toMatchObject({
      iconicFeatureCount: 4,
      scaleRelativeToPlayer: 2.25,
      passed: true,
    });
  });

  it("disposes each owned resource exactly once", () => {
    const guide = createDreamGuide();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    guide.root.traverse((object) => {
      if (!isMesh(object)) return;
      geometries.add(object.geometry);
      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of meshMaterials) materials.add(material);
    });
    const disposalSpies = [
      ...[...geometries].map((geometry) => vi.spyOn(geometry, "dispose")),
      ...[...materials].map((material) => vi.spyOn(material, "dispose")),
    ];

    guide.dispose();
    guide.dispose();

    expect(guide.root.children).toHaveLength(0);
    expect(disposalSpies.length).toBeGreaterThan(0);
    for (const spy of disposalSpies) expect(spy).toHaveBeenCalledOnce();
  });
});
