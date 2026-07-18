import {
  MockLocalGenerationProvider,
  sanitizeDreamSpec,
  type DreamSpecV1,
} from "../dream";

export interface DreamLibraryShowcase {
  id: "moonlit-kitchen" | "flooded-school" | "lottery-family";
  label: string;
  summary: string;
  centralObject: string;
  expectedScenario: string;
  prompt: string;
  spec: DreamSpecV1;
}

export const DREAM_LIBRARY_SHOWCASE_CARDS = [
  {
    id: "moonlit-kitchen",
    label: "Tiny wonder",
    summary: "Fill the moonlit giant cup with Luna Moth.",
    prompt: "I was tiny in a moonlit kitchen where teacups floated and a patient moth guarded the sugar bowl.",
  },
  {
    id: "flooded-school",
    label: "Lost messages",
    summary: "Swim past paper boats and find the exit stairwell.",
    prompt: "A flooded school repeated forever while paper boats carried messages from my childhood dog.",
  },
  {
    id: "lottery-family",
    label: "Golden celebration",
    summary: "Lead a family band beneath singing jackpot lights.",
    prompt: "My family celebrated beneath a golden rainstorm as the city buildings slowly turned into instruments.",
  },
] as const;

function showcaseCard(id: DreamLibraryShowcase["id"]): (typeof DREAM_LIBRARY_SHOWCASE_CARDS)[number] {
  const card = DREAM_LIBRARY_SHOWCASE_CARDS.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`DreamLibrary showcase unavailable: ${id}`);
  return card;
}

async function baseSpec(dreamText: string, clientRequestId: string): Promise<DreamSpecV1> {
  const generated = await new MockLocalGenerationProvider().generate({
    dreamText,
    intensity: "vivid",
    strategy: "mock-local",
    clientRequestId,
  }, new AbortController().signal);
  return structuredClone(generated.core);
}

function finish(spec: DreamSpecV1): DreamSpecV1 {
  const result = sanitizeDreamSpec(spec);
  if (!result.success) {
    throw new Error(result.issues.map(({ path, message }) => `${path}: ${message}`).join("; "));
  }
  return result.spec;
}

function showcaseMaterials(
  visual: DreamSpecV1["entities"][number]["visual"],
  primary: number,
  accent: number,
  eye: number,
): void {
  visual.palette = { ...visual.palette, primary, secondary: accent, accent, eye };
  const first = visual.materials[0];
  const solid = (material: DreamSpecV1["entities"][number]["visual"]["materials"][number], color: number, id = material.id) => ({
    ...material,
    id,
    preset: "matte" as const,
    color,
    roughness: 0.55,
    metalness: 0,
    opacity: 1,
    emissive: 0,
  });
  visual.materials = visual.materials.length >= 2
    ? visual.materials.map((material, index) => solid(material, index === 0 ? primary : index === 1 ? accent : material.color))
    : first === undefined
      ? [{ id: "showcase-primary", preset: "toon", color: primary, roughness: 0.5, metalness: 0, opacity: 1, emissive: 0 }, { id: "showcase-accent", preset: "toon", color: accent, roughness: 0.5, metalness: 0, opacity: 1, emissive: 0 }]
      : [solid(first, primary), solid(first, accent, "showcase-accent")];
}

function rebindDialogueSpeaker(spec: DreamSpecV1, entityId: string): void {
  spec.dialogues = spec.dialogues.map((dialogue) => ({ ...dialogue, speakerEntityId: entityId }));
}

