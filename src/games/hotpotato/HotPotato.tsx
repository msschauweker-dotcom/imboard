'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, TouchPad, type StickState } from '@/components/kit';
import { Segmented } from '@/components/ui';
import { MAPS, MAP_BY_ID } from '../tag/maps';
import { MiniMap } from '../tag/Tag';
import { drawTag, spawnBurst, stepParticles, pixelFont, TILE, type Particle } from '../tag/render';
import { readInput } from '../tag/input';
import { createRound, stepRound, heat, cpuInput, type HPState, type Who } from './sim';
import type { MatchState, AiLevel, AiMemory } from '../tag/sim';
import { useHeldKeys, useAutoPause } from '@/lib/hooks';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { recordResult, getStats } from '@/lib/stats';
import { randomSeed } from '@/lib/rng';

const DT = 1 / 60;
const COLORS: Record<Who, string> = { p1: '#C8FF00', p2: '#FF6BD6' };
const FIRST_TO = 3;

export default function HotPotato() {
  const [mode, setMode] = useState<'cpu' | 'local'>('cpu');
  const [mapId, setMapId] = useState('courtyard');
  const [ai, setAi] = useState<AiLevel>('normal');
  const [phase, setPhase] = useState<'setup' | 'play' | 'round' | 'match'>('setup');
  const [score, setScore] = useState<Record<Who, number>>({ p1: 0, p2: 0 });
  const [loser, setLoser] = useState<Who | null>(null);
  const [hud, setHud] = useState({ holder: 'p1' as Who, countdown: 3, phase: 'countdown' as HPState['phase'], passes: 0 });
  const [paused, setPaused] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<HPState | null>(null);
  const particles = useRef<Particle[]>([]);
  const shake = useRef(0);
  const mem = useRef<AiMemory>({ target: 0, until: 0, wobble: 0 });
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(phase === 'play');
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  useAutoPause(phase === 'play', () => setPaused(true));
  const names: Record<Who, string> = mode === 'cpu' ? { p1: 'YOU', p2: 'CPU' } : { p1: 'P1', p2: 'P2' };

  const startRound = () => {
    state.current = createRound(mapId, randomSeed());
    particles.current = [];
    mem.current = { target: 0, until: 0, wobble: 0 };
    setLoser(null); setPaused(false); setPhase('play');
  };
  const newMatch = () => { setScore({ p1: 0, p2: 0 }); startRound(); };

  useEffect(() => {
    if (phase !== 'play') return;
    const k = (e: KeyboardEvent) => { if (e.code === 'KeyP' || e.code === 'Escape') setPaused((p) => !p); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'play') return;
    const ctx = canvas.current!.getContext('2d')!;
    const font = pixelFont();
    const reduced = prefersReducedMotion();
    let raf = 0, acc = 0, last = performance.now(), hudT = 0, sparkT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = state.current!;
      if (!pausedRef.current) {
        acc += dt;
        while (acc >= DT) {
          acc -= DT;
          const keys = held.current;
          const inp = mode === 'cpu'
            ? { p1: readInput(keys, 'both', stick.current), p2: cpuInput(s, 'p2', ai, mem.current, now / 1000) }
            : { p1: readInput(keys, 'wasd'), p2: readInput(keys, 'arrows', stick.current) };
          stepRound(s, inp, DT);
          for (const ev of s.events) {
            if (ev === 'count') blip('tick');
            if (ev === 'go') blip('go');
            if (ev === 'pass') { blip('tag'); const a = s[s.holder]; spawnBurst(particles.current, a.x, a.y - 0.6, '#FFB800', 14, 4); }
            if (ev === 'boom') {
              blip('lose');
              const a = s[s.holder];
              spawnBurst(particles.current, a.x, a.y, '#FF3D3D', 60, 9);
              spawnBurst(particles.current, a.x, a.y, '#FFB800', 40, 6);
              if (!reduced) shake.current = 10;
            }
          }
          s.events.length = 0;
          stepParticles(particles.current, DT);
          shake.current = Math.max(0, shake.current - DT * 18);
          // fuse sparks speed up with heat
          sparkT += DT * (2 + heat(s) * 14);
          if (s.phase === 'play' && sparkT > 1) { sparkT = 0; const a = s[s.holder]; particles.current.push({ x: a.x + 0.3, y: a.y - 2.2, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, life: 0.35, color: Math.random() < 0.5 ? '#FFB800' : '#FFF4B0', size: 1 }); }
          if (s.phase === 'boom') break;
        }
      }
      // draw arena + players through the TAG renderer
      const fake = { mapId: s.mapId, phase: 'play', countdown: 0, timeLeft: 0, roundLength: 0, winner: null, chaser: s.p1, runner: s.p2, powers: [], rng: 0, events: [], tick: 0 } as MatchState;
      drawTag(ctx, fake, { names: { chaser: names.p1, runner: names.p2 }, colors: { chaser: COLORS.p1, runner: COLORS.p2 }, me: null, particles: particles.current, shake: shake.current, time: now / 1000, pixelFont: font });
      if (s.phase !== 'boom') drawBomb(ctx, s, now / 1000);
      hudT += dt;
      if (hudT > 0.1) { hudT = 0; setHud({ holder: s.holder, countdown: s.countdown, phase: s.phase, passes: s.passes }); }
      if (s.phase === 'boom') {
        const l = s.loser!;
        const winner: Who = l === 'p1' ? 'p2' : 'p1';
        setLoser(l);
        setScore((sc) => {
          const next = { ...sc, [winner]: sc[winner] + 1 };
          setTimeout(() => {
            if (next[winner] >= FIRST_TO) {
              setPhase('match');
              if (mode === 'cpu') recordResult('hotpotato', { score: next.p1, win: winner === 'p1', mode: 'arcade' });
            } else setPhase('round');
          }, 900);
          return next;
        });
        let t = 0;
        const tail = (n2: number) => { t += 1 / 60; stepParticles(particles.current, 1 / 60); shake.current = Math.max(0, shake.current - 0.3); drawTag(ctx, fake, { names: { chaser: names.p1, runner: names.p2 }, colors: { chaser: COLORS.p1, runner: COLORS.p2 }, me: null, particles: particles.current, shake: shake.current, time: n2 / 1000, pixelFont: font }); if (t < 0.9) raf = requestAnimationFrame(tail); };
        raf = requestAnimationFrame(tail);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, mode, ai]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'round' && phase !== 'match') return;
    const k = (e: KeyboardEvent) => { if (e.code === 'Enter') { e.preventDefault(); phase === 'round' ? startRound() : newMatch(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const map = MAP_BY_ID[mapId];
  const stats = getStats('hotpotato');
  const champ: Who | null = score.p1 >= FIRST_TO ? 'p1' : score.p2 >= FIRST_TO ? 'p2' : null;
  return (
    <GameFrame
      id="hotpotato"
      modes={[{ id: 'cpu', label: 'vs Computer' }, { id: 'local', label: 'Local 2P (same keyboard)' }]}
      mode={mode}
      onMode={(m) => { setMode(m as 'cpu' | 'local'); setPhase('setup'); }}
      right={<span className="chip">Matches won <span className="text-paper">{stats.wins}</span></span>}
      howTo={<><p>One of you holds a lit bomb. <strong className="text-paper">Touch the other player to pass it.</strong> The fuse length is random and hidden — the sparks just get faster as it burns down.</p><p>Whoever is holding it when it blows loses the round. First to {FIRST_TO} rounds wins. After a pass, the bomb can’t come straight back for a moment, and the receiver is stunned for a split second.</p></>}
      controls={mode === 'cpu' ? [['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['Space', 'Dash'], ['P', 'Pause']] : [['W A S D', 'P1 move'], ['Space', 'P1 dash'], ['↑ ← ↓ →', 'P2 move'], ['Enter', 'P2 dash']]}
    >
      {phase === 'setup' ? (
        <div className="card space-y-6 p-6">
          <div>
            <div className="label mb-2">Arena</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MAPS.map((m) => (
                <button key={m.id} onClick={() => setMapId(m.id)} className={`rounded-xl border p-3 text-left transition ${mapId === m.id ? 'border-signal-amber' : 'border-ink-500 hover:border-paper/40'}`}>
                  <MiniMap rows={m.rows} color={m.palette.wallTop} floor={m.palette.floor} />
                  <div className="mt-2 font-pixel text-xs">{m.name}</div>
                </button>
              ))}
            </div>
          </div>
          {mode === 'cpu' && <div><div className="label mb-2">CPU</div><Segmented size="sm" value={ai} onChange={setAi} options={[{ id: 'easy', label: 'Easy' }, { id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Hard' }]} /></div>}
          <button className="btn-lime px-8 py-3" onClick={newMatch}>Light the fuse 🧨</button>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between font-pixel text-sm">
            <span style={{ color: COLORS.p1 }}>{names.p1} {score.p1}</span>
            <span className="text-paper-mute">FIRST TO {FIRST_TO} · {hud.passes} PASSES</span>
            <span style={{ color: COLORS.p2 }}>{score.p2} {names.p2}</span>
          </div>
          <div className="game-surface relative overflow-hidden rounded-xl border border-ink-600">
            <canvas ref={canvas} width={map.rows[0].length * TILE} height={map.rows.length * TILE} className="pixelated block h-auto w-full" aria-label="Hot Potato arena" />
            {phase === 'play' && hud.phase === 'countdown' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center font-pixel"><div className="text-7xl drop-shadow-[0_4px_0_#000]">{Math.ceil(hud.countdown)}</div><div className="mt-2 text-sm" style={{ color: COLORS[hud.holder] }}>{names[hud.holder]} HAS THE BOMB</div></div>
              </div>
            )}
            {paused && phase === 'play' && <div className="absolute inset-0 grid place-items-center bg-ink/80"><button className="btn-lime" onClick={() => setPaused(false)}>Resume</button></div>}
            {(phase === 'round' || phase === 'match') && loser && (
              <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4 text-center">
                <div>
                  <div className="font-pixel text-sm text-signal-red">BOOM!</div>
                  <div className="mt-1 font-pixel text-4xl">{phase === 'match' && champ ? `${names[champ]} ${mode === 'cpu' && champ === 'p1' ? 'WIN' : 'WINS'} THE MATCH` : `${names[loser]} ${mode === 'cpu' && loser === 'p1' ? 'BLOW' : 'BLOWS'} UP`}</div>
                  <div className="mt-3 font-pixel text-lg text-paper-dim">{score.p1} — {score.p2}</div>
                  <div className="mt-5 flex justify-center gap-2">
                    <button className="btn-lime" onClick={phase === 'round' ? startRound : newMatch}>{phase === 'round' ? 'Next round' : 'Rematch'} <span className="kbd ml-1 !bg-transparent !text-ink">Enter</span></button>
                    <button className="btn-ghost" onClick={() => setPhase('setup')}>Settings</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <TouchPad stick={stick} actionLabel="Dash" />
        </div>
      )}
    </GameFrame>
  );
}

function drawBomb(ctx: CanvasRenderingContext2D, s: HPState, t: number) {
  const a = s[s.holder];
  const cx = Math.round(a.x * TILE), cy = Math.round(a.y * TILE) - 22 + Math.round(Math.sin(t * 8) * 1);
  const h = heat(s);
  const flash = h > 0.75 && Math.floor(t * (6 + h * 14)) % 2 === 0;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
  ctx.fillStyle = flash ? '#FF3D3D' : '#2a2a2a';
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(cx - 3, cy - 3, 2, 2);
  ctx.strokeStyle = '#B9B6AC'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx + 2, cy - 5); ctx.quadraticCurveTo(cx + 5, cy - 10, cx + 4, cy - 12); ctx.stroke();
  ctx.fillStyle = Math.floor(t * 20) % 2 ? '#FFB800' : '#FFF4B0';
  ctx.fillRect(cx + 3, cy - 14, 3, 3);
}
