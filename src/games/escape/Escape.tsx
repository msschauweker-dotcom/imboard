'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, TouchPad, PB, type StickState } from '@/components/kit';
import { generateMaze } from './maze';
import { useHeldKeys, useAutoPause } from '@/lib/hooks';
import { readInput } from '../tag/input';
import { createRng, randomSeed, type Rng } from '@/lib/rng';
import { recordResult, getStats } from '@/lib/stats';
import { blip } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

// ESCAPE — reach the exit. Sentries patrol and, deeper down, hunt you.
const T = 12;
type Ent = { x: number; y: number; fx: number; fy: number; tx: number; ty: number; t: number };
type L = { tiles: string[]; W: number; H: number; enemies: (Ent & { speed: number; chase: number })[]; exit: [number, number]; fog: number; level: number; rng: Rng };

export const VERSUS_LEVELS = 3;

function buildLevel(seed: string, level: number): L {
  const cw = Math.min(19, 6 + level * 2), ch = Math.min(13, 5 + level);
  const m = generateMaze(`${seed}-${level}`, cw, ch, 0.06 + Math.min(0.1, level * 0.01));
  const rng = createRng(`esc:${seed}:${level}`);
  const W = cw * 2 + 1, H = ch * 2 + 1;
  const n = Math.min(9, 1 + Math.floor(level * 0.8));
  const enemies: L['enemies'] = [];
  const open: [number, number][] = [];
  m.tiles.forEach((r, y) => r.split('').forEach((c, x) => c === '.' && x + y > 10 && open.push([x, y])));
  for (let i = 0; i < n && open.length; i++) {
    const [x, y] = open.splice(rng.int(0, open.length - 1), 1)[0];
    enemies.push({ x, y, fx: x, fy: y, tx: x, ty: y, t: 1, speed: 3 + level * 0.35, chase: level >= 3 ? 4 + level : 0 });
  }
  return { tiles: m.tiles, W, H, enemies, exit: [W - 2, H - 2], fog: level >= 4 ? Math.max(4, 9 - (level - 4)) : 0, level, rng };
}

const open = (l: L, x: number, y: number) => l.tiles[y]?.[x] === '.';

function bfsStep(l: L, from: [number, number], to: [number, number], max: number): [number, number] | null {
  const key = (x: number, y: number) => y * l.W + x;
  const prev = new Map<number, number>([[key(...to), -1]]);
  const q: [number, number, number][] = [[to[0], to[1], 0]];
  while (q.length) {
    const [x, y, d] = q.shift()!;
    if (x === from[0] && y === from[1]) {
      const p = prev.get(key(x, y))!;
      return p < 0 ? null : [p % l.W, Math.floor(p / l.W)];
    }
    if (d >= max) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (open(l, nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny, d + 1]); }
    }
  }
  return null;
}

