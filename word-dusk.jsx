import { useState, useRef, useMemo, useEffect, useCallback } from "react";

/* ============================================================
   WORD DUSK — a Wordscapes-style prototype
   Levels are precomputed: each has wheel letters, a crossword
   layout of required words, and a curated bonus-word list.
   (A production app would swap the bonus lists for a real
   dictionary like SCOWL/ENABLE.)
   ============================================================ */

const LEVELS = [
  {
    name: "Dusk",
    letters: ["T", "E", "A", "M"],
    grid: [
      { word: "MATE", row: 0, col: 0, dir: "across" },
      { word: "MEAT", row: 0, col: 0, dir: "down" },
      { word: "TEAM", row: 0, col: 2, dir: "down" },
      { word: "TAME", row: 3, col: 0, dir: "across" },
    ],
    bonus: ["ate", "eat", "eta", "mat", "met", "tam", "tea"],
  },
  {
    name: "Pine",
    letters: ["S", "T", "O", "N", "E"],
    grid: [
      { word: "STONE", row: 0, col: 0, dir: "across" },
      { word: "SENT", row: 0, col: 0, dir: "down" },
      { word: "ONSET", row: 0, col: 2, dir: "down" },
      { word: "EON", row: 0, col: 4, dir: "down" },
      { word: "TOES", row: 3, col: 0, dir: "across" },
    ],
    bonus: [
      "eons", "nest", "net", "nets", "nose", "not", "note", "notes",
      "one", "ones", "set", "snot", "son", "sot", "ten", "tens",
      "toe", "ton", "tone", "tones", "tons",
    ],
  },
  {
    name: "Ridge",
    letters: ["B", "R", "E", "A", "D"],
    grid: [
      { word: "BEARD", row: 0, col: 0, dir: "across" },
      { word: "BREAD", row: 0, col: 0, dir: "down" },
      { word: "RED", row: 0, col: 3, dir: "down" },
      { word: "DARE", row: 4, col: 0, dir: "across" },
    ],
    bonus: [
      "are", "bad", "bar", "bard", "bare", "bared", "bead", "bear",
      "bed", "bra", "brad", "bred", "dab", "dear", "debar", "drab",
      "ear", "era", "rad", "read",
    ],
  },
  {
    name: "Summit",
    letters: ["P", "L", "A", "N", "E", "T"],
    grid: [
      { word: "PLANET", row: 0, col: 0, dir: "across" },
      { word: "PLATE", row: 0, col: 0, dir: "down" },
      { word: "ANTE", row: 0, col: 2, dir: "down" },
      { word: "TEAL", row: 0, col: 5, dir: "down" },
      { word: "APT", row: 2, col: 0, dir: "across" },
    ],
    bonus: [
      "ale", "ant", "ape", "ate", "eat", "elan", "eta", "lane", "lap",
      "late", "lean", "leap", "leapt", "lent", "let", "nap", "nape",
      "neap", "neat", "net", "pal", "pale", "pan", "pane", "panel",
      "pant", "pat", "pate", "pea", "peal", "peat", "pen", "penal",
      "pet", "petal", "plan", "plane", "plant", "plea", "pleat",
      "tale", "tan", "tap", "tape", "tea", "ten",
    ],
  },
  {
    name: "Aurora",
    letters: ["M", "A", "S", "T", "E", "R"],
    grid: [
      { word: "MASTER", row: 0, col: 0, dir: "across" },
      { word: "MEATS", row: 0, col: 0, dir: "down" },
      { word: "STEAM", row: 0, col: 2, dir: "down" },
      { word: "EAST", row: 0, col: 4, dir: "down" },
    ],
    bonus: [
      "arm", "arms", "art", "arts", "aster", "ate", "ear", "ears",
      "eat", "eats", "era", "eras", "mare", "mares", "mars", "mart",
      "marts", "mast", "mat", "mate", "mates", "mats", "meat", "mesa",
      "met", "ram", "rams", "rat", "rate", "rates", "rats", "rest",
      "same", "sat", "sea", "seam", "sear", "seat", "set", "smart",
      "smear", "star", "stare", "stream", "tam", "tame", "tamer",
      "tamers", "tames", "tar", "tars", "tea", "team", "teams",
      "tear", "tears", "teas", "term", "terms", "tram", "trams",
    ],
  },
];

