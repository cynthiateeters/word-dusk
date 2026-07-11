export default function Backdrop() {
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
