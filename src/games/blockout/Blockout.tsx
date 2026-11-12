'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, TouchPad } from '@/components/kit';
import { generateLevel, type Level } from './gen';
import { applyMove, initState, type BState } from './game';
import { useKeyPress, useMounted } from '@/lib/hooks';
import { load, save } from '@/lib/storage';
import { recordResult } from '@/lib/stats';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

const T = 16;
const KEYMAP: Record<string, 'U' | 'D' | 'L' | 'R'> = { ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R' };
type Progress = { unlocked: number; best: Record<number, { time: number; moves: number }> };

export default function Blockout({ versus }: { versus?: VersusProps }) {
  const mounted = useMounted();
  const [progress, setProgress] = useState<Progress>({ unlocked: 1, best: {} });
  const [levelNo, setLevelNo] = useState(1);
  const [view, setView] = useState<'select' | 'play'>(versus ? 'play' : 'select');
  const level: Level = useMemo(() => (versus ? generateLevel(Number(versus.settings.level) || 8, versus.seed) : generateLevel(levelNo)), [levelNo, versus]);
  const [st, setSt] = useState<BState>(() => initState(level));
  const [history, setHistory] = useState<BState[]>([]);
  const [moves, setMoves] = useState('');
  const [startAt, setStartAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState(false);
  const token = useRef<string | null>(null);
  const reported = useRef(false);

  useEffect(() => { if (mounted) setProgress(load<Progress>('blockout', { unlocked: 1, best: {} })); }, [mounted]);

  const reset = () => {
    setSt(initState(level)); setHistory([]); setMoves(''); setStartAt(0); setElapsed(0); reported.current = false; disp.current = null;
  };
  useEffect(reset, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!startAt || st.status !== 'play') return;
    const id = setInterval(() => setElapsed(Date.now() - startAt), 100);
    return () => clearInterval(id);
  }, [startAt, st.status]);

  const move = (k: 'U' | 'D' | 'L' | 'R') => {
    if (st.status !== 'play') return;
    const next = applyMove(level, st, k);
    if (next === st) return;
    if (!startAt) { setStartAt(Date.now()); if (!versus && levelNo === progress.unlocked) startRun('blockout').then((t) => (token.current = t)); }
    setHistory((h) => [...h, st]);
    setSt(next);
    const m = moves + k;
    setMoves(m);
    if (next.lastPush != null) blip('place'); else blip('type');
    if (next.status === 'won') onWin(m);
    if (next.status === 'trapped' || next.status === 'crushed' || next.status === 'out-of-moves') blip('bad');
  };

  const onWin = (m: string) => {
    blip('win');
    const time = Date.now() - (startAt || Date.now());
    if (versus) { if (!reported.current) { reported.current = true; versus.onDone({ moves: m }); } return; }
    const prev = progress.best[level.id];
    const best = { ...progress.best, [level.id]: { time: prev ? Math.min(prev.time, time) : time, moves: prev ? Math.min(prev.moves, m.length) : m.length } };
    const p = { unlocked: Math.max(progress.unlocked, level.id + 1), best };
    setProgress(p);
    save('blockout', p);
    recordResult('blockout', { score: p.unlocked - 1, mode: 'arcade', win: true });
    submitRun('blockout', token.current, level.id, { level: level.id, moves: m });
    token.current = null;
  };

  const undo = () => {
    if (!history.length) return;
    setSt({ ...history[history.length - 1] });
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m.slice(0, -1));
    blip('select');
  };

  useKeyPress(view === 'play', (code, e) => {
    if (KEYMAP[code]) move(KEYMAP[code]);
    else if (code === 'KeyZ' || code === 'KeyU' || code === 'Backspace') { e.preventDefault(); undo(); }
    else if (code === 'KeyR') reset();
    else if (code === 'Enter' && st.status === 'won' && !versus) { setLevelNo((n) => n + 1); }
  });

  // ------- rendering -------
  const canvas = useRef<HTMLCanvasElement>(null);
  const disp = useRef<{ p: [number, number]; b: [number, number][] } | null>(null);
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || view !== 'play') return;
    const ctx = cv.getContext('2d')!;
    const reduced = prefersReducedMotion();
    let raf = 0;
    const xy = (i: number): [number, number] => [i % level.w, Math.floor(i / level.w)];
    if (!disp.current || disp.current.b.length !== st.boxes.length) disp.current = { p: xy(st.player), b: st.boxes.map(xy) };
    const draw = (now: number) => {
      const d = disp.current!;
      const lerp = (a: [number, number], b: [number, number]): [number, number] => (reduced ? b : [a[0] + (b[0] - a[0]) * 0.35, a[1] + (b[1] - a[1]) * 0.35]);
      d.p = lerp(d.p, xy(st.player));
      d.b = st.boxes.map((bx, i) => lerp(d.b[i] ?? xy(bx), xy(bx)));
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < level.cells.length; i++) {
        const [x, y] = xy(i);
        const c = level.cells[i];
        if (c === 'wall') {
          ctx.fillStyle = '#2a2418'; ctx.fillRect(x * T, y * T, T, T);
          ctx.fillStyle = '#3a3220'; ctx.fillRect(x * T, y * T, T, T - 4);
          ctx.fillStyle = '#4a4028'; ctx.fillRect(x * T + 2, y * T + 2, 5, 3); ctx.fillRect(x * T + 9, y * T + 6, 5, 3);
          continue;
        }
        ctx.fillStyle = (x + y) % 2 ? '#171717' : '#1b1b1b';
        ctx.fillRect(x * T, y * T, T, T);
        if (c === 'trap') {
          ctx.fillStyle = '#2a0d0d'; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
          const on = Math.floor(now / 300) % 2;
          ctx.fillStyle = on ? '#FF3D3D' : '#9a2424';
          for (let k = 0; k < 3; k++) { ctx.fillRect(x * T + 3 + k * 4, y * T + 9, 2, 4); ctx.fillRect(x * T + 3.5 + k * 4, y * T + 6, 1, 3); }
        }
      }
      for (const t of level.targets) {
        const [x, y] = xy(t);
        const filled = st.boxes.includes(t);
        ctx.strokeStyle = filled ? '#C8FF00' : '#FFB800';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.strokeRect(x * T + 2.5, y * T + 2.5, T - 5, T - 5);
        ctx.setLineDash([]);
      }
      d.b.forEach(([x, y], i) => {
        const on = level.targets.includes(st.boxes[i]);
        ctx.fillStyle = '#000'; ctx.fillRect(x * T + 1, y * T + 2, T - 2, T - 2);
        ctx.fillStyle = on ? '#C8FF00' : '#FFB800'; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 3);
        ctx.fillStyle = on ? '#9BC400' : '#c78e00'; ctx.fillRect(x * T + 3, y * T + 3, T - 6, T - 7);
        ctx.fillStyle = on ? '#C8FF00' : '#FFB800'; ctx.fillRect(x * T + 5, y * T + 5, T - 10, T - 11);
      });
      const [px, py] = d.p;
      const dead = st.status === 'trapped';
      ctx.fillStyle = '#000'; ctx.fillRect(px * T + 3, py * T + 2, 10, 12);
      ctx.fillStyle = dead ? '#FF3D3D' : '#F2F0E9'; ctx.fillRect(px * T + 4, py * T + 3, 8, 10);
      ctx.fillStyle = '#0A0A0A'; ctx.fillRect(px * T + 6, py * T + 6, 1, 2); ctx.fillRect(px * T + 9, py * T + 6, 1, 2);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [st, level, view]);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const best = progress.best[level.id];
  const statusMsg = { won: 'Level clear!', trapped: 'Zapped by a trap.', crushed: 'A block fell into a trap.', 'out-of-moves': 'Out of moves.', play: '' }[st.status];

  return (
    <GameFrame
      id="blockout"
      versus={!!versus}
      right={!versus ? <button className="btn-ghost btn-sm" onClick={() => setView('select')}>Levels</button> : null}
      howTo={
        <>
          <p>Push every <span className="text-signal-amber">block</span> onto a <span className="text-signal-amber">target</span>. You can push one block at a time — never pull.</p>
          <p><span className="text-signal-red">Traps</span> zap you if you step on them and destroy any block pushed into them. Some levels have a <strong className="text-paper">move limit</strong>.</p>
          <p>Every level is generated by playing the puzzle backwards from its solution, so each one is guaranteed solvable. Undo freely.</p>
        </>
      }
      controls={[['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['Z', 'Undo'], ['R', 'Restart'], ['Enter', 'Next level']]}
    >
      {view === 'select' && !versus ? (
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="label">Choose a level · {progress.unlocked - 1} cleared</div>
            <ChallengeButton game="blockout" settings={{ level: Math.max(4, Math.min(progress.unlocked, 20)) }} label="Race a friend" className="btn-ghost btn-sm" />
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: Math.max(30, progress.unlocked + 5) }).map((_, i) => {
              const n = i + 1;
              const locked = n > progress.unlocked;
              const b = progress.best[n];
              return (
                <button key={n} disabled={locked} onClick={() => { setLevelNo(n); setView('play'); }} className={`aspect-square rounded-lg border font-pixel text-sm ${b ? 'border-signal-amber/60 bg-signal-amber/10 text-signal-amber' : locked ? 'border-ink-600 text-ink-500' : 'border-ink-500 hover:border-paper'}`}>
                  {locked ? '🔒' : n}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-pixel text-sm">{versus ? 'RACE' : `LV ${level.id}`} · {level.name.toUpperCase()}</div>
            <div className="flex flex-wrap gap-2">
              <span className="chip">Moves <span className="text-paper">{st.moves}{level.moveLimit ? ` / ${level.moveLimit}` : ''}</span></span>
              <span className="chip">Time <span className="text-paper">{fmt(elapsed)}</span></span>
              {best && <span className="chip">Best <span className="text-paper">{fmt(best.time)} · {best.moves}m</span></span>}
            </div>
          </div>
          <div className="game-surface relative mx-auto max-w-xl overflow-hidden rounded-xl border border-ink-600">
            <canvas ref={canvas} width={level.w * T} height={level.h * T} className="pixelated block h-auto w-full" aria-label="Blockout board" />
            {st.status !== 'play' && (
              <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center">
                <div>
                  <div className={`font-pixel text-3xl ${st.status === 'won' ? 'text-lime' : 'text-signal-red'}`}>{statusMsg}</div>
                  {st.status === 'won' && <div className="mt-2 text-sm text-paper-dim">{st.moves} moves · {fmt(elapsed)} · par {level.par}</div>}
                  <div className="mt-4 flex justify-center gap-2">
                    {st.status !== 'won' && <button className="btn-paper" onClick={undo}>Undo</button>}
                    {!(versus && st.status === 'won') && <button className="btn-ghost" onClick={reset}>Restart</button>}
                    {st.status === 'won' && !versus && <button className="btn-lime" onClick={() => setLevelNo((n) => n + 1)}>Next level ⏎</button>}
                  </div>
                  {versus && st.status === 'won' && <div className="mt-3 text-sm text-paper-dim">Waiting for your opponent…</div>}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button className="btn-ghost btn-sm" onClick={undo} disabled={!history.length}>↶ Undo</button>
            <button className="btn-ghost btn-sm" onClick={reset}>Restart</button>
            {!versus && <button className="btn-ghost btn-sm" onClick={() => setHint((h) => !h)}>{hint ? 'Hide' : 'Show'} par</button>}
          </div>
          {hint && !versus && <p className="mt-2 text-center text-xs text-paper-mute">Our reference solution takes {level.par} moves. Can you beat it?</p>}
          <TouchPad onPress={(d) => d !== 'A' && move(d)} />
        </div>
      )}
    </GameFrame>
  );
}
