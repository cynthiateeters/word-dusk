import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateLevels } from "../../src/game/levelSchema.js";

const levelsPath = fileURLToPath(new URL("../../src/data/levels.json", import.meta.url));
const levels = JSON.parse(readFileSync(levelsPath, "utf8"));

const blocklistPath = fileURLToPath(new URL("../../scripts/blocklist.txt", import.meta.url));
const blocklist = new Set(
  readFileSync(blocklistPath, "utf8")
    .split("\n")
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean),
);

// Independent re-derivation — deliberately does not import any generator internals,
// so a bug in the generator's own bookkeeping can't hide from these checks.
function cellKey(r, c) {
  return `${r},${c}`;
}

function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.word.length; i++) {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    cells.push({ r, c, letter: w.word[i] });
  }
  return cells;
}

function buildCellsMap(grid) {
  const cells = new Map();
  for (const w of grid) {
    for (const { r, c, letter } of wordCells(w)) {
      const key = cellKey(r, c);
      if (cells.has(key)) {
        if (cells.get(key) !== letter) {
          throw new Error(`Intersection conflict at ${key}: ${cells.get(key)} vs ${letter}`);
        }
      }
      cells.set(key, letter);
    }
  }
  return cells;
}

function boundingBox(cellsMap) {
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const key of cellsMap.keys()) {
    const [r, c] = key.split(",").map(Number);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  }
  return { minR, maxR, minC, maxC };
}

function computeRuns(cellsMap) {
  const { minR, maxR, minC, maxC } = boundingBox(cellsMap);
  const runs = [];

  for (let r = minR; r <= maxR; r++) {
    let c = minC;
    while (c <= maxC) {
      if (cellsMap.has(cellKey(r, c))) {
        const start = c;
        let word = "";
        while (c <= maxC && cellsMap.has(cellKey(r, c))) {
          word += cellsMap.get(cellKey(r, c));
          c++;
        }
        if (word.length >= 2) runs.push({ row: r, col: start, dir: "across", word });
      } else {
        c++;
      }
    }
  }

  for (let c = minC; c <= maxC; c++) {
    let r = minR;
    while (r <= maxR) {
      if (cellsMap.has(cellKey(r, c))) {
        const start = r;
        let word = "";
        while (r <= maxR && cellsMap.has(cellKey(r, c))) {
          word += cellsMap.get(cellKey(r, c));
          r++;
        }
        if (word.length >= 2) runs.push({ row: start, col: c, dir: "down", word });
      } else {
        r++;
      }
    }
  }

  return runs;
}

function isConnected(grid) {
  const parent = grid.map((_, i) => i);
  function find(i) {
    while (parent[i] !== i) i = parent[i];
    return i;
  }
  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (let i = 0; i < grid.length; i++) {
    const cellsA = new Map(wordCells(grid[i]).map(({ r, c, letter }) => [cellKey(r, c), letter]));
    for (let j = i + 1; j < grid.length; j++) {
      const cellsB = wordCells(grid[j]);
      if (cellsB.some(({ r, c }) => cellsA.has(cellKey(r, c)))) union(i, j);
    }
  }

  const roots = new Set(grid.map((_, i) => find(i)));
  return roots.size === 1;
}

function letterMultiset(letters) {
  const m = new Map();
  for (const l of letters) m.set(l, (m.get(l) || 0) + 1);
  return m;
}

function isFormable(word, multiset) {
  const need = letterMultiset(word.split(""));
  for (const [ch, count] of need) {
    if ((multiset.get(ch) || 0) < count) return false;
  }
  return true;
}

const RAMP = [
  { min: 1, max: 8, length: 4 },
  { min: 9, max: 20, length: 5 },
  { min: 21, max: 32, length: 6 },
  { min: 33, max: Infinity, length: 7 },
];

function expectedLetterLength(levelNumber) {
  return RAMP.find((band) => levelNumber >= band.min && levelNumber <= band.max).length;
}

describe("generator invariants", () => {
  it("schema is valid", () => {
    const result = validateLevels(levels);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("emits at least 40 levels", () => {
    expect(levels.levels.length).toBeGreaterThanOrEqual(40);
  });

  it.each(levels.levels.map((level, i) => [i + 1, level]))(
    "level %i satisfies all layout invariants",
    (levelNumber, level) => {
      const multiset = letterMultiset(level.letters);

      // every grid word formable from level letters
      for (const w of level.grid) {
        expect(isFormable(w.word, multiset)).toBe(true);
      }

      // 4-7 grid words per level
      expect(level.grid.length).toBeGreaterThanOrEqual(4);
      expect(level.grid.length).toBeLessThanOrEqual(7);

      // intersections agree (throws on conflict) + bounding box fits 9x8
      const cellsMap = buildCellsMap(level.grid);
      const { minR, maxR, minC, maxC } = boundingBox(cellsMap);
      expect(maxC - minC + 1).toBeLessThanOrEqual(9);
      expect(maxR - minR + 1).toBeLessThanOrEqual(8);

      // connectivity
      expect(isConnected(level.grid)).toBe(true);

      // no accidental adjacency: every run must be exactly a placed word at that position/dir
      const placedIndex = new Map(level.grid.map((w) => [`${w.row},${w.col},${w.dir}`, w]));
      for (const run of computeRuns(cellsMap)) {
        const placed = placedIndex.get(`${run.row},${run.col},${run.dir}`);
        expect(placed).toBeDefined();
        expect(placed.word).toBe(run.word);
      }

      // no blocklisted word in grid or bonus
      for (const w of level.grid) expect(blocklist.has(w.word)).toBe(false);
      for (const b of level.bonus) expect(blocklist.has(b)).toBe(false);

      // bonus sorted and disjoint from grid words
      const sorted = [...level.bonus].sort();
      expect(level.bonus).toEqual(sorted);
      const gridWordSet = new Set(level.grid.map((w) => w.word));
      for (const b of level.bonus) expect(gridWordSet.has(b)).toBe(false);

      // letter counts match the difficulty ramp
      expect(level.letters.length).toBe(expectedLetterLength(levelNumber));
    },
  );

  it("no two levels share a letter multiset", () => {
    const seen = new Set();
    for (const level of levels.levels) {
      const key = [...level.letters].sort().join("");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
