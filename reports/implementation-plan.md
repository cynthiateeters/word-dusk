---
title: "Word Dusk: Implementation Plan"
type: "reference"
sources: [handoff.md]
tags: [vite, vitest, netlify, github-actions]
created: 2026-07-11
updated: 2026-07-11
status: draft
---

# Word Dusk: Implementation Plan

## For humans

### Overview

This plan turns `reports/handoff.md` (the spec) into an ordered, checkable build sequence for Word Dusk: a Wordscapes-style word puzzle game currently living as a single-file React prototype (`word-dusk.jsx`). The spec defines architecture, tech stack, and a two-tier dictionary pipeline; this plan sequences the work into runbook-form phases — every state-touching step has a **Do / Expect / If not** — so a Claude Code session can execute it autonomously between the two human checkpoints, without re-deriving decisions or stalling on ambiguity.

### Findings

- The prototype (`word-dusk.jsx`, ~700 lines) is a complete single-file proof of the mechanic — wheel, grid, bonus words, shuffle, hints, styling. Reading it surfaced several extraction-time issues this plan now handles explicitly (see "Prototype issues to fix during extraction" below).
- No repo exists yet locally and no GitHub repo has been created.
- The riskiest technical piece is the crossword layout generator: the no-accidental-adjacency constraint is a real combinatorial search problem. It gets the most invariant tests and a dedicated repair-loop allocation.
- The second-riskiest piece is *executor stalls*: interactive scaffolding prompts, unpinned download URLs, and un-pre-approved dependency additions would each halt an autonomous session. This plan pins URLs behind CHECK FIRST marks, avoids interactive commands entirely, and pre-approves the exact dependency set in the stop-conditions section.
- The spec's two human checkpoints (after phases 2 and 4) are preserved as hard stops. Everything else is designed to run without a human in the loop.

### Prototype issues to fix during extraction (not redesigns)

These are correctness/robustness fixes that preserve the visual identity and interaction model:

1. **Google Fonts `@import` in a CSS string** — render-blocking, third-party request, will hurt Lighthouse Performance and fails offline. Self-host Fraunces + Nunito Sans as woff2 files with `@font-face` and `font-display: swap`. Same typefaces, same look. Font files were taken from Google fonts and are licensed as SIL Open Font License (OFL). They are at: src/fonts/Fraunces-VariableFont_SOFT,WONK,opsz,wght.woff2 and src/fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.woff2 and do not require a download.
2. **Timer leaks** — `msgTimer`, the `justRevealed` timeout, and the shake timeout are never cleaned up on unmount/level change. Track and clear them (or move to a small `useTimeout` helper).
3. **Sub-3-letter submits** are silently dropped with no feedback on pointer-up of a 1–2 letter trace — keep the behavior but make it deliberate in the extracted logic (a named rule in `src/game/`, unit-tested), not an accident of an early return.
4. **`min-height: 100vh`** — use `100dvh` with a `100vh` fallback so mobile browser chrome doesn't clip the controls (spec acceptance: "playable on a phone").
5. **No error boundary** — add a top-level React error boundary with a "reload" card in the game's visual style, so a runtime error never white-screens a deployed static app.
6. **Duplicate letters** — the five prototype levels happen to have unique letters per wheel; generated 6–7 letter base words will not (e.g. "LETTERS"). All selection/validation logic must treat wheel letters as a multiset keyed by wheel *position*, never by letter value. The prototype already selects by index — keep that, and make the keyboard path (Phase 3) match unused positions.

### Recommendations

- Start Phase 0 immediately: it carries no open decisions.
- Treat the Phase 2 checkpoint as non-negotiable — bad word lists or a broken adjacency rule compound into every later phase.
- Budget disproportionate time for the generator's layout search relative to its line count.

---

## For Claude Code — executor runbook

You are done only when every check in the Verification section passes; a failing check you cannot lawfully repair is a hard stop. Mark unverifiable claims CHECK FIRST rather than asserting them. Begin the run record (`reports/run-record.md`, with wiki frontmatter via `/wiki-report`) with an identity block: run id, executor model, this plan's `updated` date, and Node/pnpm versions.

