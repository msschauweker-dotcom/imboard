'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { GameFrame, ShareBar, ChallengeButton, SignalLost, PB } from '@/components/kit';
import { ResetCountdown, Segmented } from '@/components/ui';
import { PROMPT_BY_ID, judge, generateGame, dailyGame, sampleAnswers, normalize, TIERS, TIER_ORDER, THEMED_MODES, SECONDS_PER_PROMPT, ZONES, zoneFor, type Verdict, type ThemeChoice, type Tier } from './engine';
import { THEMES } from './bank';
import DiveReveal, { type RevealData } from './DiveReveal';
import { Fish, Angler } from './Fish';
import { dateKey, puzzleNumber } from '@/lib/daily';
import { getDaily, setDaily, recordResult, getStats } from '@/lib/stats';
import { useFairPlay, useAutoPause, useMounted } from '@/lib/hooks';
import { randomSeed } from '@/lib/rng';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { submitDaily } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

type Mode = 'daily' | 'unlimited' | 'versus';
type Answer = { text: string; verdict: Verdict; ms: number; attempts: string[] };
type DailyData = { prompts: string[]; answers: Answer[]; total: number };

const EMOJI: Record<string, string> = { common: '⬜', uncommon: '🟦', rare: '🟪', deep: '🟩', miss: '⬛' };
const MAX_ATTEMPTS = 25; // generous cap per prompt (spam guard)

