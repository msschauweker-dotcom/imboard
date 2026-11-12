'use client';
// The rarity reveal, told with fish: the more common your answer, the bigger the
// school you swim with. A Deep Cut leaves you alone in the dark with an angler.
// (School sizes are a visual metaphor for the editorial tier — not real counts.)
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import { TIERS, TIER_ORDER, type Tier } from './engine';
import { Fish, Angler, Krill } from './Fish';
import { blip, prefersReducedMotion } from '@/lib/sound';

export type RevealData =
  | { kind: 'hit'; answer: string; tier: Tier; points: number; corrected: boolean; tries: number; secondsLeft: number }
  | { kind: 'timeout'; samples: Record<Tier, string[]> };

const SCHOOL: Record<Tier, number> = { common: 30, uncommon: 12, rare: 3, deep: 0 };
const CAPTION: Record<Tier, string> = {
  common: 'You’re swimming with the whole school.',
  uncommon: 'A smaller school. Nice.',
  rare: 'Only a few fish ever make it down here.',
  deep: 'Nobody else swam this deep.',
};
const WATER: Record<Tier, string> = {
  common: 'linear-gradient(180deg,#0f4a6b,#0a2f47 60%,#071d2e)',
  uncommon: 'linear-gradient(180deg,#0b3150,#071f36 60%,#051424)',
  rare: 'linear-gradient(180deg,#120f33,#0b0a24 60%,#06051a)',
  deep: 'radial-gradient(circle at 70% 45%, #0b1406 0%, #030502 55%, #000 100%)',
};

