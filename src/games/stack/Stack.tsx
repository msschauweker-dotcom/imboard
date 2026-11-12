'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, ShareBar, PB } from '@/components/kit';
import { recordResult, getStats } from '@/lib/stats';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { startRun, submitRun } from '@/lib/leaderboard';
import { createRng, randomSeed } from '@/lib/rng';
import type { VersusProps } from '@/lib/versus';

// STACK — stop the sliding block over the tower. Overhang is sliced off.
const W = 300, H = 480, BH = 22, BASE_W = 160;
type Block = { x: number; w: number; hue: number };
type Chip = { x: number; y: number; w: number; vy: number; hue: number; rot: number };

export default function Stack({ versus }: { versus?: VersusProps }) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>(versus ? 'play' : 'ready');
  const [score, setScore] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const g = useRef({ tower: [] as Block[], cur: { x: 0, w: BASE_W, hue: 0 } as Block, dir: 1, speed: 120, chips: [] as Chip[], cam: 0, combo: 0, over: false, rng: createRng('x'), flash: 0 });
  const token = useRef<string | null>(null);

  const start = () => {
    const rng = createRng(versus?.seed ?? randomSeed());
    const hue = rng.int(0, 359);
    g.current = { tower: [{ x: (W - BASE_W) / 2, w: BASE_W, hue }], cur: { x: -BASE_W, w: BASE_W, hue: hue + 8 }, dir: 1, speed: 120, chips: [], cam: 0, combo: 0, over: false, rng, flash: 0 };
    setScore(0); setPerfect(0); setRank(null); setPhase('play');
    if (!versus) startRun('stack').then((t) => (token.current = t));
  };
  useEffect(() => { if (versus) start(); }, [versus?.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop = () => {
    const s = g.current;
    if (phase !== 'play' || s.over) return;
    const top = s.tower[s.tower.length - 1];
    const c = s.cur;
    const left = Math.max(c.x, top.x), right = Math.min(c.x + c.w, top.x + top.w);
    const overlap = right - left;
    const y = s.tower.length;
    if (overlap <= 0) {
      s.chips.push({ x: c.x, y, w: c.w, vy: 0, hue: c.hue, rot: 0 });
      s.over = true;
      blip('lose');
      finish(s.tower.length - 1);
      return;
    }
    let placed: Block;
    if (Math.abs(c.x - top.x) <= 4) {
      s.combo++;
      const grow = s.combo >= 3 ? Math.min(6, BASE_W - top.w) : 0;
      placed = { x: top.x - grow / 2, w: top.w + grow, hue: c.hue };
      setPerfect((p) => p + 1);
      setMsg(s.combo >= 3 ? `PERFECT ×${s.combo} · +grow` : 'PERFECT');
      s.flash = 1;
      blip('win');
    } else {
      s.combo = 0;
      placed = { x: left, w: overlap, hue: c.hue };
      const cutX = c.x < top.x ? c.x : right;
      s.chips.push({ x: cutX, y, w: c.w - overlap, vy: 0, hue: c.hue, rot: 0 });
      setMsg(null);
      blip('place');
    }
    s.tower.push(placed);
    s.dir = s.tower.length % 2 ? 1 : -1;
    s.speed = Math.min(380, 120 + s.tower.length * 7);
    s.cur = { x: s.dir > 0 ? -placed.w : W, w: placed.w, hue: placed.hue + 8 };
    setScore(s.tower.length - 1);
  };

  const finish = (floors: number) => {
    setTimeout(() => setPhase('over'), 700);
    if (versus) { versus.onDone({ floors }); return; }
    recordResult('stack', { score: floors, mode: 'arcade' });
    submitRun('stack', token.current, floors).then((r) => r.ok && setRank(`Global #${r.rank}`));
    token.current = null;
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (e.repeat) return;
        if (phase === 'play') drop(); else if (!versus) start();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const reduced = prefersReducedMotion();
    let raf = 0, last = performance.now();
    const col = (h: number, l = 62) => `hsl(${h % 360} 85% ${l}%)`;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = g.current;
      if (phase === 'play' && !s.over) {
        s.cur.x += s.dir * s.speed * dt;
        if (s.cur.x > W) s.dir = -1;
        if (s.cur.x + s.cur.w < 0) s.dir = 1;
      }
      const targetCam = Math.max(0, s.tower.length * BH - H * 0.55);
      s.cam += (targetCam - s.cam) * (reduced ? 1 : 0.1);
      for (const c of s.chips) { c.vy += 900 * dt; c.y -= (c.vy * dt) / BH; c.rot += dt * 2; }
      s.chips = s.chips.filter((c) => c.y > -40);
      s.flash = Math.max(0, s.flash - dt * 3);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      const baseHue = (s.tower[s.tower.length - 1]?.hue ?? 270) + 180;
      grad.addColorStop(0, `hsl(${baseHue % 360} 30% 10%)`);
      grad.addColorStop(1, '#0A0A0A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      const Y = (i: number) => H - 40 - (i + 1) * BH + s.cam;
      s.tower.forEach((b, i) => {
        const y = Y(i);
        if (y > H || y < -BH) return;
        ctx.fillStyle = col(b.hue, 40); ctx.fillRect(b.x, y + BH - 5, b.w, 5);
        ctx.fillStyle = col(b.hue); ctx.fillRect(b.x, y, b.w, BH - 5);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(b.x, y, b.w, 2);
      });
      if (s.flash > 0 && s.tower.length) { const b = s.tower[s.tower.length - 1]; ctx.strokeStyle = `rgba(255,255,255,${s.flash})`; ctx.lineWidth = 2; ctx.strokeRect(b.x - 3, Y(s.tower.length - 1) - 3, b.w + 6, BH + 1); }
      if (phase === 'play' && !s.over) {
        const y = Y(s.tower.length);
        ctx.fillStyle = col(s.cur.hue, 40); ctx.fillRect(s.cur.x, y + BH - 5, s.cur.w, 5);
        ctx.fillStyle = col(s.cur.hue); ctx.fillRect(s.cur.x, y, s.cur.w, BH - 5);
      }
      for (const c of s.chips) {
        ctx.save();
        ctx.translate(c.x + c.w / 2, Y(c.y) + BH / 2);
        if (!reduced) ctx.rotate(c.rot * 0.3);
        ctx.fillStyle = col(c.hue, 50);
        ctx.fillRect(-c.w / 2, -BH / 2, c.w, BH - 5);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const stats = getStats('stack');
  return (
    <GameFrame
      id="stack"
      versus={!!versus}
      right={<PB value={`${stats.best ?? 0} floors`} />}
      howTo={<><p>A block slides back and forth. Tap, click or press Space to drop it onto the tower.</p><p>Anything hanging over the edge is sliced off, so your platform shrinks. Land within a hair for a <strong className="text-lime">PERFECT</strong> — three perfects in a row starts growing the platform back. It speeds up as you climb.</p></>}
      controls={[['Space', 'Drop'], ['Click / tap', 'Drop']]}
    >
      <div
        className="game-surface relative mx-auto w-full max-w-[360px] cursor-pointer overflow-hidden rounded-2xl border border-ink-600"
        onPointerDown={(e) => { e.preventDefault(); if (phase === 'play') drop(); else if (phase === 'ready') start(); }}
      >
        <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" aria-label="Stack tower" />
        <div className="pointer-events-none absolute inset-x-0 top-6 text-center">
          <div className="font-display text-6xl font-bold tabular-nums">{score}</div>
          {msg && <div className="mt-1 font-mono text-xs tracking-[0.3em] text-lime">{msg}</div>}
        </div>
        {phase === 'ready' && <div className="absolute inset-0 grid place-items-center bg-ink/60"><div className="text-center"><div className="font-display text-4xl font-bold">STACK</div><div className="mt-2 text-sm text-paper-dim">Tap or press Space to start</div></div></div>}
        {phase === 'over' && (
          <div className="absolute inset-0 grid place-items-center bg-ink/75 p-4 text-center" onPointerDown={(e) => e.stopPropagation()}>
            <div>
              <div className="label">Tower height</div>
              <div className="font-display text-7xl font-bold text-signal-violet">{score}</div>
              <div className="text-sm text-paper-dim">{perfect} perfect drop{perfect === 1 ? '' : 's'}</div>
              {rank && <div className="mt-1 text-sm text-lime">{rank}</div>}
              {versus ? <div className="mt-4 text-sm text-paper-dim">Waiting for your opponent…</div> : (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <button className="btn-lime" onClick={start}>Again</button>
                  <ShareBar text={`OFFGRID Stack 🏗️ ${score} floors`} card={{ game: 'stack', title: 'Stack', big: `${score} floors`, sub: `${perfect} perfect drops`, accent: '#A66BFF' }} />
                  <ChallengeButton game="stack" className="btn-ghost btn-sm" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  );
}
