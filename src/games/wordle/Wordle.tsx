'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameFrame, ShareBar, ChallengeButton, SignalLost, OfficialNotice, PB } from '@/components/kit';
import { ResetCountdown, Segmented, Toast, useToast } from '@/components/ui';
import { scoreGuess, isValidWord, hardModeViolation, dailyAnswer, seededAnswer, DIFFICULTY, type Mark, type Difficulty } from './logic';
import { dateKey, puzzleNumber } from '@/lib/daily';
import { getDaily, setDaily, recordResult, getStats } from '@/lib/stats';
import { useFairPlay, useKeyPress, useMounted } from '@/lib/hooks';
import { randomSeed } from '@/lib/rng';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { motion } from 'framer-motion';
import { submitDaily } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

type Mode = 'daily' | 'unlimited' | 'versus';
type Row = { guess: string; marks: Mark[] };
type Saved = { rows: Row[]; status: 'won' | 'lost' };

const COLORS: Record<Mark, string> = { correct: '#5FCB7A', present: '#E6B93C', absent: '#2B2B2B' };
const EMOJI: Record<Mark, string> = { correct: '🟩', present: '🟨', absent: '⬛' };
const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export default function Wordle({ versus }: { versus?: VersusProps }) {
  const mounted = useMounted();
  const [mode, setMode] = useState<Mode>(versus ? 'versus' : 'daily');
  const [difficulty, setDifficulty] = useState<Difficulty>((versus?.settings.difficulty as Difficulty) ?? 'normal');
  const [seed, setSeed] = useState(randomSeed);
  const day = puzzleNumber();
  const key = dateKey();
  const diff: Difficulty = mode === 'daily' ? 'normal' : difficulty;
  const cfg = DIFFICULTY[diff];
  const answer = useMemo(() => (versus ? seededAnswer(versus.seed, diff) : mode === 'daily' ? dailyAnswer(day) : seededAnswer(seed, diff)), [versus, mode, day, seed, diff]);

  const [rows, setRows] = useState<Row[]>([]);
  const [cur, setCur] = useState('');
  const [status, setStatus] = useState<'intro' | 'play' | 'won' | 'lost' | 'void'>('intro');
  const [shake, setShake] = useState(false);
  const [fresh, setFresh] = useState(-1);
  const [revealing, setRevealing] = useState(false);
  const [toast, showToast] = useToast();
  const [voidReason, setVoidReason] = useState<string | null>(null);
  const [lbMsg, setLbMsg] = useState<string | null>(null);
  const timeLimit = (versus?.settings.timeLimit as number) || 0;
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (!mounted) return;
    setRows([]); setCur(''); setLbMsg(null); setFresh(-1); setRevealing(false);
    if (mode === 'daily') {
      const d = getDaily<Saved>('wordle', key);
      if (d?.status === 'complete' && d.data) { setRows(d.data.rows); setStatus(d.data.status); }
      else if (d?.status === 'void') setStatus('void');
      else if (d?.status === 'in-progress') { setDaily('wordle', { ...d, status: 'void', reason: 'Page reloaded mid-challenge' }); setStatus('void'); }
      else setStatus('intro');
    } else setStatus('play');
  }, [mounted, mode, key, seed, diff]);

  useEffect(() => { if (versus) { setStatus('play'); setTimeLeft(timeLimit); } }, [versus?.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional versus timer
  useEffect(() => {
    if (!versus || !timeLimit || status !== 'play') return;
    const end = Date.now() + timeLeft * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setTimeLeft(l);
      if (l <= 0) { clearInterval(id); setStatus('lost'); versus.onDone({ guesses: rows.map((r) => r.guess), timedOut: true }); }
    }, 250);
    return () => clearInterval(id);
  }, [versus, status, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useFairPlay(mode === 'daily' && status === 'play', (reason) => {
    setDaily('wordle', { date: key, status: 'void', startedAt: Date.now(), reason });
    recordResult('wordle', { score: 0, mode: 'daily', countStreak: false, bucket: 'X' });
    setVoidReason(reason);
    setStatus('void');
  });

  const startDaily = () => { setDaily('wordle', { date: key, status: 'in-progress', startedAt: Date.now() }); setStatus('play'); };

  const end = useCallback((all: Row[], won: boolean) => {
    setStatus(won ? 'won' : 'lost');
    blip(won ? 'win' : 'lose');
    if (mode === 'versus') { versus?.onDone({ guesses: all.map((r) => r.guess) }); return; }
    const used = all.length;
    recordResult('wordle', { score: won ? cfg.guesses + 1 - used : 0, mode, win: won, bucket: won ? String(used) : 'X', countStreak: won });
    if (mode === 'daily') {
      setDaily<Saved>('wordle', { date: key, status: 'complete', startedAt: Date.now(), data: { rows: all, status: won ? 'won' : 'lost' } });
      submitDaily('wordle', day, key, { guesses: all.map((r) => r.guess) })
        .then((r) => setLbMsg(r.ok ? `Ranked #${r.rank} today` : r.reason ?? null))
        .catch(() => setLbMsg('Offline — saved locally'));
    }
  }, [mode, versus, cfg.guesses, key, day]);

  const type = (k: string) => {
    if (status !== 'play') {
      if (k === 'enter' && mode === 'unlimited' && (status === 'won' || status === 'lost')) setSeed(randomSeed());
      return;
    }
    if (k === 'enter') {
      if (cur.length < 5) return fail('Not enough letters');
      if (!isValidWord(cur)) return fail('Not in word list');
      if (cfg.hardRule) { const v = hardModeViolation(cur, rows); if (v) return fail(v); }
      if (revealing) return;
      const row = { guess: cur, marks: scoreGuess(cur, answer) };
      const all = [...rows, row];
      setRows(all);
      setFresh(all.length - 1);
      setRevealing(true);
      setCur('');
      row.marks.forEach((_, c) => setTimeout(() => blip('place'), c * FLIP_STAGGER * 1000 + 250));
      if (cur !== answer) setTimeout(() => setRevealing(false), REVEAL_MS);
      if (cur === answer) setTimeout(() => { setRevealing(false); end(all, true); }, REVEAL_MS + 200);
      else if (all.length >= cfg.guesses) setTimeout(() => { end(all, false); showToast(answer.toUpperCase(), 3000); }, REVEAL_MS + 200);
    } else if (k === 'back') setCur((c) => c.slice(0, -1));
    else if (/^[a-z]$/.test(k) && cur.length < 5) { setCur((c) => c + k); blip('type'); }
  };
  const fail = (msg: string) => { setShake(true); showToast(msg); blip('bad'); setTimeout(() => setShake(false), 400); };

  useKeyPress(status !== 'intro' && status !== 'void', (code, e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (code === 'Enter') type('enter');
    else if (code === 'Backspace') type('back');
    else if (/^Key[A-Z]$/.test(code)) type(code.slice(3).toLowerCase());
  });

  const keyState = useMemo(() => {
    const m: Record<string, Mark> = {};
    const rank = { absent: 0, present: 1, correct: 2 };
    // keyboard colours update only after the flip finishes
    const shown = revealing ? rows.slice(0, -1) : rows;
    for (const r of shown) r.guess.split('').forEach((ch, i) => { if (!m[ch] || rank[r.marks[i]] > rank[m[ch]]) m[ch] = r.marks[i]; });
    return m;
  }, [rows, revealing]);

  const stats = mounted ? getStats('wordle') : null;
  const done = status === 'won' || status === 'lost';
  const title = mode === 'daily' ? `Wordle Daily #${day}` : `Wordle ${cfg.label}`;
  const shareText = `${title} ${status === 'won' ? rows.length : 'X'}/${cfg.guesses}\n${rows.map((r) => r.marks.map((m) => EMOJI[m]).join('')).join('\n')}\n${typeof window !== 'undefined' ? window.location.origin : ''}/daily/wordle`;

  return (
    <GameFrame
      id="wordle"
      versus={!!versus}
      modes={[{ id: 'daily', label: `Daily #${day}` }, { id: 'unlimited', label: 'Unlimited' }]}
      mode={mode}
      onMode={(m) => { setMode(m as Mode); setSeed(randomSeed()); }}
      right={stats ? <PB label="Streak" value={stats.streak} /> : null}
      howTo={
        <>
          <p>Guess the hidden five-letter word. Each guess must be a real word.</p>
          <p>After each guess the tiles show how close you are: <span className="font-semibold" style={{ color: COLORS.correct }}>green</span> = right letter, right spot; <span className="font-semibold" style={{ color: COLORS.present }}>yellow</span> = in the word, wrong spot; grey = not in the word.</p>
          <p><strong className="text-paper">Easy</strong>: 7 guesses. <strong className="text-paper">Normal</strong>: 6 guesses. <strong className="text-paper">Hard</strong>: 6 guesses, tougher words, and any revealed hint must be used in later guesses.</p>
          <p>The daily word is the same for everyone. Unlimited lets you play as many as you like — press Enter after a game to start the next.</p>
        </>
      }
      controls={[['A–Z', 'Type'], ['Enter', 'Submit / next word'], ['⌫', 'Delete']]}
    >
      <Toast text={toast} />
      {voidReason && <SignalLost reason={voidReason} onClose={() => setVoidReason(null)} />}
      {mode === 'unlimited' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented size="sm" value={difficulty} onChange={(d) => { setDifficulty(d); setSeed(randomSeed()); }} options={(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => ({ id: d, label: DIFFICULTY[d].label }))} />
          <span className="text-xs text-paper-mute">{cfg.blurb}</span>
        </div>
      )}
      {versus && timeLimit > 0 && <div className="mb-3 text-center font-mono text-2xl tabular-nums">{timeLeft}s</div>}

      {status === 'intro' ? (
        <OfficialNotice onStart={startDaily}><p className="mt-3 text-sm text-paper-mute">6 guesses · same word for everyone</p></OfficialNotice>
      ) : status === 'void' ? (
        <div className="card p-8 text-center">
          <div className="font-display text-3xl font-bold text-signal-red">Signal lost</div>
          <p className="mt-2 text-paper-dim">Today’s official attempt was voided. Try Unlimited, or come back in <ResetCountdown />.</p>
          <button className="btn-lime mt-5" onClick={() => setMode('unlimited')}>Play Unlimited</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${cfg.guesses}, minmax(0,1fr))` }}>
            {Array.from({ length: cfg.guesses }).map((_, r) => {
              const row = rows[r];
              const isCur = r === rows.length && status === 'play';
              const letters = row ? row.guess : isCur ? cur : '';
              return (
                <motion.div key={r} className="grid grid-cols-5 gap-1.5" animate={isCur && shake ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
                  {Array.from({ length: 5 }).map((__, c) => (
                    <Tile key={c} ch={letters[c] ?? ''} mark={row?.marks[c]} col={c} flip={r === fresh} bounce={status === 'won' && r === rows.length - 1 && r === fresh} />
                  ))}
                </motion.div>
              );
            })}
          </div>

          {done && mode !== 'versus' && (
            <div className="card mt-6 w-full p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="label">{title}</div>
                  <div className="font-display text-3xl font-bold">{status === 'won' ? ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew', 'Close one'][rows.length - 1] : <>The word was <span className="text-lime">{answer.toUpperCase()}</span></>}</div>
                </div>
                {stats && <Distribution stats={stats} max={cfg.guesses} highlight={status === 'won' ? String(rows.length) : 'X'} />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats && <><span className="chip">Played <span className="text-paper">{stats.played}</span></span><span className="chip">Win % <span className="text-paper">{stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}</span></span><span className="chip">Streak <span className="text-paper">{stats.streak}</span> / max {stats.maxStreak}</span></>}
                {lbMsg && <span className="chip text-lime">{lbMsg}</span>}
                {mode === 'daily' && <span className="chip">Next word <ResetCountdown /></span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ShareBar text={shareText} card={{ game: 'wordle', title, big: `${status === 'won' ? rows.length : 'X'}/${cfg.guesses}`, sub: mode === 'daily' ? `Streak ${stats?.streak ?? 0}` : cfg.label, grid: rows.map((r) => r.marks.map((m) => COLORS[m])), accent: '#7BE495' }} />
                <ChallengeButton game="wordle" settings={{ difficulty: diff }} className="btn-ghost" />
                {mode === 'unlimited' && <button className="btn-paper" onClick={() => setSeed(randomSeed())}>Next word ⏎</button>}
              </div>
            </div>
          )}
          {done && mode === 'versus' && <div className="mt-6 text-center text-paper-dim">{status === 'won' ? `Solved in ${rows.length}.` : `The word was ${answer.toUpperCase()}.`} Waiting for your opponent…</div>}

          <div className="mt-6 w-full max-w-lg select-none space-y-1.5">
            {KEYS.map((row, i) => (
              <div key={row} className="flex justify-center gap-1.5">
                {i === 2 && <Key label="Enter" wide onClick={() => type('enter')} />}
                {row.split('').map((k) => <Key key={k} label={k} state={keyState[k]} onClick={() => type(k)} />)}
                {i === 2 && <Key label="⌫" wide onClick={() => type('back')} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </GameFrame>
  );
}

const FLIP_STAGGER = 0.28;
const REVEAL_MS = 5 * FLIP_STAGGER * 1000 + 450;

function Tile({ ch, mark, col, flip, bounce }: { ch: string; mark?: Mark; col: number; flip: boolean; bounce: boolean }) {
  const reduced = prefersReducedMotion();
  const base = 'grid h-14 w-14 place-items-center rounded-lg border-2 font-display text-[1.7rem] font-bold uppercase sm:h-16 sm:w-16 [backface-visibility:hidden]';
  if (!mark) {
    return (
      <motion.div
        key={ch ? `f${ch}` : 'e'}
        initial={ch && !reduced ? { scale: 0.8 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 700, damping: 18 }}
        className={`${base} ${ch ? 'border-paper-dim bg-ink-800 shadow-[0_0_0_1px_rgba(242,240,233,0.08)]' : 'border-ink-600 bg-ink-900/50'}`}
      >
        {ch}
      </motion.div>
    );
  }
  const color = COLORS[mark];
  const fg = mark === 'absent' ? '#F2F0E9' : '#0A0A0A';
  return (
    <motion.div
      className={`${base} border-transparent`}
      style={{ perspective: 400 }}
      initial={flip && !reduced ? { rotateX: 0, backgroundColor: '#161616', color: '#F2F0E9', borderColor: '#B9B6AC' } : false}
      animate={bounce && !reduced
        ? { rotateX: 0, backgroundColor: color, color: fg, borderColor: color, y: [0, -26, 0, -6, 0] }
        : { rotateX: flip && !reduced ? [0, 90, 0] : 0, backgroundColor: color, color: fg, borderColor: color }}
      transition={bounce && !reduced
        ? { y: { delay: col * 0.09, duration: 0.55, ease: 'easeOut' }, default: { duration: 0 } }
        : flip && !reduced
          ? { rotateX: { delay: col * FLIP_STAGGER, duration: 0.5, times: [0, 0.5, 1], ease: 'easeInOut' }, backgroundColor: { delay: col * FLIP_STAGGER + 0.25, duration: 0.01 }, color: { delay: col * FLIP_STAGGER + 0.25, duration: 0.01 }, borderColor: { delay: col * FLIP_STAGGER + 0.25, duration: 0.01 } }
          : { duration: 0 }}
    >
      {ch}
    </motion.div>
  );
}

function Key({ label, state, wide, onClick }: { label: string; state?: Mark; wide?: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9, y: 2 }}
      onClick={onClick}
      className={`grid h-12 place-items-center rounded-lg font-semibold uppercase shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] transition-colors duration-300 sm:h-14 ${wide ? 'flex-[1.5] px-2 text-xs' : 'flex-1 text-sm'}`}
      style={{ background: state ? COLORS[state] : '#2E2E2E', color: state && state !== 'absent' ? '#0A0A0A' : '#F2F0E9', maxWidth: wide ? 72 : 44 }}
    >
      {label}
    </motion.button>
  );
}

function Distribution({ stats, max, highlight }: { stats: ReturnType<typeof getStats>; max: number; highlight: string }) {
  const buckets = [...Array.from({ length: max }, (_, i) => String(i + 1)), 'X'];
  const top = Math.max(1, ...buckets.map((b) => stats.distribution[b] || 0));
  return (
    <div className="w-48 space-y-0.5">
      {buckets.map((b) => (
        <div key={b} className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="w-2 text-paper-mute">{b}</span>
          <div className="h-3 rounded-sm text-right" style={{ width: `${Math.max(8, ((stats.distribution[b] || 0) / top) * 100)}%`, background: b === highlight ? '#5FCB7A' : '#333' }}>
            <span className="px-1 text-paper">{stats.distribution[b] || 0}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
