'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ShareBar, PB } from '@/components/kit';
import { newWorld, step, flip, colAt, meters, W, H, COL, TOP, BOT, P, type World } from './world';
import { recordResult, getStats } from '@/lib/stats';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import { randomSeed } from '@/lib/rng';
import { useAutoPause } from '@/lib/hooks';

type Trail = { x: number; y: number; a: number };
type Spark = { x: number; y: number; vx: number; vy: number; l: number; c: string };

export default function Pivot() {
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [paused, setPaused] = useState(false);
  const [dist, setDist] = useState(0);
  const [result, setResult] = useState<{ m: number; best: boolean; rank?: string } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(newWorld('x'));
  const trail = useRef<Trail[]>([]);
  const sparks = useRef<Spark[]>([]);
  const shake = useRef(0);
  const token = useRef<string | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  useAutoPause(phase === 'play', () => setPaused(true));

  const start = () => {
    world.current = newWorld(randomSeed());
    trail.current = []; sparks.current = [];
    setResult(null); setDist(0); setPaused(false); setPhase('play');
    startRun('pivot').then((t) => (token.current = t));
  };

  const press = () => {
    if (phase === 'ready' || phase === 'over') { if (phase === 'ready' || result) start(); return; }
    if (paused) { setPaused(false); return; }
    flip(world.current);
    blip('select');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) press(); }
      if ((e.code === 'KeyP' || e.code === 'Escape') && phase === 'play') setPaused((p) => !p);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const reduced = prefersReducedMotion();
    let raf = 0, last = performance.now(), hud = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = world.current;
      if (phase === 'play' && !pausedRef.current && !w.dead) {
        // sub-step for stable collisions at high speed
        for (let i = 0; i < 2; i++) {
          if (step(w, dt / 2) === 'dead') {
            blip('lose');
            if (!reduced) shake.current = 8;
            for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; sparks.current.push({ x: 80, y: w.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0.9, c: k % 2 ? '#C8FF00' : '#F2F0E9' }); }
            finish(meters(w));
            break;
          }
        }
        trail.current.unshift({ x: 80, y: w.y, a: 1 });
        if (trail.current.length > 14) trail.current.pop();
        hud += dt;
        if (hud > 0.08) { hud = 0; setDist(meters(w)); }
      }
      for (const t of trail.current) { t.x -= w.speed * dt; t.a *= 0.86; }
      for (const s of sparks.current) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.l -= dt; }
      sparks.current = sparks.current.filter((s) => s.l > 0);
      shake.current = Math.max(0, shake.current - dt * 30);
      draw(ctx, w, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = (ctx: CanvasRenderingContext2D, w: World, now: number) => {
    const hue = (200 + w.t * 6) % 360;
    ctx.save();
    if (shake.current) ctx.translate((Math.random() - 0.5) * shake.current, (Math.random() - 0.5) * shake.current);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `hsl(${hue} 40% 9%)`);
    bg.addColorStop(1, `hsl(${(hue + 40) % 360} 40% 6%)`);
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    // parallax stripes
    ctx.fillStyle = `hsla(${hue} 80% 70% / 0.05)`;
    for (let i = 0; i < 8; i++) { const x = ((i * 70 - w.dist * 0.3) % (W + 70) + W + 70) % (W + 70) - 70; ctx.fillRect(x, TOP, 26, BOT - TOP); }
    // surfaces
    const accent = `hsl(${hue} 90% 65%)`;
    for (let i = 0; i < w.cols.length; i++) {
      const x = i * COL - w.scroll;
      const c = w.cols[i];
      drawSurface(ctx, x, BOT, c.floor, accent, 1);
      drawSurface(ctx, x, TOP, c.ceil, accent, -1);
      if (c.block === 'low') { ctx.fillStyle = '#FF3D3D'; ctx.fillRect(x + 2, BOT - 70, COL - 4, 70); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 2, BOT - 70, COL - 4, 3); }
      if (c.block === 'high') { ctx.fillStyle = '#FF3D3D'; ctx.fillRect(x + 2, TOP, COL - 4, 70); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, TOP + 67, COL - 4, 3); }
    }
    // trail
    for (const t of trail.current) { ctx.fillStyle = `rgba(200,255,0,${t.a * 0.35})`; ctx.fillRect(t.x - P * 0.7, t.y - P * 0.7, P * 1.4, P * 1.4); }
    // player
    if (!w.dead) {
      const squash = Math.min(0.35, Math.abs(w.vy) / 1800);
      const pw = P * 2 * (1 - squash * 0.5), ph = P * 2 * (1 + squash);
      ctx.fillStyle = '#C8FF00';
      ctx.shadowColor = '#C8FF00'; ctx.shadowBlur = 16;
      ctx.fillRect(80 - pw / 2, w.y - ph / 2, pw, ph);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0A0A0A';
      const ey = w.g === 1 ? -3 : 1;
      ctx.fillRect(80 + 1, w.y + ey, 2, 3); ctx.fillRect(80 + 5, w.y + ey, 2, 3);
    }
    for (const s of sparks.current) { ctx.fillStyle = s.c; ctx.globalAlpha = Math.min(1, s.l * 1.5); ctx.fillRect(s.x, s.y, 3, 3); }
    ctx.globalAlpha = 1;
    // gravity indicator
    ctx.fillStyle = 'rgba(242,240,233,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(w.g === 1 ? '▼ GRAVITY' : '▲ GRAVITY', 10, H - 8);
    void now; void colAt;
    ctx.restore();
  };

  const finish = (m: number) => {
    const { newBest } = recordResult('pivot', { score: m, mode: 'arcade' });
    setResult({ m, best: newBest });
    setTimeout(() => setPhase('over'), 700);
    submitRun('pivot', token.current, m).then((r) => r.ok && setResult((x) => (x ? { ...x, rank: `Global #${r.rank}` } : x)));
    token.current = null;
  };

  const stats = getStats('pivot');
  return (
    <GameFrame
      id="pivot"
      right={<PB value={`${stats.best ?? 0}m`} />}
      howTo={<><p>You run automatically. <strong className="text-paper">One button flips gravity</strong> — you snap between the floor and the ceiling.</p><p>Spikes, gaps and red blocks will end your run. The course always leaves you a way through, but it keeps getting faster.</p></>}
      controls={[['Space', 'Flip gravity'], ['Click / tap', 'Flip gravity'], ['P', 'Pause']]}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-3xl font-bold tabular-nums text-[#7FD8FF]">{dist}m</span>
        <span className="font-mono text-xs text-paper-mute">Best {stats.best ?? 0}m</span>
      </div>
      <div className="game-surface relative cursor-pointer overflow-hidden rounded-2xl border border-ink-600" onPointerDown={(e) => { e.preventDefault(); press(); }}>
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" aria-label="Pivot course" />
        {phase === 'ready' && <div className="absolute inset-0 grid place-items-center bg-ink/70"><div className="text-center"><div className="font-display text-5xl font-bold">PIVOT</div><div className="mt-2 text-sm text-paper-dim">Tap or press Space to start — and to flip</div></div></div>}
        {paused && phase === 'play' && <div className="absolute inset-0 grid place-items-center bg-ink/80"><div className="text-center"><div className="font-display text-3xl font-bold">Paused</div><div className="mt-1 text-sm text-paper-dim">Tap to resume</div></div></div>}
        {phase === 'over' && result && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center" onPointerDown={(e) => e.stopPropagation()}>
            <div>
              <div className="label">{result.best ? 'New personal best' : 'Run over'}</div>
              <div className="font-display text-6xl font-bold">{result.m}m</div>
              {result.rank && <div className="mt-1 text-sm text-lime">{result.rank}</div>}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button className="btn-lime" onClick={start}>Again</button>
                <ShareBar text={`OFFGRID Pivot ↕ ${result.m}m`} card={{ game: 'pivot', title: 'Pivot', big: `${result.m}m`, accent: '#7FD8FF' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  );
}

function drawSurface(ctx: CanvasRenderingContext2D, x: number, y: number, kind: string, accent: string, dir: 1 | -1) {
  if (kind === 'gap') return;
  const thick = 28;
  ctx.fillStyle = '#151515';
  ctx.fillRect(x, dir === 1 ? y : y - thick, COL, thick);
  ctx.fillStyle = accent;
  ctx.fillRect(x, dir === 1 ? y : y - 2, COL, 2);
  if (kind === 'spike') {
    ctx.fillStyle = '#FF3D3D';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      const bx = x + i * 10;
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + 5, y - dir * 11);
      ctx.lineTo(bx + 10, y);
      ctx.fill();
    }
  }
}
