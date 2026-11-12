'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { GameFrame, ShareBar, ChallengeButton, SignalLost, OfficialNotice, PB } from '@/components/kit';
import { ResetCountdown, Segmented, Toast, useToast } from '@/components/ui';
import { generatePuzzle, checkGuess, MISTAKES_ALLOWED, type Difficulty, type Puzzle } from './generate';
import { dateKey, puzzleNumber } from '@/lib/daily';
import { getDaily, setDaily, recordResult, getStats } from '@/lib/stats';
import { useFairPlay, useMounted, useKeyPress } from '@/lib/hooks';
import { createRng, randomSeed } from '@/lib/rng';
import { blip } from '@/lib/sound';
import { submitDaily } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

type Mode = 'daily' | 'unlimited' | 'versus';
type Saved = { guesses: string[][]; solved: string[]; mistakes: number; won: boolean };

export const LEVEL_COLORS = ['#FFE45C', '#7BE495', '#6FB7FF', '#C79BFF'];
const EMOJI = ['🟨', '🟩', '🟦', '🟪'];

export default function Connections({ versus }: { versus?: VersusProps }) {
  const mounted = useMounted();
  const [mode, setMode] = useState<Mode>(versus ? 'versus' : 'daily');
  const [difficulty, setDifficulty] = useState<Difficulty>((versus?.settings.difficulty as Difficulty) ?? 'normal');
  const [seed, setSeed] = useState(randomSeed);
  const day = puzzleNumber();
  const key = dateKey();
  const diff: Difficulty = mode === 'daily' ? 'normal' : difficulty;
  const puzzle: Puzzle = useMemo(
    () => (versus ? generatePuzzle(versus.seed, diff) : mode === 'daily' ? generatePuzzle(`daily-${day}`, 'normal') : generatePuzzle(seed, diff)),
    [versus, mode, day, seed, diff],
  );
  const maxMistakes = MISTAKES_ALLOWED[diff];

  const [order, setOrder] = useState<string[]>(puzzle.order);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<'intro' | 'play' | 'won' | 'lost' | 'void'>('intro');
  const [shake, setShake] = useState(false);
  const [jumping, setJumping] = useState<string[]>([]);
  const [toast, showToast] = useToast();
  const [voidReason, setVoidReason] = useState<string | null>(null);
  const [lbMsg, setLbMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setOrder(puzzle.order); setSelected([]); setSolved([]); setGuesses([]); setMistakes(0); setLbMsg(null);
    if (mode === 'daily') {
      const d = getDaily<Saved>('connections', key);
      if (d?.status === 'complete' && d.data) { setGuesses(d.data.guesses); setSolved(d.data.solved); setMistakes(d.data.mistakes); setStatus(d.data.won ? 'won' : 'lost'); }
      else if (d?.status === 'void') setStatus('void');
      else if (d?.status === 'in-progress') { setDaily('connections', { ...d, status: 'void', reason: 'Page reloaded mid-challenge' }); setStatus('void'); }
      else setStatus('intro');
    } else setStatus('play');
  }, [mounted, puzzle, mode, key]);

  useFairPlay(mode === 'daily' && status === 'play', (reason) => {
    setDaily('connections', { date: key, status: 'void', startedAt: Date.now(), reason });
    recordResult('connections', { score: 0, mode: 'daily', countStreak: false });
    setVoidReason(reason);
    setStatus('void');
  });

  const finish = (won: boolean, g: string[][], s: string[], m: number) => {
    setStatus(won ? 'won' : 'lost');
    blip(won ? 'win' : 'lose');
    if (!won) setSolved(puzzle.groups.map((x) => x.id).sort((a, b) => (s.includes(a) ? -1 : 1) - (s.includes(b) ? -1 : 1)));
    if (mode === 'versus') { versus?.onDone({ guesses: g }); return; }
    const score = won ? 100 + (maxMistakes - m) * 25 : s.length * 20;
    recordResult('connections', { score, mode, win: won, bucket: won ? String(m) : 'X', countStreak: won });
    if (mode === 'daily') {
      setDaily<Saved>('connections', { date: key, status: 'complete', startedAt: Date.now(), data: { guesses: g, solved: s, mistakes: m, won } });
      submitDaily('connections', day, key, { guesses: g }).then((r) => setLbMsg(r.ok ? `Ranked #${r.rank} today` : r.reason ?? null)).catch(() => setLbMsg('Offline — saved locally'));
    }
  };

  const submit = () => {
    if (selected.length !== 4 || status !== 'play' || jumping.length) return;
    const sortedSel = [...selected].sort().join();
    if (guesses.some((g) => [...g].sort().join() === sortedSel)) { showToast('Already guessed!'); return; }
    const g = [...guesses, selected];
    setGuesses(g);
    const r = checkGuess(puzzle, selected);
    if (r.correct) {
      const sel = selected;
      const s = [...solved, r.correct!];
      setJumping(sel);
      blip('good');
      setTimeout(() => {
        setJumping([]);
        setSolved(s);
        setSelected([]);
        setOrder((o) => o.filter((w) => !sel.includes(w)));
        if (s.length === 4) setTimeout(() => finish(true, g, s, mistakes), 700);
      }, 650);
    } else {
      const m = mistakes + 1;
      setMistakes(m);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      blip('bad');
      if (r.best === 3) showToast('One away…');
      if (m >= maxMistakes) setTimeout(() => finish(false, g, solved, m), 600);
    }
  };

  useKeyPress(status === 'play', (code) => { if (code === 'Enter') submit(); });

  const toggle = (w: string) => {
    if (status !== 'play') return;
    setSelected((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length < 4 ? [...s, w] : s));
    blip('type');
  };

  const stats = mounted ? getStats('connections') : null;
  const levelOf = (w: string) => puzzle.groups.find((gr) => gr.words.includes(w))!.level;
  const title = mode === 'daily' ? `Connections Daily #${day}` : `Connections ${diff[0].toUpperCase() + diff.slice(1)}`;
  const shareText = `${title}\n${guesses.map((g) => g.map((w) => EMOJI[levelOf(w) - 1]).join('')).join('\n')}\n${typeof window !== 'undefined' ? window.location.origin : ''}/daily/connections`;
  const done = status === 'won' || status === 'lost';

  return (
    <GameFrame
      id="connections"
      versus={!!versus}
      modes={[{ id: 'daily', label: `Daily #${day}` }, { id: 'unlimited', label: 'Unlimited' }]}
      mode={mode}
      onMode={(m) => { setMode(m as Mode); setSeed(randomSeed()); }}
      right={stats ? <PB label="Streak" value={stats.streak} /> : null}
      howTo={
        <>
          <p>Find <strong className="text-paper">four groups of four</strong> words that share a connection. Select four tiles and submit.</p>
          <p>Categories range from <span style={{ color: LEVEL_COLORS[0] }}>straightforward</span> to <span style={{ color: LEVEL_COLORS[3] }}>devious wordplay</span>. Watch out for words that seem to fit more than one group — only one arrangement works.</p>
          <p>Mistakes allowed: Easy 6 · Normal 4 · Hard 3. Every board is machine-checked so each word fits exactly one group on it.</p>
        </>
      }
      controls={[['Click', 'Select a word'], ['Enter', 'Submit']]}
    >
      <Toast text={toast} />
      {voidReason && <SignalLost reason={voidReason} onClose={() => setVoidReason(null)} />}
      {mode === 'unlimited' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented size="sm" value={difficulty} onChange={(d) => { setDifficulty(d); setSeed(randomSeed()); }} options={[{ id: 'easy', label: 'Easy' }, { id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Hard' }]} />
          <button className="btn-ghost btn-sm" onClick={() => setSeed(randomSeed())}>New puzzle</button>
        </div>
      )}
      {status === 'intro' ? (
        <OfficialNotice onStart={() => { setDaily('connections', { date: key, status: 'in-progress', startedAt: Date.now() }); setStatus('play'); }}>
          <p className="mt-3 text-sm text-paper-mute">16 words · 4 groups · 4 mistakes</p>
        </OfficialNotice>
      ) : status === 'void' ? (
        <div className="card p-8 text-center">
          <div className="font-display text-3xl font-bold text-signal-red">Signal lost</div>
          <p className="mt-2 text-paper-dim">Today’s official attempt was voided. Try Unlimited, or come back in <ResetCountdown />.</p>
          <button className="btn-lime mt-5" onClick={() => setMode('unlimited')}>Play Unlimited</button>
        </div>
      ) : (
        <div>
          <LayoutGroup>
            <div className="space-y-2">
              {solved.map((id) => {
                const gr = puzzle.groups.find((x) => x.id === id)!;
                return (
                  <motion.div
                    layout
                    key={id}
                    initial={{ scaleY: 0.4, opacity: 0, y: 30 }}
                    animate={{ scaleY: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="relative overflow-hidden rounded-2xl p-4 text-center text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
                    style={{ background: `linear-gradient(135deg, ${LEVEL_COLORS[gr.level - 1]}, ${LEVEL_COLORS[gr.level - 1]}cc)` }}
                  >
                    <motion.div className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" initial={{ x: '-120%' }} animate={{ x: '400%' }} transition={{ duration: 0.9, delay: 0.15 }} />
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="font-display text-sm font-bold uppercase tracking-[0.2em]">{gr.name}</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="text-sm font-semibold">{gr.words.join(' · ')}</motion.div>
                  </motion.div>
                );
              })}
            </div>
            <div className={`mt-2 grid grid-cols-4 gap-2 ${shake ? 'animate-shake' : ''}`}>
              {order.filter((w) => !solved.some((id) => puzzle.groups.find((x) => x.id === id)!.words.includes(w))).map((w) => (
                <motion.button
                  layout
                  key={w}
                  onClick={() => toggle(w)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.93 }}
                  animate={jumping.includes(w) ? { y: [0, -14, 0], scale: 1.04 } : { y: 0, scale: selected.includes(w) ? 1.03 : 1 }}
                  transition={jumping.includes(w) ? { duration: 0.35, delay: jumping.indexOf(w) * 0.08 } : { type: 'spring', stiffness: 500, damping: 30 }}
                  className={`flex h-16 items-center justify-center rounded-xl px-1 text-center font-display font-bold uppercase leading-tight shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] transition-colors duration-150 sm:h-20 ${w.length > 8 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-base'} ${selected.includes(w) ? 'bg-paper text-ink shadow-[0_8px_24px_-8px_rgba(242,240,233,0.5)]' : 'bg-ink-700 text-paper hover:bg-ink-600'}`}
                >
                  {w}
                </motion.button>
              ))}
            </div>
          </LayoutGroup>
          {!done && (
            <>
              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-paper-dim">
                Mistakes remaining:
                {Array.from({ length: maxMistakes }).map((_, i) => (
                  <motion.span key={i} className="h-3 w-3 rounded-full" animate={i < maxMistakes - mistakes ? { scale: 1, backgroundColor: '#F2F0E9' } : { scale: [1.6, 0.8], backgroundColor: '#FF3D3D33' }} transition={{ duration: 0.35 }} />
                ))}
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <button className="btn-ghost" onClick={() => setOrder((o) => createRng(Math.random() * 1e9).shuffle(o))}>Shuffle</button>
                <button className="btn-ghost" onClick={() => setSelected([])} disabled={!selected.length}>Deselect</button>
                <button className="btn-lime" onClick={submit} disabled={selected.length !== 4}>Submit</button>
              </div>
            </>
          )}
          {done && mode !== 'versus' && (
            <div className="card mt-6 p-5">
              <div className="label">{title}</div>
              <div className="font-display text-3xl font-bold">{status === 'won' ? (mistakes === 0 ? 'Perfect.' : 'Solved.') : 'Next time.'}</div>
              <div className="mt-2 text-lg leading-tight tracking-widest">{guesses.map((g, i) => <div key={i}>{g.map((w) => EMOJI[levelOf(w) - 1]).join('')}</div>)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats && <><span className="chip">Played <span className="text-paper">{stats.played}</span></span><span className="chip">Win % <span className="text-paper">{stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}</span></span><span className="chip">Streak <span className="text-paper">{stats.streak}</span></span></>}
                {lbMsg && <span className="chip text-lime">{lbMsg}</span>}
                {mode === 'daily' && <span className="chip">Next puzzle <ResetCountdown /></span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ShareBar text={shareText} card={{ game: 'connections', title, big: status === 'won' ? `${mistakes} mistake${mistakes === 1 ? '' : 's'}` : `${solved.length}/4`, sub: status === 'won' ? 'Solved' : 'Out of mistakes', grid: guesses.map((g) => g.map((w) => LEVEL_COLORS[levelOf(w) - 1])), accent: '#A66BFF' }} />
                <ChallengeButton game="connections" settings={{ difficulty: diff }} className="btn-ghost" />
                {mode === 'unlimited' && <button className="btn-paper" onClick={() => setSeed(randomSeed())}>Next puzzle →</button>}
              </div>
            </div>
          )}
          {done && mode === 'versus' && <div className="mt-6 text-center text-paper-dim">{status === 'won' ? 'Solved!' : 'Out of mistakes.'} Waiting for your opponent…</div>}
        </div>
      )}
    </GameFrame>
  );
}
