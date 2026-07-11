import { describe, it, expect } from "vitest";
import { letterMultiset, isFormable } from "../../src/game/multiset.js";

describe("multiset", () => {
  it("counts letter frequency", () => {
    const m = letterMultiset("teem");
    expect(m.get("e")).toBe(2);
    expect(m.get("t")).toBe(1);
    expect(m.get("m")).toBe(1);
  });

  it("returns an empty multiset for empty input", () => {
    expect(letterMultiset("").size).toBe(0);
  });

  it("is formable when every letter count is covered", () => {
    expect(isFormable("mate", letterMultiset("team"))).toBe(true);
  });

  it("is not formable when a letter is missing entirely", () => {
    expect(isFormable("cat", letterMultiset("team"))).toBe(false);
  });

  it("is not formable when a duplicate letter exceeds the available count", () => {
    // "team" has only one E; "eee" needs three.
    expect(isFormable("eee", letterMultiset("team"))).toBe(false);
  });

  it("the empty word is trivially formable from anything", () => {
    expect(isFormable("", letterMultiset("team"))).toBe(true);
  });

  it("no word is formable from an empty multiset", () => {
    expect(isFormable("a", letterMultiset(""))).toBe(false);
  });
});
