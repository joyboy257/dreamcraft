import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { cameraRotationToward } from "./voxelEngine";

describe("cameraRotationToward", () => {
  it("faces a staged landmark above and in front of the camera", () => {
    const rotation = cameraRotationToward(
      { x: 0, y: 2, z: 0 },
      { x: 0, y: 7, z: -10 },
    );
    const camera = new THREE.PerspectiveCamera();
    camera.rotation.order = "YXZ";
    camera.rotation.set(rotation.pitch, rotation.yaw, 0);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    expect(forward.z).toBeLessThan(0);
    expect(forward.y).toBeGreaterThan(0);
  });
});