export default function Escape({ versus }: { versus?: VersusProps }) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'clear' | 'over' | 'won'>(versus ? 'play' : 'ready');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rank, setRank] = useState<string | null>(null);
  const seed = useRef(versus?.seed ?? randomSeed());
  const lvl = useRef<L>(buildLevel(seed.current, 1));
  const me = useRef<Ent>({ x: 1, y: 1, fx: 1, fy: 1, tx: 1, ty: 1, t: 1 });
  const total = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(phase === 'play');
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const token = useRef<string | null>(null);
  const hitCd = useRef(0);
  const livesRef = useRef(3);
  const busy = useRef(false);
  useAutoPause(phase === 'play' && !versus, () => setPaused(true));

  const load = (n: number) => {
    lvl.current = buildLevel(seed.current, n);
    me.current = { x: 1, y: 1, fx: 1, fy: 1, tx: 1, ty: 1, t: 1 };
    setLevel(n);
    hitCd.current = 1;
    busy.current = false;
  };
  const start = () => {
    seed.current = versus?.seed ?? randomSeed();
    total.current = 0; setTime(0); setLives(3); livesRef.current = 3; setRank(null); setPaused(false);
    load(1); setPhase('play');
    if (!versus) startRun('escape').then((t) => (token.current = t));
  };
  useEffect(() => { if (versus) start(); }, [versus?.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'play' || versus) return;
    const k = (e: KeyboardEvent) => { if (e.code === 'KeyP' || e.code === 'Escape') setPaused((p) => !p); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [phase, versus]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let raf = 0, last = performance.now(), hud = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const l = lvl.current, p = me.current;
      if (phase === 'play' && !pausedRef.current) {
        total.current += dt;
        hitCd.current = Math.max(0, hitCd.current - dt);
        // player: tile-to-tile with smooth tween
        p.t = Math.min(1, p.t + dt * 9);
        if (p.t >= 1) {
          p.x = p.tx; p.y = p.ty;
          const inp = readInput(held.current, 'both', stick.current);
          let dx = Math.sign(Math.round(inp.x)), dy = Math.sign(Math.round(inp.y));
          if (dx && dy) { if (open(l, p.x + dx, p.y)) dy = 0; else dx = 0; }
          if ((dx || dy) && open(l, p.x + dx, p.y + dy)) { p.fx = p.x; p.fy = p.y; p.tx = p.x + dx; p.ty = p.y + dy; p.t = 0; }
        }
        const px = p.fx + (p.tx - p.fx) * p.t, py = p.fy + (p.ty - p.fy) * p.t;
        // enemies
        for (const e of l.enemies) {
          e.t = Math.min(1, e.t + dt * e.speed);
          if (e.t >= 1) {
            e.x = e.tx; e.y = e.ty;
            let next: [number, number] | null = null;
            if (e.chase) next = bfsStep(l, [e.x, e.y], [p.tx, p.ty], e.chase);
            if (!next) {
              const opts = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => open(l, e.x + dx, e.y + dy));
              const fwd = opts.filter(([dx, dy]) => !(e.x + dx === e.fx && e.y + dy === e.fy));
              const pick = (fwd.length ? fwd : opts);
              const [dx, dy] = pick[Math.floor(l.rng.next() * pick.length)] ?? [0, 0];
              next = [e.x + dx, e.y + dy];
            }
            e.fx = e.x; e.fy = e.y; e.tx = next[0]; e.ty = next[1]; e.t = 0;
          }
          const ex = e.fx + (e.tx - e.fx) * e.t, ey = e.fy + (e.ty - e.fy) * e.t;
          if (hitCd.current === 0 && Math.hypot(ex - px, ey - py) < 0.7) {
            hitCd.current = 1.5;
            blip('bad');
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0 && !busy.current) { busy.current = true; endRun(false); }
            me.current = { x: 1, y: 1, fx: 1, fy: 1, tx: 1, ty: 1, t: 1 };
          }
        }
        if (!busy.current && p.t >= 1 && p.tx === l.exit[0] && p.ty === l.exit[1]) {
          busy.current = true;
          blip('win');
          if (versus && l.level >= VERSUS_LEVELS) { endRun(true); }
          else { setPhase('clear'); setTimeout(() => { load(l.level + 1); setPhase('play'); }, 900); }
        }
        hud += dt;
        if (hud > 0.1) { hud = 0; setTime(total.current); }
      }
      // draw
      ctx.fillStyle = '#06130f';
      ctx.fillRect(0, 0, cv.width, cv.height);
      const px = p.fx + (p.tx - p.fx) * p.t, py = p.fy + (p.ty - p.fy) * p.t;
      for (let y = 0; y < l.H; y++) for (let x = 0; x < l.W; x++) {
        if (l.tiles[y][x] === '#') { ctx.fillStyle = '#0f3d31'; ctx.fillRect(x * T, y * T, T, T); ctx.fillStyle = '#16564a'; ctx.fillRect(x * T, y * T, T, T - 3); }
        else { ctx.fillStyle = (x + y) % 2 ? '#0a1a16' : '#0b1d18'; ctx.fillRect(x * T, y * T, T, T); }
      }
      const pulse = (Math.sin(now / 200) + 1) / 2;
      ctx.fillStyle = `rgba(0,229,168,${0.5 + pulse * 0.5})`;
      ctx.fillRect(l.exit[0] * T + 2, l.exit[1] * T + 2, T - 4, T - 4);
      for (const e of l.enemies) {
        const ex = e.fx + (e.tx - e.fx) * e.t, ey = e.fy + (e.ty - e.fy) * e.t;
        ctx.fillStyle = e.chase && Math.hypot(ex - px, ey - py) < e.chase ? '#FF3D3D' : '#c2410c';
        ctx.fillRect(ex * T + 2, ey * T + 2, T - 4, T - 4);
        ctx.fillStyle = '#000'; ctx.fillRect(ex * T + 4, ey * T + 4, 1, 2); ctx.fillRect(ex * T + 7, ey * T + 4, 1, 2);
      }
      if (hitCd.current === 0 || Math.floor(now / 100) % 2) {
        ctx.fillStyle = '#F2F0E9';
        ctx.fillRect(px * T + 2, py * T + 2, T - 4, T - 4);
        ctx.fillStyle = '#0A0A0A'; ctx.fillRect(px * T + 4, py * T + 4, 1, 2); ctx.fillRect(px * T + 7, py * T + 4, 1, 2);
      }
      if (l.fog) {
        const g = ctx.createRadialGradient(px * T + T / 2, py * T + T / 2, T * 1.5, px * T + T / 2, py * T + T / 2, l.fog * T);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.97)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = `rgba(0,229,168,${0.3 + pulse * 0.4})`; // exit beacon always visible
        ctx.fillRect(l.exit[0] * T + 4, l.exit[1] * T + 4, T - 8, T - 8);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const endRun = (won: boolean) => {
    const ms = Math.round(total.current * 1000);
    const cleared = won ? lvl.current.level : lvl.current.level - 1;
    setPhase(won ? 'won' : 'over');
    if (versus) { versus.onDone({ levels: cleared, ms, finished: won }); return; }
    blip('lose');
    recordResult('escape', { score: cleared, mode: 'arcade' });
    submitRun('escape', token.current, cleared, { ms }).then((r) => r.ok && setRank(`Global #${r.rank}`));
    token.current = null;
  };

  const l = lvl.current;
  const stats = getStats('escape');
  return (
    <GameFrame
      id="escape"
      versus={!!versus}
      right={<PB value={`Lv ${stats.best ?? 0}`} />}
      howTo={<><p>Guide the white square to the glowing <span className="text-[#00E5A8]">exit</span>. Touching a sentry costs a life (3 total) and sends you back to the start.</p><p>From level 3, sentries <span className="text-signal-red">hunt</span> you when you get close. From level 4, the lights go down. Mazes grow every level. Your clock runs the whole way.</p>{versus && <p>Versus: first to clear {VERSUS_LEVELS} levels wins.</p>}</>}
      controls={[['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['P', 'Pause']]}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-pixel text-sm">LEVEL {level}{versus ? ` / ${VERSUS_LEVELS}` : ''}</span>
        <span className="font-mono text-xl tabular-nums">{time.toFixed(1)}s</span>
        <span className="font-pixel text-sm text-signal-red">{'♥'.repeat(Math.max(0, lives))}</span>
      </div>
      <div className="game-surface relative mx-auto overflow-hidden rounded-xl border border-ink-600">
        <canvas ref={canvas} width={l.W * T} height={l.H * T} className="pixelated block h-auto w-full" aria-label="Escape maze" />
        {phase === 'ready' && <div className="absolute inset-0 grid place-items-center bg-ink/80"><div className="text-center"><div className="font-pixel text-3xl">ESCAPE</div><button className="btn-lime mt-4" onClick={start}>Start</button></div></div>}
        {phase === 'clear' && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="rounded-lg bg-ink/80 px-4 py-2 font-pixel text-2xl text-[#00E5A8]">LEVEL {level} CLEAR</div></div>}
        {paused && phase === 'play' && <div className="absolute inset-0 grid place-items-center bg-ink/80"><button className="btn-lime" onClick={() => setPaused(false)}>Resume</button></div>}
        {(phase === 'over' || phase === 'won') && (
          <div className="absolute inset-0 grid place-items-center bg-ink/85 p-4 text-center">
            <div>
              <div className="font-pixel text-2xl">{phase === 'won' ? 'ESCAPED!' : 'CAUGHT'}</div>
              <div className="mt-2 text-paper-dim">{phase === 'won' ? `${VERSUS_LEVELS} levels` : `${level - 1} level${level - 1 === 1 ? '' : 's'} cleared`} · {time.toFixed(1)}s</div>
              {rank && <div className="mt-1 text-sm text-lime">{rank}</div>}
              {versus ? <div className="mt-4 text-sm text-paper-dim">Waiting for your opponent…</div> : (
                <div className="mt-4 flex justify-center gap-2"><button className="btn-lime" onClick={start}>Again</button><ChallengeButton game="escape" label="Race a friend" className="btn-ghost" /></div>
              )}
            </div>
          </div>
        )}
      </div>
      <TouchPad stick={stick} />
    </GameFrame>
  );
}
