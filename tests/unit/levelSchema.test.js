import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateLevels, CURRENT_SCHEMA_VERSION } from "../../src/game/levelSchema.js";

const levelsPath = fileURLToPath(new URL("../../src/data/levels.json", import.meta.url));
const levelsJson = JSON.parse(readFileSync(levelsPath, "utf8"));

describe("validateLevels", () => {
  it("accepts the ported level file", () => {
    const result = validateLevels(levelsJson);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("rejects a mismatched schema version", () => {
    const mutated = { ...levelsJson, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(validateLevels(mutated).valid).toBe(false);
  });

  it("rejects a grid word that isn't formable from the level letters", () => {
    const mutated = structuredClone(levelsJson);
    mutated.levels[0].grid[0].word = "ZZZZ";
    expect(validateLevels(mutated).valid).toBe(false);
  });

  it("rejects a missing letters array", () => {
    const mutated = structuredClone(levelsJson);
    delete mutated.levels[0].letters;
    expect(validateLevels(mutated).valid).toBe(false);
  });

  it("rejects an empty levels array", () => {
    expect(
      validateLevels({ schemaVersion: CURRENT_SCHEMA_VERSION, generator: {}, levels: [] }).valid,
    ).toBe(false);
  });
});
