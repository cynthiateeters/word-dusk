import { describe, it, expect } from "vitest";
import { shuffleArray } from "../../src/game/rng.js";

describe("shuffleArray", () => {
  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    shuffleArray(input, () => 0);
    expect(input).toEqual([1, 2, 3]);
  });

  it("returns the same elements in some order", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input, () => 0.5);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("is deterministic for a fixed rng", () => {
    const a = shuffleArray([1, 2, 3, 4], () => 0.9);
    const b = shuffleArray([1, 2, 3, 4], () => 0.9);
    expect(a).toEqual(b);
  });

  it("handles an empty array", () => {
    expect(shuffleArray([], () => 0.5)).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(shuffleArray([1], () => 0.5)).toEqual([1]);
  });
});
