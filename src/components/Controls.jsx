export default function Controls({ onShuffle, onHint, disabled, hintCredits }) {
  return (
    <div className="controls">
      <button className="btn" onClick={onShuffle}>
        Shuffle
      </button>
      <button className="btn" onClick={onHint} disabled={disabled}>
        Hint ({hintCredits})
      </button>
    </div>
  );
}