export default function Krillion({ versus }: { versus?: VersusProps }) {
  const mounted = useMounted();
  const [mode, setMode] = useState<Mode>(versus ? 'versus' : 'daily');
  const [theme, setTheme] = useState<ThemeChoice>('mixed');
  const [seed, setSeed] = useState(() => randomSeed());
  const day = puzzleNumber();
  const key = dateKey();

  const prompts = useMemo(() => {
    if (versus) return generateGame(versus.seed, (versus.settings.theme as ThemeChoice) ?? 'mixed');
    return mode === 'daily' ? dailyGame(day) : generateGame(seed, theme);
  }, [mode, seed, theme, day, versus]);

  const [phase, setPhase] = useState<'intro' | 'play' | 'results' | 'void'>('intro');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [voidReason, setVoidReason] = useState<string | null>(null);
  const [lbMsg, setLbMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || mode !== 'daily') return;
    const d = getDaily<DailyData>('krillion', key);
    if (d?.status === 'complete' && d.data) { setAnswers(d.data.answers); setPhase('results'); }
    else if (d?.status === 'void') { setAnswers(d.data?.answers ?? []); setPhase('void'); }
    else if (d?.status === 'in-progress') {
      setDaily('krillion', { ...d, status: 'void', reason: 'Page reloaded mid-challenge' });
      setPhase('void');
    } else { setPhase('intro'); setAnswers([]); }
  }, [mounted, mode, key]);

  const start = () => {
    setAnswers([]);
    setLbMsg(null);
    if (mode === 'daily') setDaily<DailyData>('krillion', { date: key, status: 'in-progress', startedAt: Date.now() });
    setPhase('play');
  };
  useEffect(() => { if (versus) start(); }, [versus?.seed, versus?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  useFairPlay(mode === 'daily' && phase === 'play', (reason) => {
    setDaily<DailyData>('krillion', { date: key, status: 'void', startedAt: Date.now(), reason, data: { prompts, answers, total: 0 } });
    recordResult('krillion', { score: 0, mode: 'daily', countStreak: false });
    setVoidReason(reason);
    setPhase('void');
  });

  const finish = (all: Answer[]) => {
    const total = all.reduce((s, a) => s + (a.verdict.status === 'valid' ? a.verdict.points : 0), 0);
    setAnswers(all);
    setPhase('results');
    if (mode === 'versus') { versus?.onDone({ answers: all.map((a) => (a.verdict.status === 'valid' ? a.text : '')) }); return; }
    recordResult('krillion', { score: total, mode, win: true, countStreak: true });
    if (mode === 'daily') {
      setDaily<DailyData>('krillion', { date: key, status: 'complete', startedAt: Date.now(), data: { prompts, answers: all, total } });
      submitDaily('krillion', day, key, { answers: all.map((a) => (a.verdict.status === 'valid' ? a.text : '')) })
        .then((r) => setLbMsg(r.ok ? `Ranked #${r.rank} today` : r.reason ?? null))
        .catch(() => setLbMsg('Offline — score saved locally'));
    }
  };

  return (
    <GameFrame
      id="krillion"
      versus={!!versus}
      modes={[{ id: 'daily', label: `Daily Dive #${day}` }, { id: 'unlimited', label: 'Unlimited Dive' }]}
      mode={mode}
      onMode={(m) => { setMode(m as Mode); setPhase('intro'); setAnswers([]); setSeed(randomSeed()); }}
      right={mounted ? <PB label="Best" value={`${getStats('krillion').best ?? 0} pts`} /> : null}
      howTo={
        <>
          <p>Seven prompts like “Name a dog breed.” Each gets <strong className="text-paper">25 seconds</strong>. Guess as many times as you like — wrong or unknown answers don’t cost you anything but time. The first answer that lands is locked in.</p>
          <p>The rarer your answer, the smaller the school you swim with: <Tiers />. “Lab” puts you in a huge school (Common). “Xoloitzcuintli” leaves you alone in the deep (Deep Cut).</p>
          <p>Typos never get silently changed — if we think you meant something, we ask “Did you mean…?” and you confirm (Enter) or reject (Esc). The clock keeps running.</p>
          <p>Some prompts have a twist — “…starting with B”. Your total decides what fish you are today: {ZONES.map((z) => z.name).join(' → ')}.</p>
          <p>Rarity tiers are editorial — our curators’ judgment of how likely a typical player is to think of an answer, not survey data. Typos, plurals and aliases are accepted; unrelated answers aren’t.</p>
          <p>The Daily Dive is the same for everyone and never repeats; you get one official run. Unlimited Dive never runs out.</p>
        </>
      }
      controls={[['Enter', 'Submit / continue'], ['Esc', 'Clear input']]}
    >
      {voidReason && <SignalLost reason={voidReason} onClose={() => setVoidReason(null)} />}

      {phase === 'intro' && (
        <Intro
          mode={mode}
          day={day}
          theme={theme}
          setTheme={setTheme}
          onStart={start}
        />
      )}

      {phase === 'play' && <Round key={prompts.join()} prompts={prompts} casual={mode === 'unlimited'} onFinish={finish} />}

      {(phase === 'results' || phase === 'void') && (
        <Results
          prompts={prompts}
          answers={answers}
          mode={mode}
          day={day}
          voided={phase === 'void'}
          lbMsg={lbMsg}
          theme={theme}
          onAgain={mode === 'unlimited' ? () => { setSeed(randomSeed()); setPhase('intro'); } : undefined}
        />
      )}
    </GameFrame>
  );
}

function Tiers() {
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {TIER_ORDER.map((t, i) => (
        <span key={t} className="rounded px-1.5 py-0.5 font-mono text-[11px] text-ink" style={{ background: TIERS[t].color }}>L{i + 1} {TIERS[t].label} {TIERS[t].points}</span>
      ))}
    </span>
  );
}

// ---------------- Ocean backdrop ----------------
function Ocean({ intensity = 1 }: { intensity?: number }) {
  const bubbles = useMemo(
    () => Array.from({ length: Math.round(14 * intensity) }, (_, i) => ({
      left: `${(i * 37) % 100}%`, size: 4 + ((i * 13) % 10), dur: 9 + ((i * 7) % 9), delay: -((i * 3.1) % 12), sway: `${((i % 5) - 2) * 14}px`,
    })),
    [intensity],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="ocean-rays absolute inset-0" />
      <div className="ocean-caustics absolute inset-0" />
      {!prefersReducedMotion() && bubbles.map((b, i) => (
        <span key={i} className="bubble" style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ['--sway' as string]: b.sway }} />
      ))}
    </div>
  );
}

