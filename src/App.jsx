import { useState, useMemo, useEffect, useRef } from "react";
import Backdrop from "./components/Backdrop.jsx";
import Wheel from "./components/Wheel.jsx";
import Grid from "./components/Grid.jsx";
import Controls from "./components/Controls.jsx";
import Overlay from "./components/Overlay.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LevelSelect from "./components/LevelSelect.jsx";
import About from "./components/About.jsx";
import { useTimeout } from "./hooks/useTimeout.js";
import { buildLevelData } from "./game/cells.js";
import { shuffleArray } from "./game/rng.js";
import { classifyWord, WordResult } from "./game/classify.js";
import { isLevelComplete } from "./game/completion.js";
import { validateLevels, CURRENT_SCHEMA_VERSION } from "./game/levelSchema.js";
import { loadSave, writeSave, totalBonusCount } from "./game/persistence.js";
import { awardHintCredits, canSpendHint, spendHint, pickHintCell } from "./game/hints.js";
import levelsData from "./data/levels.json";
import "./styles/fonts.css";
import "./styles/app.css";

function getStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    // Some strict private-browsing modes throw on accessing localStorage itself.
    return null;
  }
}

function GameLoadError() {
  return (
    <div className="app">
      <div className="overlay">
        <div className="overlay-card">
          <div className="overlay-eyebrow">Word Dusk</div>
          <h2 className="overlay-title">Level data is out of date</h2>
          <p className="overlay-stats">
            Reload after the next deploy. Expected schema version {CURRENT_SCHEMA_VERSION}.
          </p>
        </div>
      </div>
    </div>
  );
}

function Game({
  level,
  levelIndex,
  totalLevels,
  initialBonusFound,
  hintCredits,
  onBonusFound,
  onLevelCleared,
  onHintSpend,
  onExit,
}) {
  const [wheelLetters, setWheelLetters] = useState(level.letters);
  const [revealed, setRevealed] = useState(new Set());
  const [foundWords, setFoundWords] = useState(new Set());
  const [bonusFound, setBonusFound] = useState(new Set(initialBonusFound));
  const [trace, setTrace] = useState("");
  const [message, setMessage] = useState(null);
  const [justRevealed, setJustRevealed] = useState(new Set());
  const [shake, setShake] = useState(false);
  const clearedRef = useRef(false);

  const msgTimer = useTimeout();
  const revealTimer = useTimeout();
  const shakeTimer = useTimeout();

  const data = useMemo(() => buildLevelData(level), [level]);
  const gridWords = useMemo(() => new Set(level.grid.map((w) => w.word)), [level]);
  const bonusWords = useMemo(() => new Set(level.bonus), [level]);

  const levelComplete = isLevelComplete(level, revealed);
  const isLastLevel = levelIndex === totalLevels - 1;

  useEffect(() => {
    if (levelComplete && !clearedRef.current) {
      clearedRef.current = true;
      onLevelCleared(level.id);
    }
  }, [levelComplete, level.id, onLevelCleared]);

  const flash = (text, kind = "info") => {
    setMessage({ text, kind });
    msgTimer.set(() => setMessage(null), 1600);
  };

  const revealWordCells = (w) => {
    const fresh = new Set();
    setRevealed((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === "across" ? w.row : w.row + i;
        const c = w.dir === "across" ? w.col + i : w.col;
        const key = `${r},${c}`;
        if (!next.has(key)) fresh.add(key);
        next.add(key);
      }
      return next;
    });
    setJustRevealed(fresh);
    revealTimer.set(() => setJustRevealed(new Set()), 700);
  };

  const handleSubmit = (word) => {
    const classified = classifyWord(word, {
      gridWords,
      bonusWords,
      foundWords,
      bonusFound,
    });

    switch (classified.result) {
      case WordResult.TOO_SHORT:
        return;
      case WordResult.ALREADY_FOUND:
        flash("Already found", "muted");
        return;
      case WordResult.GRID: {
        const w = level.grid.find((g) => g.word === classified.word);
        setFoundWords((prev) => new Set(prev).add(classified.word));
        revealWordCells(w);
        flash(classified.word, "success");
        return;
      }
      case WordResult.BONUS:
        setBonusFound((prev) => new Set(prev).add(classified.word));
        onBonusFound(level.id, classified.word);
        flash(`Bonus: ${classified.word}`, "bonus");
        return;
      default:
        setShake(true);
        shakeTimer.set(() => setShake(false), 450);
        flash("Not in word list", "muted");
    }
  };

  const handleHint = () => {
    if (!canSpendHint(hintCredits)) return;
    const unrevealedKeys = [...data.cells.keys()].filter((k) => !revealed.has(k));
    const pick = pickHintCell(unrevealedKeys);
    if (pick === null) return;
    setRevealed((prev) => new Set(prev).add(pick));
    setJustRevealed(new Set([pick]));
    revealTimer.set(() => setJustRevealed(new Set()), 700);
    onHintSpend();
  };

  const handleShuffle = () => setWheelLetters((prev) => shuffleArray(prev));

  const cols = data.maxC - data.minC + 1;
  const rows = data.maxR - data.minR + 1;
  const cellSize = Math.min(Math.floor(330 / cols), Math.floor(240 / rows), 50);

  return (
    <div className="app">
      <Backdrop />

      <header className="header">
        <div className="level-tag">
          <span className="level-name">{level.name}</span>
          <span className="level-num">
            Level {levelIndex + 1} of {totalLevels}
          </span>
        </div>
        <div className="header-actions">
          <div className="bonus-chip" title="Bonus words found" data-testid="bonus-chip">
            <span className="bonus-dot" />
            {bonusFound.size} bonus
          </div>
          <button className="btn" data-testid="levels-button" onClick={onExit}>
            Levels
          </button>
        </div>
      </header>

      <main className="board">
        <Grid data={data} revealed={revealed} justRevealed={justRevealed} cellSize={cellSize} />

        <div
          className={`trace-word ${shake ? "shake" : ""}`}
          aria-live="polite"
          data-testid="trace-word"
        >
          {trace ? (
            <span className="trace-live">{trace}</span>
          ) : message ? (
            <span className={`msg msg-${message.kind}`}>{message.text}</span>
          ) : (
            <span className="msg msg-idle">
              Drag through letters, or type them, to spell a word
            </span>
          )}
        </div>

        <Wheel
          letters={wheelLetters}
          onSubmit={handleSubmit}
          onTraceChange={setTrace}
          disabled={levelComplete}
        />

        <Controls
          onShuffle={handleShuffle}
          onHint={handleHint}
          disabled={levelComplete || !canSpendHint(hintCredits)}
          hintCredits={hintCredits}
        />
      </main>

      {levelComplete && (
        <Overlay
          levelName={level.name}
          isLastLevel={isLastLevel}
          foundCount={foundWords.size}
          bonusCount={bonusFound.size}
          onAdvance={onExit}
          onReplay={onExit}
        />
      )}
    </div>
  );
}