### Current state

- `word-dusk.jsx` at project root: working single-file React prototype. It is the design and interaction reference — do not redesign its visual identity (dusk gradient, amber trace line, Fraunces + Nunito Sans, mountain ridge backdrop).
- `reports/handoff.md` is the spec of record. If this plan and the spec conflict, the spec wins — except where this plan tightens the spec (runbook form, pinned versions, the extraction fixes above), which the spec's "smallest reasonable choice" clause covers.
- Not a git repo; no `package.json`; no GitHub repo.

### Stop conditions

**Hard stops (stop, report, wait):**

- H1. After Phase 2: human review of generated level quality (word choices, layouts, bonus-list sanity) before Phase 3.
- H2. After Phase 4: human review of test coverage and Lighthouse results before deploying.
- H3. Creating the public GitHub repo and the production Netlify deploy are outward-facing: show the repo name/visibility and the deploy plan at the H2 checkpoint and get them approved there, so Phase 5 runs without a third stop.
- H4. Any pre-existing failure (a check that fails on an unchanged system) — report, never fix.
- H5. A word-list source URL that is dead or serves unexpected content after the CHECK FIRST probe — do not substitute an unvetted mirror silently; report candidates and wait.

**Pre-approved dependency additions** (supply-chain rule satisfied here; pinned versions, no install scripts, pnpm):

- Runtime: `react`, `react-dom`.
- Dev only: `vite`, `@vitejs/plugin-react`, `vitest`, `@playwright/test`, `eslint` + `@eslint/js` + `eslint-plugin-react-hooks` (flat config), `jsdom` (for component-adjacent unit tests if needed).
- Nothing else without stopping. In particular: no dictionary/word-list npm packages (word lists are downloaded data files, not dependencies), no CSS frameworks, no state libraries, no profanity-filter packages (the blocklist is a data file you curate).
- `pnpm approve-builds`: only if `esbuild` requires it; approve `esbuild` only.
- Playwright browser download (`pnpm exec playwright install chromium`) is pre-approved — it is a browser binary fetch, not a package.

**Repair-loop allocations** (3 attempts each, mechanical oracle decides, attempt log kept; exhausted budget → hard stop):

- R1. Generator layout search tuning — oracle: `pnpm vitest run tests/unit/generator-invariants.test.js` plus "≥ 40 levels emitted".
- R2. Failing unit/e2e tests in code this run wrote — oracle: the failing test command.
- R3. Lighthouse category below 90 — oracle: the Lighthouse CLI JSON score.

### Standing decisions (do not re-litigate)

