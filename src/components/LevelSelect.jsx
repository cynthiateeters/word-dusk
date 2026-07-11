import { isLevelCleared, isLevelUnlocked } from "../game/progress.js";

export default function LevelSelect({ levels, clearedLevels, onSelect, onAbout }) {
  return (
    <div className="app level-select">
      <header className="header">
        <div className="level-tag">
          <span className="level-name">Word Dusk</span>
          <span className="level-num">Choose a level</span>
        </div>
        <button className="btn" onClick={onAbout}>
          About
        </button>
      </header>

      <main className="board level-grid">
        {levels.map((level, i) => {
          const cleared = isLevelCleared(level, clearedLevels);
          const unlocked = isLevelUnlocked(i, levels, clearedLevels);
          return (
            <button
              key={level.id}
              className={`level-tile ${cleared ? "cleared" : ""} ${!unlocked ? "locked" : ""}`}
              disabled={!unlocked}
              onClick={() => onSelect(i)}
            >
              <span className="level-tile-num">{i + 1}</span>
              {cleared && <span className="level-tile-check">✓</span>}
            </button>
          );
        })}
      </main>
    </div>
  );
}
