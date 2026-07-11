import { describe, it, expect } from "vitest";
import { cellKey, wordCells, buildLevelData } from "../../src/game/cells.js";

describe("cells", () => {
  it("formats a cell key from row/col", () => {
    expect(cellKey(2, 3)).toBe("2,3");
  });

  it("computes across word cells left to right", () => {
    const cells = wordCells({ word: "CAT", row: 1, col: 2, dir: "across" });
    expect(cells).toEqual([
      { r: 1, c: 2, letter: "C" },
      { r: 1, c: 3, letter: "A" },
      { r: 1, c: 4, letter: "T" },
    ]);
  });

  it("computes down word cells top to bottom", () => {
    const cells = wordCells({ word: "CAT", row: 1, col: 2, dir: "down" });
    expect(cells).toEqual([
      { r: 1, c: 2, letter: "C" },
      { r: 2, c: 2, letter: "A" },
      { r: 3, c: 2, letter: "T" },
    ]);
  });

  it("builds the bounding box and cell map for a level's grid", () => {
    const level = {
      grid: [
        { word: "MATE", row: 0, col: 0, dir: "across" },
        { word: "TEAM", row: 0, col: 2, dir: "down" },
      ],
    };
    const data = buildLevelData(level);
    expect(data.minR).toBe(0);
    expect(data.maxR).toBe(3);
    expect(data.minC).toBe(0);
    expect(data.maxC).toBe(3);
    expect(data.cells.get("0,2").letter).toBe("T");
  });
});
