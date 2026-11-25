import { describe, expect, it } from "vitest";
import { degreeToMidi, styleFor, synthParams } from "@/components/players/generated/params";
import { sceneFor } from "@/components/players/generated/footage";
import { seedCatalog } from "@/lib/seed-catalog";

describe("placeholder tunes", () => {
  it("are the same every time for a given item", () => {
    expect(synthParams("neon-drive-1987", ["Action"])).toEqual(synthParams("neon-drive-1987", ["Action"]));
  });
  it("differ between items", () => {
    const a = synthParams("dial-tone", ["Indie"]);
    const b = synthParams("porch-light", ["Indie"]);
    expect([a.bpm, a.root, a.progression.join()]).not.toEqual([b.bpm, b.root, b.progression.join()]);
  });
  it("follow the genre", () => {
    expect(styleFor(["Grunge", "Alternative"])).toBe("grunge");
    expect(styleFor(["Hip Hop"])).toBe("hiphop");
    expect(styleFor(["Horror"])).toBe("horror");
    expect(styleFor(["Unknown"])).toBe("pop");
    const ska = synthParams("x", ["Ska"]);
    expect(ska.bpm).toBeGreaterThanOrEqual(148);
  });
  it("add tape wobble only for cassettes", () => {
    expect(synthParams("x", ["Pop"], { tape: true }).tape).toBe(true);
    expect(synthParams("x", ["Pop"]).tape).toBe(false);
  });
  it("map scale degrees across octaves", () => {
    const p = { root: 48, scale: [0, 2, 4, 5, 7, 9, 11] };
    expect(degreeToMidi(p, 0)).toBe(48);
    expect(degreeToMidi(p, 7)).toBe(60);
    expect(degreeToMidi(p, 2, 1)).toBe(64);
  });
});

describe("placeholder footage", () => {
  it("picks a scene from the film genre", () => {
    expect(sceneFor(["Horror"])).toBe("ghost");
    expect(sceneFor(["Sci-Fi", "Action"])).toBe("drive");
    expect(sceneFor(["Family", "Animation"])).toBe("toon");
    expect(sceneFor(["Comedy"])).toBe("studio");
  });
});

describe("sample catalog previews", () => {
  it("gives every item a preview of the right kind", () => {
    for (const item of seedCatalog()) {
      expect(item.preview?.provider).toBe("generated");
      expect(item.preview?.kind).toBe(item.format === "vhs" ? "video" : "audio");
    }
  });
});