export default function DiveReveal({ data, onDone, last }: { data: RevealData; onDone: () => void; last: boolean }) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [landed, setLanded] = useState(reduced || data.kind === 'timeout');
  const doneRef = useRef(false);
  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };
  const tier = data.kind === 'hit' ? data.tier : null;
  const level = tier ? TIER_ORDER.indexOf(tier) : -1;
  const color = tier ? TIERS[tier].color : '#FF3D3D';

  useEffect(() => {
    if (data.kind !== 'hit' || reduced) return;
    blip('ping');
    const id = setTimeout(() => { setLanded(true); blip(level === 3 ? 'deep' : level === 2 ? 'win' : 'good'); }, 1150);
    return () => clearTimeout(id);
  }, [data, reduced, level]);

  useEffect(() => {
    if (!landed) return;
    const id = setTimeout(finish, data.kind === 'hit' ? (level >= 2 ? 3300 : 2500) : 3600);
    return () => clearTimeout(id);
  }, [landed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      e.preventDefault();
      landed ? finish() : setLanded(true);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const points = useMotionValue(0);
  const pointsText = useTransform(points, (v) => `+${Math.round(v)}`);
  useEffect(() => {
    if (!landed || data.kind !== 'hit') return;
    const c = animate(points, data.points, { duration: reduced ? 0 : 0.7, ease: 'easeOut' });
    return c.stop;
  }, [landed, data, points, reduced]);

  // School layout: deterministic scatter so it doesn't jump between renders
  const school = useMemo(() => {
    const n = tier ? SCHOOL[tier] : 9;
    return Array.from({ length: n }, (_, i) => {
      const a = (i * 137.5 * Math.PI) / 180, r = 18 + Math.sqrt(i) * 13;
      return { x: 50 + Math.cos(a) * r * 1.35, y: 50 + Math.sin(a) * r * 0.75, s: 22 + ((i * 7) % 12), d: (i % 9) * 0.05, hue: ['#7FD8FF', '#5fb8e8', '#9fe4ff', '#3DA9FF'][i % 4] };
    });
  }, [tier]);

  return (
    <motion.div
      className="absolute inset-0 z-20 overflow-hidden rounded-[inherit]"
      style={{ background: tier ? WATER[tier] : WATER.uncommon }}
      initial={{ opacity: 0 }}
      animate={landed && level === 3 && !reduced ? { opacity: 1, x: [0, -6, 6, -4, 2, 0] } : { opacity: 1 }}
      transition={{ duration: 0.45 }}
      onClick={() => (landed ? finish() : setLanded(true))}
      role="dialog"
      aria-live="assertive"
    >
      <div className="ocean-rays pointer-events-none absolute inset-0" style={{ opacity: tier === 'deep' ? 0.05 : 1 }} />
      {/* bubbles */}
      {!reduced && Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="bubble" style={{ left: `${8 + i * 12}%`, width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3, animationDuration: `${5 + (i % 4)}s`, animationDelay: `${-i * 0.7}s` }} />
      ))}

      {/* THE SCENE */}
      <div className="pointer-events-none absolute inset-x-0 top-[18%] h-[52%]">
        {data.kind === 'hit' && tier !== 'deep' && school.map((f, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            initial={reduced ? false : { x: -700, opacity: 0 }}
            animate={{ x: 0, opacity: 0.85 }}
            transition={{ duration: 1.0, delay: f.d, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="swimbob" style={{ animationDelay: `${-i * 0.2}s` }}><Fish color={f.hue} size={f.s} /></div>
          </motion.div>
        ))}
        {data.kind === 'hit' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <motion.div
              initial={reduced ? false : { x: tier === 'deep' ? 0 : -800, scale: tier === 'deep' ? 0.6 : 1, opacity: tier === 'deep' ? 0 : 1 }}
              animate={{ x: 0, scale: landed ? 1.08 : 1, opacity: 1 }}
              transition={{ duration: tier === 'deep' ? 1.1 : 1.05, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="swimbob relative flex flex-col items-center">
                {tier === 'deep' ? <Angler size={150} color={color} /> : <Fish color={color} size={70} you />}
                <span className="mt-1 rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">You</span>
              </div>
            </motion.div>
          </div>
        )}
        {data.kind === 'timeout' && school.slice(0, 7).map((f, i) => (
          <motion.div key={i} className="absolute" style={{ left: `${f.x}%`, top: `${f.y}%` }} initial={{ x: 0, opacity: 0.8 }} animate={{ x: 900, opacity: 0 }} transition={{ duration: 1.6, delay: i * 0.06, ease: 'easeIn' }}>
            <Fish color={f.hue} size={f.s} />
          </motion.div>
        ))}
        {tier === 'deep' && !reduced && Array.from({ length: 6 }).map((_, i) => (
          <motion.div key={`k${i}`} className="absolute" style={{ left: `${15 + i * 13}%`, top: `${20 + ((i * 37) % 60)}%` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0], x: [0, 30, 60] }} transition={{ duration: 3, delay: 0.4 + i * 0.3, repeat: Infinity }}>
            <Krill size={14} />
          </motion.div>
        ))}
      </div>

      {/* Text */}
      <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
        <div>
          {data.kind === 'hit' ? (
            <>
              <div className="label !text-[#9ccfe8]">Your answer{data.tries > 1 ? ` · attempt ${data.tries}` : ''}{data.corrected ? ' · spelling confirmed' : ''}</div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="truncate font-display text-3xl font-bold capitalize sm:text-4xl">{data.answer}</motion.div>
            </>
          ) : (
            <>
              <div className="font-mono text-xs uppercase tracking-[0.35em] text-signal-red">The school swam off</div>
              <div className="font-display text-4xl font-black sm:text-5xl">Time’s up</div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-h-[110px]">
            <AnimatePresence>
              {landed && data.kind === 'hit' && (
                <motion.div initial={{ opacity: 0, scale: 1.6, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} style={{ transformOrigin: 'left bottom' }}>
                  <div className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color }}>Level {level + 1} · {CAPTION[data.tier]}</div>
                  <div className="font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl" style={{ color, textShadow: `0 0 ${10 + level * 14}px ${color}99` }}>{TIERS[data.tier].label}</div>
                  <motion.div className="font-display text-3xl font-bold tabular-nums">{pointsText}</motion.div>
                </motion.div>
              )}
              {data.kind === 'timeout' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <div className="text-sm text-[#9ccfe8]">Answers that would have scored:</div>
                  <div className="mt-2 flex max-w-xl flex-wrap gap-1.5">
                    {TIER_ORDER.flatMap((t) => data.samples[t].slice(0, 2).map((s) => (
                      <span key={t + s} className="rounded-full px-2.5 py-1 text-xs capitalize" style={{ background: `${TIERS[t].color}22`, color: TIERS[t].color }}>{s} · {TIERS[t].points}</span>
                    )))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* rarity ladder */}
            <div className="flex gap-1">
              {TIER_ORDER.map((t, i) => (
                <motion.span key={t} className="rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase" animate={{ background: landed && i === level ? TIERS[t].color : 'rgba(255,255,255,0.06)', color: landed && i === level ? '#0A0A0A' : 'rgba(255,255,255,0.45)', scale: landed && i === level ? 1.12 : 1 }}>
                  L{i + 1}
                </motion.span>
              ))}
            </div>
            <AnimatePresence>
              {landed && (
                <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} onClick={(e) => { e.stopPropagation(); finish(); }} className="btn border border-white/20 bg-white/5 text-paper hover:bg-white/10">
                  {last ? 'See your catch' : 'Next prompt'} <span className="kbd !bg-transparent">⏎</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
