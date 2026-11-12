'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFrame, PB } from '@/components/kit';
import { generateLevel, stepBall, launch, clampAngle, W, H, LX, LY, BALL_R, PEG_R, DT, type Ball } from './physics';
import { load, save } from '@/lib/storage';
import { recordResult } from '@/lib/stats';
import { blip } from '@/lib/sound';
import { useMounted } from '@/lib/hooks';

type Progress = { unlocked: number; stars: Record<number, number> };
type Pop = { x: number; y: number; t: number; c: string };

export default function Bounce() {
  const mounted = useMounted();
  const [progress, setProgress] = useState<Progress>({ unlocked: 1, stars: {} });
  const [n, setN] = useState(1);
  const [view, setView] = useState<'select' | 'play'>('select');
  const level = useMemo(() => (view === 'play' ? generateLevel(n) : null), [n, view]);
  const [alive, setAlive] = useState<boolean[]>([]);
  const [shotsLeft, setShotsLeft] = useState(0);
  const [status, setStatus] = useState<'aim' | 'flying' | 'won' | 'lost'>('aim');
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(Math.PI / 2);
  const ball = useRef<Ball | null>(null);
  const lit = useRef(new Set<number>());
  const pops = useRef<Pop[]>([]);
  const used = useRef(0);

  useEffect(() => { if (mounted) setProgress(load<Progress>('bounce', { unlocked: 1, stars: {} })); }, [mounted]);
  useEffect(() => {
    if (!level) return;
    setAlive(level.pegs.map(() => true));
    setShotsLeft(level.shots);
    setStatus('aim');
    used.current = 0;
    ball.current = null;
    lit.current = new Set();
  }, [level]);

  const fire = () => {
    if (!level || status !== 'aim' || shotsLeft <= 0) return;
    ball.current = launch(angle.current);
    lit.current = new Set();
    used.current++;
    setShotsLeft((s) => s - 1);
    setStatus('flying');
    blip('go');
  };

  const endShot = () => {
    if (!level) return;
    const next = alive.slice();
    for (const i of lit.current) if (level.pegs[i].kind === 'target') { next[i] = false; pops.current.push({ x: level.pegs[i].x, y: level.pegs[i].y, t: 0, c: '#FFB800' }); }
    setAlive(next);
    ball.current = null;
    const remaining = level.pegs.some((p, i) => next[i] && p.kind === 'target');
    if (!remaining) {
      const stars = used.current <= level.par ? 3 : used.current <= level.par + 1 ? 2 : 1;
      const p: Progress = { unlocked: Math.max(progress.unlocked, level.n + 1), stars: { ...progress.stars, [level.n]: Math.max(stars, progress.stars[level.n] ?? 0) } };
      setProgress(p); save('bounce', p);
      recordResult('bounce', { score: p.unlocked - 1, mode: 'arcade', win: true });
      setStatus('won'); blip('win');
    } else if (shotsLeft <= 0) { setStatus('lost'); blip('lose'); }
    else setStatus('aim');
  };

  // keyboard aim/fire
  useEffect(() => {
    if (view !== 'play') return;
    const k = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); angle.current = clampAngle(angle.current + 0.03); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); angle.current = clampAngle(angle.current - 0.03); }
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (status === 'won') setN((x) => x + 1); else if (status === 'lost') retry(); else fire(); }
      if (e.code === 'KeyR') retry();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const retry = () => { if (!level) return; setAlive(level.pegs.map(() => true)); setShotsLeft(level.shots); setStatus('aim'); used.current = 0; ball.current = null; };

  const aimAt = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    angle.current = clampAngle(Math.atan2(y - LY, x - LX));
  };

  // loop
  useEffect(() => {
    if (!level || view !== 'play') return;
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (ball.current) {
        acc += dt;
        while (acc >= DT && ball.current) {
          acc -= DT;
          const before = lit.current.size;
          const inPlay = stepBall(ball.current, level.pegs, alive, lit.current);
          if (lit.current.size > before) blip('pickup');
          if (!inPlay) { endShot(); break; }
        }
      } else acc = 0;
      for (const p of pops.current) p.t += dt;
      pops.current = pops.current.filter((p) => p.t < 0.5);
      // ---- draw ----
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#120d1f'); g.addColorStop(1, '#07060c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(166,107,255,0.07)';
      for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // aim preview (first ~0.45s of flight, ignoring pegs)
      if (!ball.current && status === 'aim') {
        const b = launch(angle.current);
        ctx.fillStyle = 'rgba(242,240,233,0.55)';
        const dummy = new Set<number>();
        for (let s = 0; s < 110; s++) { stepBall(b, [], [], dummy); if (s % 6 === 0) { ctx.beginPath(); ctx.arc(b.x, b.y, 1.6, 0, 7); ctx.fill(); } }
      }
      level.pegs.forEach((p, i) => {
        if (!alive[i]) return;
        const on = lit.current.has(i);
        ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R, 0, 7);
        if (p.kind === 'block') { ctx.fillStyle = '#3a3a44'; ctx.fill(); ctx.strokeStyle = '#55556a'; ctx.stroke(); return; }
        ctx.fillStyle = on ? '#FFE45C' : '#FFB800';
        ctx.shadowColor = '#FFB800'; ctx.shadowBlur = on ? 22 : 8;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 2.5, 0, 7); ctx.fill();
      });
      for (const p of pops.current) { ctx.strokeStyle = `rgba(255,184,0,${1 - p.t * 2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R + p.t * 40, 0, 7); ctx.stroke(); ctx.lineWidth = 1; }
      // launcher
      ctx.save(); ctx.translate(LX, LY); ctx.rotate(angle.current);
      ctx.fillStyle = '#A66BFF'; ctx.fillRect(0, -5, 26, 10); ctx.restore();
      ctx.beginPath(); ctx.arc(LX, LY, 13, 0, 7); ctx.fillStyle = '#F2F0E9'; ctx.fill();
      if (ball.current) { ctx.beginPath(); ctx.arc(ball.current.x, ball.current.y, BALL_R, 0, 7); ctx.fillStyle = '#F2F0E9'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const targetsLeft = level ? level.pegs.filter((p, i) => alive[i] && p.kind === 'target').length : 0;
  return (
    <GameFrame
      id="bounce"
      right={<>{view === 'play' && <button className="btn-ghost btn-sm" onClick={() => setView('select')}>Levels</button>}<PB value={`Lv ${progress.unlocked - 1}`} /></>}
      howTo={<><p>Aim the launcher with your mouse (or ← →) and fire. The ball bounces off everything; every <span className="text-signal-amber">gold peg</span> it touches is cleared when the shot ends. Grey pegs never break.</p><p>Clear every gold peg before you run out of shots. Match par for three stars. Each level is checked by a solver using the same physics, so it can always be cleared.</p></>}
      controls={[['Mouse', 'Aim'], ['Click / Space', 'Fire'], ['← →', 'Fine aim'], ['R', 'Retry']]}
    >
      {view === 'select' ? (
        <div className="card p-6">
          <div className="label mb-4">Choose a level</div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: Math.max(30, progress.unlocked + 5) }).map((_, i) => {
              const lv = i + 1, locked = lv > progress.unlocked, s = progress.stars[lv];
              return (
                <button key={lv} disabled={locked} onClick={() => { setN(lv); setView('play'); }} className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm font-semibold ${s ? 'border-signal-amber/60 bg-signal-amber/10 text-signal-amber' : locked ? 'border-ink-600 text-ink-500' : 'border-ink-500 hover:border-paper'}`}>
                  {locked ? '🔒' : lv}
                  {s ? <span className="text-[9px] tracking-tighter">{'★'.repeat(s)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : level && (
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-display font-bold">Level {level.n} · {level.name}</span>
            <span className="flex gap-2"><span className="chip">Pegs <span className="text-paper">{targetsLeft}</span></span><span className="chip">Shots <span className="text-paper">{shotsLeft}</span></span><span className="chip">Par <span className="text-paper">{level.par}</span></span></span>
          </div>
          <div className="game-surface relative mx-auto max-w-[420px] cursor-crosshair overflow-hidden rounded-2xl border border-ink-600" onPointerMove={aimAt} onPointerDown={(e) => { aimAt(e); if (status === 'aim') fire(); }}>
            <canvas ref={canvas} width={W} height={H} className="block h-auto w-full" aria-label="Bounce board" />
            {(status === 'won' || status === 'lost') && (
              <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center" onPointerDown={(e) => e.stopPropagation()}>
                <div>
                  <div className={`font-display text-4xl font-bold ${status === 'won' ? 'text-signal-amber' : 'text-signal-red'}`}>{status === 'won' ? 'Cleared!' : 'Out of shots'}</div>
                  {status === 'won' && <div className="mt-2 text-3xl text-signal-amber">{'★'.repeat(used.current <= level.par ? 3 : used.current <= level.par + 1 ? 2 : 1)}</div>}
                  {status === 'won' && <div className="mt-1 text-sm text-paper-dim">{used.current} shot{used.current === 1 ? '' : 's'} · par {level.par}{used.current === 1 ? ' · ONE-SHOT!' : ''}</div>}
                  <div className="mt-4 flex justify-center gap-2">
                    <button className="btn-ghost" onClick={retry}>Retry</button>
                    {status === 'won' && <button className="btn-lime" onClick={() => setN((x) => x + 1)}>Next level ⏎</button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GameFrame>
  );
}