// ---------------- Intro ----------------
function Intro({ mode, day, theme, setTheme, onStart }: { mode: Mode; day: number; theme: ThemeChoice; setTheme: (t: ThemeChoice) => void; onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ocean relative overflow-hidden rounded-3xl border border-[#1d3d55] p-6 sm:p-10">
      <Ocean />
      <div className="relative">
        <div className="label !text-[#7FD8FF]">{mode === 'daily' ? `Daily Dive #${day} · official run` : 'Unlimited Dive'}</div>
        <h2 className="mt-2 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">
          Seven prompts. <span className="text-[#7FD8FF]">Dive deep.</span>
        </h2>
        <p className="mt-3 max-w-lg text-[#a9c7d8]">25 seconds each. Keep guessing until something lands — the rarer it is, the deeper you go.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {TIER_ORDER.map((t, i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="rounded-xl border px-3 py-2" style={{ borderColor: `${TIERS[t].color}55`, background: `${TIERS[t].color}12` }}>
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: TIERS[t].color }}>Level {i + 1}</div>
              <div className="text-sm font-semibold">{TIERS[t].label} <span className="text-paper-mute">+{TIERS[t].points}</span></div>
            </motion.div>
          ))}
        </div>
        {mode === 'unlimited' && (
          <div className="mt-8">
            <div className="label mb-3 !text-[#7FD8FF]">Pick your waters</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEMED_MODES.map((t) => (
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} key={t.id} onClick={() => setTheme(t.id)} className={`rounded-xl border p-3 text-left backdrop-blur transition-colors ${theme === t.id ? 'border-[#7FD8FF] bg-[#7FD8FF]/15' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}>
                  <div className="text-xl">{t.emoji}</div>
                  <div className="mt-1 text-sm font-semibold">{t.label}</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
        {mode === 'daily' && <p className="mt-6 max-w-md text-sm text-[#a9c7d8]">One official run. Leaving this tab mid-dive voids it.</p>}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-lime shine px-10 py-3.5 text-base" onClick={onStart}>Dive in ↓</motion.button>
          {mode === 'unlimited' && <ChallengeButton game="krillion" settings={{ theme }} className="btn border border-white/20 text-paper hover:bg-white/5" />}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------- Round ----------------
function TimerRing({ pct, secs }: { pct: number; secs: number }) {
  const R = 26, C = 2 * Math.PI * R;
  const danger = pct < 0.2;
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={danger ? '#FF3D3D' : '#7FD8FF'} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }} />
      </svg>
      <motion.span key={secs} initial={{ scale: danger ? 1.35 : 1.1, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className={`font-mono text-xl font-bold tabular-nums ${danger ? 'text-signal-red' : ''}`}>{secs}</motion.span>
    </div>
  );
}

const REASON_TEXT: Record<string, string> = {
  'not-in-bank': 'Not in our bank — keep going',
  'ambiguous': 'Too close to two answers — be more specific',
  'wrong-letter': 'Wrong starting letter',
  'empty': '',
  'timeout': '',
};

function Round({ prompts, casual, onFinish }: { prompts: string[]; casual: boolean; onFinish: (a: Answer[]) => void }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ msg: string; n: number } | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [left, setLeft] = useState(SECONDS_PER_PROMPT * 1000);
  const [paused, setPaused] = useState(false);
  const [shake, setShake] = useState(0);
  const [confirm, setConfirm] = useState<{ raw: string; verdict: Extract<Verdict, { status: 'valid' }> } | null>(null);
  const deadline = useRef(Date.now() + SECONDS_PER_PROMPT * 1000);
  const shownAt = useRef(Date.now());
  const pausedLeft = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const p = PROMPT_BY_ID.get(prompts[i])!;
  const letter = prompts[i].split('@')[1];

  useAutoPause(casual && !reveal, () => {
    if (!paused) { pausedLeft.current = deadline.current - Date.now(); setPaused(true); }
  });

  useEffect(() => {
    if (reveal || paused) return;
    inputRef.current?.focus();
    const id = setInterval(() => {
      const l = deadline.current - Date.now();
      setLeft(l);
      if (l <= 5000 && Math.floor(l / 1000) !== Math.floor((l + 100) / 1000) && l > 0) blip('tick');
      if (l <= 0) timeUp();
    }, 100);
    return () => clearInterval(id);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const lock = (a: Answer, data: RevealData) => {
    if (locked.current) return;
    locked.current = true;
    setAnswers((prev) => [...prev, a]);
    setReveal(data);
  };

  const timeUp = () => {
    if (locked.current) return;
    setConfirm(null);
    blip('lose');
    lock({ text: '', verdict: { status: 'invalid', reason: 'timeout' }, ms: SECONDS_PER_PROMPT * 1000, attempts }, { kind: 'timeout', samples: sampleAnswers(prompts[i], 2) });
  };

  const submit = () => {
    const raw = text.trim();
    if (!raw || locked.current || paused) return;
    const n = normalize(raw);
    if (attempts.some((a) => normalize(a) === n)) { setFeedback({ msg: 'Already tried that one', n: Date.now() }); setShake((s) => s + 1); blip('nope'); return; }
    const verdict = judge(prompts[i], raw);
    if (verdict.status === 'valid' && verdict.corrected) {
      // Never auto-correct: ask first. The clock keeps running.
      setConfirm({ raw, verdict });
      blip('select');
      return;
    }
    if (verdict.status === 'valid') { accept(raw, verdict); return; }
    miss(raw, verdict.reason);
  };

  const accept = (raw: string, verdict: Extract<Verdict, { status: 'valid' }>) => {
    const msLeft = Math.max(0, deadline.current - Date.now());
    setConfirm(null);
    lock(
      { text: verdict.canonical, verdict, ms: Date.now() - shownAt.current, attempts: [...attempts, raw] },
      { kind: 'hit', answer: verdict.canonical, tier: verdict.tier, points: verdict.points, corrected: verdict.corrected, tries: attempts.length + 1, secondsLeft: Math.ceil(msLeft / 1000) },
    );
  };

  const reject = () => {
    if (!confirm) return;
    const raw = confirm.raw;
    setConfirm(null);
    miss(raw, 'not-in-bank', 'OK — not that. Keep going');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!confirm) return;
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'KeyY') { e.preventDefault(); accept(confirm.raw, confirm.verdict); }
      if (e.code === 'Escape' || e.code === 'KeyN' || e.code === 'Backspace') { e.preventDefault(); reject(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const miss = (raw: string, reason: string, override?: string) => {
    // Miss: keep the clock running, let them try again.
    if (attempts.length + 1 >= MAX_ATTEMPTS) { setAttempts((a) => [...a, raw]); timeUp(); return; }
    setAttempts((a) => [...a, raw]);
    setText('');
    const msg = override ?? (reason === 'wrong-letter' && letter ? `Has to start with “${letter.toUpperCase()}”` : REASON_TEXT[reason] || 'Not in our bank — keep going');
    setFeedback({ msg, n: Date.now() });
    setShake((s) => s + 1);
    blip('nope');
  };

  const next = () => {
    setReveal(null);
    setConfirm(null);
    if (answers.length >= prompts.length) { onFinish(answers); return; }
    locked.current = false;
    setI((x) => x + 1);
    setText('');
    setAttempts([]);
    setFeedback(null);
    deadline.current = Date.now() + SECONDS_PER_PROMPT * 1000;
    shownAt.current = Date.now();
    setLeft(SECONDS_PER_PROMPT * 1000);
  };

  const pct = Math.max(0, left / (SECONDS_PER_PROMPT * 1000));
  const theme = THEMES[p.theme];
  const words = p.text.split(' ');
  const reduced = prefersReducedMotion();

  return (
    <div className="ocean relative min-h-[460px] overflow-hidden rounded-3xl border border-[#1d3d55]">
      <Ocean intensity={0.8} />
      {/* draining water line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#7FD8FF]/10 to-transparent transition-[height] duration-100 ease-linear" style={{ height: `${pct * 100}%` }} />
      <div className="relative p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {prompts.map((_, k) => {
              const a = answers[k];
              const c = a ? (a.verdict.status === 'valid' ? TIERS[(a.verdict as { tier: Tier }).tier].color : '#3a3a3a') : k === i ? '#F2F0E9' : 'rgba(255,255,255,0.12)';
              return <motion.span key={k} layout className="h-2 rounded-full" animate={{ width: k === i && !a ? 32 : 18, background: c }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />;
            })}
          </div>
          <TimerRing pct={pct} secs={Math.ceil(Math.max(0, left) / 1000)} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={prompts[i]} initial="hidden" animate="show" exit={{ opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.25 } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }} className="label mb-3 !text-[#7FD8FF]">
              {theme.emoji} {theme.label} · Prompt {i + 1} of {prompts.length}{letter && <span className="ml-2 rounded bg-lime px-1.5 py-0.5 text-ink">Letter twist</span>}
            </motion.div>
            <motion.h2
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
              variants={{ show: { transition: { staggerChildren: reduced ? 0 : 0.06 } } }}
            >
              {words.map((w, k) => (
                <motion.span key={k} className="mr-[0.25em] inline-block" variants={{ hidden: { opacity: 0, y: 18, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 300, damping: 24 } } }}>
                  {w}
                </motion.span>
              ))}
            </motion.h2>
          </motion.div>
        </AnimatePresence>

        <motion.form
          key={shake}
          animate={shake && !reduced ? { x: [0, -10, 9, -6, 4, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="mt-10 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <input
            ref={inputRef}
            className={`input border-white/15 bg-black/30 py-4 text-xl backdrop-blur transition-colors focus:border-[#7FD8FF] ${feedback && Date.now() - feedback.n < 500 ? '!border-signal-red' : ''}`}
            placeholder={letter ? `Starts with ${letter.toUpperCase()}…` : 'Type an answer…'}
            value={text}
            maxLength={48}
            disabled={!!reveal || paused || !!confirm}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setText('')}
            aria-label="Answer"
          />
          <motion.button whileTap={{ scale: 0.95 }} className="btn-lime shrink-0 px-6" disabled={!text.trim() || !!reveal || paused}>Dive</motion.button>
        </motion.form>

        <div className="mt-4 min-h-[60px]">
          <AnimatePresence>
            {confirm && (
              <motion.div key="confirm" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#7FD8FF]/40 bg-[#7FD8FF]/10 px-4 py-3">
                <span className="text-[#bfe9ff]">Did you mean <strong className="capitalize text-paper">{confirm.verdict.canonical}</strong>?</span>
                <span className="text-xs text-paper-mute">(you typed “{confirm.raw}”)</span>
                <span className="ml-auto flex gap-2">
                  <button type="button" className="btn-lime btn-sm" onClick={() => accept(confirm.raw, confirm.verdict)}>Yes <span className="kbd !bg-transparent !text-ink">⏎</span></button>
                  <button type="button" className="btn-ghost btn-sm" onClick={reject}>No <span className="kbd">Esc</span></button>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {feedback && (
              <motion.div key={feedback.n} initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 rounded-full border border-signal-red/40 bg-signal-red/10 px-3 py-1.5 text-sm text-signal-red">
                <span>✕</span>{feedback.msg}
                <span className="text-signal-red/60">· {Math.ceil(Math.max(0, left) / 1000)}s left</span>
              </motion.div>
            )}
          </AnimatePresence>
          {attempts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <AnimatePresence>
                {attempts.map((a, k) => (
                  <motion.span key={a + k} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-paper-mute line-through decoration-signal-red/70">{a}</motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {reveal && <DiveReveal key={`r${i}`} data={reveal} last={answers.length >= prompts.length} onDone={next} />}
        {paused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center backdrop-blur">
            <div>
              <div className="font-display text-4xl font-bold">Paused</div>
              <p className="mt-2 text-sm text-paper-dim">Unlimited dives pause when you leave the tab.</p>
              <button className="btn-lime mt-5" onClick={() => { deadline.current = Date.now() + pausedLeft.current; setPaused(false); }}>Resume</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Results ----------------
function CountUp({ to, className, delay = 0 }: { to: number; className?: string; delay?: number }) {
  const v = useMotionValue(0);
  const t = useTransform(v, (x) => Math.round(x).toLocaleString());
  useEffect(() => { const c = animate(v, to, { duration: prefersReducedMotion() ? 0 : 1.6, delay, ease: [0.2, 0.8, 0.2, 1] }); return c.stop; }, [to, v, delay]);
  return <motion.span className={className}>{t}</motion.span>;
}

function Results({ prompts, answers, mode, day, voided, lbMsg, theme, onAgain }: { prompts: string[]; answers: Answer[]; mode: Mode; day: number; voided: boolean; lbMsg: string | null; theme: ThemeChoice; onAgain?: () => void }) {
  const [view, setView] = useState<'mine' | 'bank'>('mine');
  const total = answers.reduce((s, a) => s + (a.verdict.status === 'valid' ? a.verdict.points : 0), 0);
  const stats = getStats('krillion');
  const zone = zoneFor(total);
  const counts = TIER_ORDER.map((t) => ({ t, n: answers.filter((a) => a.verdict.status === 'valid' && a.verdict.tier === t).length }));
  const emoji = answers.map((a) => (a.verdict.status === 'valid' ? EMOJI[a.verdict.tier] : EMOJI.miss)).join('');
  const title = mode === 'daily' ? `Krillion Daily #${day}` : 'Krillion Unlimited';
  const shareText = `${title} — ${total} pts · ${zone.name} 🐟\n${emoji}\n${typeof window !== 'undefined' ? window.location.origin : ''}/daily/krillion`;
  const colors = answers.map((a) => (a.verdict.status === 'valid' ? TIERS[a.verdict.tier].color : '#2a2a2a'));
  const maxDepth = 700;

  useEffect(() => { if (!voided) blip(total >= 400 ? 'deep' : 'win'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ocean relative overflow-hidden rounded-3xl border border-[#1d3d55] p-6 sm:p-10">
        <Ocean intensity={0.6} />
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto]">
          <div>
            {voided && <div className="mb-4 rounded-xl border border-signal-red/50 bg-signal-red/10 p-4 text-sm text-signal-red">Signal lost — this official run was voided. Unlimited Dive is still open.</div>}
            <div className="label !text-[#7FD8FF]">{title}</div>
            <div className="mt-1 font-display text-sm uppercase tracking-[0.3em] text-[#a9c7d8]">Your catch</div>
            <div className="font-display text-7xl font-black leading-none tracking-tight sm:text-8xl">
              {voided ? '—' : <><CountUp to={total} /><span className="ml-2 text-3xl text-[#7FD8FF]">pts</span></>}
            </div>
            {!voided && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }} className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-sm uppercase tracking-widest" style={{ background: `${zone.color}1f`, color: zone.color }}>
                🐟 You’re a {zone.name} today
              </motion.div>
            )}
            <div className="mt-5 flex gap-1.5 text-2xl">
              {answers.map((a, k) => (
                <motion.span key={k} initial={{ opacity: 0, y: 10, rotate: -20 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.4 + k * 0.09, type: 'spring' }}>
                  {a.verdict.status === 'valid' ? EMOJI[a.verdict.tier] : EMOJI.miss}
                </motion.span>
              ))}
            </div>
            <div className="mt-6 grid max-w-md grid-cols-4 gap-3">
              {counts.map(({ t, n }, k) => (
                <motion.div key={t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + k * 0.08 }} className="rounded-xl border p-2 text-center" style={{ borderColor: `${TIERS[t].color}44`, background: `${TIERS[t].color}10` }}>
                  <div className="font-display text-2xl font-bold" style={{ color: TIERS[t].color }}>{n}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-paper-mute">{TIERS[t].label}</div>
                </motion.div>
              ))}
            </div>
          </div>
          {/* aquarium: one fish per answer, sized and coloured by rarity */}
          <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f3b57]/60 to-[#04101c]/80 md:w-72">
            {answers.map((a, k) => {
              const v = a.verdict.status === 'valid' ? a.verdict : null;
              const size = v ? [34, 44, 54, 0][TIER_ORDER.indexOf(v.tier)] : 26;
              return (
                <motion.div key={k} className="absolute" style={{ top: `${8 + k * 12}%`, left: `${10 + ((k * 23) % 55)}%` }} initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + k * 0.12, duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}>
                  <div className="swimbob flex items-center gap-1.5" style={{ animationDelay: `${-k * 0.3}s` }}>
                    {v?.tier === 'deep' ? <Angler size={70} color={TIERS.deep.color} /> : <Fish size={size} color={v ? TIERS[v.tier].color : '#3a3a3a'} />}
                    <span className="max-w-[90px] truncate font-mono text-[9px] capitalize text-paper-dim">{v ? v.canonical : '—'}</span>
                  </div>
                </motion.div>
              );
            })}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-[repeating-linear-gradient(90deg,#c9a86a22_0_6px,transparent_6px_12px)]" />
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 text-sm">
          <span className="chip !border-white/15">Personal best <span className="text-paper">{stats.best ?? 0} pts</span></span>
          <span className="chip !border-white/15">Daily streak <span className="text-paper">🔥 {stats.streak}</span></span>
          {lbMsg && <span className="chip !border-lime/40 text-lime">{lbMsg}</span>}
          {mode === 'daily' && <span className="chip !border-white/15">Next dive in <ResetCountdown /></span>}
        </div>
        {mode !== 'versus' && !voided && (
          <div className="relative mt-6 flex flex-wrap gap-3">
            <ShareBar text={shareText} card={{ game: 'krillion', title, big: `${total} pts`, sub: `${zone.name} · ${counts.filter((c) => c.n).map((c) => `${c.n} ${TIERS[c.t].label}`).join(' · ')}`, grid: [colors], accent: '#7FD8FF' }} />
            <ChallengeButton game="krillion" settings={{ theme: mode === 'daily' ? 'mixed' : theme }} className="btn border border-white/20 text-paper hover:bg-white/5" />
            {onAgain && <button className="btn-paper" onClick={onAgain}>New dive →</button>}
          </div>
        )}
        {mode === 'versus' && <p className="relative mt-6 text-sm text-[#a9c7d8]">Waiting for your opponent to surface…</p>}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="label">Dive log</div>
          <Segmented size="sm" value={view} onChange={setView} options={[{ id: 'mine', label: 'Your answers' }, { id: 'bank', label: 'What else scored' }]} />
        </div>
        <div className="space-y-2">
          {prompts.map((pid, k) => {
            const p = PROMPT_BY_ID.get(pid)!;
            const a = answers[k];
            const samples = sampleAnswers(pid, 3);
            const valid = a?.verdict.status === 'valid' ? a.verdict : null;
            return (
              <motion.div key={pid} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + k * 0.06 }} className="relative overflow-hidden rounded-xl border border-ink-600 bg-ink-900/60 p-3">
                {valid && <motion.div className="absolute inset-y-0 left-0" style={{ background: `${TIERS[valid.tier].color}14` }} initial={{ width: 0 }} animate={{ width: `${valid.points}%` }} transition={{ delay: 0.7 + k * 0.06, duration: 0.8 }} />}
                <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-paper-dim">{p.text}</div>
                  {view === 'mine' ? (
                    <div className="flex items-center gap-3">
                      {a && a.attempts.length > 1 && <span className="font-mono text-[10px] text-paper-mute">{a.attempts.length} tries</span>}
                      <span className="font-semibold">{valid ? <span className="capitalize">{valid.canonical}</span> : <span className="text-paper-mute">{a?.verdict.status === 'invalid' && a.verdict.reason === 'timeout' ? 'Out of time' : '—'}</span>}</span>
                      {valid ? (
                        <span className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-ink" style={{ background: TIERS[valid.tier].color }}>{TIERS[valid.tier].label} +{valid.points}</span>
                      ) : (
                        <span className="rounded-md border border-ink-500 px-2 py-0.5 font-mono text-[11px] text-paper-mute">+0</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {TIER_ORDER.map((t) => samples[t].slice(0, t === 'deep' ? 2 : 1).map((s) => (
                        <span key={t + s} className="rounded-md px-1.5 py-0.5 capitalize" style={{ background: `${TIERS[t].color}22`, color: TIERS[t].color }}>{s}</span>
                      )))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
