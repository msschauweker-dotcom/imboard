'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, TouchPad, PB, type StickState } from '@/components/kit';
import { useHeldKeys, useAutoPause } from '@/lib/hooks';
import { readInput } from '../tag/input';
import { createRng, randomSeed, type Rng } from '@/lib/rng';
import { recordResult, getStats } from '@/lib/stats';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import type { VersusProps } from '@/lib/versus';

// DODGE — survive the arena. Seeded hazard schedule so versus runs are identical.
const S = 320;
type Hazard =
  | { k: 'fall'; x: number; y: number; w: number; h: number; vy: number; warn: number }
  | { k: 'shot'; x: number; y: number; vx: number; vy: number; r: number; warn: number }
  | { k: 'bar'; x: number; y: number; w: number; h: number; vx: number; vy: number; warn: number }
  | { k: 'ring'; x: number; y: number; r: number; max: number; grow: number; warn: number; life: number };
type World = { t: number; px: number; py: number; hz: Hazard[]; spawn: number; rng: Rng; dead: boolean; particles: { x: number; y: number; vx: number; vy: number; l: number }[] };

const newWorld = (seed: string): World => ({ t: 0, px: S / 2, py: S / 2, hz: [], spawn: 1, rng: createRng(`dodge:${seed}`), dead: false, particles: [] });

function spawn(w: World) {
  const r = w.rng;
  const lvl = Math.min(1, w.t / 90); // 0 → 1 over 90 s
  const kinds = ['fall', 'fall', 'shot', ...(w.t > 10 ? ['bar'] : []), ...(w.t > 20 ? ['ring', 'shot'] : [])];
  const k = r.pick(kinds);
  const speed = 1 + lvl * 1.4;
  if (k === 'fall') {
    const n = 1 + Math.floor(r.next() * (1 + lvl * 3));
    for (let i = 0; i < n; i++) { const s = 14 + r.int(0, 16); w.hz.push({ k: 'fall', x: r.int(0, S - s), y: -s, w: s, h: s, vy: (70 + r.int(0, 60)) * speed, warn: 0.6 }); }
  } else if (k === 'shot') {
    const side = r.int(0, 3);
    const x = side === 0 ? -8 : side === 1 ? S + 8 : r.int(0, S);
    const y = side === 2 ? -8 : side === 3 ? S + 8 : r.int(0, S);
    const ang = Math.atan2(w.py - y, w.px - x) + (r.next() - 0.5) * 0.3;
    const v = (110 + r.int(0, 50)) * speed;
    w.hz.push({ k: 'shot', x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 5, warn: 0.45 });
  } else if (k === 'bar') {
    const horiz = r.chance(0.5);
    const v = (60 + r.int(0, 40)) * speed * (r.chance(0.5) ? 1 : -1);
    if (horiz) w.hz.push({ k: 'bar', x: v > 0 ? -12 : S, y: r.int(20, S - 80), w: 12, h: 50 + r.int(0, 50), vx: v, vy: 0, warn: 0.8 });
    else w.hz.push({ k: 'bar', x: r.int(20, S - 80), y: v > 0 ? -12 : S, w: 50 + r.int(0, 50), h: 12, vx: 0, vy: v, warn: 0.8 });
  } else {
    w.hz.push({ k: 'ring', x: r.int(40, S - 40), y: r.int(40, S - 40), r: 0, max: 40 + r.int(0, 30) + lvl * 30, grow: 90, warn: 1, life: 1.2 });
  }
  w.spawn = Math.max(0.28, 1.1 - lvl * 0.75) * (0.7 + r.next() * 0.6);
}

