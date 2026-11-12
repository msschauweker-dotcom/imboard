'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFrame, ShareBar, PB } from '@/components/kit';
import { ResetCountdown } from '@/components/ui';
import { dailySequences, generateSequence, type Seq } from './gen';
import { dateKey, puzzleNumber } from '@/lib/daily';
import { getDaily, setDaily, recordResult, getStats } from '@/lib/stats';
import { useMounted } from '@/lib/hooks';
import { randomSeed } from '@/lib/rng';
import { blip } from '@/lib/sound';

type Mode = 'daily' | 'unlimited';
type Res = { correct: boolean; tries: number };

export default function Sequence() {
  const mounted = useMounted();
  const [mode, setMode] = useState<Mode>('daily');
  const day = puzzleNumber();
  const key = dateKey();
  const [streakRun, setStreakRun] = useState(0);
  const [seed, setSeed] = useState(randomSeed);
  const daily = useMemo(() => dailySequences(day), [day]);
  const unlimitedSeq = useMemo(() => generateSequence(seed, 1 + Math.min(2, Math.floor(streakRun / 3))), [seed, streakRun]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Res[]>([]);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState<null | { ok: boolean; seq: Seq }>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mounted) return;
    setIdx(0); setResults([]); setInput(''); setTries(0); setReveal(null); setDone(false);
    if (mode === 'daily') {
      const d = getDaily<Res[]>('sequence', key);
      if (d?.status === 'complete' && d.data) { setResults(d.data); setDone(true); }
    }
  }, [mounted, mode, key]);

  const seq = mode === 'daily' ? daily[idx] : unlimitedSeq;
  useEffect(() => { inputRef.current?.focus(); }, [idx, seed, reveal]);

  const submit = () => {
    if (!input.trim() || reveal || done) return;
    const ok = Number(input) === seq.answer;
    const t = tries + 1;
    if (!ok && t < 2) { setTries(t); setInput(''); blip('bad'); return; }
    blip(ok ? 'good' : 'bad');
    setReveal({ ok, seq });
    const all = [...results, { correct: ok, tries: t }];
    setResults(all);
    setTimeout(() => {
      setReveal(null); setInput(''); setTries(0);
      if (mode === 'daily') {
        if (idx + 1 >= daily.length) {
          setDone(true);
          const score = all.filter((r) => r.correct).length;
          recordResult('sequence', { score, mode: 'daily', win: score >= 3 });
          setDaily('sequence', { date: key, status: 'complete', startedAt: Date.now(), data: all });
        } else setIdx(idx + 1);
      } else {
        if (ok) { setStreakRun((s) => s + 1); setSeed(randomSeed()); }
        else {
          recordResult('sequence', { score: streakRun, mode: 'unlimited' });
          setStreakRun(0); setSeed(randomSeed()); setResults([]);
        }
      }
    }, 1600);
  };

  const score = results.filter((r) => r.correct).length;
  return (
    <GameFrame
      id="sequence"
      modes={[{ id: 'daily', label: `Daily #${day}` }, { id: 'unlimited', label: 'Endless' }]}
      mode={mode}
      onMode={(m) => setMode(m as Mode)}
      right={mounted ? <PB label="Best run" value={getStats('sequence').best ?? 0} /> : null}
      howTo={<><p>Each puzzle shows the start of a number sequence. Type the next number.</p><p>You get two tries per sequence. The daily set has five sequences of rising difficulty. Endless mode keeps going until you miss — it gets harder as your run grows.</p></>}
      controls={[['0–9', 'Type'], ['Enter', 'Submit']]}
    >
      {done && mode === 'daily' ? (
        <div className="card p-8 text-center">
          <div className="label">Sequence #{day}</div>
          <div className="font-display text-6xl font-bold text-signal-blue">{score}/5</div>
          <div className="mt-3 text-2xl">{results.map((r) => (r.correct ? (r.tries === 1 ? '🟦' : '🟨') : '⬛')).join('')}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2"><span className="chip">Next set <ResetCountdown /></span></div>
          <div className="mt-5 flex justify-center gap-2">
            <ShareBar text={`OFFGRID Sequence #${day} ${score}/5\n${results.map((r) => (r.correct ? (r.tries === 1 ? '🟦' : '🟨') : '⬛')).join('')}`} />
            <button className="btn-ghost" onClick={() => setMode('unlimited')}>Endless mode</button>
          </div>
        </div>
      ) : (
        <div className="card relative p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <span className="label">{mode === 'daily' ? `Sequence ${idx + 1} of 5` : `Run: ${streakRun}`}</span>
            <span className="label">Level {seq.level}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-3xl font-bold sm:text-5xl">
            {seq.terms.map((n, i) => <span key={i} className="rounded-lg bg-ink-700 px-3 py-2">{n}</span>)}
            <span className="rounded-lg border-2 border-dashed border-signal-blue px-4 py-2 text-signal-blue">?</span>
          </div>
          <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <input ref={inputRef} className="input font-mono text-xl" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/[^0-9-]/g, ''))} placeholder={tries ? 'One more try…' : 'Next number'} aria-label="Next number" />
            <button className="btn-lime">Submit</button>
          </form>
          {reveal && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/95 text-center">
              <div>
                <div className={`font-display text-4xl font-bold ${reveal.ok ? 'text-lime' : 'text-signal-red'}`}>{reveal.ok ? 'Correct' : `It was ${reveal.seq.answer}`}</div>
                <div className="mt-2 text-paper-dim">{reveal.seq.rule}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </GameFrame>
  );
}
