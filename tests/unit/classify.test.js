import { describe, it, expect } from "vitest";
import { classifyWord, WordResult } from "../../src/game/classify.js";

const ctx = () => ({
  gridWords: new Set(["MATE", "TEAM"]),
  bonusWords: new Set(["TEA", "EAT"]),
  foundWords: new Set(),
  bonusFound: new Set(),
});

describe("classifyWord", () => {
  it("rejects submissions under the minimum length without a verdict", () => {
    expect(classifyWord("me", ctx()).result).toBe(WordResult.TOO_SHORT);
    expect(classifyWord("", ctx()).result).toBe(WordResult.TOO_SHORT);
  });

  it("classifies a grid word", () => {
    expect(classifyWord("mate", ctx()).result).toBe(WordResult.GRID);
  });

  it("classifies a bonus word not in the grid", () => {
    expect(classifyWord("tea", ctx()).result).toBe(WordResult.BONUS);
  });

  it("classifies an already-found grid word", () => {
    const c = ctx();
    c.foundWords.add("MATE");
    expect(classifyWord("mate", c).result).toBe(WordResult.ALREADY_FOUND);
  });

  it("classifies an already-found bonus word", () => {
    const c = ctx();
    c.bonusFound.add("TEA");
    expect(classifyWord("tea", c).result).toBe(WordResult.ALREADY_FOUND);
  });

  it("classifies a word absent from both tiers as invalid", () => {
    expect(classifyWord("xyz", ctx()).result).toBe(WordResult.INVALID);
  });
});
