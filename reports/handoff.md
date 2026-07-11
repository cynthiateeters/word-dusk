---
title: "Word Dusk: Claude Code Handoff Spec"
type: "reference"
sources: []
tags: [vite, vitest, netlify, github-actions]
created: 2026-07-11
updated: 2026-07-11
status: draft
---

# Word Dusk: Claude Code Handoff Spec

## Context

Word Dusk is a Wordscapes-style word puzzle game. A working single-file React prototype exists (`word-dusk.jsx`, included in this folder). It proves the core mechanic: a draggable letter wheel, a crossword grid that fills as words are found, bonus words, shuffle, hints, and a twilight mountain aesthetic.

Your job is to turn that prototype into a production web app with a proper repo, a real dictionary pipeline, programmatic level generation, tests, and a Netlify deploy.

The prototype is the design reference. Preserve its look, feel, and interaction model. The visual identity (dusk gradient, amber trace line, Fraunces + Nunito Sans, mountain ridge backdrop) is settled. Do not redesign it.

## Goal

A deployed, ad-free, installable-quality web game at a Netlify URL, backed by a public GitHub repo, with 40+ generated levels and a two-tier dictionary.

## Non-goals (do not build these)

- No accounts, no backend, no database. This is a fully static app.
- No monetization, ads, or analytics beyond Netlify's built-in.
- No multiplayer or leaderboards.
- No i18n. English only.
- Do not clone Wordscapes assets, art, or branding. Word Dusk is its own game.

## Tech stack

- Vite + React (the prototype is React; keep it)
- Plain CSS or CSS modules, extracted from the prototype's embedded styles. No Tailwind.
- Vitest for unit tests, Playwright for e2e
- Node scripts (ESM) for the dictionary and level-generation pipeline, run at build time, never in the browser
- Deploy target: Netlify (the account is already connected; Netlify CLI and MCP are available)

## Architecture

```
word-dusk/
  scripts/
    build-dictionary.mjs    # downloads/filters word lists into tiers
    generate-levels.mjs     # produces src/data/levels.json
  src/
    data/
      levels.json           # generated, committed
      bonus-index.json      # generated, committed (see dictionary section)
    components/             # Wheel, Grid, Backdrop, Overlay, Controls
    game/                   # pure logic: level state, word validation, scoring
    App.jsx
  tests/
    unit/                   # game logic, generator invariants
    e2e/                    # Playwright
  netlify.toml
  CLAUDE.md
```

Keep game logic (validation, reveal state, completion checks) in pure functions under `src/game/` with no React imports, so it is unit-testable in isolation.

## Dictionary: two tiers

This is the heart of the upgrade from the prototype, which used hand-curated per-level word lists.

**Tier 1, answer words (what puzzles are built from):**

- Source: SCOWL/12dicts common-word lists (start with the 2of12inf list or SCOWL size 35 to 50)
- Filter: 3 to 7 letters, lowercase alpha only, no proper nouns, no abbreviations
- These are the only words that appear in crossword grids. If a word would make a player say "that is not a word," it does not belong in tier 1.

**Tier 2, bonus words (what players get credit for):**

- Source: ENABLE word list (public domain)
- Filter: 3+ letters, must be formable from level letters (multiset containment)
- Any valid tier 2 word that is not a grid answer counts as a bonus word.

**Profanity/slur screen:** apply a blocklist to both tiers before generation. Nothing offensive appears in a grid or gets rewarded as a bonus.

**Shipping the dictionary without shipping 170k words:** do not send the full ENABLE list to the browser. At generation time, precompute the complete set of valid bonus words per level (it is small, typically 20 to 80 words for 5 to 7 letters) and embed it in `levels.json` or a companion `bonus-index.json`. The client only ever does set lookups.

Cache downloaded word lists in `scripts/.cache/` and commit the generated JSON, so builds are reproducible without network access. Record source URLs and licenses in `scripts/README.md`.

## Level generation

`generate-levels.mjs` produces 40+ levels with a difficulty ramp:

1. Pick a base word (the pangram) from tier 1: levels 1 to 8 use 4 letters, 9 to 20 use 5, 21 to 32 use 6, 33+ use 7.
2. Compute all tier 1 sub-words formable from the base word's letters. A level needs 4 to 7 grid words to be viable; otherwise pick a new base word.
3. Lay out the grid words as a connected crossword. Constraints the prototype already respects, now enforced programmatically:
   - Every grid word intersects at least one other grid word.
   - No accidental adjacencies: any run of 2+ contiguous letters in a row or column must be exactly one of the placed words. Parallel words in adjacent rows/columns almost always violate this; the layout search must reject those placements.
   - Grid bounding box fits mobile: max 9 columns by 8 rows.
