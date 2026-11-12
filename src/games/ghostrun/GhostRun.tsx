'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFrame, TouchPad, type StickState } from '@/components/kit';
import { Segmented } from '@/components/ui';
import { course, ghostAt, validGhost, encodeGhost, decodeGhost, open, STEP_MS, DIRS, type Ghost, type Step } from './ghost';
import { useHeldKeys, useCopy, useMounted, usePlayer } from '@/lib/hooks';
import { readInput } from '../tag/input';
import { load, save } from '@/lib/storage';
import { recordResult } from '@/lib/stats';
import { puzzleNumber } from '@/lib/daily';
import { blip } from '@/lib/sound';

const T = 14;
type Phase = 'ready' | 'count' | 'run' | 'done';

export default function GhostRun() {
  const mounted = useMounted();
  const player = usePlayer();
  const [copied, copy] = useCopy();
  const [courseId, setCourseId] = useState<string>('daily-0');
  const [friend, setFriend] = useState<Ghost | null>(null);
  const [friendErr, setFriendErr] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<'mine' | 'friend' | 'none'>('mine');
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(3);
  const [time, setTime] = useState(0);
  const [result, setResult] = useState<{ ms: number; ghostMs: number | null; best: boolean; myGhost: Ghost } | null>(null);
  const [tick, setTick] = useState(0);
  const c = useMemo(() => course(courseId), [courseId]);
  const myBest = useMemo(() => (mounted ? load<Ghost | null>(`ghost:${courseId}`, null) : null), [courseId, mounted, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const ghost: Ghost | null = opponent === 'friend' && friend?.course === courseId ? friend : opponent === 'mine' ? myBest : null;

  // Daily course + friend ghost from the link (#g=…)
  useEffect(() => {
    if (!mounted) return;
    const day = puzzleNumber();
    const m = window.location.hash.match(/g=([^&]+)/);
    if (m) {
      const g = decodeGhost(m[1]);
      if (g && validGhost(course(g.course), g)) { setFriend(g); setCourseId(g.course); setOpponent('friend'); }
      else setFriendErr('That ghost link is broken or was tampered with.');
    } else setCourseId(`daily-${day}`);
  }, [mounted]);

  const canvas = useRef<HTMLCanvasElement>(null);
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(phase === 'run' || phase === 'count');
  const run = useRef({ go: 0, steps: [] as Step[], x: 1, y: 1, cur: null as Step | null, finished: false });

  const start = () => {
    run.current = { go: 0, steps: [], x: c.start[0], y: c.start[1], cur: null, finished: false };
    setResult(null); setTime(0); setCount(3); setPhase('count');
    let n = 3;
    blip('tick');
    const id = setInterval(() => {
      n--;
      if (n > 0) { setCount(n); blip('tick'); }
      else { clearInterval(id); run.current.go = performance.now(); setPhase('run'); blip('go'); }
    }, 700);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Enter' && (phase === 'ready' || phase === 'done')) { e.preventDefault(); start(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let raf = 0, hud = 0, last = performance.now();
    const trail: { x: number; y: number }[] = [];
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      const r = run.current;
      const el = phase === 'run' ? now - r.go : 0;
      if (phase === 'run' && !r.finished) {
        // advance the current step; chain the next one while a key is held
        if (r.cur && el >= r.cur.t + STEP_MS) { r.x += DIRS[r.cur.d][0]; r.y += DIRS[r.cur.d][1]; r.cur = null; if (r.x === c.finish[0] && r.y === c.finish[1]) finish(Math.round(r.steps[r.steps.length - 1].t + STEP_MS)); }
        if (!r.cur && !r.finished) {
          const inp = readInput(held.current, 'both', stick.current);
          const opts: Step['d'][] = [];
          if (inp.x > 0.3) opts.push('R'); if (inp.x < -0.3) opts.push('L'); if (inp.y > 0.3) opts.push('D'); if (inp.y < -0.3) opts.push('U');
          const d = opts.find((o) => open(c, r.x + DIRS[o][0], r.y + DIRS[o][1]));
          if (d) {
            const prev = r.steps[r.steps.length - 1];
            const t = Math.max(Math.round(el), prev ? prev.t + STEP_MS : 0);
            r.cur = { t, d }; r.steps.push(r.cur);
          }
        }
        hud += dt;
        if (hud > 0.05) { hud = 0; setTime(el); }
      }
      // draw
      ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) {
        if (c.tiles[y][x] === '#') { ctx.fillStyle = '#1c1c2e'; ctx.fillRect(x * T, y * T, T, T); ctx.fillStyle = '#27274a'; ctx.fillRect(x * T, y * T, T, T - 3); }
        else { ctx.fillStyle = (x + y) % 2 ? '#10101a' : '#12121e'; ctx.fillRect(x * T, y * T, T, T); }
      }
      // start + finish
      ctx.fillStyle = 'rgba(242,240,233,0.15)'; ctx.fillRect(c.start[0] * T, c.start[1] * T, T, T);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#F2F0E9' : '#0A0A0A'; ctx.fillRect(c.finish[0] * T + i * (T / 4), c.finish[1] * T + j * (T / 4), T / 4, T / 4); }
      // ghost
      if (ghost) {
        const gp = ghostAt(c, ghost, phase === 'run' ? el : phase === 'done' && result ? result.ms : 0);
        trail.unshift({ x: gp.x, y: gp.y }); if (trail.length > 10) trail.pop();
        trail.forEach((p, i) => { ctx.fillStyle = `rgba(200,255,0,${0.18 - i * 0.016})`; ctx.fillRect(p.x * T + 3, p.y * T + 3, T - 6, T - 6); });
        ctx.globalAlpha = 0.55 + Math.sin(now / 150) * 0.1;
        ctx.fillStyle = '#C8FF00'; ctx.fillRect(gp.x * T + 2, gp.y * T + 2, T - 4, T - 4);
        ctx.fillStyle = '#0A0A0A'; ctx.fillRect(gp.x * T + 4, gp.y * T + 5, 2, 2); ctx.fillRect(gp.x * T + 8, gp.y * T + 5, 2, 2);
        ctx.globalAlpha = 1;
      }
      // player
      let px = r.x, py = r.y;
      if (r.cur && phase === 'run') { const k = Math.max(0, Math.min(1, (el - r.cur.t) / STEP_MS)); px += DIRS[r.cur.d][0] * k; py += DIRS[r.cur.d][1] * k; }
      ctx.fillStyle = '#F2F0E9'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
      ctx.fillRect(px * T + 2, py * T + 2, T - 4, T - 4); ctx.shadowBlur = 0;
      ctx.fillStyle = '#0A0A0A'; ctx.fillRect(px * T + 4, py * T + 5, 2, 2); ctx.fillRect(px * T + 8, py * T + 5, 2, 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, c, ghost]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (ms: number) => {
    const r = run.current;
    if (r.finished) return;
    r.finished = true;
    const g: Ghost = { v: 1, course: c.id, name: player?.name ?? 'Guest', ms, steps: r.steps.slice() };
    const prev = load<Ghost | null>(`ghost:${c.id}`, null);
    const best = !prev || ms < prev.ms;
    if (best) save(`ghost:${c.id}`, g);
    recordResult('ghostrun', { score: ms / 1000, mode: 'arcade', lowerIsBetter: true, win: ghost ? ms < ghost.ms : true });
    setResult({ ms, ghostMs: ghost?.ms ?? null, best, myGhost: g });
    setTime(ms);
    setPhase('done');
    setTick((x) => x + 1);
    blip(ghost && ms < ghost.ms ? 'win' : 'good');
  };

  const shareLink = (g: Ghost) => `${window.location.origin}${window.location.pathname}#g=${encodeGhost(g)}`;
  const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
  const day = mounted ? puzzleNumber() : 0;

  return (
    <GameFrame
      id="ghostrun"
      right={myBest ? <span className="chip">Your best <span className="text-paper">{fmt(myBest.ms)}</span></span> : null}
      howTo={<><p>Race from the start (top-left) to the checkered flag. A <span className="text-lime">ghost</span> replays a previous run frame by frame — your own best, or a friend’s.</p><p>Finish a run, then <strong className="text-paper">share your ghost</strong>: the link carries your whole run, so your friend races the exact replay. Ghost links are verified — a tampered or impossible run is rejected.</p><p>There’s a new daily course every day, plus numbered courses that get bigger.</p></>}
      controls={[['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['Enter', 'Start / retry']]}
    >
      {friendErr && <div className="mb-3 rounded-xl border border-signal-red/40 bg-signal-red/10 p-3 text-sm text-signal-red">{friendErr}</div>}
      {friend && <div className="mb-3 rounded-xl border border-lime/30 bg-lime/10 p-3 text-sm text-lime">👻 {friend.name} challenged you on {course(friend.course).name} — their time: {fmt(friend.ms)}</div>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto !py-2 text-sm" value={courseId} disabled={phase === 'run' || phase === 'count'} onChange={(e) => { setCourseId(e.target.value); setPhase('ready'); setResult(null); }} aria-label="Course">
            <option value={`daily-${day}`}>Daily course #{day}</option>
            {friend && !friend.course.startsWith('daily-') === false && friend.course !== `daily-${day}` && <option value={friend.course}>{course(friend.course).name} (friend)</option>}
            {Array.from({ length: 12 }).map((_, i) => <option key={i} value={`c${i + 1}`}>Course {i + 1}</option>)}
            {friend && /^c\d+$/.test(friend.course) && Number(friend.course.slice(1)) > 12 && <option value={friend.course}>{course(friend.course).name}</option>}
          </select>
          <Segmented size="sm" value={opponent} onChange={setOpponent} options={[{ id: 'mine', label: 'My ghost' }, ...(friend ? [{ id: 'friend' as const, label: `${friend.name}’s ghost` }] : []), { id: 'none', label: 'No ghost' }]} />
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums">{fmt(time)}</span>
      </div>
      <div className="game-surface relative overflow-hidden rounded-xl border border-ink-600">
        <canvas ref={canvas} width={c.W * T} height={c.H * T} className="pixelated block h-auto w-full" aria-label="Ghost Run course" />
        {phase === 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-ink/75 text-center">
            <div>
              <div className="font-pixel text-3xl">GHOST RUN</div>
              <div className="mt-2 text-sm text-paper-dim">{ghost ? `Racing ${ghost === friend ? friend.name : 'your best'} · ${fmt(ghost.ms)}` : opponent === 'mine' ? 'No ghost yet — set a time to race next' : 'Solo time trial'}</div>
              <button className="btn-lime mt-4" onClick={start}>Start ⏎</button>
            </div>
          </div>
        )}
        {phase === 'count' && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="font-pixel text-7xl drop-shadow-[0_4px_0_#000]">{count}</div></div>}
        {phase === 'done' && result && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center">
            <div>
              <div className="label">{result.best ? 'New best on this course' : 'Finished'}</div>
              <div className="font-display text-5xl font-bold">{fmt(result.ms)}</div>
              {result.ghostMs != null && (
                <div className={`mt-1 font-semibold ${result.ms < result.ghostMs ? 'text-lime' : 'text-signal-red'}`}>
                  {result.ms < result.ghostMs ? `Beat the ghost by ${fmt(result.ghostMs - result.ms)}` : result.ms === result.ghostMs ? 'Dead heat!' : `Ghost wins by ${fmt(result.ms - result.ghostMs)}`}
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button className="btn-lime" onClick={start}>Race again ⏎</button>
                <button className="btn-paper" onClick={() => copy(shareLink(result.best ? result.myGhost : myBest ?? result.myGhost))}>{copied ? 'Link copied ✓' : '👻 Share my ghost'}</button>
              </div>
              <p className="mt-2 text-xs text-paper-mute">The link contains your best run on this course.</p>
            </div>
          </div>
        )}
      </div>
      <TouchPad stick={stick} />
    </GameFrame>
  );
}
