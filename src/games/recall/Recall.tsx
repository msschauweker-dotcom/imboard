'use client';
import { useEffect, useMemo, useState } from 'react';
import { GameFrame, ShareBar, PB } from '@/components/kit';
import { ResetCountdown } from '@/components/ui';
import { dateKey, puzzleNumber } from '@/lib/daily';
import { getDaily, setDaily, recordResult, getStats } from '@/lib/stats';
import { useMounted } from '@/lib/hooks';
import { createRng, randomSeed } from '@/lib/rng';
import { blip } from '@/lib/sound';

// RECALL — memory puzzle. A pattern flashes; rebuild it. Level n shows n+2 cells.
type Mode = 'daily' | 'unlimited';
const sizeFor = (lvl: number) => (lvl < 4 ? 4 : lvl < 8 ? 5 : 6);

function pattern(seed: string, level: number) {
  const n = sizeFor(level);
  const r = createRng(`recall:${seed}:${level}`);
  return { n, cells: r.shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, Math.min(n * n - 2, level + 2)) };
}

export default function Recall() {
  const mounted = useMounted();
  const [mode, setMode] = useState<Mode>('daily');
  const day = puzzleNumber();
  const key = dateKey();
  const [seed, setSeed] = useState(randomSeed);
  const s = mode === 'daily' ? `daily-${day}` : seed;
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'feedback' | 'over'>('ready');
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const pat = useMemo(() => pattern(s, level), [s, level]);

  useEffect(() => {
    if (!mounted) return;
    setLevel(1); setLives(3); setPicked([]); setPhase('ready');
    if (mode === 'daily') {
      const d = getDaily<{ level: number }>('recall', key);
      if (d?.status === 'complete' && d.data) { setLevel(d.data.level); setPhase('over'); }
    }
  }, [mounted, mode, key, seed]);

  const show = () => {
    setPicked([]); setWrong(null); setPhase('show');
    setTimeout(() => setPhase('input'), 900 + pat.cells.length * 140);
  };

  const end = (reached: number) => {
    setPhase('over');
    blip('lose');
    recordResult('recall', { score: reached, mode: mode === 'daily' ? 'daily' : 'unlimited' });
    if (mode === 'daily') setDaily('recall', { date: key, status: 'complete', startedAt: Date.now(), data: { level: reached } });
  };

  const click = (i: number) => {
    if (phase !== 'input' || picked.includes(i)) return;
    if (!pat.cells.includes(i)) {
      setWrong(i);
      blip('bad');
      const l = lives - 1;
      setLives(l);
      setPhase('feedback');
      setTimeout(() => (l <= 0 ? end(level - 1) : show()), 900);
      return;
    }
    const p = [...picked, i];
    setPicked(p);
    blip('type');
    if (p.length === pat.cells.length) {
      blip('good');
      setPhase('feedback');
      setTimeout(() => { setLevel((x) => x + 1); setPhase('ready'); }, 600);
    }
  };

  useEffect(() => { if (phase === 'ready' && level > 1) show(); }, [phase, level]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameFrame
      id="recall"
      modes={[{ id: 'daily', label: `Daily #${day}` }, { id: 'unlimited', label: 'Unlimited' }]}
      mode={mode}
      onMode={(m) => setMode(m as Mode)}
      right={mounted ? <PB value={`Lv ${getStats('recall').best ?? 0}`} /> : null}
      howTo={<><p>Some squares light up briefly. When they go dark, tap the same squares (any order).</p><p>Each level adds a square, and the grid grows. Three wrong taps and the run is over. The daily run uses the same patterns for everyone.</p></>}
      controls={[['Click / tap', 'Select a square']]}
    >
      {phase === 'over' ? (
        <div className="card p-8 text-center">
          <div className="label">{mode === 'daily' ? `Recall #${day}` : 'Recall'}</div>
          <div className="font-display text-6xl font-bold text-signal-amber">Level {level}</div>
          {mode === 'daily' && <div className="mt-3"><span className="chip">Next set <ResetCountdown /></span></div>}
          <div className="mt-5 flex justify-center gap-2">
            <ShareBar text={`OFFGRID Recall${mode === 'daily' ? ` #${day}` : ''} — reached level ${level} 🧠`} />
            {mode === 'unlimited' ? <button className="btn-paper" onClick={() => setSeed(randomSeed())}>Play again</button> : <button className="btn-ghost" onClick={() => setMode('unlimited')}>Unlimited</button>}
          </div>
        </div>
      ) : (
        <div className="card flex flex-col items-center p-6">
          <div className="mb-4 flex w-full max-w-sm justify-between">
            <span className="label">Level {level}</span>
            <span className="label">{'♥'.repeat(lives)}{'♡'.repeat(3 - lives)}</span>
          </div>
          <div className="grid w-full max-w-sm gap-2" style={{ gridTemplateColumns: `repeat(${pat.n}, minmax(0,1fr))` }}>
            {Array.from({ length: pat.n * pat.n }).map((_, i) => {
              const lit = (phase === 'show' && pat.cells.includes(i)) || picked.includes(i) || (phase === 'feedback' && pat.cells.includes(i));
              return (
                <button
                  key={i}
                  onClick={() => click(i)}
                  className="aspect-square rounded-lg transition-colors duration-150"
                  style={{ background: wrong === i ? '#FF3D3D' : lit ? '#FFB800' : '#242424' }}
                  aria-label={`Square ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="mt-6 h-10">
            {phase === 'ready' && level === 1 && <button className="btn-lime" onClick={show}>Start</button>}
            {phase === 'show' && <span className="text-paper-dim">Memorize…</span>}
            {phase === 'input' && <span className="text-paper-dim">{pat.cells.length - picked.length} to go</span>}
          </div>
        </div>
      )}
    </GameFrame>
  );
}
