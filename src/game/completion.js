import { wordCells, cellKey } from "./cells.js";

export function isLevelComplete(level, revealed) {
  return level.grid.every((w) => wordCells(w).every(({ r, c }) => revealed.has(cellKey(r, c))));
}
