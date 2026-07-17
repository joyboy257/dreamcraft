import * as THREE from "three";
import type { DreamSpecV1 } from "../dream";
import type { DreamLibraryBinding } from "./grounding";

export interface DreamLibraryWorld {
  readonly root: THREE.Group;
  readonly renderedCapabilityIds: readonly string[];
  update(elapsedSeconds: number): void;
  dispose(): void;
}

export interface DreamLibraryWaterVolume {
  readonly center: readonly [number, number, number];
  readonly size: readonly [number, number, number];
  readonly buoyancy: number;
  readonly drag: number;
}

export function dreamLibraryCameraFocus(capabilityIds: readonly string[]): readonly [number, number, number] | null {
  if (capabilityIds.includes("school")) return [0, 12, -9];
  if (capabilityIds.includes("kitchen")) return [5, 13, -8];
  if (capabilityIds.includes("celebration")) return [1, 13, -9];
  return null;
}

export function dreamLibraryWaterVolumes(capabilityIds: readonly string[]): readonly DreamLibraryWaterVolume[] {
  return capabilityIds.includes("school")
    ? [{ center: [0, 10.4, -9], size: [25, 7, 14], buoyancy: 9, drag: 1.2 }]
    : [];
}

function material(color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...options });
}

function box(root: THREE.Object3D, name: string, size: readonly [number, number, number], position: readonly [number, number, number], color: number, options?: Partial<THREE.MeshStandardMaterialParameters>): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, options));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
}

function sphere(root: THREE.Object3D, name: string, radius: number, position: readonly [number, number, number], color: number, options?: Partial<THREE.MeshStandardMaterialParameters>): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material(color, options));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; root.add(mesh); return mesh;
}

function has(spec: DreamSpecV1, term: string): boolean {
  const haystack = `${spec.title} ${spec.blueprint.summary} ${spec.structures.map(({ id, kind, tags }) => `${id} ${kind} ${tags.join(" ")}`).join(" ")} ${spec.entities.map(({ id, displayName, tags }) => `${id} ${displayName} ${tags.join(" ")}`).join(" ")}`.toLowerCase();
  return haystack.includes(term);
}

function addWater(root: THREE.Group, center: readonly [number, number, number], size: readonly [number, number], animated: THREE.Object3D[]): void {
  const volume = new THREE.Mesh(new THREE.BoxGeometry(size[0], 1.2, size[1]), material(0x167ec1, { transparent: true, opacity: 0.34, depthWrite: false }));
  volume.name = "dreamlibrary-water-volume"; volume.position.set(center[0], center[1] - 0.6, center[2]); root.add(volume);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1], 12, 12), material(0x79d9ff, { transparent: true, opacity: 0.62, emissive: 0x0d4a78, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  surface.name = "dreamlibrary-water-surface"; surface.rotation.x = -Math.PI / 2; surface.position.set(...center); root.add(surface); animated.push(surface);
}

function addSchool(root: THREE.Group, animated: THREE.Object3D[]): void {
  const y = 11; const school = new THREE.Group(); school.name = "dreamlibrary-school-kit"; root.add(school);
  box(school, "school-floor", [27, 0.3, 15], [0, y - 1, -9], 0x98a1aa);
  box(school, "school-left-wall", [0.45, 6, 15], [-13, y + 2, -9], 0x78828f);
  box(school, "school-right-wall", [0.45, 6, 15], [13, y + 2, -9], 0x78828f);
  box(school, "classroom-divider", [0.35, 5, 12], [-3, y + 1.5, -11], 0xc7b99e);
  for (let index = 0; index < 7; index += 1) box(school, `locker-${index + 1}`, [1.4, 3.4, 0.6], [-11 + index * 2.1, y + 0.7, -15.8], 0x3973ad, { metalness: 0.35 });
  for (let index = 0; index < 4; index += 1) {
    box(school, `desk-top-${index + 1}`, [1.7, 0.2, 1.2], [2 + (index % 2) * 3, y + 0.3, -6 + Math.floor(index / 2) * 3], 0x81563e);
    box(school, `desk-leg-${index + 1}`, [0.2, 1.1, 0.2], [2 + (index % 2) * 3, y - 0.25, -6 + Math.floor(index / 2) * 3], 0x36404c);
  }
  for (let index = 0; index < 3; index += 1) {
    const message = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), material(0xf5e9c8, { emissive: 0x4a3f2c, emissiveIntensity: 0.2 }));
    message.name = `written-message-${index + 1}`; message.position.set(-4 + index * 3.5, y + 1.1, -8.6); message.rotation.y = Math.PI; school.add(message);
  }
  box(school, "school-board", [5.5, 2.7, 0.12], [8, y + 2.1, -15.3], 0x173e2c);
  for (let step = 0; step < 6; step += 1) box(school, `exit-stair-${step + 1}`, [3.8, 0.45, 0.7], [10, y - 0.7 + step * 0.45, -3 - step * 0.7], 0x9da5ae);
  addWater(school, [0, y, -9], [25, 14], animated);
  for (let index = 0; index < 3; index += 1) addPaperBoat(school, `paper-boat-${index + 1}`, [-3 + index * 4, y + 0.2, -9 + index]);
}

