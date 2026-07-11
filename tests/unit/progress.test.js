import { describe, it, expect } from "vitest";
import { isLevelCleared, isLevelUnlocked } from "../../src/game/progress.js";

const levels = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe("progress", () => {
  it("the first level is always unlocked", () => {
    expect(isLevelUnlocked(0, levels, [])).toBe(true);
  });

  it("a level is locked until the previous level is cleared", () => {
    expect(isLevelUnlocked(1, levels, [])).toBe(false);
    expect(isLevelUnlocked(1, levels, [1])).toBe(true);
  });

  it("reports whether a level is cleared by id", () => {
    expect(isLevelCleared(levels[0], [1, 2])).toBe(true);
    expect(isLevelCleared(levels[2], [1, 2])).toBe(false);
  });
});
