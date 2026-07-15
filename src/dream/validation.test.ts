import example from "../../schemas/dream-spec-v1.example.json";
import { describe, expect, it } from "vitest";

import { DreamSpecV1Schema } from "./schema";
import { validateDreamSpecReferences } from "./validation";

describe("validateDreamSpecReferences", () => {
  it("accepts the governing example", () => {
    const spec = DreamSpecV1Schema.parse(example);

    expect(validateDreamSpecReferences(spec)).toEqual([]);
  });

  it("reports duplicate identifiers and missing references", () => {
    const candidate = structuredClone(example);
    candidate.blocks[1]!.id = "air";
    candidate.world.layers[0]!.block = "missing_block";
    candidate.entities[0]!.dialogueId = "missing_dialogue";
    const response = candidate.dialogues[0]!.nodes[0]!.responses[0]! as {
      nextNodeId: string;
    };
    response.nextNodeId = "missing_node";
    const spec = DreamSpecV1Schema.parse(candidate);

    const issues = validateDreamSpecReferences(spec);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "duplicate_id",
        "missing_block_reference",
        "missing_dialogue_reference",
        "missing_dialogue_node_reference",
      ]),
    );
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });

  it("rejects a response that belongs to a different dialogue", () => {
    const candidate = structuredClone(example);
    const original = candidate.dialogues[0]!;
    candidate.dialogues.push({
      ...structuredClone(original),
      id: "second_dialogue",
      nodes: [{
        id: "second_node",
        text: "A second conversation.",
        responses: [{ id: "second_response", text: "Continue", effects: [] }],
      }],
      startNodeId: "second_node",
    });
    const beat = candidate.playGraph.beats[0]! as { completesWhen: unknown };
    beat.completesWhen = {
      kind: "response_chosen",
      dialogueId: original.id,
      responseId: "second_response",
    };
    const spec = DreamSpecV1Schema.parse(candidate);

    expect(validateDreamSpecReferences(spec).map(({ code }) => code)).toContain(
      "mismatched_dialogue_response_reference",
    );
  });
});
