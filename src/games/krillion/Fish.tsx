'use client';
// Original fish illustrations for KRILLION (hand-drawn SVG, not based on any
// other game's artwork). The tail and fins wiggle with CSS.

export function Fish({ color = '#7FD8FF', size = 40, you = false, flip = false, className = '', style }: { color?: string; size?: number; you?: boolean; flip?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 36" width={size} height={(size * 36) / 64} className={className} style={{ transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible', ...style }} aria-hidden>
      <g className="fish-tail" style={{ transformOrigin: '14px 18px' }}>
        <path d="M14 18 L1 6 Q5 18 1 30 Z" fill={color} opacity="0.85" />
      </g>
      <path d="M12 18 Q22 3 42 5 Q60 8 62 18 Q60 28 42 31 Q22 33 12 18 Z" fill={color} />
      <path d="M26 7 Q34 -1 42 6" fill={color} opacity="0.7" />
      <path d="M30 29 Q35 36 40 30" fill={color} opacity="0.7" />
      <path d="M18 18 Q30 12 46 15" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 9 Q44 18 40 27" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" fill="none" />
      <circle cx="51" cy="15" r="3.4" fill="#0A0A0A" />
      <circle cx="52.2" cy="13.8" r="1.1" fill="#fff" />
      {you && <path d="M12 18 Q22 3 42 5 Q60 8 62 18 Q60 28 42 31 Q22 33 12 18 Z" fill="none" stroke="#F2F0E9" strokeWidth="2.5" />}
    </svg>
  );
}

/** A deep-sea angler with a glowing lure — reserved for Deep Cuts. */
export function Angler({ size = 120, color = '#C8FF00' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 120 80" width={size} height={(size * 80) / 120} style={{ overflow: 'visible' }} aria-hidden>
      <defs>
        <radialGradient id="lure" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff" /><stop offset="0.35" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      </defs>
      <circle className="lure-glow" cx="100" cy="8" r="16" fill="url(#lure)" />
      <path d="M70 26 Q82 2 100 8" stroke="#5b6b3a" strokeWidth="2" fill="none" />
      <circle cx="100" cy="8" r="4" fill="#fff" />
      <g className="fish-tail" style={{ transformOrigin: '22px 44px' }}>
        <path d="M22 44 L2 28 Q8 44 2 62 Z" fill="#26301a" />
      </g>
      <path d="M20 44 Q30 18 64 20 Q96 22 104 44 Q96 68 64 70 Q30 72 20 44 Z" fill="#1f2a14" />
      <path d="M62 46 Q84 40 102 46 Q90 60 64 58 Z" fill="#0a0d06" />
      {[66, 72, 78, 84, 90, 96].map((x, i) => <path key={i} d={`M${x} 45 l2 6 l2 -6 z`} fill="#F2F0E9" />)}
      {[68, 74, 80, 86, 92].map((x, i) => <path key={i} d={`M${x} 57 l2 -5 l2 5 z`} fill="#F2F0E9" />)}
      <circle cx="78" cy="33" r="5" fill="#0A0A0A" /><circle cx="79.5" cy="31.5" r="1.6" fill={color} />
      <path d="M44 28 Q50 20 58 26" stroke={color} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Small krill — scatter decoration. */
export function Krill({ size = 18, color = '#FF9F7A' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 30 14" width={size} height={(size * 14) / 30} aria-hidden>
      <path d="M2 8 Q10 0 24 4 Q29 6 27 9 Q20 13 6 11 Z" fill={color} opacity="0.9" />
      <path d="M24 4 L30 0 M25 5 L30 3" stroke={color} strokeWidth="0.8" />
      {[8, 12, 16, 20].map((x) => <path key={x} d={`M${x} 11 l-1 3`} stroke={color} strokeWidth="0.8" />)}
      <circle cx="24" cy="6" r="1" fill="#0A0A0A" />
    </svg>
  );
}
