export default function Controls({ onShuffle, onHint, disabled }) {
  return (
    <div className="controls">
      <button className="btn" onClick={onShuffle}>
        Shuffle
      </button>
      <button className="btn" onClick={onHint} disabled={disabled}>
        Hint
      </button>
    </div>
  );
}
