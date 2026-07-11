import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const DATA_DIR = path.join(__dirname, "data");
const BLOCKLIST_PATH = path.join(__dirname, "blocklist.txt");
const TIER1_EXCLUSIONS_PATH = path.join(__dirname, "tier1-exclusions.txt");

const SOURCES = {
  tier1: {
    url: "http://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip",
    cachePath: path.join(CACHE_DIR, "12dicts-6.0.2.zip"),
    sha256: "64ac1d35acb66b550c7ebc56e080b62e0bad8f5984d72059dc2e05ac48780e52",
  },
  tier2: {
    url: "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
    cachePath: path.join(CACHE_DIR, "enable1.txt"),
    sha256: "3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89",
  },
};

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function ensureCached(source) {
  if (existsSync(source.cachePath)) {
    const cached = readFileSync(source.cachePath);
    if (sha256(cached) === source.sha256) return source.cachePath;
    console.error(`Cached file at ${source.cachePath} does not match recorded SHA-256.`);
    process.exit(1);
  }
  const res = await fetch(source.url);
  if (!res.ok) {
    console.error(`Failed to download ${source.url}: HTTP ${res.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const actual = sha256(buf);
  if (actual !== source.sha256) {
    console.error(`SHA-256 mismatch for ${source.url}: expected ${source.sha256}, got ${actual}`);
    process.exit(1);
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(source.cachePath, buf);
  return source.cachePath;
}

function loadWordSet(filePath) {
  return new Set(
    readFileSync(filePath, "utf8")
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
  );
}

function extractTier1Words(zipPath) {
  const raw = execFileSync("unzip", ["-p", zipPath, "American/2of12inf.txt"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("!")) // 12dicts marks these possibly-offensive/variant entries
    .filter((line) => !line.includes("%")) // single-source headwords; too permissive for grid words (e.g. OPE)
    .filter((word) => /^[a-z]+$/.test(word));
}

function extractTier2Words(txtPath) {
  return readFileSync(txtPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((word) => /^[a-z]+$/.test(word));
}

function main() {
  return Promise.all([ensureCached(SOURCES.tier1), ensureCached(SOURCES.tier2)]).then(
    ([tier1ZipPath, tier2TxtPath]) => {
      const blocklist = loadWordSet(BLOCKLIST_PATH);
      const tier1Exclusions = loadWordSet(TIER1_EXCLUSIONS_PATH);

      const tier1 = [...new Set(extractTier1Words(tier1ZipPath))]
        .filter((w) => w.length >= 3 && w.length <= 7)
        .filter((w) => !blocklist.has(w))
        .filter((w) => !tier1Exclusions.has(w))
        .sort();

      const tier2 = [...new Set(extractTier2Words(tier2TxtPath))]
        .filter((w) => w.length >= 3)
        .filter((w) => !blocklist.has(w))
        .sort();

      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(path.join(CACHE_DIR, "tier1.json"), JSON.stringify(tier1));
      writeFileSync(path.join(CACHE_DIR, "tier2.json"), JSON.stringify(tier2));

      // Tier 1 (only) is also committed under scripts/data/ — small enough to check in, and it
      // lets the generator-invariant tests assert "every grid word is tier 1" without needing
      // the gitignored cache to exist. Tier 2 (172k+ words) stays cache-only.
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(path.join(DATA_DIR, "tier1.json"), JSON.stringify(tier1, null, 2) + "\n");

      const byLength = (words) => {
        const counts = {};
        for (const w of words) counts[w.length] = (counts[w.length] || 0) + 1;
        return counts;
      };

      console.log(`tier1: ${tier1.length} words`, byLength(tier1));
      console.log(`tier2: ${tier2.length} words`, byLength(tier2));
    }
  );
}

main();