async function moonlitKitchen(): Promise<DreamLibraryShowcase> {
  const card = showcaseCard("moonlit-kitchen");
  const { prompt } = card;
  const spec = await baseSpec(prompt, "dreamlibrary-moonlit-kitchen");
  const hero = spec.entities[0]!;
  hero.id = "luna-moth";
  rebindDialogueSpeaker(spec, hero.id);
  hero.displayName = "Luna Moth";
  hero.visual.bodyPlan = "moth";
  hero.visual.scale = 1.85;
  showcaseMaterials(hero.visual, 0x352050, 0xf0a4c8, 0x16131d);
  hero.visual.face = { eyeStyle: "glowing", eyeScale: 1.2, eyeSpacing: 0.6, mouthStyle: "none", defaultExpression: "curious" };
  hero.visual.animationStyle = { idle: "float", locomotion: "fly", emotion: "wave", speedMultiplier: 1.15, exaggeration: 1.25 };
  const mothMaterial = hero.visual.materials[0]?.id ?? "body";
  hero.visual.features = [
    { kind: "antenna", style: "moon-feelers", size: 1, materialSlot: mothMaterial },
    { kind: "wing", style: "patterned", size: 1, materialSlot: mothMaterial },
    { kind: "tail", style: "abdomen", size: 0.8, materialSlot: mothMaterial },
  ];
  hero.visual.recognitionFeatures = ["four broad wings", "feathered antennae", "segmented abdomen", "bright eyes"];
  hero.spawn = { kind: "fixed", positions: [[0, 8, -2]] };
  hero.tags = ["moth-guide", "guide", "hero"];
  spec.budgets.structures = 5;
  spec.budgets.entityDefinitions = 1;
  spec.budgets.entityInstances = 2;
  spec.blueprint.semanticAnchors = [
    { id: "moonlit-kitchen", concept: "moonlit kitchen", sourcePhrase: "moonlit kitchen", role: "environment", representation: "structure", gameplayRole: "landmark", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "giant-cup", concept: "giant cup to fill", sourcePhrase: "giant moonlit cup", role: "object", representation: "prop", gameplayRole: "objective", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "sugar-bowl", concept: "sugar bowl", sourcePhrase: "sugar bowl", role: "object", representation: "prop", gameplayRole: "route", importance: 4, nearSpawn: true, mustAppear: true },
    { id: "moth-guide", concept: "moth guide", sourcePhrase: "moth guide", role: "character", representation: "entity", gameplayRole: "guide", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "moon-door", concept: "moon doorway", sourcePhrase: "moon doorway", role: "object", representation: "structure", gameplayRole: "ending", importance: 4, nearSpawn: true, mustAppear: true },
  ];
  spec.structures = [
    { id: "moonlit-kitchen", kind: "kitchen", position: [-12, 10, -8], width: 12, height: 7, depth: 10, block: "fragment_surface", tags: ["moonlit-kitchen"] },
    { id: "giant-cup", kind: "giant_cup", position: [8, 10, -5], width: 7, height: 7, depth: 7, block: "beacon_block", interactionId: "fill_giant_cup", tags: ["giant-cup", "objective"] },
    { id: "sugar-bowl", kind: "bowl", position: [2, 10, -10], width: 6, height: 4, depth: 6, block: "fragment_surface", tags: ["sugar-bowl"] },
    { id: "moon-door", kind: "doorway", position: [15, 10, -12], width: 6, height: 7, depth: 3, block: "beacon_block", tags: ["moon-door"] },
  ];
  spec.playGraph.experienceName = "The Moonlit Kitchen";
  spec.title = "The Moonlit Kitchen";
  spec.playGraph.experienceTags = ["transformation"];
  spec.playGraph.availableVerbs = [{ mechanic: "repair", label: "Fill the giant cup", targetTags: ["giant-cup"] }];
  spec.playGraph.beats = [{
    id: "fill-the-cup", title: "Fill the Giant Cup", objectiveText: "Bring moonlight to the giant cup.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "fill_giant_cup" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "giant-cup", state: "brimming" }, { kind: "complete_experience", endingId: "kitchen-remembers" }], optional: false,
  }];
  spec.playGraph.endings = [{ id: "kitchen-remembers", title: "The Kitchen Remembers", narration: "The giant cup shines, and the moonlit kitchen returns to its gentle rhythm.", condition: { kind: "interacted", targetId: "fill_giant_cup" }, effects: [] }];
  return { ...card, centralObject: "giant-cup", expectedScenario: "guarded_objective", spec: finish(spec) };
}

