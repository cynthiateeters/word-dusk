import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { shuffleArray } from "../src/game/rng.js";
import { validateLevels, CURRENT_SCHEMA_VERSION } from "../src/game/levelSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "levels.json");
const GENERATOR_VERSION = "1.0.0";

const MAX_COLS = 9;
const MAX_ROWS = 8;
const MIN_GRID_WORDS = 4;
const MAX_GRID_WORDS = 7;
const BASE_WORDS_TRIED_PER_SLOT = 60;

function parseArgs(argv) {
  const args = { seed: null, count: 40 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--seed") args.seed = Number(argv[++i]);
    if (argv[i] === "--count") args.count = Number(argv[++i]);
  }
  if (args.seed === null || Number.isNaN(args.seed)) {
    console.error("Usage: node scripts/generate-levels.mjs --seed <n> [--count <n>]");
    process.exit(1);
  }
  return args;
}

// mulberry32: small, fast, deterministic PRNG seeded by a 32-bit integer.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function letterMultiset(word) {
  const m = new Map();
  for (const ch of word) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}

function isFormable(word, availableMultiset) {
  const need = letterMultiset(word);
  for (const [ch, count] of need) {
    if ((availableMultiset.get(ch) || 0) < count) return false;
  }
  return true;
}

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

function noAccidentalAdjacency(cellsMap, placedWords) {
  const placedIndex = new Map(placedWords.map((w) => [`${w.row},${w.col},${w.dir}`, w]));
  for (const run of computeRuns(cellsMap)) {
    const placed = placedIndex.get(`${run.row},${run.col},${run.dir}`);
    if (!placed || placed.word !== run.word) return false;
  }
  return true;
}

function tryPlaceWord(cellsMap, placedWords, candidateWord, rng) {
  // Anchor: find every (candidate letter index, existing cell) pair whose letters match,
  // try both directions at each anchor. Order is seed-shuffled for determinism-with-variety.
  const anchors = [];
  for (const [key, letter] of cellsMap) {
    const [r, c] = key.split(",").map(Number);
    for (let i = 0; i < candidateWord.length; i++) {
      if (candidateWord[i] === letter) anchors.push({ r, c, i });
    }
  }

  const dirs = shuffleArray(["across", "down"], rng);
  const shuffledAnchors = shuffleArray(anchors, rng);

  for (const anchor of shuffledAnchors) {
    for (const dir of dirs) {
      const row = dir === "across" ? anchor.r : anchor.r - anchor.i;
      const col = dir === "across" ? anchor.c - anchor.i : anchor.c;
      const candidate = { word: candidateWord, row, col, dir };
      const newCells = wordCells(candidate);

      let conflict = false;
      let intersects = false;
      for (const { r, c, letter } of newCells) {
        const key = cellKey(r, c);
        if (cellsMap.has(key)) {
          if (cellsMap.get(key) !== letter) {
            conflict = true;
            break;
          }
          intersects = true;
        }
      }
      if (conflict || !intersects) continue;

      const trialCells = new Map(cellsMap);
      for (const { r, c, letter } of newCells) trialCells.set(cellKey(r, c), letter);

      const { minR, maxR, minC, maxC } = boundingBox(trialCells);
      if (maxC - minC + 1 > MAX_COLS || maxR - minR + 1 > MAX_ROWS) continue;

      const trialPlaced = [...placedWords, candidate];
      if (!noAccidentalAdjacency(trialCells, trialPlaced)) continue;

      return { cells: trialCells, placed: trialPlaced };
    }
  }

  return null;
}

function buildLayout(baseWord, candidateWords, rng) {
  const ordered = shuffleArray(
    candidateWords.filter((w) => w !== baseWord),
    rng
  );
  // Anchor the grid on the base word (the pangram) so every level's wheel word is always placed.
  let cellsMap = new Map();
  baseWord.split("").forEach((letter, i) => cellsMap.set(cellKey(0, i), letter));
  let placed = [{ word: baseWord, row: 0, col: 0, dir: "across" }];

  for (const candidate of ordered) {
    if (placed.length >= MAX_GRID_WORDS) break;
    const result = tryPlaceWord(cellsMap, placed, candidate, rng);
    if (result) {
      cellsMap = result.cells;
      placed = result.placed;
    }
  }

  if (placed.length < MIN_GRID_WORDS) return null;
  return placed;
}

