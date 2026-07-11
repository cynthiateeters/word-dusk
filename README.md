# Word Dusk

A Wordscapes-style word puzzle game: drag or type letters on a wheel to spell words, fill a
crossword grid, and find bonus words along the way — set against a twilight mountain backdrop.
Fully static, no backend, no accounts, no ads, no analytics, English only.

**Play it: [word-dusk.netlify.app](https://word-dusk.netlify.app)**

![Word Dusk — level 1, showing the crossword grid and letter wheel](docs/screenshot.png)

## Beginner's guide

- Each level gives you a wheel of 4-7 letters and an empty crossword grid.
- **Drag** through the letters on the wheel (or **type** them on a keyboard) to spell a word, then
  release or press Enter to submit it.
- Words that fit a slot in the crossword **grid** reveal those cells. Any other valid word you can
  spell from the same letters counts as a **bonus** word — bonus words don't appear in the grid but
  still count toward your total.
- **Shuffle** rearranges the wheel without changing the letters. **Hint** reveals one unrevealed
  grid cell; you start with 3 hint credits and earn one more every 5 bonus words you find.
- Clearing a level's full grid unlocks the next one. Your cleared levels, bonus words, and hint
  credits are saved automatically and survive a page reload.

## Dev setup

This project uses **pnpm**.

```
pnpm install                        # install dependencies
pnpm dev                            # run locally
pnpm build && pnpm preview          # production build
pnpm vitest run                     # unit tests
pnpm exec playwright test           # e2e tests
```

## Dictionary pipeline

Word Dusk uses a two-tier dictionary, built at generation time and never shipped to the browser as
raw word lists:

- **Tier 1** (12dicts common words) is the only source of **grid** words — an obscure word should
  never appear in the crossword grid.
- **Tier 2** (ENABLE) words that aren't also grid words count as **bonus** only.
- A profanity/slur blocklist (`scripts/blocklist.txt`) is applied to both tiers.
- **Tier 1 exclusions** (`scripts/tier1-exclusions.txt`) is the standing mechanism for "that's not
  a common word" reports: append the word, rebuild (`node scripts/build-dictionary.mjs`), and
  regenerate (below) — never hand-edit `levels.json`. The exclusion only affects tier 1; the word
  remains a valid bonus word if it's still formable.

`src/data/levels.json` is generated and committed, never hand-edited:

```
node scripts/generate-levels.mjs --seed <n>
```

The same seed always produces a byte-identical `levels.json`; a different seed produces a
different level set.

Full source URLs, checksums, and licenses for the word lists are recorded in
[`scripts/README.md`](scripts/README.md).

## Attributions

- **Fonts:** Fraunces and Nunito Sans, both SIL Open Font License (OFL), self-hosted in
  `src/fonts/`.
- **Word lists:** [12dicts](https://wordlist.aspell.net/12dicts/) (tier 1, grid words) and
  [ENABLE](https://github.com/dolph/dictionary) (tier 2, bonus words). Details in
  [`scripts/README.md`](scripts/README.md).

## Contributing

Issues and pull requests are welcome. Please run `pnpm lint`, `pnpm vitest run`, and
`pnpm exec playwright test` before submitting a change, and never hand-edit `src/data/levels.json`
— regenerate it instead (see Dictionary pipeline above).

## License

MIT © Cynthia Teeters — see [LICENSE](LICENSE).
