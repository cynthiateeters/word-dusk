export default function Overlay({
  levelName,
  isLastLevel,
  foundCount,
  bonusCount,
  onAdvance,
  onReplay,
}) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="overlay-eyebrow">{levelName} cleared</div>
        <h2 className="overlay-title">{isLastLevel ? "Journey complete" : "Level complete"}</h2>
        <p className="overlay-stats">
          {foundCount} words · {bonusCount} bonus
        </p>
        {isLastLevel ? (
          <button className="btn btn-primary" onClick={onReplay}>
            Play again
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onAdvance}>
            Next level
          </button>
        )}
      </div>
    </div>
  );
}
