'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GameCard from '@/components/GameCard';
import { Logo, ResetCountdown, SectionHead } from '@/components/ui';
import { JoinRoom, QuickCreate } from '@/components/RoomEntry';
import { DAILY, ARCADE, GAME_BY_ID } from '@/lib/catalog';
import { getRecords, getStats, type RecordEntry } from '@/lib/stats';
import { useStorageTick } from '@/lib/hooks';
import { puzzleNumber } from '@/lib/daily';

function HeroLogo() {
  const letters = 'OFFGRID'.split('');
  return (
    <div className="flex items-center font-display text-6xl font-bold tracking-[0.06em] sm:text-8xl md:text-[9rem]" aria-label="OFFGRID">
      {letters.map((l, i) => (
        <span key={i} className="flex items-center">
          {i === 3 && (
            <motion.span className="mx-[0.06em] inline-block h-[0.55em] w-[0.18em] bg-lime" initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.4, 1] }} transition={{ delay: 0.45, duration: 0.6 }} style={{ boxShadow: '0 0 40px #C8FF0088' }} />
          )}
          <motion.span className="inline-block" initial={{ y: '0.6em', opacity: 0, rotateX: -80 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ delay: i * 0.055, type: 'spring', stiffness: 260, damping: 18 }}>
            {l}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

function FloatingPieces() {
  const pieces = [
    { x: '72%', y: '8%', d: 0, el: <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#5FCB7A] font-display text-2xl font-bold text-ink">W</span> },
    { x: '86%', y: '30%', d: 1.2, el: <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E6B93C] font-display text-xl font-bold text-ink">O</span> },
    { x: '64%', y: '42%', d: 2.1, el: <span className="block h-6 w-16 rounded-md bg-signal-violet/80" /> },
    { x: '90%', y: '62%', d: 0.6, el: <span className="block h-5 w-5 bg-signal-red" style={{ boxShadow: '0 0 0 3px #0a0a0a, 0 0 20px #FF3D3D88' }} /> },
    { x: '78%', y: '76%', d: 1.7, el: <span className="block h-5 w-5 bg-lime" style={{ boxShadow: '0 0 0 3px #0a0a0a, 0 0 20px #C8FF0088' }} /> },
    { x: '58%', y: '14%', d: 2.6, el: <span className="block h-4 w-4 rounded-full border-2 border-[#7FD8FF]" /> },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {pieces.map((p, i) => (
        <motion.div key={i} className="absolute" style={{ left: p.x, top: p.y }} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 1 + i * 0.12, type: 'spring' }}>
          <div className="floaty" style={{ animationDelay: `${p.d}s`, animationDuration: `${5 + (i % 3)}s` }}>{p.el}</div>
        </motion.div>
      ))}
    </div>
  );
}

function Ticker() {
  const items = ['KRILLION', 'WORDLE', 'CONNECTIONS', 'TAG', 'BLOCKOUT', 'DODGE', 'REFLEX', 'STACK', 'ESCAPE', 'SEQUENCE', 'RECALL'];
  const row = [...items, ...items];
  return (
    <div className="relative mt-14 overflow-hidden border-y border-ink-600 py-3 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-8 font-pixel text-sm text-paper-mute">
        {row.map((t, i) => <span key={i} className="flex items-center gap-8">{t}<span className="text-lime">✦</span></span>)}
      </div>
    </div>
  );
}

export default function Home() {
  const tick = useStorageTick();
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [streaks, setStreaks] = useState<{ id: string; streak: number }[]>([]);
  const [num, setNum] = useState<number | null>(null);
  useEffect(() => {
    setNum(puzzleNumber());
    setRecords(getRecords().filter((r) => r.newBest).slice(0, 5));
    setStreaks(['krillion', 'wordle', 'connections'].map((id) => ({ id, streak: getStats(id).streak })).filter((s) => s.streak > 0));
  }, [tick]);
  const [krillion, wordle, connections, ...moreDaily] = DAILY;

  return (
    <div className="space-y-24">
      {/* HERO */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-6 pt-6 sm:-mx-6 sm:px-6 sm:pt-12">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_40%,black_20%,transparent_70%)]" />
        <FloatingPieces />
        <div className="relative">
          <HeroLogo />
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} className="mt-4 flex origin-left flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-mono text-sm uppercase tracking-[0.4em] text-lime">Think for yourself.</span>
            <span className="h-px flex-1 bg-gradient-to-r from-ink-500 to-transparent" />
          </motion.div>
          <h1 className="mt-10 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {['Your', 'daily', 'dose', 'of', 'distraction.'].map((w, i) => (
              <motion.span key={w} className={`mr-[0.25em] inline-block ${w === 'of' ? 'text-paper-mute' : ''} ${w === 'distraction.' ? 'bg-gradient-to-r from-paper via-lime to-paper bg-[length:200%_100%] bg-clip-text text-transparent' : ''}`} initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.9 + i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}>
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
            <Link href="/daily" className="btn-lime shine px-6 py-3 text-base">Play today’s puzzles</Link>
            <Link href="/arcade" className="btn-ghost px-6 py-3 text-base">Enter the arcade</Link>
            <Link href="/versus" className="btn-ghost px-6 py-3 text-base">⚔ Challenge a friend</Link>
          </motion.div>
        </div>
        <Ticker />
      </section>

      {/* TODAY */}
      <section>
        <SectionHead kicker={`Daily${num ? ` · #${num}` : ''} · resets in`} title="Today’s games">
          <span className="font-mono text-paper-dim"><ResetCountdown /></span>
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-3">
          {[krillion, wordle, connections].map((g, i) => <GameCard key={g.id} game={g} size="lg" index={i} />)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="label mr-2">Also today</span>
          {moreDaily.map((g) => g.status === 'live'
            ? <Link key={g.id} href={g.href} className="chip hover:!text-paper">{g.name}</Link>
            : <span key={g.id} className="chip opacity-50">{g.name} · soon</span>)}
        </div>
      </section>

      {/* ARCADE */}
      <section>
        <SectionHead kicker="Unlimited · instant play" title="The Arcade">
          <Link href="/arcade" className="btn-ghost btn-sm">All games →</Link>
        </SectionHead>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCADE.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
        </div>
      </section>

      {/* VERSUS */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-600 bg-gradient-to-br from-ink-800 to-ink p-6 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-2">
          <div>
            <div className="label mb-3 text-lime">Versus</div>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Challenge your friends.</h2>
            <p className="mt-4 max-w-md text-paper-dim">No accounts. Make a private room, send the link, and play the same puzzle — or chase each other around a pixel arena in real time.</p>
            <div className="mt-6"><QuickCreate /></div>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div className="label">Got a code?</div>
            <JoinRoom />
            <div className="mt-2 flex flex-wrap gap-2">
              {['tag', 'wordle', 'krillion', 'connections', 'reflex', 'dodge'].map((id) => <span key={id} className="chip">{GAME_BY_ID[id].name}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* RECORDS */}
      {(records.length > 0 || streaks.length > 0) && (
        <section>
          <SectionHead kicker="You" title="Your records" >
            <Link href="/profile" className="btn-ghost btn-sm">Profile →</Link>
          </SectionHead>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <div className="label mb-3">Streaks</div>
              {streaks.length ? streaks.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5">
                  <span>{GAME_BY_ID[s.id].name}</span>
                  <span className="font-mono text-lime">🔥 {s.streak} day{s.streak === 1 ? '' : 's'}</span>
                </div>
              )) : <p className="text-sm text-paper-mute">Finish a daily puzzle to start a streak.</p>}
            </div>
            <div className="card p-5">
              <div className="label mb-3">Recent personal bests</div>
              {records.length ? records.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{GAME_BY_ID[r.game]?.name ?? r.game}</span>
                  <span className="font-mono">{r.score}</span>
                </div>
              )) : <p className="text-sm text-paper-mute">No records yet.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
