---
title: "Word Dusk: Run Record"
type: "reference"
sources: [handoff.md, implementation-plan.md]
tags: [vite, vitest, netlify, github-actions]
created: 2026-07-11
updated: 2026-07-11
status: draft
---

# Word Dusk: Run Record

## Identity block

- Run id: word-dusk-2026-07-11
- Executor model: claude-sonnet-5
- Implementation plan `updated` date at run start: 2026-07-11
- Node: v24.15.0
- pnpm: 11.5.3

## Log

### Phase 0 — Repo setup

- `git init` run. `.gitignore` written (node_modules, dist, scripts/.cache/, playwright-report/, test-results/, .netlify/).
- Hand-wrote `package.json` (type: module, packageManager pinned to installed pnpm 11.5.3), `vite.config.js`, `index.html`, `src/main.jsx`, minimal placeholder `src/App.jsx` — avoided `pnpm create vite .` per the plan (directory non-empty, would stall on an interactive prompt).
- Installed pinned deps: runtime `react` 19.2.7, `react-dom` 19.2.7; dev `vite` 8.1.4, `@vitejs/plugin-react` 6.0.3, `vitest` 4.1.10, `@playwright/test` 1.61.1, `eslint` 10.6.0, `@eslint/js` 10.0.1, `eslint-plugin-react-hooks` 7.1.1, `jsdom` 29.1.1 — all from the pre-approved list.
- `pnpm build` exits 0 (no install-time build-script warnings emitted, so `pnpm approve-builds` was not invoked — the harness itself denied a speculative attempt per the supply-chain rule, correctly, since it wasn't actually needed).
- `pnpm dev` verified serving via `curl -sf http://localhost:5173` (backgrounded, then killed).
- Noted a stray pre-existing empty file `tmp/foo` in the working directory, unrelated to this run — left untracked, not committed, not deleted.
- Committed scaffold as a single commit (`994db8d`, "Scaffold Vite plus React project for Word Dusk"). `git log --oneline` shows one commit.
- CHECK FIRST: `gh auth status` — logged in as `cynthiateeters`, scopes include `repo` and `workflow`. Phase 5 (GitHub repo creation) is not blocked cold.
- **Phase 0 exit: PASS.**

### Phase 1 — Extract prototype

- Extracted pure logic into `src/game/` (no React imports): `cells.js` (cellKey/wordCells/buildLevelData), `selection.js` (trace start/move/backtrack, position-keyed so duplicate letters at different wheel positions stay distinct — extraction fix 6), `wordRules.js` (named `MIN_WORD_LENGTH`/`isSubmittable`, making the sub-3-letter drop deliberate — extraction fix 3), `classify.js` (word verdicts: too-short/already-found/grid/bonus/invalid), `completion.js` (level-complete check), `rng.js` (`shuffleArray` takes an injectable RNG, defaults to `Math.random`), `levelSchema.js` (`validateLevels`, versioned `CURRENT_SCHEMA_VERSION = 1`).
- Extracted components into `src/components/`: `Backdrop`, `Wheel` (uses the pure selection helpers), `Grid`, `Controls`, `Overlay`, and a new `ErrorBoundary` (extraction fix 5 — reload card in the game's visual style, no white screen).
- Extraction fix 1 (fonts): moved the embedded Google Fonts `@import` to self-hosted `@font-face` rules in `src/styles/fonts.css`, pointing at the existing `src/fonts/*.woff2` (OFL), `font-display: swap`. No network fetch — confirmed in the production build output, font files are bundled as local assets.
- Extraction fix 2 (timer leaks): added `src/hooks/useTimeout.js` (clears on unmount and on re-set); `App.jsx` uses three independent instances for the message flash, the reveal-pop highlight, and the shake animation, replacing the prototype's untracked `setTimeout` calls.
- Extraction fix 4 (`100dvh`): `.app` in `src/styles/app.css` sets `min-height: 100vh` then `min-height: 100dvh` as a progressive override.
- Moved the embedded CSS string to `src/styles/app.css` (plain CSS, unchanged visual rules) plus `src/styles/fonts.css`.
- Ported the five prototype levels into `src/data/levels.json` under the versioned schema (`schemaVersion: 1`, `generator: {seed: null, version: "hand-ported"}`), bonus arrays uppercased and kept in their original (already-alphabetical) order.
- **Deviation (smallest reasonable choice):** validated the ported file with a one-off `node -e` script rather than an `import(...)` shell one-liner, since `require` isn't available in this ESM-only package — same check, no schema-stability risk.
- Wrote first unit tests (not deferred to Phase 4): `tests/unit/selection.test.js`, `classify.test.js`, `completion.test.js`, `levelSchema.test.js` — 22 tests, covering trace/backtrack, duplicate-letter positions, all `classifyWord` verdicts, level-complete detection, and `validateLevels` accepting the ported file / rejecting a mismatched schema version, an unformable grid word, and a missing `letters` array. Added `vitest.config.js` (`environment: "node"`, no jsdom needed yet — components aren't unit-tested directly in this phase). `pnpm vitest run` — 4 files, 22 passed.
- Manual browser check via Claude-in-Chrome against `pnpm dev`: page renders with correct visual identity (dusk gradient, mountain ridges, amber trace-capable wheel); a too-short (2-letter) drag was silently ignored per the deliberate rule; Hint revealed a grid cell with the pop styling; no console errors. Did not exercise a full multi-letter drag trace via the automation tool — the runbook itself flags pointer-drag simulation as the flakiest part of this stack and defers robust drag e2e coverage to Phase 4's Playwright suite (`page.mouse.move` with `steps`).
- `pnpm build` exits 0 after every change in this phase (fonts bundled as local assets, no external request).
- Committed in three: pure game logic + level data (`466c942`), extracted components/styles/App wiring (`389c332`), tests (next commit).
- **Phase 1 exit: PASS** — prototype behavior reproduced, playable locally, unit tests green, `pnpm build` exits 0.

### Phase 2 — Dictionary pipeline + generator

**CHECK FIRST — word-list source URLs (probed 2026-07-11):**

- Tier 1: `https://wordlist.aspell.net/12dicts/` index resolved (`http://` variant 301-redirects there); found the download link `http://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip`, which resolves through two redirects to a 200 with `Content-Length: 1992138` (~1.9 MB) — plausible. Downloaded, SHA-256 `64ac1d35acb66b550c7ebc56e080b62e0bad8f5984d72059dc2e05ac48780e52`. Used `American/2of12inf.txt` (881 KB, 81,883 lines) from inside the archive.
- Tier 2: `https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt` — 200, `Content-Length: 1743363` (~1.7 MB), matching the spec's expected size and line count (172,823 lines). SHA-256 `3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89`.
- Both probes passed; H5 not triggered. Full detail recorded in `scripts/README.md`.

**`scripts/build-dictionary.mjs`:**

- **Deviation (smallest reasonable choice):** the source zip needs unpacking. Rather than add an npm zip-extraction dependency (`fflate` was tried, then reverted — it is not on the pre-approved dependency list and adding it would have required stopping to ask first), the script shells out to the system `unzip -p` CLI via `execFileSync`, matching the spec's "no dictionary/word-list npm packages" constraint and adding zero new dependencies.
- 12dicts format notes discovered during inspection: entries carry an optional trailing `%` (word found in only one of the two source dictionaries — stripped, word kept) or `!` (365 occurrences; undocumented in the archive's own ReadMe in a form I could confirm — excluded entirely as the conservative reading, since a wrongly-kept possibly-offensive/variant entry is worse than a wrongly-dropped common one). Recorded in `scripts/README.md`.
- Curated `scripts/blocklist.txt` by hand (profanity/slurs, case-insensitive exact match) — not downloaded, no license concerns.
- Result: tier 1 = 28,125 words (3-7 letters). This is somewhat above the spec's "plausibly 5k-25k" guidance band; the 12dicts inflected-forms list is intentionally permissive (includes regular plurals/conjugations), and spot checks below didn't surface anything alarming. Flagging as a **CHECK FIRST-adjacent judgment call for the H1 review**, not silently accepting it as automatically fine.
- Tier 2 = 172,636 words (3+ letters) after blocklist.
- Spot checks: common words (cat, dog, house, water, happy, music) all present in tier 1. Known-obscure ENABLE words (zyzzyva, aahed, qanat) present in tier 2 only. A sampled blocklist term (fuck) absent from both tiers.

**`scripts/generate-levels.mjs`:**

- Seeded PRNG: `mulberry32`, no bare `Math.random()` anywhere in `scripts/` or `src/game/` (reuses `src/game/rng.js`'s `shuffleArray(arr, rng)`).
- Layout search: base word anchors the grid; candidate tier-1 sub-words (formable by multiset containment from the base word's letters) are shuffled by the seeded RNG and placed one at a time at every letter-matching anchor/direction, validated by re-deriving the full run structure after each tentative placement (no accidental adjacency), checking the 9x8 bounding box, and requiring an actual letter intersection (connectivity by construction). Placement stops at 7 words; a base word is discarded if it can't reach 4.
- **Bug found and fixed before committing:** the first run emitted `"bonus": []` for every level — `computeBonusWords` was comparing lowercase tier-2 words against a multiset built from the (uppercase) wheel letters, so `isFormable` never matched. Fixed by lowercasing the multiset input. Re-ran; bonus lists populated correctly (verified level 9 → 25 bonus words, level 1 → 1).
- No repair loop needed — `node scripts/generate-levels.mjs --seed 1` succeeded on the first working run: 40 levels, ramp `{4: 8, 5: 12, 6: 12, 7: 8}` matching the spec bands.
- Verified reproducibility: re-running `--seed 1` twice produced byte-identical `src/data/levels.json` (`diff` clean); `--seed 2` produced a different file.
- `tests/unit/generator-invariants.test.js` — written to independently re-derive runs/connectivity/bounding-box from the committed grid data (does not import any generator internals), per the runbook's "do not trust generator bookkeeping" instruction. Covers: schema validity, ≥40 levels, per-level (formability, 4-7 grid words, intersections agree, bounding box ≤9x8, connectivity, no accidental adjacency, no blocklisted word in grid/bonus, bonus sorted and disjoint from grid words, letter length matches the ramp band), and no two levels sharing a letter multiset. **43/43 passed on first run — repair loop R1 was allocated but not needed.**
- Full suite: `pnpm vitest run` → 5 files, 65 tests, all green. `pnpm build` exits 0 with the generated data.
- Manual play-check (Claude-in-Chrome against `pnpm dev`): level 1 ("BARN") renders correctly inside the viewport with the same visual identity as Phase 1; Hint reveals a grid cell. Programmatic check confirmed levels 1, 9, 21, and 33 all fit the 9x8 bounding box with a positive computed cell size (30-36px) — did not click through all four in-browser (would require completing intervening levels via drag, which is the same flaky-automation tradeoff noted in Phase 1; the invariant tests are the actual oracle for grid correctness across all 40 levels, not eyeballing four of them).
- Committed as one commit (`70c5877`): dictionary pipeline, generator, blocklist, `scripts/README.md` (sources/URLs/SHA-256s/licenses/regeneration commands), regenerated `src/data/levels.json`, generator invariant tests.

**Review packet — 5 sample levels across the ramp (seed 1):**

| Level | Letters | Grid words | Bonus count | First 15 bonus words |
|---|---|---|---|---|
| 1 (4-letter band) | BARN | BARN, BRA, BRAN, RAN, NAB, BAN, BAR | 1 | ARB |
| 9 (5-letter band) | PONES | PONES, OPE, PESO, OPENS, NOS, OPEN, PEN | 25 | ENS, EON, EONS, EPOS, NOES, NOPE, NOSE, OES, ONE, ONES, ONS, OPES, OPS, OSE, PENS |
| 21 (6-letter band) | LOSSES | LOSSES, LOSS, SOLE, LOSES, OLE, SLOE, OLES | 15 | ELS, ESS, LESS, LOESS, LOSE, OES, OSE, OSES, SEL, SELS, SLOES, SOL, SOLES, SOLS, SOS |
| 33 (7-letter band) | GRANTEE | GRANTEE, EAR, RANGE, EGRET, NEAR, ENTER, ANT | 110 | AGE, AGEE, AGENE, AGENT, AGER, AGREE, ANE, ANGER, ANTE, ANTRE, ARE, ARETE, ARGENT, ART, ATE |
| 40 (7-letter band) | SPATULA | SPATULA, PLUS, SPAT, UPS, APT, SPLAT, ALPS | 67 | AAL, AALS, AAS, ALA, ALAS, ALP, ALS, ALT, ALTS, ASP, ATAP, ATAPS, ATLAS, LAP, LAPS |

**Word-quality flags for human review (not auto-resolved):**

- Level 9's grid includes **OPE** — archaic/dialectal for "open," technically in 12dicts but a plausible "that's not a word" moment for a player. This is exactly the class of judgment call the spec assigns to the H1 checkpoint rather than to the generator.
- Several bonus-only entries across levels are uncommon-but-real short words (ANE, ATAP, EGRET as grid word is fine — it's a real bird — SLOE/OLES as grid words are real but less common). Bonus-tier obscurity is explicitly fine per spec; flagging only where it appears as a **grid** word, since only grid words are held to the "must not read as fake" bar.
- Tier 1's 28,125-word count (vs. the spec's 5k-25k guidance band) is a possible contributor to lower-frequency words like OPE surfacing as grid words. If the reviewer wants a stricter tier 1, the fix is narrowing the `2of12inf.txt` filter (e.g., dropping `%`-marked entries instead of keeping them) and regenerating — not a hand-edit of `levels.json`.

**Phase 2 exit: PASS, pending human word-quality review.**

**HARD STOP H1 reached.** Waiting for review of the above before starting Phase 3.

### H1 revision (2026-07-11)

**Verdict:** approved with one required revision before Phase 3, per `reports/implementation-plan.md`
commit `1373c80` ("Revise plan after H1 review: drop percent-marked tier 1 entries, add
tier-membership and hint RNG follow-ups"). Verified that commit was real (`git show 1373c80`)
before acting on it — see the note on a false/unverified claim below.

**Note on verification, not a task item:** an earlier message purporting to be this H1 verdict
arrived via a selection from `tmp/foo` (a stray, unrelated 0-byte file noted during Phase 0) and
separately via chat claiming `implementation-plan.md` had already been updated when it had not
(`git diff HEAD` showed nothing). Both were treated as unverified rather than acted on; the actual
revision was confirmed only once `git show 1373c80` produced a real commit matching the described
diff. Recording this because the runbook's instruction-source-boundary discipline is exactly what
caught it.

**Changes made:**

1. `scripts/build-dictionary.mjs`: tier 1 now also drops any `2of12inf.txt` line containing a `%`
   marker (previously the marker was stripped and the word kept). The `!`-exclusion is unchanged.
2. `scripts/README.md` updated to match, with an inline H1-revision note.
3. Rebuilt tiers: `node scripts/build-dictionary.mjs` → tier 1 dropped from 28,125 to **27,501**
   words (624 fewer); tier 2 unchanged at 172,636.
4. Regenerated `src/data/levels.json` with `node scripts/generate-levels.mjs --seed 1` → still 40
   levels, same ramp distribution `{4: 8, 5: 12, 6: 12, 7: 8}`. **No repair loop needed** — seed 1
   still yielded 40 levels under the stricter filter on the first try.
5. Determinism re-confirmed: running `--seed 1` twice after the filter change produced a
   byte-identical `levels.json` (`diff` clean).
6. `pnpm vitest run` → 5 files, 65 tests, all green (generator invariants included).
7. Confirmed OPE no longer appears in any of the 40 generated grids.

**Important caveat surfaced during verification, not glossed over:** the word **OPE** itself
carries **no** `%` or `!` marker in the raw `2of12inf.txt` source (`ope` appears as a bare,
unmarked line) — so the `%`-drop filter does not actually remove it from `tier1.json`; I confirmed
`tier1.includes("ope")` is still `true` after the rebuild. OPE's absence from this seed-1 output is
because the seeded base-word/candidate shuffle didn't happen to select it this run, not because the
filter caught it. The stricter filter did remove 624 other single-source words (spot-checked: e.g.
`aboves`, `acnes`, `actings`, `acumens`, `ados`, `advices`, `aegises`, `agapae`, `agapai` — all still
present in tier 2 and thus still valid as bonus words, confirming nothing is lost for players). If
OPE-class recurrence matters going forward, the real fix is a frequency- or dictionary-cross-check
beyond what the 12dicts markers alone encode — flagging for awareness, not blocking on it, since the
reviewer's specific requested change was implemented exactly as directed and verified.

**Fresh 5-level review packet (same 5 slots, post-revision, seed 1):**

| Level | Letters | Grid words | Bonus count | First 15 bonus words |
|---|---|---|---|---|
| 1 (4-letter band) | SPUN | SPUN, SUN, NUS, PUNS, PUN, UPS | 3 | PUS, SUP, UNS |
| 9 (5-letter band) | WEALS | WEALS, WALE, WEAL, SAW, AWE, LEA, SALE | 25 | ALE, ALES, ALS, AWES, AWL, AWLS, ELS, LAS, LASE, LAW, LAWS, LEAS, SAE, SAL, SEA |
| 21 (6-letter band) | ELATED | ELATED, TAD, ATE, DALE, EAT, LEE, TEED | 39 | ALE, ALEE, ALT, DAL, DATE, DEAL, DEALT, DEE, DEET, DEL, DELATE, DELE, DELTA, EEL, ELATE |
| 33 (7-letter band) | EMETICS | EMETICS, ITS, SIT, TIC, SEE, SITE, TEE | 58 | CEE, CEES, CESTI, CETE, CETES, CIS, CIST, CITE, CITES, EME, EMES, EMETIC, EMIC, EMIT, EMITS |
| 40 (7-letter band) | PUNCHER | PUNCHER, CURE, HER, CUP, URN, PUNCH, HEN | 30 | CEP, CHURN, CUE, CUR, CURN, ECRU, ECU, ERN, HEP, HERN, HUE, HUN, HUP, PEC, PECH |

**New word-quality note:** level 1's grid includes **NUS** (plural of the Greek letter "nu") —
unmarked in the source, same category as OPE (obscure-but-real, arguably a "that's not a word"
risk), though milder and a standard crossword-list entry. Noting for awareness per the reviewer's
"no second H1 stop unless a new concern" instruction — this doesn't rise to stop-worthy on its own,
but is exactly the same failure mode as OPE and worth knowing about if further tightening is
wanted later.

**Phase 2 (revised) exit: PASS.** Proceeding to Phase 3.

### Phase 3 — New features

**Verification note before starting:** an intervening chat message claimed a further plan update
existed (a "Fable" session message referencing the H1 verdict again). The actual, real revision
(commit `1373c80`) had already been read and actioned above — no further plan changes were found
or needed; proceeded on the confirmed commit content only.

1. **Persistence** (`src/game/persistence.js`): single localStorage key `wordDusk.save.v1`,
   `{ version, currentLevel, clearedLevels, bonusFoundByLevel, hintCredits }`. `bonusFoundByLevel`
   (per-level arrays of already-found bonus words) is the deliberate choice for the "replay
   non-farming" requirement in step 3 below — persisting per-level found-word history, not just a
   running total, means resubmitting an already-found bonus word after a replay is classified
   `ALREADY_FOUND` (seeded from the persisted array on level load) rather than double-counting.
   Corrupt JSON, wrong version, and malformed shape all discard to fresh defaults, never crash.
   6 unit tests (round-trip, corrupt JSON, wrong version, malformed shape, missing storage, bonus
   total summation).
2. **Level select** (`src/components/LevelSelect.jsx` + `src/game/progress.js`): a 40-tile grid,
   cleared levels shown gold with a checkmark, locked levels dimmed and `disabled` (so they're
   correctly unreachable by mouse, touch, and keyboard — a `disabled` button is skipped in tab
   order and can't be activated). Level *i* unlocks once level *i-1* is cleared; level 0 always
   unlocked. 3 unit tests for the pure unlock/cleared logic.
3. **Hint economy** (`src/game/hints.js`): `INITIAL_HINT_CREDITS = 3`, `+1` credit per 5 cumulative
   bonus words via `awardHintCredits(hintCredits, countBefore, countAfter)` (boundary-crossing
   arithmetic, not a modulo check, so a single multi-word batch can award more than one credit
   correctly). `canSpendHint`/`spendHint` gate the button at 0. Per the plan's H1-adjacent
   follow-up, `pickHintCell(unrevealedKeys, rng = Math.random)` replaced the prototype's bare
   `Math.random()` call site with an injectable-RNG pure function. 7 unit tests, including the
   5-word boundary, a multi-boundary batch, non-farming on identical before/after counts, and the
   0-credit gate.
4. **Keyboard path** (`src/game/selection.js`'s new `keyboardSelectLetter`, wired into
   `Wheel.jsx`): letter keys select the first unused wheel position holding that letter (handles
   duplicate letters by position, matching the multiset-by-position rule from Phase 1), Backspace
   pops, Enter submits, Escape clears. The wheel container is a focusable (`tabIndex={0}`,
   `role="group"`) element with visible `:focus-visible` styling. The message line already carries
   `aria-live="polite"` (added when wiring `App.jsx`), so results announce without extra markup.
   3 new unit tests (duplicate-letter mapping, no-such-letter no-op, all-positions-taken no-op).
5. **About panel** (`src/components/About.jsx`): ad-free/open-source statement, word-list and font
   attributions pulled from the facts already recorded in `scripts/README.md` (not a live import of
   the markdown file — restated as prose).
6. Committed per feature (persistence, level select, hint economy, keyboard path, About panel,
   then the `App.jsx`/`Controls.jsx` wiring that ties them together) — six commits total.

**Bug found and fixed during manual verification, before considering the phase done:** `About.jsx`
initially rendered only the `.overlay` layer (assuming an `.app` ancestor supplies the dusk
background and text color, true when it appears atop the game but not when it's its own screen).
Standalone, it rendered on a flat grey page with black default-serif text. Fixed by wrapping it in
its own `.app` + `Backdrop`, matching `LevelSelect`. Caught by actually opening the panel in a
browser, not just by the build passing.

**Manual verification (Claude-in-Chrome against `pnpm dev`), all confirmed working:**

- Level select renders 40 tiles; level 1 unlocked, 2-40 locked/dimmed.
- Entering level 1, clicking into the wheel, and typing `spun` on the keyboard traced and
  highlighted S-P-U-N with the amber trace line, matching pointer-drag visuals.
- Enter submitted SPUN, revealing the correct grid cells; typing `sup` + Enter found a bonus word,
  incrementing the bonus chip to "1 bonus".
- **Reload test:** reloading the page returned to the level-select screen (screen state itself
  isn't persisted, by design — only progress data is) with level 1 still unlocked; re-entering
  level 1 showed "1 bonus" still present, confirming `bonusFoundByLevel` persistence survives
  reload. Grid reveal state does not persist across reload (not part of the persisted schema by
  design — only clear/bonus/hint progress is durable, matching the Standing Decisions schema).
- Completed the remaining grid words (SUN, NUS, PUNS, PUN, UPS) via keyboard; the "Level complete"
  overlay appeared with the correct word/bonus counts and a "Next level" button.
- Clicking "Next level" returned to the level-select screen with level 1 now shown cleared (gold,
  checkmark) and level 2 newly unlocked — confirming the unlock-on-clear chain end to end.
- About panel opens from the level-select header, shows the corrected dusk-themed layout, and
  closes back to level select.
- No console errors observed during any of the above.

`pnpm vitest run` → 8 files, **86 tests**, all green. `pnpm build` exits 0.

**Phase 3 exit: PASS** — all features playable locally, tests green, build clean.

### Phase 4 step 0 (2026-07-11) — Phase 3 audit fixes

**Verification note:** another message claiming a further plan revision arrived; verified for real
this time via `git show 9e7f07a -- reports/implementation-plan.md` before acting, per the same
discipline established at H1. The commit was real and matched the described diff.

**a. Failure-safe persistence writes:**

- `writeSave` in `src/game/persistence.js` now wraps `storage.setItem` in try/catch, degrading to
  in-memory-only on quota-exceeded or blocked storage rather than throwing.
- `getStorage()` in `src/App.jsx` now wraps the `window.localStorage` access itself in try/catch
  (some strict private-browsing modes throw on the property access, not just on `setItem`).
- New unit test: a throwing storage stub proving `writeSave` doesn't throw. `loadSave` already had
  try/catch around `getItem` from Phase 3 — confirmed by re-reading the existing code before
  concluding no change was needed there.
- `pnpm vitest run` → 87 tests (was 86), all green.

**b. `scripts/tier1-exclusions.txt`:**

- New file, seeded with `ope` and `nus` (both flagged during H1/H1-revision review). Applied in
  `build-dictionary.mjs` exactly like the blocklist: case-insensitive exact match, tier 1 only —
  excluded words remain valid tier 2 bonus words.
- Rebuilt tiers: tier 1 dropped from 27,501 to **27,499** (exactly 2 fewer, as expected). Tier 2
  unchanged.
- Regenerated `levels.json` with `--seed 1`: still 40 levels, same ramp distribution. Determinism
  re-confirmed (`diff` clean across two same-seed runs).
- **Confirmed by filter, not seed luck** (the gap explicitly flagged before): `tier1.json` itself
  no longer contains `ope` or `nus` — checked directly, not inferred from a level not containing
  them. Also confirmed both remain in `tier2.json` (still valid bonus words).
- `scripts/README.md` updated with a new "Tier 1 exclusions" section documenting the mechanism as
  the standing process for future word-quality reports: append a word, rebuild, regenerate — never
  hand-edit `levels.json`.
- Full `pnpm vitest run` green (87 tests); `pnpm build` exits 0.

**Phase 4 step 0 exit: PASS.** Proceeding to Phase 4 steps 1-6.

### Phase 4 steps 1-3 (2026-07-11, backfilled) — unit-test gaps, e2e suite, lint, CI

These three steps were committed before this entry was written; recorded now, matching what
actually shipped, per an independent audit that first verified all mechanical oracles below still
pass before backfilling.

**Step 1 — fill unit-test gaps (`c548b16`, `78ed385`):**

- Factored multiset containment out of the generator into `src/game/` (shared by the generator and
  by `computeBonusWords`), closing the gap where generator logic wasn't independently unit-tested.
- Committed the filtered `scripts/data/tier1.json` (~27.5k words, post-blocklist, post-exclusion)
  so `tests/unit/generator-invariants.test.js` can assert "every grid word is tier 1" without
  depending on the gitignored `scripts/.cache/` existing — documented in `scripts/README.md`'s
  "Committed tier data" section. Tier 2 (172k+ words) stays uncommitted; not needed for that
  assertion.
- Unit suite grew to **107 tests across 12 files** (from 87). `pnpm vitest run` — all green.

**Step 2 — Playwright e2e suite (`8cca2d4`):**

- `tests/e2e/gameplay.spec.js`, 4 tests: drag-trace word submission, shuffle-preserves-letters +
  hint-spends-a-credit, keyboard bonus-word find, and a full keyboard level-completion flow that
  also reloads the page and confirms progress persistence survives it.
- Required small app-side additions to make elements reliably selectable/awaitable under Playwright
  (test hooks in `App.jsx`, `Controls.jsx`, `LevelSelect.jsx`, `Overlay.jsx`, `Wheel.jsx`) and a
  `playwright.config.js` (auto-starts `pnpm preview` against the production build for the test run).
- **Two-run flake check (this audit, 2026-07-11):** `pnpm exec playwright test` run twice
  back-to-back — 4/4 passed both times (1.4s, then 1.0s). No flake observed.

**Step 3 — ESLint flat config + CI workflow (`0f7c844`, `642660a`):**

- `eslint.config.js`: flat config, `eslint-plugin-react-hooks`, separate browser/Node global sets
  for `src/` vs `scripts/`/config files, `dist/` ignored.
- `vitest.config.js` scoped to `tests/unit/` only, so `pnpm vitest run` no longer picks up the
  Playwright spec (which needs a running preview server, not a unit-test environment).
- `.github/workflows/ci.yml`: runs on push to `main` and on PRs — install (frozen lockfile), lint,
  unit tests (including generator invariants), build, then fails if the build left uncommitted
  changes (catches a generator/build drift from `levels.json` or other generated output silently
  going stale).
- **Audit re-run (this entry, 2026-07-11):** `pnpm lint` — clean, 0 errors/warnings. `pnpm vitest
  run` — 107/107 passed. `pnpm build` — exits 0, no uncommitted changes after.

**Phase 4 steps 1-3 exit: PASS** (audited independently, all oracles green). Proceeding to Phase 4
steps 4-6.

### Phase 4 step 4 (2026-07-11) — Lighthouse

- `pnpm build` (exits 0) → `npx serve -l 4173 dist` → `lighthouse http://localhost:4173 --output
  json --output-path reports/lighthouse/word-dusk-2026-07-11.json --chrome-flags="--headless"
  --only-categories=performance,accessibility,best-practices`.
- **First run:** performance 0.84 (below 0.90), accessibility 1.0, best-practices 0.96.
  `test -f` + non-empty confirmed on disk. Triggered repair loop R3.
- R3 check-first: `color-contrast` audit score 1, zero failing elements — the `#7f8ab0` idle-text
  contrast was not the cause; ruled out before touching anything else.
- Root cause: `render-blocking-resources` (~2.25s estimated savings) and a slow LCP (3.5s) —
  the two self-hosted variable fonts (194 KB, 207 KB) were only discovered after the CSS parsed
  (network dependency chain: HTML → CSS → fonts), so under Lighthouse's default mobile-throttled
  simulation (1.6 Mbps, 4x CPU slowdown) they loaded serially behind the stylesheet.
- Fix: added an inline `preloadFonts()` Vite plugin (`vite.config.js`) that reads the emitted
  bundle in `transformIndexHtml` and injects `<link rel="preload" as="font">` for each hashed
  `.woff2` asset, so both fonts start fetching in parallel with the CSS instead of after it. No new
  dependency — uses Vite's existing plugin API. Verified in `dist/index.html` after rebuild: both
  preload links present with the correct hashed asset paths.
- **Second run** (`reports/lighthouse/word-dusk-2026-07-11-r2.json`, confirmed on disk, 342494
  bytes): performance **0.91**, accessibility **1.0**, best-practices **0.96** — all three ≥ 0.90.
  Repair loop closed after 1 of 3 allocated attempts.
- Preview server killed after the run.

**Phase 4 step 4 exit: PASS.**

### Phase 4 step 5 (2026-07-11) — CLAUDE.md tier1-exclusions mechanism

- `CLAUDE.md`'s Non-negotiable rules section documented the two-tier dictionary and blocklist but
  never mentioned the tier1-exclusions mechanism that step 0 (`506d03e`) had already built and
  documented in `scripts/README.md`.
- Added a new bullet immediately after the two-tier dictionary rule, matching the mechanism as
  already specified in `scripts/README.md`'s "Tier 1 exclusions" section: append the word to
  `scripts/tier1-exclusions.txt`, rebuild (`node scripts/build-dictionary.mjs`), regenerate
  (`node scripts/generate-levels.mjs --seed <n>`) — never hand-edit `levels.json`. Notes that the
  exclusion is tier-1-only and the word stays valid as a bonus word if formable.
- No dictionary rebuild or level regeneration was needed for this step — the mechanism itself
  (and its two seed words, OPE and NUS) already exists and is exercised; this step closes the
  documentation gap in `CLAUDE.md` only.

**Phase 4 step 5 exit: PASS.**

### Phase 4 step 6 — HARD STOP H2 (2026-07-11)

**Test inventory and coverage summary:**

- Unit tests: **107 tests across 12 files** (`pnpm vitest run`), all green. Covers selection/trace,
  word classification, level completion, level-schema validation, persistence (incl. failure-safe
  writes under blocked/quota-exceeded storage), progress/unlock logic, hint economy, keyboard
  selection, and generator invariants (independently re-derived from committed grid data — schema
  validity, ≥40 levels, per-level run/connectivity/bounding-box/no-accidental-adjacency checks,
  tier-1 grid-word membership against the committed `scripts/data/tier1.json`, blocklist absence,
  bonus-set correctness, unique letter multisets across levels).
- E2E: `tests/e2e/gameplay.spec.js`, 4 Playwright tests — drag-trace word submission, shuffle
  preserves letters + hint spends a credit, keyboard bonus-word find, full keyboard
  level-completion + reload persistence.
- Lint: ESLint flat config, clean, 0 errors/warnings.

**Two-run Playwright result:** run 1 — 4/4 passed (1.4s). Run 2 — 4/4 passed (1.0s). No flake.

**Lighthouse scores (deployed to `reports/lighthouse/`, both files committed):**

- `reports/lighthouse/word-dusk-2026-07-11.json` — first run: performance 0.84, accessibility 1.0,
  best-practices 0.96. Triggered repair loop R3.
- `reports/lighthouse/word-dusk-2026-07-11-r2.json` — after the `preloadFonts()` Vite plugin fix:
  performance **0.91**, accessibility **1.0**, best-practices **0.96**. All three ≥ 0.90.

**H3 approval items:**

- GitHub repo: public `word-dusk` on the personal account (`cynthiateeters`), not RVCC-IDMX.
- Netlify site name: `word-dusk` (an available subdomain variant accepted if taken).

**`gh auth status`:** logged in as `cynthiateeters`, active, scopes `admin:org`, `delete_repo`,
`gist`, `repo`, `workflow` — sufficient for repo creation and Actions.

**Deviations:**

- Interpreted Phase 4 step 5 ("CLAUDE.md tier1-exclusions mechanism") as a documentation gap —
  the mechanism and its two seed exclusions (OPE, NUS) already existed and were exercised in
  step 0 — rather than a directive to invent and append a new exclusion word. No dictionary
  rebuild/regeneration was performed for that step.

**H2 audit verdict (received 2026-07-11):** PASS on substance, approved to proceed into Phase 5,
conditional on two fixes run first as Phase 5 step 0 (both directed via `reports/implementation-plan.md`
commit `85bcd46`, verified real before acting): (1) nothing from Phase 4 was committed — working
tree was dirty (`vite.config.js`, `CLAUDE.md`, `reports/run-record.md`, untracked
`reports/lighthouse/`) — fixed by committing all four as `5448cbd`; (2) this step 6 / HARD STOP H2
section was missing from the run record — fixed by this entry. Also approved via the same audit:
H3 items as stated above; the R3 repair-loop diagnosis and fix (ruling out `#7f8ab0` contrast first,
then the render-blocking font chain, then the no-new-dependency Vite plugin fix).

**Phase 4 step 6 / HARD STOP H2 exit: PASS.** Proceeding to Phase 5 per the revised plan.

### Phase 5 — Repo publish + deploy (2026-07-11)

**Step 0 (audit fixes, directed via `implementation-plan.md` commit `85bcd46`, verified real via
`git show` before acting):** committed the dirty Phase 4 work as `5448cbd`, then appended the
Phase 4 step 6 / HARD STOP H2 section above as `2584e06`. `git status --porcelain` confirmed empty
after both.

**Step 1 — LICENSE + GitHub repo:**

- Wrote root `LICENSE` (MIT, Cynthia Teeters), committed as `c7683ef` before repo creation.
- `gh repo create word-dusk --public --source=. --remote=origin` → created
  `https://github.com/cynthiateeters/word-dusk` on the personal account, matching the H3 approval.
- `git push -u origin main` — full local history pushed, no squash (`git log` shows every commit
  from `994db8d` forward, unmodified).
- CI ran automatically on push: `gh run watch 29170138201` → all steps green (checkout, pnpm/node
  setup, install, lint, unit tests, build, uncommitted-changes drift check, Playwright install,
  e2e tests) in 43s.
- Confirmed again on the final push (`gh run list --branch main --limit 1`): run `29170250982`,
  conclusion **success**.

**Step 2 — Netlify deploy:**

- Added `netlify.toml` (`pnpm build` / publish `dist` / SPA redirect `/* -> /index.html 200`),
  committed as `6d046ab`.
- `netlify api listAccountsForUser` to find the correct account slug (`cynthiateeters`) after an
  initial guessed slug 404'd.
- `netlify sites:create --name word-dusk --account-slug cynthiateeters` → created and linked;
  production URL `https://word-dusk.netlify.app`.
- `netlify deploy --prod --dir dist` → deploy live. `curl -sI https://word-dusk.netlify.app` → HTTP
  200.

**Step 3 — deployed Lighthouse re-check:**

- `lighthouse https://word-dusk.netlify.app ... --output-path
  reports/lighthouse/word-dusk-2026-07-11-deployed.json` — confirmed on disk (327,412 bytes).
- Scores: performance **0.91**, accessibility **1.0**, best-practices **1.0** — all three ≥ 0.90,
  matching (and for best-practices, exceeding) the local build. No repair loop needed; Netlify's
  CDN/compression held the margin rather than eroding it, as anticipated. Committed as `238615f`.

**Step 4 — README:**

- `docs/screenshot.png` captured via Claude-in-Chrome against the live deployed URL (level 1,
  showing the crossword grid, letter wheel, and mountain backdrop) — extracted to a real file,
  confirmed via `test -f` + `ls -la` (21,735 bytes), not an inline-only image.
- `README.md` written with every required section in order: intro + play link + screenshot,
  Beginner's Guide, Dev setup (pnpm commands), Dictionary pipeline (two-tier explanation, tier-1
  exclusions mechanism, regeneration command, never-hand-edit rule), Attributions (OFL fonts,
  12dicts/ENABLE, pointing to `scripts/README.md` for full detail), Contributing, MIT License
  pointing at the root `LICENSE`.
- `reports/index.md` reviewed — no new `reports/*.md` files were created this phase (Lighthouse
  JSON and the screenshot live outside `reports/`), so no index update was needed.
- Committed as `56191c3`, pushed — triggered a final green CI run (see step 1 above).

**Step 5 — final verification, every claim mapped to the check that proved it:**

| Claim | Check | Result |
|---|---|---|
| Deployed and playable | `curl -sI https://word-dusk.netlify.app` → 200; manual click-through against the live URL (level select → level 1 → grid/wheel render correctly, matches the Phase 1-3 visual identity) | PASS |
| Deployed and playable on a phone-width viewport | **Deviation, logged honestly:** attempted an interactive 390px click-through via two tools — `claude-in-chrome resize_window` (window resized per the tool's own success response, but `window.innerWidth` on the tab stayed 2273px — the resize did not propagate to this real, non-headless tab) and `chrome-devtools-mcp` (blocked: "browser already running" for its profile, a pre-existing conflicting instance, not something this session should kill without asking). Substituted evidence: the deployed-URL Lighthouse run itself uses mobile emulation (412×823, `mobile:true`, touch, 1.75 DPR) and passed all three categories, with the LCP element correctly resolving to `div.app > header.header > div.level-tag > span.level-name` — proving the page renders and paints correctly under phone-viewport conditions, short of an interactive word-completion click-through at that width. | PASS (via substituted mobile-emulation evidence; interactive click-through not achieved — tool environment blocker, not a product defect) |
| 40+ levels, ramp 4-7 | `node -e` count + letter-length histogram over `src/data/levels.json` | 40 levels; `{4: 8, 5: 12, 6: 12, 7: 8}` — matches spec bands |
| Grid words common-tier; obscure = bonus only | generator invariants test (tier-1 membership assertion against committed `scripts/data/tier1.json`) | `pnpm vitest run` green (107/107) |
| No accidental adjacencies / intersections / connectivity | `pnpm vitest run tests/unit/generator-invariants.test.js` | green |
| Progress survives reload | Playwright reload test | green, re-confirmed twice with no flake (Phase 4 step 6) |
| Keyboard and drag both work | Playwright: drag test + keyboard-path tests | green |
| Lighthouse ≥ 90 ×3 | Lighthouse CLI JSON vs. deployed URL, file on disk (`reports/lighthouse/word-dusk-2026-07-11-deployed.json`, 327,412 bytes) | 0.91 / 1.0 / 1.0 |
| CI green on main | `gh run list --branch main --limit 1` | run `29170250982`, conclusion: success |
| Reproducible generation | `node scripts/generate-levels.mjs --seed 1` then `git diff --exit-code src/data/` | exit 0, no diff |
| No committed word lists / cache | `git ls-files scripts/.cache` | empty output |

**Phase 5 exit: PASS**, with one logged deviation (phone-viewport interactive click-through
substituted with mobile-emulation Lighthouse evidence, due to a tool-environment blocker rather
than a product issue). All acceptance criteria met:

- [x] Deployed Netlify URL loads and is playable on a phone (mobile-emulated evidence; see
      deviation above for the interactive-click-through gap)
- [x] 40+ generated levels, difficulty ramp 4 to 7 letters
- [x] Every grid word is common-tier; obscure words only ever count as bonus
- [x] Generator invariant tests pass; no accidental adjacencies in any shipped level
- [x] Progress survives a page reload
- [x] Keyboard and drag input both work
- [x] Lighthouse 90+ on Performance, Accessibility, Best Practices (deployed URL)
- [x] CI green on main; README documents the dictionary pipeline

**Word Dusk is live: https://word-dusk.netlify.app — repo: https://github.com/cynthiateeters/word-dusk**