function computeBonusWords(letters, tier2, gridWordSet) {
  const multiset = letterMultiset(letters.join("").toLowerCase());
  const bonus = [];
  for (const word of tier2) {
    if (word.length > letters.length) continue;
    if (gridWordSet.has(word.toUpperCase())) continue;
    if (isFormable(word, multiset)) bonus.push(word.toUpperCase());
  }
  return bonus.sort();
}

function difficultyBandLength(levelNumber) {
  if (levelNumber <= 8) return 4;
  if (levelNumber <= 20) return 5;
  if (levelNumber <= 32) return 6;
  return 7;
}

function generateLevel(levelNumber, letterLength, tier1ByLength, tier1Set, tier2, usedMultisets, rng) {
  const pool = shuffleArray(tier1ByLength[letterLength] || [], rng);

  for (let attempt = 0; attempt < Math.min(BASE_WORDS_TRIED_PER_SLOT, pool.length); attempt++) {
    const baseWord = pool[attempt];
    const multisetKey = [...baseWord].sort().join("");
    if (usedMultisets.has(multisetKey)) continue;

    const baseMultiset = letterMultiset(baseWord);
    const candidateWords = tier1Set.filter(
      (w) => w.length >= 3 && w.length <= baseWord.length && isFormable(w, baseMultiset)
    );
    if (candidateWords.length < MIN_GRID_WORDS) continue;

    const placed = buildLayout(baseWord, candidateWords, rng);
    if (!placed) continue;

    usedMultisets.add(multisetKey);
    const letters = baseWord.toUpperCase().split("");
    const grid = placed.map((w) => ({ word: w.word.toUpperCase(), row: w.row, col: w.col, dir: w.dir }));
    const gridWordSet = new Set(grid.map((w) => w.word));
    const bonus = computeBonusWords(letters, tier2, gridWordSet);

    return {
      id: levelNumber,
      name: `Level ${levelNumber}`,
      letters,
      grid,
      bonus,
    };
  }

  return null;
}

function main() {
  const { seed, count } = parseArgs(process.argv.slice(2));

  if (!existsSync(path.join(CACHE_DIR, "tier1.json")) || !existsSync(path.join(CACHE_DIR, "tier2.json"))) {
    console.error("Missing scripts/.cache/tier{1,2}.json — run scripts/build-dictionary.mjs first.");
    process.exit(1);
  }

  const tier1 = JSON.parse(readFileSync(path.join(CACHE_DIR, "tier1.json"), "utf8"));
  const tier2 = JSON.parse(readFileSync(path.join(CACHE_DIR, "tier2.json"), "utf8"));

  const tier1ByLength = {};
  for (const w of tier1) {
    (tier1ByLength[w.length] ||= []).push(w);
  }

  const rng = mulberry32(seed);
  const usedMultisets = new Set();
  const levels = [];

  for (let levelNumber = 1; levels.length < count && levelNumber <= count * 20; levelNumber++) {
    const letterLength = difficultyBandLength(levels.length + 1);
    const level = generateLevel(
      levels.length + 1,
      letterLength,
      tier1ByLength,
      tier1,
      tier2,
      usedMultisets,
      rng
    );
    if (level) levels.push(level);
  }

  if (levels.length < count) {
    console.error(`Only generated ${levels.length}/${count} levels — widen the base-word pool or search budget.`);
    process.exit(1);
  }

  const output = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generator: { seed, version: GENERATOR_VERSION },
    levels,
  };

  const { valid, errors } = validateLevels(output);
  if (!valid) {
    console.error("Generated levels failed schema validation:", errors);
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

  const byLength = {};
  for (const l of levels) byLength[l.letters.length] = (byLength[l.letters.length] || 0) + 1;
  console.log(`Generated ${levels.length} levels (seed ${seed}). Letter-length distribution:`, byLength);
}

main();