/* ---------- helpers ---------- */

function cellKey(r, c) {
  return `${r},${c}`;
}

function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.word.length; i++) {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    cells.push({ r, c, letter: w.word[i] });
  }
  return cells;
}

function buildLevelData(level) {
  const cells = new Map();
  level.grid.forEach((w, wi) => {
    wordCells(w).forEach(({ r, c, letter }) => {
      const key = cellKey(r, c);
      if (!cells.has(key)) cells.set(key, { r, c, letter, words: [] });
      cells.get(key).words.push(wi);
    });
  });
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  cells.forEach(({ r, c }) => {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  });
  return { cells, minR, maxR, minC, maxC };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- mountain backdrop ---------- */

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="stars">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 55}%`,
              animationDelay: `${(i % 7) * 0.9}s`,
              opacity: 0.3 + ((i * 13) % 10) / 18,
            }}
          />
        ))}
      </div>
      <svg className="ridge ridge-far" viewBox="0 0 1200 260" preserveAspectRatio="none">
        <path d="M0,200 L120,120 L260,190 L420,80 L560,170 L720,60 L880,160 L1040,100 L1200,180 L1200,260 L0,260 Z" />
      </svg>
      <svg className="ridge ridge-mid" viewBox="0 0 1200 260" preserveAspectRatio="none">
        <path d="M0,230 L160,140 L300,210 L480,110 L640,200 L820,120 L980,200 L1200,140 L1200,260 L0,260 Z" />
      </svg>
      <svg className="ridge ridge-near" viewBox="0 0 1200 260" preserveAspectRatio="none">
        <path d="M0,260 L100,190 L280,240 L460,160 L660,240 L860,170 L1060,235 L1200,200 L1200,260 L0,260 Z" />
      </svg>
    </div>
  );
}

/* ---------- letter wheel ---------- */

const WHEEL_SIZE = 264;
const LETTER_SIZE = 58;
const HIT_RADIUS = 34;

function Wheel({ letters, onSubmit, onTraceChange, disabled }) {
  const [selection, setSelection] = useState([]);
  const [pointer, setPointer] = useState(null);
  const tracingRef = useRef(false);
  const containerRef = useRef(null);

  const positions = useMemo(() => {
    const n = letters.length;
    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const radius = WHEEL_SIZE / 2 - LETTER_SIZE / 2 - 8;
    return letters.map((_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }, [letters]);

  const localPoint = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const letterAt = (pt) => {
    for (let i = 0; i < positions.length; i++) {
      const dx = pt.x - positions[i].x;
      const dy = pt.y - positions[i].y;
      if (Math.hypot(dx, dy) <= HIT_RADIUS) return i;
    }
    return -1;
  };

  const updateTrace = useCallback(
    (sel) => {
      setSelection(sel);
      onTraceChange(sel.map((i) => letters[i]).join(""));
    },
    [letters, onTraceChange]
  );

  const handleDown = (e) => {
    if (disabled) return;
    const pt = localPoint(e);
    const idx = letterAt(pt);
    if (idx === -1) return;
    tracingRef.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    setPointer(pt);
    updateTrace([idx]);
  };

  const handleMove = (e) => {
    if (!tracingRef.current) return;
    const pt = localPoint(e);
    setPointer(pt);
    const idx = letterAt(pt);
    if (idx === -1) return;
    setSelection((sel) => {
      if (sel[sel.length - 1] === idx) return sel;
      // backtrack: sliding onto the previous letter pops the last one
      if (sel.length >= 2 && sel[sel.length - 2] === idx) {
        const next = sel.slice(0, -1);
        onTraceChange(next.map((i) => letters[i]).join(""));
        return next;
      }
      if (sel.includes(idx)) return sel;
      const next = [...sel, idx];
      onTraceChange(next.map((i) => letters[i]).join(""));
      return next;
    });
  };

  const handleUp = () => {
    if (!tracingRef.current) return;
    tracingRef.current = false;
    setPointer(null);
    setSelection((sel) => {
      onSubmit(sel.map((i) => letters[i]).join(""));
      onTraceChange("");
      return [];
    });
  };

  const tracePoints = selection.map((i) => positions[i]);

  return (
    <div
      ref={containerRef}
      className="wheel"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <svg className="trace" width={WHEEL_SIZE} height={WHEEL_SIZE}>
        {tracePoints.length > 0 && (
          <polyline
            points={[...tracePoints, ...(pointer ? [pointer] : [])]
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
          />
        )}
      </svg>
      {letters.map((letter, i) => (
        <div
          key={i}
          className={`wheel-letter ${selection.includes(i) ? "selected" : ""}`}
          style={{
            left: positions[i].x - LETTER_SIZE / 2,
            top: positions[i].y - LETTER_SIZE / 2,
            width: LETTER_SIZE,
            height: LETTER_SIZE,
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

/* ---------- main app ---------- */

export default function WordDusk() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [wheelLetters, setWheelLetters] = useState(LEVELS[0].letters);
  const [revealed, setRevealed] = useState(new Set());
  const [foundWords, setFoundWords] = useState(new Set());
  const [bonusFound, setBonusFound] = useState(new Set());
  const [trace, setTrace] = useState("");
  const [message, setMessage] = useState(null);
  const [justRevealed, setJustRevealed] = useState(new Set());
  const [shake, setShake] = useState(false);
  const msgTimer = useRef(null);

  const level = LEVELS[levelIndex];
  const data = useMemo(() => buildLevelData(level), [level]);
  const gridWordSet = useMemo(
    () => new Set(level.grid.map((w) => w.word.toUpperCase())),
    [level]
  );
  const bonusSet = useMemo(
    () => new Set(level.bonus.map((w) => w.toUpperCase())),
    [level]
  );

  const levelComplete = level.grid.every((w) =>
    wordCells(w).every(({ r, c }) => revealed.has(cellKey(r, c)))
  );
  const isLastLevel = levelIndex === LEVELS.length - 1;

  const flash = (text, kind = "info") => {
    clearTimeout(msgTimer.current);
    setMessage({ text, kind });
    msgTimer.current = setTimeout(() => setMessage(null), 1600);
  };

  const revealWordCells = (w) => {
    const fresh = new Set();
    setRevealed((prev) => {
      const next = new Set(prev);
      wordCells(w).forEach(({ r, c }) => {
        const key = cellKey(r, c);
        if (!next.has(key)) fresh.add(key);
        next.add(key);
      });
      return next;
    });
    setJustRevealed(fresh);
    setTimeout(() => setJustRevealed(new Set()), 700);
  };

  const handleSubmit = (word) => {
    if (!word || word.length < 3) return;
    const upper = word.toUpperCase();

    if (gridWordSet.has(upper)) {
      if (foundWords.has(upper)) {
        flash("Already found", "muted");
        return;
      }
      const w = level.grid.find((g) => g.word.toUpperCase() === upper);
      setFoundWords((prev) => new Set(prev).add(upper));
      revealWordCells(w);
      flash(upper, "success");
      return;
    }

    if (bonusSet.has(upper)) {
      if (bonusFound.has(upper)) {
        flash("Already found", "muted");
        return;
      }
      setBonusFound((prev) => new Set(prev).add(upper));
      flash(`Bonus: ${upper}`, "bonus");
      return;
    }

    setShake(true);
    setTimeout(() => setShake(false), 450);
    flash("Not in word list", "muted");
  };

  const handleHint = () => {
    const unrevealedKeys = [...data.cells.keys()].filter((k) => !revealed.has(k));
    if (unrevealedKeys.length === 0) return;
    const pick = unrevealedKeys[Math.floor(Math.random() * unrevealedKeys.length)];
    setRevealed((prev) => new Set(prev).add(pick));
    setJustRevealed(new Set([pick]));
    setTimeout(() => setJustRevealed(new Set()), 700);
  };

  const handleShuffle = () => setWheelLetters((prev) => shuffleArray(prev));

  const goToLevel = (idx) => {
    setLevelIndex(idx);
    setWheelLetters(shuffleArray(LEVELS[idx].letters));
    setRevealed(new Set());
    setFoundWords(new Set());
    setBonusFound(new Set());
    setTrace("");
    setMessage(null);
  };

  /* grid sizing */
  const cols = data.maxC - data.minC + 1;
  const rows = data.maxR - data.minR + 1;
  const cellSize = Math.min(Math.floor(330 / cols), Math.floor(240 / rows), 50);

  return (
    <div className="app">
      <style>{CSS}</style>
      <Backdrop />

      <header className="header">
        <div className="level-tag">
          <span className="level-name">{level.name}</span>
          <span className="level-num">Level {levelIndex + 1} of {LEVELS.length}</span>
        </div>
        <div className="bonus-chip" title="Bonus words found">
          <span className="bonus-dot" />
          {bonusFound.size} bonus
        </div>
      </header>

      <main className="board">
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
                className={`cell ${isRevealed ? "revealed" : ""} ${
                  justRevealed.has(key) ? "pop" : ""
                }`}
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

        <div className={`trace-word ${shake ? "shake" : ""}`}>
          {trace ? (
            <span className="trace-live">{trace}</span>
          ) : message ? (
            <span className={`msg msg-${message.kind}`}>{message.text}</span>
          ) : (
            <span className="msg msg-idle">Drag through letters to spell a word</span>
          )}
        </div>

        <Wheel
          letters={wheelLetters}
          onSubmit={handleSubmit}
          onTraceChange={setTrace}
          disabled={levelComplete}
        />

        <div className="controls">
          <button className="btn" onClick={handleShuffle}>Shuffle</button>
          <button className="btn" onClick={handleHint} disabled={levelComplete}>
            Hint
          </button>
        </div>
      </main>

      {levelComplete && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-eyebrow">{level.name} cleared</div>
            <h2 className="overlay-title">
              {isLastLevel ? "Journey complete" : "Level complete"}
            </h2>
            <p className="overlay-stats">
              {foundWords.size} words · {bonusFound.size} bonus
            </p>
            {isLastLevel ? (
              <button className="btn btn-primary" onClick={() => goToLevel(0)}>
                Play again
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => goToLevel(levelIndex + 1)}
              >
                Next level
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- styles ---------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Nunito+Sans:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.app {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #10162b 0%, #1b2547 55%, #2a3763 100%);
  font-family: 'Nunito Sans', system-ui, sans-serif;
  color: #f2ecdc;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
}

/* backdrop */
.backdrop { position: absolute; inset: 0; pointer-events: none; }
.stars { position: absolute; inset: 0; }
.star {
  position: absolute; width: 2px; height: 2px; border-radius: 50%;
  background: #f2ecdc;
  animation: twinkle 4s ease-in-out infinite;
}
@keyframes twinkle { 0%,100% { opacity: .15; } 50% { opacity: .7; } }
.ridge { position: absolute; bottom: 0; left: 0; width: 100%; height: 34vh; }
.ridge-far path  { fill: #222f56; }
.ridge-mid path  { fill: #1b2547; }
.ridge-near path { fill: #141c38; }

/* header */
.header {
  position: relative; z-index: 2;
  width: 100%; max-width: 420px;
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px 6px;
}
.level-tag { display: flex; flex-direction: column; }
.level-name {
  font-family: 'Fraunces', serif;
  font-size: 26px; font-weight: 650; letter-spacing: .5px;
}
.level-num {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
  color: #9aa5c8; font-weight: 700;
}
.bonus-chip {
  display: flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 700; color: #f0c26e;
  background: rgba(232, 176, 75, .12);
  border: 1px solid rgba(232, 176, 75, .35);
  padding: 6px 12px; border-radius: 999px;
}
.bonus-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #e8b04b; box-shadow: 0 0 8px #e8b04b;
}

/* board */
.board {
  position: relative; z-index: 2;
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 10px 16px 30px;
  width: 100%; max-width: 420px;
}

.grid { display: grid; gap: 5px; margin-top: 8px; }
.cell {
  border-radius: 8px;
  background: rgba(20, 28, 56, .65);
  border: 1px solid rgba(154, 165, 200, .25);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; color: #1b2547;
  transition: background .25s ease, transform .25s ease;
}
.cell.revealed {
  background: #f2ecdc;
  border-color: #f2ecdc;
  box-shadow: 0 2px 10px rgba(0,0,0,.35);
}
.cell.pop { animation: cellpop .5s ease; }
@keyframes cellpop {
  0% { transform: scale(.4); } 60% { transform: scale(1.15); } 100% { transform: scale(1); }
}

/* trace word / messages */
.trace-word { height: 40px; display: flex; align-items: center; justify-content: center; }
.trace-live {
  font-family: 'Fraunces', serif;
  font-size: 26px; font-weight: 650; letter-spacing: 4px;
  color: #f0c26e;
  background: rgba(232,176,75,.12);
  padding: 3px 18px; border-radius: 10px;
}
.msg { font-size: 14px; font-weight: 700; letter-spacing: .4px; }
.msg-idle    { color: #7f8ab0; font-weight: 600; }
.msg-muted   { color: #9aa5c8; }
.msg-success { color: #8fd6a8; font-size: 18px; letter-spacing: 3px; }
.msg-bonus   { color: #e8956e; font-size: 16px; }
.shake { animation: shake .4s ease; }
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-7px); } 50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}

/* wheel */
.wheel {
  position: relative;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14,20,40,.35) 0%, rgba(14,20,40,.75) 100%);
  border: 1.5px solid rgba(232,176,75,.3);
  touch-action: none;
  cursor: pointer;
}
.trace { position: absolute; inset: 0; pointer-events: none; }
.trace polyline {
  fill: none;
  stroke: #e8b04b;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .9;
  filter: drop-shadow(0 0 6px rgba(232,176,75,.8));
}
.wheel-letter {
  position: absolute;
  border-radius: 50%;
  background: #f2ecdc;
  color: #1b2547;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 800;
  box-shadow: 0 3px 10px rgba(0,0,0,.4);
  transition: background .15s ease, color .15s ease, transform .15s ease;
  pointer-events: none;
}
.wheel-letter.selected {
  background: #e8b04b;
  color: #10162b;
  transform: scale(1.12);
  box-shadow: 0 0 16px rgba(232,176,75,.75);
}

/* controls */
.controls { display: flex; gap: 12px; }
.btn {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 14px; font-weight: 800; letter-spacing: .8px;
  color: #f2ecdc;
  background: rgba(242,236,220,.08);
  border: 1px solid rgba(242,236,220,.28);
  padding: 10px 22px; border-radius: 999px;
  cursor: pointer;
  transition: background .15s ease;
}
.btn:hover:not(:disabled) { background: rgba(242,236,220,.16); }
.btn:disabled { opacity: .4; cursor: default; }
.btn:focus-visible { outline: 2px solid #e8b04b; outline-offset: 2px; }
.btn-primary {
  background: #e8b04b; color: #10162b; border-color: #e8b04b;
}
.btn-primary:hover:not(:disabled) { background: #f0c26e; }

/* level complete overlay */
.overlay {
  position: fixed; inset: 0; z-index: 10;
  background: rgba(10, 14, 30, .72);
  display: flex; align-items: center; justify-content: center;
  animation: fadein .4s ease;
}
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
.overlay-card {
  background: linear-gradient(180deg, #1e2950, #161f3e);
  border: 1px solid rgba(232,176,75,.4);
  border-radius: 20px;
  padding: 36px 44px;
  text-align: center;
  box-shadow: 0 12px 50px rgba(0,0,0,.5);
  animation: rise .45s ease;
}
@keyframes rise { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
.overlay-eyebrow {
  font-size: 11px; text-transform: uppercase; letter-spacing: 2px;
  color: #e8b04b; font-weight: 800; margin-bottom: 8px;
}
.overlay-title {
  font-family: 'Fraunces', serif;
  font-size: 32px; font-weight: 650; margin-bottom: 10px;
}
.overlay-stats { color: #9aa5c8; font-size: 14px; font-weight: 600; margin-bottom: 22px; }

@media (prefers-reduced-motion: reduce) {
  .star, .cell.pop, .shake, .overlay, .overlay-card { animation: none !important; }
  .cell, .wheel-letter, .btn { transition: none !important; }
}
`;
