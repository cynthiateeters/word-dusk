import { describe, it, expect } from "vitest";
import { isSubmittable, MIN_WORD_LENGTH } from "../../src/game/wordRules.js";

describe("wordRules", () => {
  it("the minimum word length is 3", () => {
    expect(MIN_WORD_LENGTH).toBe(3);
  });

  it("rejects words under the minimum length", () => {
    expect(isSubmittable("")).toBe(false);
    expect(isSubmittable("a")).toBe(false);
    expect(isSubmittable("ab")).toBe(false);
  });

  it("accepts words at or above the minimum length", () => {
    expect(isSubmittable("cat")).toBe(true);
    expect(isSubmittable("teams")).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(isSubmittable(undefined)).toBe(false);
    expect(isSubmittable(null)).toBe(false);
  });
});
