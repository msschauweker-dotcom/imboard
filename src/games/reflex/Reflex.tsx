'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, ShareBar, PB } from '@/components/kit';
import { createRng, randomSeed } from '@/lib/rng';
import { recordResult, getStats } from '@/lib/stats';
import { blip } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

const ROUNDS = 5;
const FALSE_START_PENALTY = 1000;

export default function Reflex({ versus }: { versus?: VersusProps }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'hit' | 'false' | 'done'>(versus ? 'idle' : 'idle');
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rng = useRef(createRng(versus?.seed ?? randomSeed()));
  const token = useRef<string | null>(null);

  const arm = () => {
    setPhase('wait');
    const delay = 1200 + rng.current.next() * 3300;
    timer.current = setTimeout(() => { goAt.current = performance.now(); setPhase('go'); blip('go'); }, delay);
  };

  const begin = () => {
    rng.current = createRng(versus?.seed ?? randomSeed());
    setTimes([]); setFalseStarts(0); setLast(null); setRank(null);
    if (!versus) startRun('reflex').then((t) => (token.current = t));
    arm();
  };

  const press = () => {
    if (phase === 'idle') return begin();
    if (phase === 'wait') {
      if (timer.current) clearTimeout(timer.current);
      setFalseStarts((f) => f + 1);
      setPhase('false');
      blip('bad');
      return;
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - goAt.current);
      const t = [...times, ms];
      setTimes(t);
      setLast(ms);
      blip('good');
      if (t.length >= ROUNDS) finish(t);
      else setPhase('hit');
      return;
    }
    if (phase === 'hit' || phase === 'false') arm();
    if (phase === 'done' && !versus) begin();
  };

  const finish = (t: number[]) => {
    setPhase('done');
    const avg = Math.round(t.reduce((a, b) => a + b, 0) / t.length + (falseStarts * FALSE_START_PENALTY) / t.length);
    if (versus) { versus.onDone({ times: t, falseStarts }); return; }
    recordResult('reflex', { score: avg, mode: 'arcade', lowerIsBetter: true });
    submitRun('reflex', token.current, avg, { times: t, falseStarts }).then((r) => r.ok && setRank(`Global #${r.rank}`));
    token.current = null;
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) press(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const best = times.length ? Math.min(...times) : 0;
  const finalAvg = times.length ? Math.round(avg + (falseStarts * FALSE_START_PENALTY) / times.length) : 0;
  const bg = { idle: '#121212', wait: '#3a0d0d', go: '#C8FF00', hit: '#121212', false: '#FF3D3D', done: '#121212' }[phase];
  const stats = getStats('reflex');

  return (
    <GameFrame
      id="reflex"
      versus={!!versus}
      right={<PB value={stats.best ? `${stats.best}ms` : '—'} />}
      howTo={<><p>Wait for the screen to turn <span className="text-lime">lime</span>, then click, tap or hit Space as fast as you can.</p><p>Five rounds. Your score is the average. Pressing early is a <strong className="text-signal-red">false start</strong>: the round restarts and a {FALSE_START_PENALTY}ms penalty is spread across your average.</p></>}
      controls={[['Space', 'React'], ['Click / tap', 'React']]}
    >
      <button
        onPointerDown={(e) => { e.preventDefault(); press(); }}
        className="game-surface relative grid h-[52vh] min-h-[300px] w-full place-items-center rounded-2xl border border-ink-600 transition-colors duration-75"
        style={{ background: bg }}
        aria-label="Reaction area"
      >
        <div className={`text-center ${phase === 'go' ? 'text-ink' : 'text-paper'}`}>
          {phase === 'idle' && <><div className="font-display text-5xl font-bold">REFLEX</div><div className="mt-2 text-paper-dim">Click or press Space to start · {ROUNDS} rounds</div></>}
          {phase === 'wait' && <><div className="font-display text-5xl font-bold">Wait…</div><div className="mt-2 text-paper-dim">Round {times.length + 1} of {ROUNDS}</div></>}
          {phase === 'go' && <div className="font-display text-7xl font-black">NOW!</div>}
          {phase === 'hit' && <><div className="font-display text-7xl font-bold tabular-nums">{last}<span className="text-3xl text-paper-mute">ms</span></div><div className="mt-2 text-paper-dim">Click for round {times.length + 1}</div></>}
          {phase === 'false' && <><div className="font-display text-5xl font-bold text-ink">FALSE START</div><div className="mt-2 text-ink/70">Too early. Click to retry the round (+{FALSE_START_PENALTY}ms penalty)</div></>}
          {phase === 'done' && (
            <div>
              <div className="label">Average</div>
              <div className="font-display text-7xl font-bold tabular-nums text-signal-blue">{finalAvg}<span className="text-3xl text-paper-mute">ms</span></div>
              <div className="mt-2 text-paper-dim">Best {best}ms · {falseStarts} false start{falseStarts === 1 ? '' : 's'}</div>
              {rank && <div className="mt-1 text-sm text-lime">{rank}</div>}
              {versus && <div className="mt-3 text-sm text-paper-dim">Waiting for your opponent…</div>}
            </div>
          )}
        </div>
        <div className="absolute bottom-4 flex gap-2">
          {Array.from({ length: ROUNDS }).map((_, i) => <span key={i} className={`rounded-full px-2 py-0.5 font-mono text-xs ${times[i] ? 'bg-ink/60 text-paper' : 'bg-white/10 text-transparent'}`}>{times[i] ?? '000'}</span>)}
        </div>
      </button>
      {phase === 'done' && !versus && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-lime" onClick={begin}>Again</button>
          <ShareBar text={`OFFGRID Reflex ⚡ ${finalAvg}ms average (best ${best}ms)`} card={{ game: 'reflex', title: 'Reflex', big: `${finalAvg}ms`, sub: `Best ${best}ms · ${falseStarts} false starts`, accent: '#3DA9FF' }} />
          <ChallengeButton game="reflex" className="btn-ghost" />
        </div>
      )}
    </GameFrame>
  );
}