const P = 5; // player half-size
function hits(w: World): boolean {
  for (const h of w.hz) {
    if (h.warn > 0) continue;
    if (h.k === 'fall' || h.k === 'bar') { if (w.px + P > h.x && w.px - P < h.x + h.w && w.py + P > h.y && w.py - P < h.y + h.h) return true; }
    else if (h.k === 'shot') { if (Math.hypot(w.px - h.x, w.py - h.y) < h.r + P - 1) return true; }
    else if (h.k === 'ring') { if (Math.hypot(w.px - h.x, w.py - h.y) < h.r + P - 2) return true; }
  }
  return false;
}

export default function Dodge({ versus }: { versus?: VersusProps }) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>(versus ? 'play' : 'ready');
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [result, setResult] = useState<{ t: number; best: boolean; rank?: string } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(newWorld(versus?.seed ?? 'x'));
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(phase === 'play');
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const token = useRef<string | null>(null);
  useAutoPause(phase === 'play' && !versus, () => setPaused(true));

  const start = () => {
    world.current = newWorld(versus?.seed ?? randomSeed());
    setResult(null); setTime(0); setPaused(false); setPhase('play');
    if (!versus) startRun('dodge').then((t) => (token.current = t));
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
    const reduced = prefersReducedMotion();
    let raf = 0, last = performance.now(), hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = world.current;
      if (phase === 'play' && !pausedRef.current && !w.dead) {
        w.t += dt;
        const inp = readInput(held.current, 'both', stick.current);
        const sp = 150;
        const l = Math.hypot(inp.x, inp.y) || 1;
        w.px = Math.max(P, Math.min(S - P, w.px + (inp.x / l) * sp * dt * Math.min(1, Math.hypot(inp.x, inp.y))));
        w.py = Math.max(P, Math.min(S - P, w.py + (inp.y / l) * sp * dt * Math.min(1, Math.hypot(inp.x, inp.y))));
        w.spawn -= dt;
        if (w.spawn <= 0) spawn(w);
        for (const h of w.hz) {
          if (h.warn > 0) { h.warn -= dt; continue; }
          if (h.k === 'fall') h.y += h.vy * dt;
          else if (h.k === 'shot' || h.k === 'bar') { h.x += h.vx * dt; h.y += h.vy * dt; }
          else { h.r = Math.min(h.max, h.r + h.grow * dt); if (h.r >= h.max) h.life -= dt; }
        }
        w.hz = w.hz.filter((h) => (h.k === 'ring' ? h.life > 0 : h.x > -120 && h.x < S + 120 && h.y > -120 && h.y < S + 120));
        if (hits(w)) {
          w.dead = true;
          blip('lose');
          for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 120; w.particles.push({ x: w.px, y: w.py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0.8 }); }
          finish(w.t);
        }
        hudT += dt;
        if (hudT > 0.05) { hudT = 0; setTime(w.t); }
      }
      for (const p of w.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; }
      w.particles = w.particles.filter((p) => p.l > 0);
      // draw
      ctx.fillStyle = '#0d0808';
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = 'rgba(255,61,61,0.06)';
      for (let i = 0; i <= S; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke(); }
      const pulse = (Math.sin(now / 80) + 1) / 2;
      for (const h of w.hz) {
        if (h.warn > 0) {
          ctx.fillStyle = `rgba(255,61,61,${0.12 + pulse * 0.2})`;
          if (h.k === 'fall') ctx.fillRect(h.x, 0, h.w, 4);
          else if (h.k === 'shot') { ctx.beginPath(); ctx.arc(Math.max(4, Math.min(S - 4, h.x)), Math.max(4, Math.min(S - 4, h.y)), 6, 0, 7); ctx.fill(); }
          else if (h.k === 'bar') ctx.fillRect(h.vx ? (h.vx > 0 ? 0 : S - 4) : h.x, h.vy ? (h.vy > 0 ? 0 : S - 4) : h.y, h.vx ? 4 : h.w, h.vy ? 4 : h.h);
          else { ctx.strokeStyle = `rgba(255,61,61,${0.3 + pulse * 0.4})`; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(h.x, h.y, h.max, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
          continue;
        }
        ctx.fillStyle = '#FF3D3D';
        if (h.k === 'fall' || h.k === 'bar') { ctx.fillRect(h.x, h.y, h.w, h.h); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(h.x, h.y, h.w, 2); }
        else if (h.k === 'shot') { ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,61,61,0.3)'; ctx.beginPath(); ctx.arc(h.x - h.vx * 0.04, h.y - h.vy * 0.04, h.r * 0.8, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(255,61,61,0.35)'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#FF3D3D'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
      }
      if (!w.dead) {
        ctx.fillStyle = '#F2F0E9';
        ctx.fillRect(w.px - P, w.py - P, P * 2, P * 2);
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(w.px - 2, w.py - 2, 1, 2); ctx.fillRect(w.px + 1, w.py - 2, 1, 2);
      }
      ctx.fillStyle = '#F2F0E9';
      for (const p of w.particles) ctx.fillRect(p.x, p.y, 2, 2);
      if (reduced) { /* no screen effects */ }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (t: number) => {
    const ms = Math.round(t * 1000);
    if (versus) { versus.onDone({ survivedMs: ms }); setTimeout(() => setPhase('over'), 600); setResult({ t, best: false }); return; }
    const { newBest } = recordResult('dodge', { score: Math.round(t * 100) / 100, mode: 'arcade' });
    setResult({ t, best: newBest });
    setTimeout(() => setPhase('over'), 600);
    submitRun('dodge', token.current, ms).then((r) => r.ok && setResult((x) => (x ? { ...x, rank: `Global #${r.rank}` } : x)));
    token.current = null;
  };

  const stats = getStats('dodge');
  return (
    <GameFrame
      id="dodge"
      versus={!!versus}
      right={<PB value={`${(stats.best ?? 0).toFixed(2)}s`} />}
      howTo={
        <>
          <p>Stay alive. Red is death: <strong className="text-paper">falling blocks</strong>, <strong className="text-paper">projectiles</strong> aimed at you, <strong className="text-paper">sweeping bars</strong> and <strong className="text-paper">expanding zones</strong>.</p>
          <p>Every hazard flashes a warning before it becomes dangerous. The longer you survive, the faster and denser it gets.</p>
          <p>Switching tabs pauses the game — no penalty.</p>
        </>
      }
      controls={[['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['P', 'Pause']]}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-3xl font-bold tabular-nums text-signal-red">{time.toFixed(2)}s</span>
        {!versus && <ChallengeButton game="dodge" label="Challenge" className="btn-ghost btn-sm" />}
      </div>
      <div className="game-surface relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-xl border border-ink-600">
        <canvas ref={canvas} width={S} height={S} className="block h-full w-full" aria-label="Dodge arena" />
        {phase === 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80 text-center">
            <div>
              <div className="font-display text-4xl font-bold">DODGE</div>
              <p className="mt-2 text-sm text-paper-dim">Survive as long as you can.</p>
              <button className="btn-lime mt-5 px-8" onClick={start}>Start</button>
            </div>
          </div>
        )}
        {paused && phase === 'play' && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80">
            <button className="btn-lime" onClick={() => setPaused(false)}>Resume</button>
          </div>
        )}
        {phase === 'over' && result && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center">
            <div>
              <div className="label text-signal-red">{result.best ? 'New personal best' : 'You were hit'}</div>
              <div className="font-display text-6xl font-bold">{result.t.toFixed(2)}s</div>
              {result.rank && <div className="mt-1 text-sm text-lime">{result.rank}</div>}
              {versus ? <div className="mt-4 text-sm text-paper-dim">Waiting for your opponent…</div> : (
                <div className="mt-5 flex justify-center gap-2">
                  <button className="btn-lime" onClick={start}>Again</button>
                  <ChallengeButton game="dodge" label="Challenge a friend" className="btn-ghost" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <TouchPad stick={stick} />
    </GameFrame>
  );
}
