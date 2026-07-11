export default function Controls({ onShuffle, onHint, disabled, hintCredits }) {
  return (
    <div className="controls">
      <button className="btn" data-testid="shuffle-button" onClick={onShuffle}>
        Shuffle
      </button>
      <button className="btn" data-testid="hint-button" onClick={onHint} disabled={disabled}>
        Hint ({hintCredits})
      </button>
    </div>
  );
}
