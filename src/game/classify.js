export const WordResult = Object.freeze({
  TOO_SHORT: "too-short",
  ALREADY_FOUND: "already-found",
  GRID: "grid",
  BONUS: "bonus",
  INVALID: "invalid",
});

import { isSubmittable } from "./wordRules.js";

export function classifyWord(word, { gridWords, bonusWords, foundWords, bonusFound }) {
  if (!isSubmittable(word)) return { result: WordResult.TOO_SHORT, word };
  const upper = word.toUpperCase();

  if (gridWords.has(upper)) {
    if (foundWords.has(upper)) return { result: WordResult.ALREADY_FOUND, word: upper };
    return { result: WordResult.GRID, word: upper };
  }

  if (bonusWords.has(upper)) {
    if (bonusFound.has(upper)) return { result: WordResult.ALREADY_FOUND, word: upper };
    return { result: WordResult.BONUS, word: upper };
  }

  return { result: WordResult.INVALID, word: upper };
}
