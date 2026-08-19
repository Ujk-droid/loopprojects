export default function WaveBackground() {
  return (
    <div className="wave-bg" aria-hidden="true">
      <div className="sheen-sweep" />
      <svg
        className="wave-svg"
        viewBox="0 0 2400 300"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradBack" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.10" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id="waveGradFront" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path
          className="wave-path wave-path-back"
          d="M0,180 C200,140 400,220 600,180 C800,140 1000,220 1200,180 C1400,140 1600,220 1800,180 C2000,140 2200,220 2400,180 L2400,300 L0,300 Z"
          fill="url(#waveGradBack)"
        />
        <path
          className="wave-path wave-path-front"
          d="M0,220 C220,190 380,250 600,220 C820,190 980,250 1200,220 C1420,190 1580,250 1800,220 C2020,190 2180,250 2400,220 L2400,300 L0,300 Z"
          fill="url(#waveGradFront)"
        />
      </svg>
    </div>
  );
}
