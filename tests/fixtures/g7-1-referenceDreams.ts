import {
  MockLocalGenerationProvider,
  sanitizeDreamSpec,
  type DreamSpecV1,
} from "../../src/dream";

export interface ReferenceDream {
  id: "moonlit-kitchen" | "flooded-school" | "lottery-family";
  centralObject: string;
  expectedScenario: string;
  spec: DreamSpecV1;
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

function rebindDialogueSpeaker(spec: DreamSpecV1, entityId: string): void {
  spec.dialogues = spec.dialogues.map((dialogue) => ({ ...dialogue, speakerEntityId: entityId }));
}

async function moonlitKitchen(): Promise<ReferenceDream> {
  const spec = await baseSpec("a moonlit kitchen with a giant cup, sugar bowl, and moth guide", "g7-1-moon-kitchen");
  const hero = spec.entities[0]!;
  hero.id = "luna-moth";
  rebindDialogueSpeaker(spec, hero.id);
  hero.displayName = "Luna Moth";
  hero.visual.bodyPlan = "bird";
  hero.visual.features = hero.visual.features.map((feature, index) => index === 0
    ? { ...feature, kind: "antenna", style: "moon-feelers" }
    : feature);
  hero.spawn = { kind: "fixed", positions: [[-5, 12, -4]] };
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
  spec.playGraph.experienceTags = ["transformation"];
  spec.playGraph.availableVerbs = [{ mechanic: "repair", label: "Fill the giant cup", targetTags: ["giant-cup"] }];
  spec.playGraph.beats = [{
    id: "fill-the-cup", title: "Fill the Giant Cup", objectiveText: "Bring moonlight to the giant cup.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "fill_giant_cup" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "giant-cup", state: "brimming" }, { kind: "complete_experience", endingId: "kitchen-remembers" }], optional: false,
  }];
  spec.playGraph.endings = [{ id: "kitchen-remembers", title: "The Kitchen Remembers", narration: "The giant cup shines, and the moonlit kitchen returns to its gentle rhythm.", condition: { kind: "interacted", targetId: "fill_giant_cup" }, effects: [] }];
  return { id: "moonlit-kitchen", centralObject: "giant-cup", expectedScenario: "guarded_objective", spec: finish(spec) };
}

async function floodedSchool(): Promise<ReferenceDream> {
  const spec = await baseSpec("a flooded school with paper boats, a childhood dog, and an exit stairwell", "g7-1-flooded-school");
  const dog = spec.entities[0]!;
  dog.id = "childhood-dog";
  rebindDialogueSpeaker(spec, dog.id);
  dog.displayName = "Childhood Dog";
  dog.visual.bodyPlan = "quadruped";
  dog.spawn = { kind: "fixed", positions: [[-6, 12, -4]] };
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
  spec.playGraph.experienceTags = ["pursuit", "survival"];
  spec.playGraph.availableVerbs = [{ mechanic: "evade", label: "Reach the exit stairwell", targetTags: ["exit-stairwell"] }];
  spec.playGraph.beats = [{ id: "escape-school", title: "Reach the Exit Stairwell", objectiveText: "Evade the hallway shadow and reach the exit stairwell.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "reach_exit_stairwell" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "exit-stairwell", state: "open" }, { kind: "complete_experience", endingId: "school-released" }], optional: false }];
  spec.playGraph.endings = [{ id: "school-released", title: "The School Releases You", narration: "Your childhood dog crosses the exit stairwell as the flooded school finally lets the loop drain away.", condition: { kind: "interacted", targetId: "reach_exit_stairwell" }, effects: [] }];
  return { id: "flooded-school", centralObject: "exit-stairwell", expectedScenario: "pursuit", spec: finish(spec) };
}

async function lotteryFamily(): Promise<ReferenceDream> {
  const spec = await baseSpec("a lottery family on a bright stage with a jackpot board and instruments", "g7-1-lottery-family");
  const family = spec.entities[0]!;
  family.id = "family-band";
  rebindDialogueSpeaker(spec, family.id);
  family.displayName = "The Family Band";
  family.visual.bodyPlan = "humanoid";
  family.spawn = { kind: "fixed", positions: [[-6, 12, -4], [-3, 12, -4], [0, 12, -4]] };
  family.tags = ["family-band", "guide", "hero"];
  spec.budgets.structures = 6;
  spec.budgets.entityDefinitions = 1;
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
  spec.playGraph.experienceTags = ["celebration", "performance"];
  spec.playGraph.availableVerbs = [{ mechanic: "perform", label: "Lead the family finale", targetTags: ["celebration-stage"] }];
  spec.playGraph.beats = [{ id: "lead-family-finale", title: "Lead the Family Finale", objectiveText: "Bring the family band to the bright stage.", startsWhen: { kind: "always" }, completesWhen: { kind: "interacted", targetId: "lead_family_finale" }, onStart: [], onProgress: [], onComplete: [{ kind: "transform_structure", structureId: "celebration-stage", state: "singing" }, { kind: "complete_experience", endingId: "family-wins-together" }], optional: false }];
  spec.playGraph.endings = [{ id: "family-wins-together", title: "The Family Wins Together", narration: "The jackpot board sings while the family turns the bright stage and its instruments into a shared celebration.", condition: { kind: "interacted", targetId: "lead_family_finale" }, effects: [] }];
  return { id: "lottery-family", centralObject: "celebration-stage", expectedScenario: "performance", spec: finish(spec) };
}

export async function createG71ReferenceDreams(): Promise<readonly ReferenceDream[]> {
  return [await moonlitKitchen(), await floodedSchool(), await lotteryFamily()];
}
