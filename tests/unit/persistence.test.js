import { describe, it, expect } from "vitest";
import {
  loadSave,
  writeSave,
  totalBonusCount,
  STORAGE_KEY,
  SAVE_VERSION,
} from "../../src/game/persistence.js";

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe("persistence", () => {
  it("returns fresh defaults when nothing is stored", () => {
    const save = loadSave(fakeStorage());
    expect(save).toEqual({
      version: SAVE_VERSION,
      currentLevel: 0,
      clearedLevels: [],
      bonusFoundByLevel: {},
      hintCredits: 3,
    });
  });

  it("returns fresh defaults when storage is unavailable", () => {
    expect(loadSave(null).clearedLevels).toEqual([]);
  });

  it("round-trips a valid save", () => {
    const storage = fakeStorage();
    const save = {
      version: 1,
      currentLevel: 2,
      clearedLevels: [1, 2],
      bonusFoundByLevel: { 1: ["ATE"] },
      hintCredits: 4,
    };
    writeSave(save, storage);
    expect(loadSave(storage)).toEqual(save);
  });

  it("discards corrupt JSON and returns defaults", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: "{not json" });
    expect(loadSave(storage).clearedLevels).toEqual([]);
  });

  it("discards a mismatched schema version and returns defaults", () => {
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 999,
        currentLevel: 5,
        clearedLevels: [],
        bonusFoundByLevel: {},
        hintCredits: 1,
      }),
    });
    expect(loadSave(storage).currentLevel).toBe(0);
  });

  it("discards a malformed shape and returns defaults", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1 }) });
    expect(loadSave(storage).hintCredits).toBe(3);
  });

  it("sums bonus counts across levels", () => {
    const save = { bonusFoundByLevel: { 1: ["ATE", "TEA"], 2: ["EAT"] } };
    expect(totalBonusCount(save)).toBe(3);
  });

  it("does not throw when storage.setItem throws (quota exceeded, blocked storage)", () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
    };
    const save = {
      version: 1,
      currentLevel: 3,
      clearedLevels: [1],
      bonusFoundByLevel: {},
      hintCredits: 2,
    };
    expect(() => writeSave(save, throwingStorage)).not.toThrow();
  });
});
