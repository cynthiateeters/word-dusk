# Word Dusk dictionary and level-generation pipeline

## Word list sources

Downloaded to `scripts/.cache/` (gitignored, never committed) by `build-dictionary.mjs`.
Re-downloaded automatically if missing; the cached file's SHA-256 is checked against the
recorded value below before reuse, and the script fails loudly on mismatch.

**Tier 1 (grid/answer words) — 12dicts, `American/2of12inf.txt`**

- Archive URL: `http://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip`
- Probed: 2026-07-11
- SHA-256 (zip): `64ac1d35acb66b550c7ebc56e080b62e0bad8f5984d72059dc2e05ac48780e52`
- License: public domain / freely redistributable (12dicts package, see the archive's own `ReadMe.html`)
- Format notes: one word per line; a trailing `%` marks a headword found in only one of the
  two source dictionaries (single-source, lower-confidence common word — excluded entirely as of
  the H1 revision below); a trailing `!` marks a variant/possibly-offensive entry (also excluded
  entirely).
- **H1 revision (2026-07-11):** the first generation run kept `%`-marked entries, yielding a
  28,125-word tier 1 and low-frequency grid words like OPE (archaic for "open"). Human review
  directed dropping `%`-marked entries as well, tightening tier 1 to more clearly common words.
  A word dropped from tier 1 that still exists in ENABLE remains a valid bonus word.

**Tier 2 (bonus words) — ENABLE word list**

- URL: `https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt`
- Probed: 2026-07-11
- SHA-256: `3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89`
- License: public domain (ENABLE — Enhanced North American Benchmark LExicon)
- Format: one lowercase word per line, no markers, 172,823 lines.

**Fonts (self-hosted, `src/fonts/`)**

- Fraunces and Nunito Sans, both from Google Fonts, SIL Open Font License (OFL).
- Already present in the repo at generation time; not downloaded by any script.

**Blocklist**

- `scripts/blocklist.txt`: a hand-curated profanity/slur list, case-insensitive exact match,
  applied to both tiers before any level is generated. Curated, not downloaded — no license
  concerns.

**Tier 1 exclusions**

- `scripts/tier1-exclusions.txt`: a hand-curated grid-word exclusion list, case-insensitive exact
  match, applied to tier 1 only (tier 2 is unaffected, so an excluded word remains a valid bonus
  word if formable). This is the standing mechanism for "that's not a word" grid-word reports going
  forward: append the word, rebuild tiers, regenerate with the recorded seed — never hand-edit
  `levels.json`. Seeded with `ope` (archaic for "open") and `nus` (plural of the Greek letter),
  both flagged during H1 review as real-but-obscure words that carried no `%`/`!` marker in the
  12dicts source and so weren't caught by the marker-based filter alone.

## Regeneration

```
node scripts/build-dictionary.mjs             # rebuild scripts/.cache/tier1.json, tier2.json
node scripts/generate-levels.mjs --seed <n>   # regenerate src/data/levels.json (seed required)
```

Re-running `generate-levels.mjs` with the same seed produces a byte-identical `levels.json`.
A different seed produces a different level set. `levels.json` is generated and committed —
never hand-edit it; change the generator or the seed and regenerate instead.

## Pipeline summary

1. `build-dictionary.mjs` downloads (or reuses the checksummed cache of) the two source lists,
   filters tier 1 to 3-7 letter lowercase-alpha words and tier 2 to 3+ letter lowercase-alpha
   words, applies the blocklist to both, and writes `scripts/.cache/tier1.json` / `tier2.json`.
2. `generate-levels.mjs` picks a tier-1 base word per difficulty band (4/5/6/7 letters for
   levels 1-8/9-20/21-32/33+), computes the tier-1 sub-words formable from its letters (multiset
   containment), and runs a bounded, seeded layout search: an accepted layout has 4-7 grid words,
   fits a 9x8 bounding box, is fully connected, and has no accidental adjacencies (every
   contiguous run of 2+ letters in a row or column is exactly one placed word). Failed base
   words are discarded, never relaxed into a bad layout. The tier-2 bonus set for the level's
   letters (minus grid words) is computed, sorted, and embedded — the full dictionary never
   ships to the browser.
3. The output is validated against `src/game/levelSchema.js` before being written.
