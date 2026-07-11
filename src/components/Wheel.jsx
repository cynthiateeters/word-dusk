import { useState, useRef, useMemo, useCallback } from "react";
import {
  startSelection,
  moveSelection,
  selectionToWord,
  keyboardSelectLetter,
} from "../game/selection.js";

const WHEEL_SIZE = 264;
const LETTER_SIZE = 58;
const HIT_RADIUS = 34;

export default function Wheel({ letters, onSubmit, onTraceChange, disabled }) {
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
      onTraceChange(selectionToWord(sel, letters));
    },
    [letters, onTraceChange],
  );

  const handleDown = (e) => {
    if (disabled) return;
    const pt = localPoint(e);
    const idx = letterAt(pt);
    if (idx === -1) return;
    tracingRef.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    setPointer(pt);
    updateTrace(startSelection(idx));
  };

  const handleMove = (e) => {
    if (!tracingRef.current) return;
    const pt = localPoint(e);
    setPointer(pt);
    const idx = letterAt(pt);
    setSelection((sel) => {
      const next = moveSelection(sel, idx);
      if (next !== sel) onTraceChange(selectionToWord(next, letters));
      return next;
    });
  };

  const handleUp = () => {
    if (!tracingRef.current) return;
    tracingRef.current = false;
    setPointer(null);
    setSelection((sel) => {
      onSubmit(selectionToWord(sel, letters));
      onTraceChange("");
      return [];
    });
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      setSelection((sel) => {
        const next = sel.slice(0, -1);
        onTraceChange(selectionToWord(next, letters));
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      setSelection((sel) => {
        onSubmit(selectionToWord(sel, letters));
        onTraceChange("");
        return [];
      });
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSelection([]);
      onTraceChange("");
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      setSelection((sel) => {
        const next = keyboardSelectLetter(sel, letters, e.key);
        if (next !== sel) onTraceChange(selectionToWord(next, letters));
        return next;
      });
    }
  };

  const tracePoints = selection.map((i) => positions[i]);

  return (
    <div
      ref={containerRef}
      className="wheel"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      tabIndex={0}
      role="group"
      aria-label="Letter wheel"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKeyDown}
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
