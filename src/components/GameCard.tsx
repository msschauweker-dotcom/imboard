'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { GameMeta } from '@/lib/catalog';
import { getDaily, getStats } from '@/lib/stats';
import { useStorageTick } from '@/lib/hooks';
import GameArt from './GameArt';

export default function GameCard({ game, size = 'md', index = 0 }: { game: GameMeta; size?: 'md' | 'lg'; index?: number }) {
  const tick = useStorageTick();
  const [meta, setMeta] = useState<{ done?: string; streak?: number }>({});
  useEffect(() => {
    if (game.status !== 'live') return;
    const s = getStats(game.id);
    const d = game.section === 'daily' ? getDaily(game.id) : null;
    setMeta({ done: d?.status === 'complete' ? 'Done today' : d?.status === 'void' ? 'Signal lost' : undefined, streak: s.streak });
  }, [game, tick]);

  // spotlight + subtle 3D tilt that follows the pointer
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  const bg = useTransform([mx, my], ([x, y]) => `radial-gradient(420px circle at ${(x as number) * 100}% ${(y as number) * 100}%, ${game.accent}26, transparent 45%)`);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { mx.set(0.5); my.set(0.5); };

  const soon = game.status === 'soon';
  const inner = (
    <motion.div
      ref={ref}
      onPointerMove={soon ? undefined : onMove}
      onPointerLeave={reset}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={soon ? undefined : { y: -6 }}
      style={soon ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-ink-800/80 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 ${soon ? 'border-ink-600 opacity-55' : 'border-ink-600 hover:border-transparent'}`}
    >
      {!soon && (
        <>
          <motion.div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: `inset 0 0 0 1px ${game.accent}88, 0 20px 60px -20px ${game.accent}55` }} />
        </>
      )}
      <div className={`relative ${size === 'lg' ? 'h-44' : 'h-32'} overflow-hidden border-b border-ink-600 bg-ink-900`}>
        <div className="absolute inset-0 opacity-80 transition duration-500 group-hover:scale-[1.06] group-hover:opacity-100">
          <GameArt id={game.id} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink-800 to-transparent" />
        <span className="absolute left-3 top-3 flex h-2 w-2">
          <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: game.accent }} />
          <span className="relative h-2 w-2 rounded-full" style={{ background: game.accent }} />
        </span>
        {meta.done && (
          <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${meta.done === 'Signal lost' ? 'bg-signal-red text-ink' : 'bg-lime text-ink'}`}>{meta.done}</span>
        )}
        {soon && <span className="absolute right-3 top-3 rounded-full border border-ink-500 bg-ink/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">In development</span>}
      </div>
      <div className="relative z-[1] flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`font-display font-bold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{game.name}</h3>
          {!!meta.streak && meta.streak > 0 && <span className="font-mono text-xs text-lime">🔥 {meta.streak}</span>}
        </div>
        <p className="text-sm text-paper-dim">{game.tagline}</p>
        {size === 'lg' && <p className="mt-1 text-xs leading-relaxed text-paper-mute">{game.blurb}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {game.versus && !soon && <span className="chip">⚔ Versus</span>}
            {game.categories.slice(0, 2).map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
          {!soon && (
            <span className="grid h-8 w-8 shrink-0 translate-x-2 place-items-center rounded-full text-ink opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" style={{ background: game.accent }}>→</span>
          )}
        </div>
      </div>
    </motion.div>
  );
  if (soon) return <div aria-disabled>{inner}</div>;
  return <Link href={game.href} className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-lime">{inner}</Link>;
}
