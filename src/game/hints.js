export const INITIAL_HINT_CREDITS = 3;
export const BONUS_WORDS_PER_HINT = 5;

export function creditsEarnedForBonusCount(count) {
  return Math.floor(count / BONUS_WORDS_PER_HINT);
}

export function awardHintCredits(hintCredits, bonusCountBefore, bonusCountAfter) {
  const earned =
    creditsEarnedForBonusCount(bonusCountAfter) - creditsEarnedForBonusCount(bonusCountBefore);
  return hintCredits + earned;
}

export function canSpendHint(hintCredits) {
  return hintCredits > 0;
}

export function spendHint(hintCredits) {
  return canSpendHint(hintCredits) ? hintCredits - 1 : hintCredits;
}

export function pickHintCell(unrevealedKeys, rng = Math.random) {
  if (unrevealedKeys.length === 0) return null;
  return unrevealedKeys[Math.floor(rng() * unrevealedKeys.length)];
}