async function floodedSchool(): Promise<DreamLibraryShowcase> {
  const card = showcaseCard("flooded-school");
  const { prompt } = card;
  const spec = await baseSpec(prompt, "dreamlibrary-flooded-school");
  const dog = spec.entities[0]!;
  dog.id = "childhood-dog";
  rebindDialogueSpeaker(spec, dog.id);
  dog.displayName = "Childhood Dog";
  dog.visual.bodyPlan = "dog";
  dog.visual.scale = 1.55;
  showcaseMaterials(dog.visual, 0x8b4a2d, 0xf1d19b, 0x151017);
  dog.visual.animationStyle = { idle: "breathe", locomotion: "walk", emotion: "cheer", speedMultiplier: 1.1, exaggeration: 1.15 };
  const dogMaterial = dog.visual.materials[0]?.id ?? "body";
  dog.visual.features = [
    { kind: "ear", style: "floppy", size: 1, materialSlot: dogMaterial },
    { kind: "snout", style: "muzzle", size: 1, materialSlot: dogMaterial },
    { kind: "paw", style: "four-paws", size: 1, materialSlot: dogMaterial },
    { kind: "tail", style: "wagging", size: 1, materialSlot: dogMaterial },
  ];
  dog.visual.recognitionFeatures = ["muzzle", "upright ears", "four paws", "connected tail"];
  dog.spawn = { kind: "fixed", positions: [[0, 8, -2]] };
  dog.tags = ["childhood-dog", "guide", "hero"];
  const shadow: DreamSpecV1["entities"][number] = {
    ...structuredClone(dog), id: "hallway-shadow", displayName: "Hallway Shadow", role: "threat", visual: { ...structuredClone(dog.visual), bodyPlan: "blob", palette: { ...dog.visual.palette, primary: 0x161a2b } }, spawn: { kind: "fixed", positions: [[9, 12, -10]] }, behavior: { kind: "guard", targetId: "exit-stairwell", warningRadius: 5, chaseRadius: 9, speed: 4 }, tags: ["hallway-shadow", "threat"],
  };
  spec.entities = [dog, shadow];
  spec.budgets.structures = 5;
  spec.budgets.entityDefinitions = 2;
  spec.budgets.entityInstances = 3;
  spec.blueprint.semanticAnchors = [
    { id: "flooded-school", concept: "flooded school", sourcePhrase: "flooded school", role: "environment", representation: "structure", gameplayRole: "landmark", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "paper-boats", concept: "paper boats", sourcePhrase: "paper boats", role: "object", representation: "prop", gameplayRole: "route", importance: 4, nearSpawn: true, mustAppear: true },
    { id: "childhood-dog", concept: "childhood dog", sourcePhrase: "childhood dog", role: "character", representation: "entity", gameplayRole: "guide", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "hallway-shadow", concept: "hallway shadow", sourcePhrase: "hallway shadow", role: "character", representation: "entity", gameplayRole: "obstacle", importance: 4, nearSpawn: true, mustAppear: true },
    { id: "exit-stairwell", concept: "exit stairwell", sourcePhrase: "exit stairwell", role: "object", representation: "structure", gameplayRole: "objective", importance: 5, nearSpawn: true, mustAppear: true },
  ];
  spec.structures = [
    { id: "flooded-school", kind: "school", position: [-12, 10, -9], width: 14, height: 8, depth: 12, block: "fragment_surface", tags: ["flooded-school"] },
    { id: "flooded-hall", kind: "corridor", position: [0, 10, -8], width: 7, height: 4, depth: 14, block: "fragment_surface", tags: ["flooded-hall"] },
    { id: "paper-boats", kind: "platform", position: [1, 10, -4], width: 5, height: 3, depth: 4, block: "beacon_block", tags: ["paper-boats"] },
    { id: "exit-stairwell", kind: "doorway", position: [12, 10, -13], width: 6, height: 8, depth: 3, block: "beacon_block", interactionId: "reach_exit_stairwell", tags: ["exit-stairwell", "objective"] },
  ];
  spec.playGraph.experienceName = "Flooded School Escape";
  spec.title = "Flooded School Escape";
  spec.playGraph.experienceTags = ["pursuit", "survival"];
  spec.playGraph.availableVerbs = [{ mechanic: "evade", label: "Reach the exit stairwell", targetTags: ["exit-stairwell"] }];
  spec.playGraph.beats = [{ id: "escape-school", title: "Reach the Exit Stairwell", objectiveText: "Evade the hallway shadow and reach the exit stairwell.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "reach_exit_stairwell" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "exit-stairwell", state: "open" }, { kind: "complete_experience", endingId: "school-released" }], optional: false }];
  spec.playGraph.endings = [{ id: "school-released", title: "The School Releases You", narration: "Your childhood dog crosses the exit stairwell as the flooded school finally lets the loop drain away.", condition: { kind: "interacted", targetId: "reach_exit_stairwell" }, effects: [] }];
  return { ...card, centralObject: "exit-stairwell", expectedScenario: "pursuit", spec: finish(spec) };
}

async function lotteryFamily(): Promise<DreamLibraryShowcase> {
  const card = showcaseCard("lottery-family");
  const { prompt } = card;
  const spec = await baseSpec(prompt, "dreamlibrary-lottery-family");
  const family = spec.entities[0]!;
  family.id = "family-adult";
  rebindDialogueSpeaker(spec, family.id);
  family.displayName = "Family Adult";
  family.visual.bodyPlan = "humanoid_adult";
  family.visual.scale = 1.3;
  showcaseMaterials(family.visual, 0x2e6f95, 0xf2c14e, 0x1d1720);
  family.visual.features = [{ kind: "hair", style: "wave", size: 1, materialSlot: family.visual.materials[0]?.id ?? "body" }, { kind: "necklace", style: "keepsake", size: 0.8, materialSlot: family.visual.materials[0]?.id ?? "body" }];
  family.visual.recognitionFeatures = ["upright torso", "hair", "hands", "shoes"];
  family.spawn = { kind: "fixed", positions: [[-4, 8, -2]] };
  family.tags = ["family-band", "family-adult", "guide", "hero"];
  const familyChild = structuredClone(family);
  familyChild.id = "family-child";
  familyChild.displayName = "Family Child";
  familyChild.role = "companion";
  familyChild.visual.bodyPlan = "humanoid_child";
  familyChild.visual.scale = 1.05;
  showcaseMaterials(familyChild.visual, 0xc84b66, 0x79c267, 0x1d1720);
  familyChild.visual.animationStyle = { ...family.visual.animationStyle, locomotion: "waddle", emotion: "dance" };
  familyChild.visual.features = [{ kind: "hat", style: "cap", size: 0.8, materialSlot: familyChild.visual.materials[0]?.id ?? "body" }, { kind: "hair", style: "short", size: 0.8, materialSlot: familyChild.visual.materials[0]?.id ?? "body" }];
  familyChild.visual.recognitionFeatures = ["shorter height", "cap", "hands", "shoes"];
  familyChild.spawn = { kind: "fixed", positions: [[-1, 8, -2]] };
  familyChild.tags = ["family-band", "family-child", "companion"];
  const familyElder = structuredClone(family);
  familyElder.id = "family-elder";
  familyElder.displayName = "Family Elder";
  familyElder.role = "companion";
  familyElder.visual.bodyPlan = "humanoid_elder";
  familyElder.visual.scale = 1.22;
  showcaseMaterials(familyElder.visual, 0x6d597a, 0xe9c46a, 0x1d1720);
  familyElder.visual.animationStyle = { ...family.visual.animationStyle, locomotion: "walk", emotion: "cheer" };
  familyElder.visual.features = [{ kind: "hair", style: "silver", size: 1.1, materialSlot: familyElder.visual.materials[0]?.id ?? "body" }, { kind: "backpack", style: "satchel", size: 0.8, materialSlot: familyElder.visual.materials[0]?.id ?? "body" }];
  familyElder.visual.recognitionFeatures = ["tall posture", "silver hair", "walking cane", "shoes"];
  familyElder.spawn = { kind: "fixed", positions: [[2, 8, -2]] };
  familyElder.tags = ["family-band", "family-elder", "companion"];
  spec.entities = [family, familyChild, familyElder];
  spec.budgets.structures = 6;
  spec.budgets.entityDefinitions = 3;
  spec.budgets.entityInstances = 4;
  spec.blueprint.semanticAnchors = [
    { id: "jackpot-board", concept: "jackpot board", sourcePhrase: "lottery jackpot board", role: "object", representation: "prop", gameplayRole: "landmark", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "family-band", concept: "family group", sourcePhrase: "family celebrating", role: "character", representation: "entity", gameplayRole: "guide", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "golden-house", concept: "golden family house", sourcePhrase: "golden house", role: "environment", representation: "structure", gameplayRole: "landmark", importance: 4, nearSpawn: true, mustAppear: true },
    { id: "celebration-stage", concept: "celebration stage", sourcePhrase: "bright stage", role: "object", representation: "structure", gameplayRole: "objective", importance: 5, nearSpawn: true, mustAppear: true },
    { id: "family-instruments", concept: "family instruments", sourcePhrase: "buildings becoming instruments", role: "object", representation: "prop", gameplayRole: "route", importance: 4, nearSpawn: true, mustAppear: true },
  ];
  spec.structures = [
    { id: "jackpot-board", kind: "jackpot_board", position: [-10, 10, -10], width: 8, height: 7, depth: 3, block: "beacon_block", tags: ["jackpot-board"] },
    { id: "golden-house", kind: "house", position: [-14, 10, 4], width: 11, height: 8, depth: 10, block: "fragment_surface", tags: ["golden-house"] },
    { id: "celebration-stage", kind: "stage", position: [7, 10, -8], width: 12, height: 5, depth: 9, block: "beacon_block", interactionId: "lead_family_finale", tags: ["celebration-stage", "objective"] },
    { id: "family-instruments", kind: "instrument", position: [2, 10, -12], width: 8, height: 6, depth: 5, block: "fragment_surface", tags: ["family-instruments"] },
  ];
  spec.playGraph.experienceName = "The Lottery Family Finale";
  spec.title = "The Lottery Family Finale";
  spec.playGraph.experienceTags = ["celebration", "performance"];
  spec.playGraph.availableVerbs = [{ mechanic: "perform", label: "Lead the family finale", targetTags: ["celebration-stage"] }];
  spec.playGraph.beats = [{ id: "lead-family-finale", title: "Lead the Family Finale", objectiveText: "Bring the family band to the bright stage.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "lead_family_finale" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "celebration-stage", state: "singing" }, { kind: "complete_experience", endingId: "family-wins-together" }], optional: false }];
  spec.playGraph.endings = [{ id: "family-wins-together", title: "The Family Wins Together", narration: "The jackpot board sings while the family turns the bright stage and its instruments into a shared celebration.", condition: { kind: "interacted", targetId: "lead_family_finale" }, effects: [] }];
  return { ...card, centralObject: "celebration-stage", expectedScenario: "performance", spec: finish(spec) };
}

export async function createDreamLibraryShowcases(): Promise<readonly DreamLibraryShowcase[]> {
  return [await moonlitKitchen(), await floodedSchool(), await lotteryFamily()];
}