function addPaperBoat(root: THREE.Object3D, name: string, position: readonly [number, number, number]): void {
  const boat = new THREE.Group(); boat.name = name; boat.position.set(...position);
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 3), material(0xf4ead4)); hull.rotation.x = Math.PI / 2; boat.add(hull);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.35, 3), material(0xfff7e8)); sail.position.y = 0.62; sail.rotation.y = Math.PI / 2; boat.add(sail); root.add(boat);
}

function addKitchen(root: THREE.Group): void {
  const y = 11; const kitchen = new THREE.Group(); kitchen.name = "dreamlibrary-kitchen-kit"; root.add(kitchen);
  box(kitchen, "kitchen-floor", [26, 0.3, 17], [1, y - 1, -7], 0xd9c6ae);
  box(kitchen, "kitchen-counter", [12, 2.2, 2.5], [-7, y + 0.1, -12], 0x754937);
  box(kitchen, "kitchen-counter-top", [12.4, 0.25, 2.8], [-7, y + 1.25, -12], 0xf1e7d5);
  const window = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), material(0x87cfff, { emissive: 0x4f8fff, emissiveIntensity: 1.2 })); window.name = "moon-window"; window.position.set(-9, y + 4.2, -14.6); kitchen.add(window);
  sphere(kitchen, "moon", 1.05, [-9, y + 4.2, -14.45], 0xfff2bd, { emissive: 0xffe8a1, emissiveIntensity: 1.5 });
  const cup = new THREE.Group(); cup.name = "giant-cup"; cup.position.set(8, y + 2.4, -6); kitchen.add(cup);
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.1, 4.9, 24, 1, true), material(0xb8e1f5, { side: THREE.DoubleSide })); cup.add(cupBody);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.24, 10, 24), material(0xe8f8ff)); rim.rotation.x = Math.PI / 2; rim.position.y = 2.45; cup.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.25, 10, 18, Math.PI), material(0xb8e1f5)); handle.rotation.z = -Math.PI / 2; handle.position.set(2.5, 0.4, 0); cup.add(handle);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), material(0xf6f1df)); bowl.name = "sugar-bowl"; bowl.position.set(1.8, y + 0.4, -7); kitchen.add(bowl);
  sphere(kitchen, "sugar", 1.08, [1.8, y + 0.55, -7], 0xfff8e6);
  box(kitchen, "moon-door-left", [0.55, 4.6, 0.5], [12.5, y + 1.3, -13.5], 0x69489d, { emissive: 0x35254f, emissiveIntensity: 0.5 });
  box(kitchen, "moon-door-right", [0.55, 4.6, 0.5], [16.2, y + 1.3, -13.5], 0x69489d, { emissive: 0x35254f, emissiveIntensity: 0.5 });
  const moonDoor = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.32, 10, 18, Math.PI), material(0xc9b2ff, { emissive: 0x4d347c, emissiveIntensity: 0.7 })); moonDoor.name = "moon-door"; moonDoor.position.set(14.35, y + 3.6, -13.5); kitchen.add(moonDoor);
}

function addMoth(root: THREE.Group, position: readonly [number, number, number], animated: THREE.Object3D[]): void {
  const moth = new THREE.Group(); moth.name = "dreamlibrary-moth"; moth.position.set(...position); root.add(moth);
  sphere(moth, "moth-body", 0.38, [0, 0, 0], 0xf4d58d, { emissive: 0x80612e, emissiveIntensity: 0.5 });
  for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.CircleGeometry(0.95, 3), material(0xdab8ff, { transparent: true, opacity: 0.88, side: THREE.DoubleSide })); wing.name = `moth-wing-${side}`; wing.position.set(side * 0.52, 0.1, 0); wing.rotation.y = side * 0.3; moth.add(wing); }
  animated.push(moth);
}

function addDog(root: THREE.Group, position: readonly [number, number, number], animated: THREE.Object3D[]): void {
  const dog = new THREE.Group(); dog.name = "dreamlibrary-dog"; dog.position.set(...position); root.add(dog);
  sphere(dog, "dog-body", 0.75, [0, 0.65, 0], 0xb77b4d); sphere(dog, "dog-head", 0.48, [0, 1.15, 0.58], 0xd49a65);
  for (const x of [-0.45, 0.45]) for (const z of [-0.42, 0.42]) box(dog, `dog-leg-${x}-${z}`, [0.2, 0.75, 0.2], [x, 0.3, z], 0x75452e);
  sphere(dog, "dog-nose", 0.12, [0, 1.14, 1], 0x191820); animated.push(dog);
}

