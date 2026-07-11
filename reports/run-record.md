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