4. Compute the tier 2 bonus set for the level's letters, minus the grid words.
5. Deterministic output: seed the generator (accept `--seed`) so regeneration is reproducible and diffs are reviewable.

Write generator invariant tests (Vitest) that load the emitted `levels.json` and verify: every grid word is formable from the level letters, all intersections agree on the letter, the no-accidental-adjacency rule holds, connectivity holds, and no blocklisted words appear.

If a clean crossword layout cannot be found for a base word after a bounded search, discard it and move on. Do not loosen the adjacency rule to force a fit.

## Gameplay features to carry over and extend

From the prototype, unchanged in behavior:

- Pointer-drag tracing with backtrack (sliding onto the previous letter pops the last selection)
- Shuffle, hint (reveals one random unrevealed cell), bonus counter, level-complete overlay

New for the full app:

- Progress persistence in localStorage (current level, bonus totals). This is a real deployed site, so localStorage is fine here.
- A simple level map/select screen showing cleared levels
- Hint economy: earn 1 hint credit per 5 bonus words found, start with 3
- Sound: none for v1
- A small "about" page stating the game is ad-free and open source, with word list attributions

## Accessibility and quality floor

- Playable by touch and mouse; wheel uses pointer events with `touch-action: none` (already in the prototype)
- Keyboard path: typing letters plus Enter submits a word (new; the prototype is drag-only)
- Visible focus states, `prefers-reduced-motion` respected (prototype already does this, keep it)
- Lighthouse: 90+ on Performance, Accessibility, and Best Practices for the deployed site. Run Lighthouse before calling the deploy done.

## Testing

- Vitest: word validation, multiset containment, reveal/completion logic, generator invariants
- Playwright: happy path (trace a word via pointer events, see grid cells reveal), bonus word flow, shuffle, hint, level complete and advance, progress survives reload
- CI: GitHub Actions workflow running lint, unit tests, generator invariants, and Playwright on push and PR

## Repo and deploy

- New public repo `word-dusk` on the personal GitHub account (not the RVCC-IDMX org; this is a personal project)
- MIT license; include word list license attributions (SCOWL and ENABLE have their own terms; reproduce them as required)
- Conventional commits, small and reviewable; do not squash the history into one giant commit
- `netlify.toml` with build command, publish dir, and SPA redirect
- Deploy via Netlify CLI or MCP to a new site named `word-dusk` (accept whatever subdomain variant is free)
- README: screenshot, play link, how the dictionary pipeline works, how to regenerate levels, dev setup

## Write a CLAUDE.md

Create a `CLAUDE.md` for future sessions covering: the two-tier dictionary rule (tier 1 in grids, tier 2 for bonus), the no-accidental-adjacency layout invariant, "run generator invariant tests after touching scripts/", and "do not redesign the visual identity."

## Working agreement

- Work in phases, in this order, and stop for a human checkpoint after phases 2 and 4:
  1. Scaffold repo, extract prototype into components, get it running under Vite with the original 5 hand-built levels
  2. Dictionary pipeline plus generator with invariant tests (checkpoint: review generated levels for word quality before proceeding)
  3. New features: persistence, level select, hint economy, keyboard input
  4. Test suite, CI, Lighthouse pass (checkpoint: review before deploy)
  5. Netlify deploy, README polish
- If a decision is not covered by this spec, make the smallest reasonable choice and note it in the PR description rather than blocking.
- Never commit `scripts/.cache/` contents or any word list files, only the generated JSON.

## Acceptance criteria

- [ ] Deployed Netlify URL loads and is playable on a phone
- [ ] 40+ generated levels, difficulty ramp 4 to 7 letters
- [ ] Every grid word is common-tier; obscure words only ever count as bonus
- [ ] Generator invariant tests pass; no accidental adjacencies in any shipped level
- [ ] Progress survives a page reload
- [ ] Keyboard and drag input both work
- [ ] Lighthouse 90+ on Performance, Accessibility, Best Practices
- [ ] CI green on main; README documents the dictionary pipeline
