import * as THREE from "three";

export interface BootstrapScene {
  dispose: () => void;
}

interface BootstrapSceneOptions {
  onFailure: (message: string) => void;
}

const VOXEL_COUNT = 49;

export function createBootstrapScene(
  canvas: HTMLCanvasElement,
  options: BootstrapSceneOptions,
): BootstrapScene {
  let disposed = false;
  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    options.onFailure("WebGL could not initialize on this device.");
    return { dispose: () => undefined };
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090817, 0.055);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  camera.position.set(10, 8, 12);
  camera.lookAt(0, 1, 0);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const hemisphere = new THREE.HemisphereLight(0xc7bdff, 0x151027, 2.1);
  const keyLight = new THREE.DirectionalLight(0xffd9ad, 3.2);
  keyLight.position.set(6, 11, 4);
  scene.add(hemisphere, keyLight);

  const voxelGeometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const voxelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.04,
  });
  const voxels = new THREE.InstancedMesh(
    voxelGeometry,
    voxelMaterial,
    VOXEL_COUNT,
  );
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  let instance = 0;

  for (let x = -3; x <= 3; x += 1) {
    for (let z = -3; z <= 3; z += 1) {
      const distance = Math.hypot(x, z);
      const height = Math.max(0, 2.4 - distance * 0.52);
      transform.position.set(x, height * 0.5 - 0.35, z);
      transform.scale.set(1, 1 + height, 1);
      transform.updateMatrix();
      voxels.setMatrixAt(instance, transform.matrix);

      const hue = (0.69 + (x + z + 6) * 0.012) % 1;
      color.setHSL(hue, 0.58, 0.55 + height * 0.035);
      voxels.setColorAt(instance, color);
      instance += 1;
    }
  }
  voxels.instanceMatrix.needsUpdate = true;
  if (voxels.instanceColor) voxels.instanceColor.needsUpdate = true;
  scene.add(voxels);

  const ringGeometry = new THREE.TorusGeometry(4.8, 0.025, 6, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x9d8cff,
    transparent: true,
    opacity: 0.45,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.78;
  scene.add(ring);

  const resize = (): void => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const handleContextLoss = (event: Event): void => {
    event.preventDefault();
    options.onFailure("The 3D context paused. Reload to restore the preview.");
  };
  canvas.addEventListener("webglcontextlost", handleContextLoss);

  const startedAt = performance.now();
  renderer.setAnimationLoop((now) => {
    if (disposed) return;
    const elapsed = (now - startedAt) / 1_000;
    voxels.rotation.y = elapsed * 0.09;
    voxels.position.y = Math.sin(elapsed * 0.7) * 0.08;
    ring.rotation.z = elapsed * -0.045;
    renderer.render(scene, camera);
  });

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      voxelGeometry.dispose();
      voxelMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      scene.clear();
    },
  };
}
