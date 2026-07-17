export interface LocalDialogueContext {
  readonly identity: string;
  readonly relationship: string;
  readonly event: string;
  readonly emotion: string;
  readonly objective: string;
  readonly ending: string;
}

export interface LocalDialogueLine { readonly id: "opening" | "middle" | "ending"; readonly text: string; }

export function composeLocalDialogue(context: LocalDialogueContext): readonly LocalDialogueLine[] {
  return [
    { id: "opening", text: `I am ${context.identity}, ${context.relationship}. ${context.event} left me feeling ${context.emotion}. Will you help ${context.objective}?` },
    { id: "middle", text: `Stay with me: ${context.event} matters because we are ${context.relationship}. The next step is to ${context.objective}.` },
    { id: "ending", text: `You did it. ${context.ending} I will remember that you chose to ${context.objective}.` },
  ];
}
