import { describe, expect, it } from "vitest";
import { composeLocalDialogue } from "./dialogueComposer";

describe("local dialogue composer", () => {
  it("keeps identity, relationship, event, emotion, objective, and ending across a three-step arc", () => {
    const text = composeLocalDialogue({ identity: "Luna", relationship: "your moth guide", event: "the kitchen forgot the moon", emotion: "worried", objective: "fill the giant cup", ending: "The kitchen remembers its gentle rhythm." }).map(({ text: line }) => line).join(" ");
    for (const phrase of ["Luna", "moth guide", "kitchen forgot", "worried", "fill the giant cup", "kitchen remembers"]) expect(text).toContain(phrase);
  });
});
