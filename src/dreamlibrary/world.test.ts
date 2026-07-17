import { describe, expect, it } from "vitest";
import { createDreamLibraryWorld } from "./world";
import { createG71ReferenceDreams } from "../../tests/fixtures/g7-1-referenceDreams";

describe("DreamLibrary world composition", () => {
  it("materializes water inside a recognisable school instead of a generic beacon", async () => {
    const school = (await createG71ReferenceDreams()).find(({ id }) => id === "flooded-school")!;
    const world = createDreamLibraryWorld(school.spec);
    expect(world.root.getObjectByName("dreamlibrary-school-kit")).toBeTruthy();
    expect(world.root.getObjectByName("dreamlibrary-water-volume")).toBeTruthy();
    expect(world.root.getObjectByName("locker-1")).toBeTruthy();
    expect(world.root.getObjectByName("written-message-1")).toBeTruthy();
    world.dispose();
  });

  it("uses specialised signature objects for the kitchen and celebration references", async () => {
    const dreams = await createG71ReferenceDreams();
    const kitchen = createDreamLibraryWorld(dreams.find(({ id }) => id === "moonlit-kitchen")!.spec);
    const lottery = createDreamLibraryWorld(dreams.find(({ id }) => id === "lottery-family")!.spec);
    expect(kitchen.root.getObjectByName("giant-cup")).toBeTruthy();
    expect(kitchen.root.getObjectByName("dreamlibrary-moth")).toBeTruthy();
    expect(kitchen.root.getObjectByName("moon-door")).toBeTruthy();
    expect(lottery.root.getObjectByName("jackpot-board")).toBeTruthy();
    expect(lottery.root.getObjectByName("family--4.5")).toBeTruthy();
    expect(lottery.root.getObjectByName("family-instrument-1")).toBeTruthy();
    expect(lottery.root.getObjectByName("lottery-ticket")).toBeTruthy();
    kitchen.dispose(); lottery.dispose();
  });
});
