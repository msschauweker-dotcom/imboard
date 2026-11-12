// Hand-built, gently animated preview art so every card has its own personality.
// Uses SVG SMIL animations (no JS); reduced-motion users get the static frame via CSS.
const C = { lime: '#C8FF00', paper: '#F2F0E9', ink: '#0A0A0A', red: '#FF3D3D', blue: '#3DA9FF', amber: '#FFB800', violet: '#A66BFF', green: '#7BE495', mint: '#00E5A8', pink: '#FF6BD6', sea: '#7FD8FF' };

export default function GameArt({ id, className = '' }: { id: string; className?: string }) {
  const common = { viewBox: '0 0 160 100', preserveAspectRatio: 'xMidYMid slice', className: `w-full h-full ${className}`, 'aria-hidden': true } as const;
  switch (id) {
    case 'krillion':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="kr-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2a3d" /><stop offset="1" stopColor="#04060c" /></linearGradient>
          </defs>
          <rect width="160" height="100" fill="url(#kr-sea)" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="0" y={i * 25} width="160" height="25" fill={[C.sea, C.blue, C.violet, C.lime][i]} opacity={0.05 + i * 0.03} />)}
          {[20, 55, 95, 130].map((x, i) => (
            <circle key={i} cx={x} cy="105" r={1.5 + (i % 2)} fill="none" stroke={C.sea} strokeWidth="0.6" opacity="0.7">
              <animate attributeName="cy" from="105" to="-5" dur={`${4 + i}s`} repeatCount="indefinite" begin={`${i * 0.7}s`} />
            </circle>
          ))}
          <g>
            <circle cx="80" cy="12" r="4" fill={C.lime}>
              <animate attributeName="cy" values="12;20;37;62;88;88" keyTimes="0;0.15;0.35;0.55;0.75;1" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="80" cy="12" r="4" fill="none" stroke={C.lime} strokeWidth="1">
              <animate attributeName="cy" values="12;20;37;62;88;88" keyTimes="0;0.15;0.35;0.55;0.75;1" dur="4s" repeatCount="indefinite" />
              <animate attributeName="r" values="4;12" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
          <text x="8" y="94" fontFamily="monospace" fontSize="7" fill={C.lime} opacity="0.8">DEEP CUT · 1000m</text>
        </svg>
      );
    case 'wordle':
      return (
        <svg {...common}>
          {['O', 'F', 'F', 'E', 'R'].map((l, i) => {
            const fill = [C.green, '#3a3a3a', C.amber, C.green, '#3a3a3a'][i];
            return (
              <g key={i} transform={`translate(${26 + i * 27} 34)`}>
                <g>
                  <animateTransform attributeName="transform" type="scale" values="1 1;1 0;1 1;1 1" keyTimes="0;0.06;0.12;1" dur="5s" begin={`${i * 0.18}s`} repeatCount="indefinite" additive="sum" />
                  <rect x="-12" y="-12" width="24" height="24" rx="4" fill={fill} />
                  <text x="0" y="5" textAnchor="middle" fontWeight={800} fontSize="13" fill={C.ink}>{l}</text>
                </g>
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={14 + i * 27} y="52" width="24" height="24" rx="4" fill="none" stroke="#333" strokeWidth="2" />)}
          <rect x="14" y="52" width="24" height="24" rx="4" fill="none" stroke={C.paper} strokeWidth="2"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'connections':
      return (
        <svg {...common}>
          {Array.from({ length: 16 }).map((_, i) => {
            const r = Math.floor(i / 4), c = i % 4;
            const fill = r === 0 ? C.amber : r === 1 ? C.green : '#262626';
            return (
              <rect key={i} x={22 + c * 30} y={10 + r * 21} width="26" height="17" rx="3" fill={fill}>
                {r >= 2 && <animate attributeName="fill" values={`#262626;#262626;${r === 2 ? C.blue : C.violet};${r === 2 ? C.blue : C.violet};#262626`} keyTimes="0;0.3;0.35;0.9;1" dur="6s" begin={`${r === 2 ? 0 : 1.2}s`} repeatCount="indefinite" />}
              </rect>
            );
          })}
        </svg>
      );
    case 'sequence':
      return (
        <svg {...common}>
          <text x="80" y="58" textAnchor="middle" fontFamily="monospace" fontSize="20" fontWeight={700} fill={C.paper}>2 · 6 · 18 · <tspan fill={C.blue}>?<animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" /></tspan></text>
        </svg>
      );
    case 'recall':
      return (
        <svg {...common}>
          {Array.from({ length: 16 }).map((_, i) => {
            const lit = [1, 6, 7, 12, 14].includes(i);
            return (
              <rect key={i} x={46 + (i % 4) * 18} y={14 + Math.floor(i / 4) * 18} width="15" height="15" rx="3" fill="#262626">
                {lit && <animate attributeName="fill" values={`#262626;${C.amber};#262626`} dur="2.4s" begin={`${(i % 5) * 0.25}s`} repeatCount="indefinite" />}
              </rect>
            );
          })}
        </svg>
      );
    case 'mini':
      return (
        <svg {...common}>
          {Array.from({ length: 25 }).map((_, i) => {
            const black = [4, 20, 12].includes(i);
            return <rect key={i} x={45 + (i % 5) * 14} y={15 + Math.floor(i / 5) * 14} width="13" height="13" fill={black ? '#111' : C.paper} opacity={black ? 1 : 0.85} />;
          })}
        </svg>
      );
    case 'tag':
      return (
        <svg {...common} shapeRendering="crispEdges">
          <rect width="160" height="100" fill="#1d2417" />
          {Array.from({ length: 10 }).map((_, x) => Array.from({ length: 7 }).map((__, y) => (x + y) % 2 ? <rect key={`${x}${y}`} x={x * 16} y={y * 16} width="16" height="16" fill="#202919" /> : null))}
          {[[20, 20], [120, 20], [20, 70], [120, 70], [70, 45]].map(([x, y], i) => <g key={i}><rect x={x} y={y} width="20" height="10" fill="#3b4a2a" /><rect x={x} y={y} width="20" height="6" fill="#5b7040" /></g>)}
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 0;40 -12;70 6;40 22;0 0" dur="5s" repeatCount="indefinite" />
            <rect x="40" y="40" width="10" height="10" fill={C.red} />
            <rect x="40" y="37" width="2" height="2" fill={C.red} /><rect x="48" y="37" width="2" height="2" fill={C.red} />
            <rect x="42" y="43" width="2" height="2" fill={C.ink} /><rect x="46" y="43" width="2" height="2" fill={C.ink} />
          </g>
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 0;30 -16;55 4;30 24;0 0" dur="5s" begin="0.4s" repeatCount="indefinite" />
            <rect x="70" y="48" width="10" height="10" fill={C.lime} />
            <rect x="75" y="44" width="1" height="4" fill={C.lime} />
            <rect x="72" y="51" width="2" height="2" fill={C.ink} /><rect x="76" y="51" width="2" height="2" fill={C.ink} />
          </g>
          <rect x="100" y="78" width="8" height="8" fill={C.amber}><animate attributeName="y" values="78;75;78" dur="1s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'blockout':
      return (
        <svg {...common} shapeRendering="crispEdges">
          {Array.from({ length: 6 }).map((_, x) => Array.from({ length: 4 }).map((__, y) => <rect key={`${x}${y}`} x={32 + x * 16} y={18 + y * 16} width="15" height="15" fill={(x + y) % 2 ? '#1c1c1c' : '#202020'} />))}
          <rect x="97" y="35" width="13" height="13" fill="none" stroke={C.amber} strokeDasharray="2 2" />
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 0;0 0;32 0;32 0;0 0" keyTimes="0;0.2;0.5;0.85;1" dur="4s" repeatCount="indefinite" />
            <rect x="65" y="35" width="13" height="13" fill={C.amber} />
            <rect x="68" y="38" width="7" height="7" fill="none" stroke={C.ink} strokeWidth="2" />
            <rect x="51" y="37" width="9" height="9" rx="2" fill={C.paper} />
          </g>
        </svg>
      );
    case 'dodge':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#140909" />
          {[[30, 14, 2.2], [70, 10, 1.6], [110, 16, 2.8], [135, 8, 1.9], [52, 12, 2.5]].map(([x, s, d], i) => (
            <rect key={i} x={x} y="-20" width={s} height={s} fill={C.red}>
              <animate attributeName="y" from="-20" to="110" dur={`${d}s`} begin={`${i * 0.35}s`} repeatCount="indefinite" />
            </rect>
          ))}
          <circle cx="40" cy="70" r="6" fill="none" stroke={C.red} strokeWidth="2"><animate attributeName="r" values="2;24" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" /></circle>
          <rect x="82" y="72" width="9" height="9" fill={C.paper}><animate attributeName="x" values="82;92;76;82" dur="1.6s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'reflex':
      return (
        <svg {...common}>
          <circle cx="80" cy="50" r="22" fill={C.blue}>
            <animate attributeName="fill" values={`#3a0d0d;#3a0d0d;${C.lime};${C.lime}`} keyTimes="0;0.6;0.62;1" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="80" cy="50" r="22" fill="none" stroke={C.lime} strokeWidth="2"><animate attributeName="r" values="22;22;22;46" keyTimes="0;0.6;0.62;1" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.62;1" dur="3s" repeatCount="indefinite" /></circle>
          <text x="80" y="55" textAnchor="middle" fontWeight={800} fontSize="12" fill={C.ink}>NOW</text>
        </svg>
      );
    case 'stack':
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={48 + i * 2} y={84 - i * 13} width={64 - i * 5} height="11" rx="1" fill={`hsl(${270 + i * 10} 85% ${45 + i * 5}%)`} />)}
          <rect y="6" width="44" height="11" rx="1" fill={C.paper}><animate attributeName="x" values="10;106;10" dur="2.4s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'escape':
      return (
        <svg {...common} fill="none" stroke={C.mint} strokeWidth="3" strokeLinecap="square">
          <rect width="160" height="100" fill="#06130f" stroke="none" />
          <path d="M20 15 H140 V85 H20 V35 M40 15 V65 H70 M90 35 V85 M70 35 H120 M110 55 H140 M55 85 V75" opacity="0.55" />
          <rect x="126" y="20" width="10" height="10" fill={C.mint} stroke="none"><animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" /></rect>
          <rect x="26" y="70" width="7" height="7" fill={C.paper} stroke="none"><animate attributeName="y" values="70;45;45;25;25;70" dur="5s" repeatCount="indefinite" /><animate attributeName="x" values="26;26;30;30;26;26" dur="5s" repeatCount="indefinite" /></rect>
          <rect x="96" y="62" width="7" height="7" fill={C.red} stroke="none"><animate attributeName="y" values="62;40;62" dur="3s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'ghostrun':
      return (
        <svg {...common} shapeRendering="crispEdges">
          <rect width="160" height="100" fill="#0b0b12" />
          <path d="M14 14 H146 V86 H14 Z M34 14 V60 M54 34 V86 M74 14 V56 H104 M94 34 V86 M124 14 V66" fill="none" stroke="#27274a" strokeWidth="6" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={130 + (i % 2) * 5} y={72 + Math.floor(i / 2) * 5} width="5" height="5" fill={i % 3 ? '#0A0A0A' : C.paper} />)}
          <rect x="20" y="20" width="8" height="8" fill={C.lime} opacity="0.55"><animate attributeName="x" values="20;20;42;42;82;82;20" dur="4s" repeatCount="indefinite" /><animate attributeName="y" values="20;44;44;76;76;20;20" dur="4s" repeatCount="indefinite" /></rect>
          <rect x="20" y="20" width="8" height="8" fill={C.paper}><animate attributeName="x" values="20;20;42;42;82;82;20" dur="4s" begin="0.35s" repeatCount="indefinite" /><animate attributeName="y" values="20;44;44;76;76;20;20" dur="4s" begin="0.35s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'hotpotato':
      return (
        <svg {...common} shapeRendering="crispEdges">
          <rect width="160" height="100" fill="#1d1420" />
          <g><animateTransform attributeName="transform" type="translate" values="0 0;30 4;0 0" dur="2s" repeatCount="indefinite" />
            <rect x="40" y="50" width="12" height="12" fill={C.lime} /><rect x="43" y="54" width="2" height="2" fill={C.ink} /><rect x="47" y="54" width="2" height="2" fill={C.ink} /></g>
          <g><animateTransform attributeName="transform" type="translate" values="0 0;-22 -4;0 0" dur="2s" repeatCount="indefinite" />
            <rect x="104" y="46" width="12" height="12" fill={C.pink} /><rect x="107" y="50" width="2" height="2" fill={C.ink} /><rect x="111" y="50" width="2" height="2" fill={C.ink} />
            <circle cx="110" cy="34" r="6" fill="#2a2a2a"><animate attributeName="fill" values="#2a2a2a;#FF3D3D;#2a2a2a" dur="0.4s" repeatCount="indefinite" /></circle>
            <rect x="113" y="24" width="3" height="3" fill={C.amber}><animate attributeName="opacity" values="1;0.2;1" dur="0.15s" repeatCount="indefinite" /></rect></g>
        </svg>
      );
    case 'pivot':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#0a1624" />
          <rect x="0" y="80" width="160" height="20" fill="#151515" /><rect x="0" y="80" width="160" height="2" fill={C.sea} />
          <rect x="0" y="0" width="160" height="16" fill="#151515" /><rect x="0" y="14" width="160" height="2" fill={C.sea} />
          <g><animateTransform attributeName="transform" type="translate" values="0 0;-80 0" dur="2s" repeatCount="indefinite" />
            {[60, 110, 150, 200, 230].map((x, i) => <path key={i} d={i % 2 ? `M${x} 16 l5 10 l5 -10 z` : `M${x} 80 l5 -10 l5 10 z`} fill={C.red} />)}</g>
          <rect x="30" y="66" width="12" height="12" fill={C.lime}><animate attributeName="y" values="66;66;18;18;66" keyTimes="0;0.35;0.45;0.85;1" dur="2s" repeatCount="indefinite" /></rect>
        </svg>
      );
    case 'bounce':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#120d1f" />
          {[[40, 50], [70, 40], [100, 52], [125, 38], [55, 72], [90, 74], [118, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={i === 5 ? '#3a3a44' : C.amber} />)}
          <circle cx="80" cy="10" r="5" fill={C.paper} />
          <circle cx="80" cy="12" r="3" fill={C.paper}><animate attributeName="cx" values="80;95;70;105" dur="1.8s" repeatCount="indefinite" /><animate attributeName="cy" values="12;45;68;110" dur="1.8s" repeatCount="indefinite" /></circle>
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
