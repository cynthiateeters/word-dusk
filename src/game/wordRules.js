export const MIN_WORD_LENGTH = 3;

export function isSubmittable(word) {
  return typeof word === "string" && word.length >= MIN_WORD_LENGTH;
}