function Root({ levels }) {
  const [save, setSave] = useState(() => loadSave(getStorage()));
  const [screen, setScreen] = useState("select");
  const [activeLevelIndex, setActiveLevelIndex] = useState(save.currentLevel || 0);

  const persist = (next) => {
    setSave(next);
    writeSave(next, getStorage());
  };

  const handleSelectLevel = (index) => {
    setActiveLevelIndex(index);
    persist({ ...save, currentLevel: index });
    setScreen("game");
  };

  const handleBonusFound = (levelId, word) => {
    const before = totalBonusCount(save);
    const existing = save.bonusFoundByLevel[levelId] || [];
    if (existing.includes(word)) return;
    const bonusFoundByLevel = { ...save.bonusFoundByLevel, [levelId]: [...existing, word] };
    const after = totalBonusCount({ bonusFoundByLevel });
    persist({
      ...save,
      bonusFoundByLevel,
      hintCredits: awardHintCredits(save.hintCredits, before, after),
    });
  };

  const handleLevelCleared = (levelId) => {
    if (save.clearedLevels.includes(levelId)) return;
    persist({ ...save, clearedLevels: [...save.clearedLevels, levelId] });
  };

  const handleHintSpend = () => {
    persist({ ...save, hintCredits: spendHint(save.hintCredits) });
  };

  if (screen === "select") {
    return (
      <>
        <LevelSelect
          levels={levels}
          clearedLevels={save.clearedLevels}
          onSelect={handleSelectLevel}
          onAbout={() => setScreen("about")}
        />
      </>
    );
  }

  if (screen === "about") {
    return <About onClose={() => setScreen("select")} />;
  }

  const level = levels[activeLevelIndex];
  return (
    <Game
      key={level.id}
      level={level}
      levelIndex={activeLevelIndex}
      totalLevels={levels.length}
      initialBonusFound={save.bonusFoundByLevel[level.id] || []}
      hintCredits={save.hintCredits}
      onBonusFound={handleBonusFound}
      onLevelCleared={handleLevelCleared}
      onHintSpend={handleHintSpend}
      onExit={() => setScreen("select")}
    />
  );
}

export default function App() {
  const { valid } = validateLevels(levelsData);
  if (!valid) return <GameLoadError />;

  return (
    <ErrorBoundary>
      <Root levels={levelsData.levels} />
    </ErrorBoundary>
  );
}
