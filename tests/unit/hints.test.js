import { describe, it, expect } from "vitest";
import {
  awardHintCredits,
  canSpendHint,
  spendHint,
  pickHintCell,
  INITIAL_HINT_CREDITS,
} from "../../src/game/hints.js";

describe("hints", () => {
  it("starts with 3 credits", () => {
    expect(INITIAL_HINT_CREDITS).toBe(3);
  });

  it("awards a credit at the 5-bonus-word boundary", () => {
    expect(awardHintCredits(3, 4, 5)).toBe(4);
  });

  it("awards no credit when not crossing a boundary", () => {
    expect(awardHintCredits(3, 5, 6)).toBe(3);
  });

  it("awards multiple credits when a batch crosses several boundaries", () => {
    expect(awardHintCredits(3, 4, 15)).toBe(6);
  });

  it("does not re-award credits on replay of the same cumulative count", () => {
    // Simulates replaying a level: bonusCountBefore/After identical because the persisted
    // count never resets, so re-finding an already-recorded word is a no-op call site-side.
    expect(awardHintCredits(4, 5, 5)).toBe(4);
  });

  it("gates spending at zero credits", () => {
    expect(canSpendHint(0)).toBe(false);
    expect(canSpendHint(1)).toBe(true);
    expect(spendHint(0)).toBe(0);
    expect(spendHint(2)).toBe(1);
  });

  it("picks a hint cell deterministically for a given rng", () => {
    const keys = ["0,0", "0,1", "0,2"];
    expect(pickHintCell(keys, () => 0.5)).toBe("0,1");
  });

  it("returns null when there is nothing left to reveal", () => {
    expect(pickHintCell([], () => 0.5)).toBeNull();
  });
});
