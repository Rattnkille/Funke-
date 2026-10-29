export function SparkLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#2b211b" />
      <path d="M17.5 5 10 18h6l-1.5 9L22 14h-6z" fill="#e8952f" />
    </svg>
  );
}

export function Flame({ percent }: { percent: number }) {
  const scale = 0.55 + (Math.min(100, Math.max(0, percent)) / 100) * 0.45;
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <g className="flame" style={{ transform: `scale(${scale})` }}>
        <path d="M16 2c1 6 8 8 8 17a8 8 0 0 1-16 0c0-4 2-6 3-8 0 3 1 5 3 5-1-6 2-10 2-14z" fill="#b8410e" />
        <path d="M16 14c.5 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1.5-4 .5 1.5 1.5 2 2.5 2-.5-2 0-4 0-6z" fill="#e8952f" />
      </g>
    </svg>
  );
}
