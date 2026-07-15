export const MAX_DREAM_LENGTH = 1_200;

export const SAMPLE_DREAMS = [
  "I was tiny in a moonlit kitchen where teacups floated and a patient moth guarded the sugar bowl.",
  "A flooded school repeated forever while paper boats carried messages from my childhood dog.",
  "My family celebrated beneath a golden rainstorm as the city buildings slowly turned into instruments.",
] as const;

export interface LocalPreview {
  title: string;
  normalizedDream: string;
  seed: number;
  strategy: "mock-local";
}

function isAllowedTextCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint === 9 || codePoint === 10 || (codePoint >= 32 && codePoint !== 127);
}

export function normalizeDreamText(input: string): string {
  return Array.from(input)
    .filter(isAllowedTextCharacter)
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, MAX_DREAM_LENGTH);
}

export function stableDreamSeed(input: string): number {
  let hash = 2_166_136_261;
  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createLocalPreview(input: string): LocalPreview {
  const normalizedDream = normalizeDreamText(input);
  if (!normalizedDream) {
    throw new Error("Describe at least one remembered detail before entering.");
  }

  const firstSentence = normalizedDream.split(/[.!?]/, 1)[0] ?? normalizedDream;
  const titleStem = firstSentence.slice(0, 52).trim();

  return {
    title: titleStem ? `Fragment of ${titleStem}` : "Stable Dream Fragment",
    normalizedDream,
    seed: stableDreamSeed(normalizedDream.toLocaleLowerCase("en")),
    strategy: "mock-local",
  };
}
