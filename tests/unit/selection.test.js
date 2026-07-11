import { describe, it, expect } from "vitest";
import {
  startSelection,
  moveSelection,
  selectionToWord,
  keyboardSelectLetter,
} from "../../src/game/selection.js";

describe("selection", () => {
  it("starts a trace with a single index", () => {
    expect(startSelection(2)).toEqual([2]);
  });

  it("appends a new letter position", () => {
    expect(moveSelection([0], 1)).toEqual([0, 1]);
  });

  it("ignores moves off any letter", () => {
    expect(moveSelection([0, 1], -1)).toEqual([0, 1]);
  });

  it("ignores repeating the current letter", () => {
    expect(moveSelection([0, 1], 1)).toEqual([0, 1]);
  });

  it("backtracks when sliding onto the previous letter", () => {
    expect(moveSelection([0, 1, 2], 1)).toEqual([0, 1]);
  });

  it("ignores sliding onto an already-selected non-adjacent letter", () => {
    expect(moveSelection([0, 1, 2], 0)).toEqual([0, 1, 2]);
  });

  it("converts a selection of positions into the wheel word", () => {
    expect(selectionToWord([2, 0, 1], ["T", "E", "A", "M"])).toBe("ATE");
  });

  it("keeps duplicate-letter positions distinct in the selection", () => {
    // "LETTERS" has two T's (positions 2, 3): selecting both must not collapse via `includes`.
    const letters = ["L", "E", "T", "T", "E", "R", "S"];
    let sel = startSelection(2); // T
    sel = moveSelection(sel, 3); // second T (different position, same letter)
    expect(sel).toEqual([2, 3]);
    expect(selectionToWord(sel, letters)).toBe("TT");
  });

  it("keyboard: selects the first unused position for a duplicate letter", () => {
    const letters = ["L", "E", "T", "T", "E", "R", "S"];
    let sel = keyboardSelectLetter([], letters, "t");
    expect(sel).toEqual([2]);
    sel = keyboardSelectLetter(sel, letters, "T");
    expect(sel).toEqual([2, 3]);
  });

  it("keyboard: no-ops when the letter isn't on the wheel", () => {
    const letters = ["L", "E", "T", "T", "E", "R", "S"];
    expect(keyboardSelectLetter([0], letters, "z")).toEqual([0]);
  });

  it("keyboard: no-ops when every position for that letter is already selected", () => {
    const letters = ["L", "E", "T", "T", "E", "R", "S"];
    expect(keyboardSelectLetter([2, 3], letters, "t")).toEqual([2, 3]);
  });
});
