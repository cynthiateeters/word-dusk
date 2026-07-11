export function startSelection(idx) {
  return [idx];
}

export function moveSelection(selection, idx) {
  if (idx === -1) return selection;
  if (selection[selection.length - 1] === idx) return selection;
  // backtrack: sliding onto the previous letter pops the last selection
  if (selection.length >= 2 && selection[selection.length - 2] === idx) {
    return selection.slice(0, -1);
  }
  if (selection.includes(idx)) return selection;
  return [...selection, idx];
}

export function selectionToWord(selection, letters) {
  return selection.map((i) => letters[i]).join("");
}

export function keyboardSelectLetter(selection, letters, letterChar) {
  const upper = letterChar.toUpperCase();
  const idx = letters.findIndex((l, i) => l === upper && !selection.includes(i));
  if (idx === -1) return selection;
  return [...selection, idx];
}
