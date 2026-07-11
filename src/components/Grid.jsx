import { cellKey } from "../game/cells.js";

export default function Grid({ data, revealed, justRevealed, cellSize }) {
  const cols = data.maxC - data.minC + 1;
  const rows = data.maxR - data.minR + 1;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}
    >
      {[...data.cells.values()].map(({ r, c, letter }) => {
        const key = cellKey(r, c);
        const isRevealed = revealed.has(key);
        return (
          <div
            key={key}
            className={`cell ${isRevealed ? "revealed" : ""} ${justRevealed.has(key) ? "pop" : ""}`}
            style={{
              gridRow: r - data.minR + 1,
              gridColumn: c - data.minC + 1,
              fontSize: cellSize * 0.5,
            }}
          >
            {isRevealed ? letter : ""}
          </div>
        );
      })}
    </div>
  );
}