- **Package manager: pnpm** (personal project; user's global rule). Commit `pnpm-lock.yaml`; set `"packageManager"` in `package.json`. The spec's `npm` examples are illustrative, not a pin.
- **Level data schema is versioned.** `levels.json` top level: `{ "schemaVersion": 1, "generator": { "seed": <n>, "version": "<script version>" }, "levels": [...] }`. Each level: `{ "id", "name", "letters": [..], "grid": [{ "word", "row", "col", "dir" }], "bonus": [..sorted..] }`. Bonus arrays sorted alphabetically for stable diffs. The client validates `schemaVersion` at load and shows the error boundary card on mismatch rather than guessing.
- **One schema validator, shared.** `src/game/levelSchema.js` exports a pure `validateLevels(json)`; the generator runs it before writing, the invariant tests run it on the committed file, and the app runs it (dev builds at least) at load. One definition of "valid level," three call sites.
- **Persistence is versioned and corruption-safe.** One localStorage key, `wordDusk.save.v1`, holding `{ version: 1, currentLevel, clearedLevels, bonusTotal, hintCredits }`. All reads go through `src/game/persistence.js`: parse inside try/catch; on parse failure or version mismatch, discard and return fresh defaults — never crash, never partially merge. Unit-test the corrupt-JSON and wrong-version paths.
- **Pure logic goes in `src/game/`, no React imports**: trace/selection rules (including backtrack and the 3-letter minimum), multiset containment, word classification (grid / bonus / already-found / invalid), reveal + completion state, hint-economy accounting, keyboard letter-to-position matching. Components stay thin.
- **Randomness is injectable.** Every function that shuffles or picks randomly accepts an RNG parameter (default `Math.random` in the app; a seeded RNG in the generator and in tests). No bare `Math.random()` inside `src/game/` or `scripts/`.
- **Fonts self-hosted** (extraction fix 1). Record the font files' source and license in `scripts/README.md` alongside the word lists.

### Target architecture (from spec)

```
word-dusk/
  scripts/build-dictionary.mjs
  scripts/generate-levels.mjs
  scripts/blocklist.txt          # curated, committed
  scripts/.cache/                # gitignored, never committed
  scripts/README.md              # sources, URLs, licenses
  src/data/levels.json           # generated, committed
  src/data/bonus-index.json      # generated, committed (if split out)
  src/components/                # Wheel, Grid, Backdrop, Overlay, Controls, ErrorBoundary
  src/game/                      # pure logic, no React imports
  src/App.jsx
  public/fonts/                  # self-hosted woff2
  tests/unit/
  tests/e2e/
  netlify.toml
  CLAUDE.md
```

### Phase 0 — Repo setup

1. **Do:** `git init`; write `.gitignore` (node_modules, dist, scripts/.cache/, playwright-report/, test-results/, .netlify/).
   **Expect:** `git status` shows only intended files (word-dusk.jsx, reports/, .gitignore).
   **If not:** extend `.gitignore` before the first commit.
2. **Do:** Scaffold Vite manually — the directory is non-empty (`reports/`, `word-dusk.jsx`), so `pnpm create vite .` would hit an interactive "directory not empty" prompt and stall an autonomous run. Instead hand-write `package.json` (with `"type": "module"`, `"packageManager"`, scripts: dev/build/preview/test/lint), `vite.config.js` with `@vitejs/plugin-react`, `index.html`, and a minimal `src/main.jsx`; then `pnpm add react react-dom` and `pnpm add -D vite @vitejs/plugin-react` at current-latest pinned versions.
   **Expect:** `pnpm build` exits 0 and `pnpm dev` serves a page (verify with `curl -sf http://localhost:5173` against a backgrounded dev server, then kill it).
   **If not:** it is your scaffold — fix config, not versions, first.
3. **Do:** Commit the bare scaffold. Conventional commits from here on; small and reviewable; no AI attribution lines; plain-text shell-safe messages.
   **Expect:** `git log --oneline` shows one scaffold commit.

*(GitHub repo creation is deferred to Phase 5 under H3 — nothing before deploy needs a remote, and it keeps the outward-facing action behind an approved checkpoint. Run `gh auth status` now anyway — CHECK FIRST that credentials exist — and report at H2 if they don't, so Phase 5 isn't blocked cold.)*

### Phase 1 — Extract prototype

1. **Do:** Read `word-dusk.jsx` fully. Extract components (`Wheel`, `Grid`, `Backdrop`, `Overlay`, `Controls`, new `ErrorBoundary`) and pure logic into `src/game/` per Standing decisions. Move the embedded CSS string to plain CSS files, applying only extraction fixes 1–6 (fonts, timers, min-length rule, `dvh`, error boundary, multiset-by-position). No other visual changes.
   **Expect:** `pnpm dev` renders the game; wheel drag with backtrack, shuffle, hint, bonus counter, and complete overlay all behave as in the prototype.
2. **Do:** Port the five prototype levels into `src/data/levels.json` in the versioned schema (Standing decisions) with `"generator": {"seed": null, "version": "hand-ported"}`. Write `src/game/levelSchema.js` and validate the file with it.
   **Expect:** `node -e 'import("./src/game/levelSchema.js").then(m => m.validateLevels(JSON.parse(require("fs").readFileSync("src/data/levels.json"))))'`-style check (or a small script) exits 0. Schema stays stable when Phase 2 replaces the data.
3. **Do:** Write first unit tests now, not in Phase 4: trace/backtrack rules, word classification, completion detection, `validateLevels` accepting the ported file and rejecting mutations (missing letter, bad intersection).
   **Expect:** `pnpm vitest run` green.
4. **Do:** Delete nothing: keep `word-dusk.jsx` at root as the design reference (gitignore it or commit it — commit it; it's the spec's stated reference). Commit the phase in small conventional commits.
   **Expect (phase exit):** prototype behavior reproduced 1:1, playable locally, unit tests green, `pnpm build` exits 0.

### Phase 2 — Dictionary pipeline + generator — CHECKPOINT H1 AFTER

1. **CHECK FIRST:** the word-list source URLs. Candidates to probe (HTTP 200 and plausible content-length, e.g. `curl -sI`): 12dicts via `http://wordlist.aspell.net/12dicts/` (2of12inf inside the archive) and ENABLE via a Project-Gutenberg/public-domain mirror such as the canonical `enable1.txt` (~1.7 MB, 172k lines). Record the exact URLs that passed, with date and SHA-256 of the downloaded files, in `scripts/README.md`. A failed probe is hard stop H5.
2. **Do:** `scripts/build-dictionary.mjs` — download to `scripts/.cache/` (skip download when the cached file's SHA-256 matches the recorded one; fail loudly, non-zero exit, on mismatch or network error — never build from a partial file). Filter tier 1: 3–7 letters, `/^[a-z]+$/`, no proper nouns/abbreviations, and **drop 2of12inf entries carrying a `%` marker** (single-source words — this is where "that's not a word" grid entries like OPE come from) as well as `!`-marked entries. Filter tier 2 (ENABLE): 3+ letters, same charset. Apply `scripts/blocklist.txt` (curate a slur/profanity list; case-insensitive exact match) to both tiers. Emit `scripts/.cache/tier1.json` and `tier2.json` plus a printed summary (counts per length).
   **Expect:** script exits 0; tier 1 count is plausibly 5k–25k, tier 2 100k+; spot-check that a handful of common words are in tier 1 and a known-obscure ENABLE word is tier-2-only.
   **If not:** wrong list variant or over-aggressive filter — inspect the raw file head before touching filter code.
   *H1 revision (2026-07-11): the first run kept `%`-marked entries, yielding 28,125 tier-1 words and low-frequency grid words (OPE). Human reviewer directed the stricter filter above; regenerate `levels.json` and re-run the invariant tests before Phase 3. A word dropped from tier 1 that still exists in ENABLE remains a valid bonus word — nothing is lost for players, it just can't appear in a grid.*
3. **Do:** `scripts/generate-levels.mjs` — accepts `--seed <n>` (required; no default that silently varies) and `--count <n>` (default 40). Difficulty ramp: levels 1–8 four letters, 9–20 five, 21–32 six, 33+ seven. For each slot: pick a tier 1 base word (seeded RNG), compute tier 1 sub-words by multiset containment, require 4–7 grid words else reject the base word; run the layout search — connected crossword, every word intersects at least one other, bounding box ≤ 9 cols × 8 rows, and **no accidental adjacencies**: any run of 2+ contiguous letters in a row or column must exactly equal a placed word. Bounded search (cap placements tried per base word); on failure discard the base word — never relax the adjacency rule. Compute the tier 2 bonus set (formable from the letters, minus grid words), sort it, and emit the versioned `levels.json`. No two levels share a base word; skip base words whose letter multiset duplicates an earlier level's.
   **Expect:** `node scripts/generate-levels.mjs --seed 1` exits 0 with ≥ 40 levels; re-running with the same seed produces a byte-identical file (`diff` clean); a different seed produces a different file.
   **If not:** repair loop R1.
4. **Do:** `tests/unit/generator-invariants.test.js` — loads the committed `levels.json` and asserts: schema valid (via `validateLevels`); every grid word formable from level letters; all intersections agree; connectivity holds; the no-accidental-adjacency rule holds (re-derive runs from the placed grid — do not trust generator bookkeeping); bounding box fits 9×8; 4–7 grid words per level; no blocklisted word in any grid or bonus list; bonus lists sorted and disjoint from grid words; letter counts match the ramp. These tests are the mechanical oracle for R1.
   **Expect:** `pnpm vitest run tests/unit/generator-invariants.test.js` green against the committed file.
5. **Do:** Wire the app to the generated levels; play levels 1, 9, 21, and 33 manually via `pnpm dev` far enough to confirm the grid renders inside the viewport and words submit.
6. **Do:** Write `scripts/README.md` (sources, exact URLs, SHA-256s, licenses, regeneration commands) and prepare a short review packet for the human: 5 sample levels across the ramp (letters, grid words, first 15 bonus words each) pasted into the checkpoint report.
   **Expect:** committed; `git status` clean; `scripts/.cache/` untracked.
7. **HARD STOP H1.** Report the review packet and wait.

### Phase 3 — New features

1. **Do:** Persistence via `src/game/persistence.js` per Standing decisions; save on level clear, bonus find, and hint spend; load on boot.
   **Expect:** unit tests cover round-trip, corrupt JSON, wrong version, and missing key; manual check — clear a level, reload, still cleared.
2. **Do:** Level map/select screen: cleared levels marked, next level unlocked, later levels visibly locked; selecting a cleared level replays it without erasing progress. Match the existing visual identity.
   **Expect:** navigable by mouse, touch, and keyboard (focusable buttons).
3. **Do:** Hint economy in pure logic (`src/game/hints.js`): start 3 credits, +1 per 5 *cumulative* bonus words (count total-ever-found, persisted, so the threshold can't be re-farmed by replaying); hint button disabled at 0 with the credit count visible. While here, move the hint-cell pick out of `App.jsx` (currently a bare `Math.random()` at the call site) into an injectable-RNG pure function so it's unit-testable.
   **Expect:** unit tests for the 5-boundary, replay non-farming, and 0-credit gating.
4. **Do:** Keyboard path: letter keys select the *first unused wheel position* holding that letter (multiset-correct with duplicates), Backspace pops, Enter submits, Escape clears; the same trace display updates; pointer-drag behavior unchanged. Announce results via an `aria-live="polite"` region on the existing message line.
   **Expect:** unit tests for duplicate-letter mapping and no-such-letter no-op; manual check both input paths on one level.
5. **Do:** "About" page/panel: ad-free + open-source statement, word list attributions (from `scripts/README.md`), font attribution.
6. **Do:** Commit per feature.
   **Expect (phase exit):** `pnpm vitest run` green, `pnpm build` exits 0, all Phase 3 features playable locally.

### Phase 4 — Test suite, CI, Lighthouse — CHECKPOINT H2 AFTER

0. **Do (Phase 3 audit fixes, directed 2026-07-11 — run these first):**
   a. Make persistence writes failure-safe: wrap `storage.setItem` in `writeSave` in try/catch (quota exceeded and some private-browsing modes throw), degrading to in-memory-only; guard `getStorage()` the same way, since accessing `window.localStorage` itself can throw under strict privacy settings. Add a unit test with a throwing storage stub proving gameplay state survives a failed write.
   b. Add `scripts/tier1-exclusions.txt` — a curated grid-word exclusion list applied to tier 1 exactly like the blocklist (case-insensitive exact match; words stay in tier 2, so they remain valid bonus words). Seed it with `ope` and `nus`, plus anything else review has flagged. Document it in `scripts/README.md`, rebuild tiers, regenerate with `--seed 1`, confirm determinism, re-run the invariant suite, and confirm neither word appears in any grid *by filter, not by seed luck* (assert they're absent from `tier1.json`). This is the standing mechanism for future "that's not a word" reports — a one-line addition + regen, never a hand-edit of `levels.json`.
   **Expect:** full vitest run green; `git diff src/data/` after a second same-seed regen is clean.
1. **Do:** Fill unit-test gaps: multiset containment edge cases (duplicates, empty), reveal/completion, anything in `src/game/` under ~90% line coverage worth having. Also close the tier-membership gap: the Phase 2 invariant tests cannot assert "every grid word is tier 1" because `tier1.json` lives in the gitignored cache — either commit the filtered tier lists under `scripts/data/` (they are generated JSON, allowed) and assert membership in the invariant tests, or add a script that rebuilds the cache and checks; pick one and make the Verification table's "grid words common-tier" row true as written.
2. **Do:** Playwright e2e against `vite preview` (production build, port fixed in config). Keep drag-simulation minimal — pointer-trace e2e is the flakiest thing in this suite: one drag happy-path test using `page.mouse.move` with `steps`, and use the keyboard path for the other flows (bonus word, shuffle, hint spend/earn, level complete + advance, progress survives reload via `page.reload()`). No arbitrary `waitForTimeout`; wait on visible state.
   **Expect:** `pnpm exec playwright test` green locally, twice in a row (flake check).
   **If not:** repair loop R2.
3. **Do:** `.github/workflows/ci.yml` — on push and PR: pnpm install (with store cache), lint, `vitest run` (includes generator invariants against the committed levels.json), build, `playwright install chromium` + e2e. Fail the job if `git status --porcelain` is dirty after build (catches uncommitted generated files).
   **Expect:** workflow file lints (`gh workflow` can't run pre-push; CI proof lands in Phase 5 when the repo exists — note this openly in the H2 report, not as "CI green").
4. **Do:** Lighthouse against the local production build: `pnpm build`, serve `dist/`, run the Lighthouse CLI headless with JSON output; parse the three category scores mechanically.
   **Expect:** Performance, Accessibility, Best Practices all ≥ 0.90.
   **If not:** repair loop R3 (likely suspects: font loading, image-less LCP on the gradient, contrast of `#7f8ab0` idle text — check contrast ≥ 4.5:1 and fix the token if it fails, keeping it within the palette family).
5. **Do:** Write `CLAUDE.md`: two-tier dictionary rule, no-accidental-adjacency invariant, "run generator invariant tests after touching `scripts/`", "regenerate `levels.json` only via the script with an explicit `--seed`, never hand-edit", "do not redesign the visual identity", pnpm, schema-version rule.
6. **HARD STOP H2.** Report: test inventory, coverage summary, two-run Playwright result, Lighthouse scores (all three, with the JSON on disk as evidence), the H3 items for approval (GitHub repo name/visibility, Netlify site name `word-dusk`), and any deviations. Wait.

### Phase 5 — Repo publish + deploy (runs on H2/H3 approval)

0. **Do (H2 audit fixes, directed 2026-07-11 — run these first):** Commit the uncommitted Phase 4 work — `vite.config.js` (the `preloadFonts()` plugin that carried Performance from 0.84 to 0.91), `CLAUDE.md` (tier-1 exclusions rule), `reports/run-record.md`, and the `reports/lighthouse/` JSON evidence. Then append the missing **step 6 / HARD STOP H2** section to the run record: test inventory, two-run Playwright result, the three Lighthouse scores with their on-disk JSON paths, `gh auth status`, H3 items, and deviations.
   **Expect:** `git status --porcelain` is empty; the record contains an H2 section.
   **📝 Why:** the Lighthouse-passing build existed only in the working tree — Phase 5 opens by pushing history, and CI's own drift-gate fails on a dirty tree.
1. **Do:** Write a root `LICENSE` file — MIT, copyright Cynthia Teeters — and commit it *before* `gh repo create`. Then create the public GitHub repo `word-dusk` on the personal account (not RVCC-IDMX) via `gh repo create` with the local history pushed as-is (no squash). Word-list and font license attributions (OFL fonts; 12dicts/ENABLE dictionaries) are already recorded in `scripts/README.md` — carry them into the README in step 4.
   **Expect:** `LICENSE` exists at the root and is tracked; `gh run watch` (or `gh run list`) shows the CI workflow green on main.
   **If not:** CI-environment-only failures get repair loop R2; anything else, report.
2. **Do:** `netlify.toml` — build `pnpm build`, publish `dist`, SPA redirect `/* -> /index.html 200`. Deploy via Netlify CLI/MCP to a new site named `word-dusk` (accept an available subdomain variant).
   **Expect:** production URL returns 200 and the game loads (curl + a real page check).
3. **Do:** Run Lighthouse once more against the *deployed* URL; scores must hold ≥ 90.
   **If not:** R3 continues if attempts remain for the deployed-environment cause (headers, compression — fix in `netlify.toml`); else report.
4. **Do:** README — must follow the house convention, which the earlier draft of this step did not spell out. Required sections, in order: a short intro (what Word Dusk is) with the **play link** and a **screenshot** (saved to a stated path, `test -f` + non-zero-size proof — an image seen inline in tool output is not evidence); **Beginner's Guide** (how to play: drag or type letters on the wheel, grid words vs. bonus words, hints); **Dev setup** (pnpm — `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm vitest run`, `pnpm exec playwright test`); **Dictionary pipeline** (two-tier tier1/tier2 explanation, the tier-1 exclusions mechanism, and regeneration instructions — `node scripts/generate-levels.mjs --seed <n>`, never hand-edit `levels.json`); **Attributions** (OFL fonts, 12dicts/ENABLE word lists, per `scripts/README.md`); **Contributing**; **MIT License (Cynthia Teeters)** pointing at the root `LICENSE` from step 1. Update `reports/index.md` if any report files changed. Final commit + push.
   **Expect:** every section above is present; the screenshot path passes `test -f` and is non-zero.
5. **Do:** Complete the run record: map every acceptance criterion to the exact check that proved it.

### Verification (final — every claim maps to a check actually run)

| Claim | Check | PASS |
|---|---|---|
| Deployed and playable | Load production URL; complete one word on a phone-width viewport (390px) via devtools emulation | word submits, cells reveal |
| 40+ levels, ramp 4–7 | `node -e` count + letters-length histogram over `levels.json` | ≥ 40; ramp matches spec bands |
| Grid words common-tier; obscure = bonus only | generator invariants test (tier membership assertion) | vitest green |
| No accidental adjacencies / intersections / connectivity | `pnpm vitest run tests/unit/generator-invariants.test.js` | green |
| Progress survives reload | Playwright reload test | green |
| Keyboard and drag both work | Playwright: one drag test + keyboard-path tests | green |
| Lighthouse ≥ 90 ×3 | Lighthouse CLI JSON vs deployed URL, file on disk | all three ≥ 0.90 |
| CI green on main | `gh run list --branch main --limit 1` | conclusion: success |
| Reproducible generation | regenerate with recorded seed, `git diff --exit-code src/data/` | exit 0 |
| No committed word lists / cache | `git ls-files scripts/.cache` empty; no raw list files tracked | empty output |

### Constraints (unchanged from spec)

- Fully static: no accounts, backend, database, monetization, ads, multiplayer, leaderboards, i18n. No Wordscapes assets/art/branding.
- Vite + React, plain CSS/CSS modules (no Tailwind), Vitest + Playwright, Node ESM scripts run at build time only — no dictionary/generation logic in the browser.
- Never commit `scripts/.cache/` or raw word-list source files — only generated JSON.
- Decisions not covered here or in the spec: smallest reasonable choice, noted in the commit/PR description, never a stall.

### Acceptance criteria (from spec — final verification)

- [x] Deployed Netlify URL loads and is playable on a phone (mobile-emulation evidence; see
      `reports/run-record.md` Phase 5 step 5 for the logged interactive-click-through deviation)
- [x] 40+ generated levels, difficulty ramp 4 to 7 letters
- [x] Every grid word is common-tier; obscure words only ever count as bonus
- [x] Generator invariant tests pass; no accidental adjacencies in any shipped level
- [x] Progress survives a page reload
- [x] Keyboard and drag input both work
- [x] Lighthouse 90+ on Performance, Accessibility, Best Practices
- [x] CI green on main; README documents the dictionary pipeline

**Shipped:** https://word-dusk.netlify.app — repo: https://github.com/cynthiateeters/word-dusk
— see `reports/run-record.md` for the full Phase 5 verification log.