function addCelebration(root: THREE.Group, animated: THREE.Object3D[]): void {
  const y = 11; const stage = new THREE.Group(); stage.name = "dreamlibrary-celebration-kit"; root.add(stage);
  box(stage, "celebration-stage", [18, 1, 8], [1, y - 0.45, -9], 0x703e76, { emissive: 0x251024, emissiveIntensity: 0.4 });
  box(stage, "jackpot-board", [7, 3.5, 0.35], [1, y + 2.5, -12.8], 0x162a36, { emissive: 0x24667d, emissiveIntensity: 0.7 });
  box(stage, "jackpot-digits", [5.5, 1, 0.15], [1, y + 2.5, -12.55], 0xffde5c, { emissive: 0xffa800, emissiveIntensity: 1.5 });
  for (const x of [-6, 0, 6]) box(stage, `celebration-banner-${x}`, [3.4, 1.2, 0.1], [x, y + 5, -12.2], 0xf75e91);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) { sphere(stage, `family-${x}`, 0.52, [x, y + 1.25, -8.5], 0xf0b48a); box(stage, `family-body-${x}`, [0.8, 1.3, 0.5], [x, y + 0.45, -8.5], x < 0 ? 0x5ea6dc : 0xe279a3); }
  for (const [index, x] of [-4.5, -1.5, 1.5, 4.5].entries()) {
    const instrument = new THREE.Mesh(index % 2 === 0 ? new THREE.CylinderGeometry(0.26, 0.32, 1.1, 8) : new THREE.TorusGeometry(0.42, 0.12, 8, 12), material(0xffd85d, { metalness: 0.55, roughness: 0.25 }));
    instrument.name = `family-instrument-${index + 1}`; instrument.position.set(x, y + 1.2, -7.8); instrument.rotation.z = index % 2 === 0 ? Math.PI / 2 : 0; stage.add(instrument);
  }
  box(stage, "lottery-ticket", [2.5, 1.1, 0.12], [1, y + 1, -7.5], 0xf4e5a7, { emissive: 0x59471a, emissiveIntensity: 0.35 });
  for (let index = 0; index < 32; index += 1) { const rain = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 4), material(0xffd85d, { emissive: 0xffbd00, emissiveIntensity: 0.8 })); rain.name = `golden-rain-${index}`; rain.position.set(-8 + (index % 8) * 2.2, y + 4 + Math.floor(index / 8) * 0.5, -7 + (index % 3)); stage.add(rain); animated.push(rain); }
}

function addShadow(root: THREE.Group, position: readonly [number, number, number], animated: THREE.Object3D[]): void {
  const shadow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 10), material(0x12121e, { transparent: true, opacity: 0.82, emissive: 0x10101c, emissiveIntensity: 0.45 })); shadow.name = "dreamlibrary-shadow"; shadow.scale.y = 1.7; shadow.position.set(...position); root.add(shadow); animated.push(shadow);
}

export function createDreamLibraryWorld(spec: DreamSpecV1, binding?: DreamLibraryBinding): DreamLibraryWorld {
  const root = new THREE.Group(); root.name = "dreamlibrary-world";
  const animated: THREE.Object3D[] = []; const capabilities: string[] = [];
  if (has(spec, "school")) { addSchool(root, animated); capabilities.push("school", "water", "paper-boat", "swimming-route"); }
  if (has(spec, "kitchen") || has(spec, "giant-cup")) { addKitchen(root); capabilities.push("kitchen", "giant-cup", "sugar-bowl", "scale-traversal"); }
  if (has(spec, "moth")) { addMoth(root, [-4, 13, -4], animated); capabilities.push("moth"); }
  if (has(spec, "dog")) { addDog(root, [-5, 11.4, -6], animated); capabilities.push("dog"); }
  if (has(spec, "shadow")) { addShadow(root, [8, 12.7, -9], animated); capabilities.push("shadow"); }
  if (has(spec, "lottery") || has(spec, "celebrat") || has(spec, "jackpot")) { addCelebration(root, animated); capabilities.push("celebration", "family", "lottery-ticket", "performance"); }
  const renderedTargets: Readonly<Record<string, string>> = {
    school: "dreamlibrary-school-kit", kitchen: "dreamlibrary-kitchen-kit", moth: "dreamlibrary-moth",
    dog: "dreamlibrary-dog", shadow: "dreamlibrary-shadow", "giant-cup": "giant-cup",
    "sugar-bowl": "sugar-bowl", "paper-boat": "paper-boat-1", "exit-stairwell": "exit-stair-1",
    "moon-door": "moon-door", celebration: "dreamlibrary-celebration-kit", "celebration-stage": "dreamlibrary-celebration-kit",
    "golden-house": "dreamlibrary-celebration-kit", "jackpot-board": "jackpot-board", family: "family--4.5",
    "family-instruments": "dreamlibrary-celebration-kit", "procedural-guide": "dream-guide-staging", "objective-beacon": "dreamlibrary-world",
  };
  for (const anchor of binding?.anchors ?? []) {
    const target = root.getObjectByName(renderedTargets[anchor.capabilityId] ?? "");
    if (target) target.userData.dreamLibraryInstanceId = anchor.renderedInstanceId;
  }
  return {
    root,
    renderedCapabilityIds: [...new Set(capabilities)],
    update(elapsedSeconds) { animated.forEach((object, index) => { object.position.y += Math.sin(elapsedSeconds * 2 + index) * 0.003; if (object.name.includes("water")) object.rotation.z = Math.sin(elapsedSeconds) * 0.018; }); },
    dispose() { root.traverse((object) => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.forEach((entry) => entry?.dispose()); }); },
  };
}
