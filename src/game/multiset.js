export function letterMultiset(letters) {
  const m = new Map();
  for (const l of letters) m.set(l, (m.get(l) || 0) + 1);
  return m;
}

export function isFormable(word, multiset) {
  const need = letterMultiset(word.split(""));
  for (const [ch, count] of need) {
    if ((multiset.get(ch) || 0) < count) return false;
  }
  return true;
}
