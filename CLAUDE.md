# Word Dusk

A Wordscapes-style word puzzle game: draggable letter wheel, crossword grid, bonus words, twilight mountain aesthetic. Fully static Vite + React app deployed to Netlify. No backend, no accounts, no ads, no analytics, English only.

## Documents of record

- `reports/handoff.md` — the spec. Wins any conflict with other docs.
- `reports/implementation-plan.md` — executor runbook (phases, stop conditions, verification). Follow it when building; its two human checkpoints (after the generator phase and before deploy) are hard stops.
- `word-dusk.jsx` — the original single-file prototype, kept at the root as the design and interaction reference.

## Non-negotiable rules

- **Do not redesign the visual identity**: dusk gradient, amber trace line, Fraunces + Nunito Sans, mountain ridge backdrop. Fonts are self-hosted (`src/fonts/`, OFL-licensed woff2 from Google Fonts) — never reintroduce a Google Fonts `@import` or any third-party request.
- **Two-tier dictionary**: tier 1 (SCOWL/12dicts common words) is the only source of grid words; tier 2 (ENABLE) words that aren't grid words count as bonus only. An obscure word must never appear in a crossword grid. A profanity/slur blocklist (`scripts/blocklist.txt`) applies to both tiers.
- **Tier 1 exclusions**: if a real-but-obscure word ends up as a grid word (e.g. OPE, NUS), the fix is to append it to `scripts/tier1-exclusions.txt`, rebuild (`node scripts/build-dictionary.mjs`), and regenerate (`node scripts/generate-levels.mjs --seed <n>`) — never hand-edit `levels.json`. The exclusion is tier-1-only; the word remains a valid bonus word if formable. See `scripts/README.md` for the full mechanism.
- **No accidental adjacencies**: in any generated grid, every run of 2+ contiguous letters in a row or column must exactly equal a placed word. Never relax this rule to make a layout fit — discard the base word instead.
- **`levels.json` is generated, never hand-edited.** Regenerate only via `node scripts/generate-levels.mjs --seed <n>` (seed required; same seed → byte-identical output). The full dictionary never ships to the browser — per-level bonus sets are precomputed at generation time.
- **Run the generator invariant tests after touching anything in `scripts/`**: `pnpm vitest run tests/unit/generator-invariants.test.js`.
- **Schema is versioned.** `levels.json` carries `schemaVersion`; `src/game/levelSchema.js` is the single validator, used by the generator, the tests, and the app. Change the schema in all consumers together and bump the version.

## Architecture rules

- Pure game logic lives in `src/game/` with **no React imports**: selection/trace rules, multiset containment, word classification, reveal/completion state, hint economy, persistence. Components in `src/components/` stay thin.
- Wheel letters are a **multiset keyed by position**, never by letter value — generated 6–7 letter words have duplicate letters.
- Randomness is injectable: no bare `Math.random()` inside `src/game/` or `scripts/`.
- localStorage access goes through `src/game/persistence.js` only (versioned key `wordDusk.save.v1`; corrupt or mismatched data falls back to fresh defaults, never crashes).
- Dictionary/level generation runs at build time in Node ESM scripts — never in the browser.

## Tooling

- **pnpm** (personal project), lockfile committed. Vitest for unit tests, Playwright for e2e, ESLint flat config. Plain CSS — no Tailwind.
- Never commit `scripts/.cache/` or raw word-list source files — only generated JSON. Word-list sources, URLs, checksums, and licenses are recorded in `scripts/README.md`.
- Adding any dependency beyond the set pre-approved in the implementation plan is a stop-and-ask, not a judgment call.

## Commands

```
pnpm dev                                              # run locally
pnpm build && pnpm preview                            # production build
pnpm vitest run                                       # unit tests
pnpm exec playwright test                             # e2e
node scripts/build-dictionary.mjs                     # rebuild word tiers
node scripts/generate-levels.mjs --seed <n>           # regenerate levels
```
