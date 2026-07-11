export function cellKey(r, c) {
  return `${r},${c}`;
}

export function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.word.length; i++) {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    cells.push({ r, c, letter: w.word[i] });
  }
  return cells;
}

export function buildLevelData(level) {
  const cells = new Map();
  level.grid.forEach((w, wi) => {
    wordCells(w).forEach(({ r, c, letter }) => {
      const key = cellKey(r, c);
      if (!cells.has(key)) cells.set(key, { r, c, letter, words: [] });
      cells.get(key).words.push(wi);
    });
  });
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  cells.forEach(({ r, c }) => {
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  });
  return { cells, minR, maxR, minC, maxC };
}
