import { describe, it, expect } from "vitest";
import { isLevelComplete } from "../../src/game/completion.js";

const level = {
  grid: [
    { word: "MATE", row: 0, col: 0, dir: "across" },
    { word: "TEAM", row: 0, col: 2, dir: "down" },
  ],
};

describe("isLevelComplete", () => {
  it("is false when no cells are revealed", () => {
    expect(isLevelComplete(level, new Set())).toBe(false);
  });

  it("is false when some but not all grid word cells are revealed", () => {
    const revealed = new Set(["0,0", "0,1", "0,2"]);
    expect(isLevelComplete(level, revealed)).toBe(false);
  });

  it("is true once every grid word's cells are revealed", () => {
    const revealed = new Set(["0,0", "0,1", "0,2", "0,3", "1,2", "2,2", "3,2"]);
    expect(isLevelComplete(level, revealed)).toBe(true);
  });
});
