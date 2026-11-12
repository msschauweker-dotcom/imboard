'use client';
import { useEffect, useRef, useState } from 'react';
import { GameFrame, ChallengeButton, TouchPad, type StickState } from '@/components/kit';
import { Segmented } from '@/components/ui';
import { MAPS, MAP_BY_ID } from './maps';
import { createMatch, stepMatch, aiInput, type MatchState, type Role, type AiLevel, type AiMemory } from './sim';
import { drawTag, spawnBurst, stepParticles, pixelFont, TILE, type Particle } from './render';
import { readInput } from './input';
import { useHeldKeys, useAutoPause } from '@/lib/hooks';
import { blip, prefersReducedMotion } from '@/lib/sound';
import { recordResult, getStats } from '@/lib/stats';
import { randomSeed } from '@/lib/rng';
import { usePlayer } from '@/lib/hooks';

type Mode = 'cpu' | 'local';
const COLORS: Record<Role, string> = { chaser: '#FF3D3D', runner: '#C8FF00' };
const DT = 1 / 60;

export default function Tag() {
  const player = usePlayer();
  const [mode, setMode] = useState<Mode>('cpu');
  const [mapId, setMapId] = useState('courtyard');
  const [length, setLength] = useState(60);
  const [myRole, setMyRole] = useState<Role>('runner');
  const [ai, setAi] = useState<AiLevel>('normal');
  const [phase, setPhase] = useState<'setup' | 'play' | 'over'>('setup');
  const [paused, setPaused] = useState(false);
  const [series, setSeries] = useState({ p1: 0, p2: 0, round: 0 });
  const [hud, setHud] = useState({ time: 60, countdown: 3, phase: 'countdown' as MatchState['phase'] });
  const [winner, setWinner] = useState<Role | null>(null);
  // In local mode, P1 = WASD, P2 = arrows. p1Role tracks who is chaser.
  const [p1Role, setP1Role] = useState<Role>('chaser');

  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<MatchState | null>(null);
  const particles = useRef<Particle[]>([]);
  const shake = useRef(0);
  const mem = useRef<AiMemory>({ target: 0, until: 0, wobble: 0 });
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(phase === 'play');
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useAutoPause(phase === 'play', () => setPaused(true));

  const startRound = () => {
    state.current = createMatch(mapId, randomSeed(), length);
    particles.current = [];
    mem.current = { target: 0, until: 0, wobble: 0 };
    setWinner(null);
    setPaused(false);
    setPhase('play');
    canvas.current?.focus();
  };

  // Pause key
  useEffect(() => {
    if (phase !== 'play') return;
    const k = (e: KeyboardEvent) => { if (e.code === 'KeyP' || e.code === 'Escape') setPaused((p) => !p); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [phase]);

  // Swap / rematch with Enter on the results screen
  useEffect(() => {
    if (phase !== 'over') return;
    const k = (e: KeyboardEvent) => { if (e.code === 'Enter') { e.preventDefault(); swapAndGo(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Game loop (fixed timestep)
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0, acc = 0, last = performance.now();
    const reduced = prefersReducedMotion();
    const ctx = canvas.current!.getContext('2d')!;
    const font = pixelFont();
    let hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = state.current!;
      if (!pausedRef.current) {
        acc += dt;
        while (acc >= DT) {
          acc -= DT;
          const keys = held.current;
          let inputs: { chaser: ReturnType<typeof readInput>; runner: ReturnType<typeof readInput> };
          if (mode === 'cpu') {
            const mine = readInput(keys, 'both', stick.current);
            const theirs = aiInput(s, myRole === 'chaser' ? 'runner' : 'chaser', ai, mem.current, now / 1000);
            inputs = myRole === 'chaser' ? { chaser: mine, runner: theirs } : { chaser: theirs, runner: mine };
          } else {
            const a = readInput(keys, 'wasd'), b = readInput(keys, 'arrows', stick.current);
            inputs = p1Role === 'chaser' ? { chaser: a, runner: b } : { chaser: b, runner: a };
          }
          stepMatch(s, inputs, DT);
          for (const ev of s.events) {
            if (ev.t === 'count') blip('tick');
            if (ev.t === 'go') blip('go');
            if (ev.t === 'power') { blip('pickup'); const a = s[ev.who!]; spawnBurst(particles.current, a.x, a.y, ev.type === 'speed' ? '#FFB800' : ev.type === 'freeze' ? '#3DA9FF' : '#A66BFF', 16); }
            if (ev.t === 'dash') { const a = s[ev.who!]; spawnBurst(particles.current, a.x, a.y + 0.3, '#888', 6, 2); }
            if (ev.t === 'boost') blip('select');
            if (ev.t === 'tag') { blip('tag'); spawnBurst(particles.current, s.runner.x, s.runner.y, '#FF3D3D', 30, 6); if (!reduced) shake.current = 6; }
            if (ev.t === 'timeup') { blip('win'); spawnBurst(particles.current, s.runner.x, s.runner.y, '#C8FF00', 30, 6); }
          }
          s.events.length = 0;
          stepParticles(particles.current, DT);
          shake.current = Math.max(0, shake.current - DT * 20);
          if (s.phase === 'over') break;
        }
      }
      const names: Record<Role, string> = mode === 'cpu'
        ? { chaser: myRole === 'chaser' ? 'YOU' : 'CPU', runner: myRole === 'runner' ? 'YOU' : 'CPU' }
        : { chaser: p1Role === 'chaser' ? 'P1' : 'P2', runner: p1Role === 'runner' ? 'P1' : 'P2' };
      drawTag(ctx, s, { names, colors: COLORS, me: mode === 'cpu' ? myRole : null, particles: particles.current, shake: shake.current, time: now / 1000, pixelFont: font });
      hudT += dt;
      if (hudT > 0.1) { hudT = 0; setHud({ time: s.timeLeft, countdown: s.countdown, phase: s.phase }); }
      if (s.phase === 'over') {
        const w = s.winner!;
        setWinner(w);
        setHud({ time: s.timeLeft, countdown: 0, phase: 'over' });
        setTimeout(() => {
          setPhase('over');
          if (mode === 'cpu') {
            const won = w === myRole;
            setSeries((x) => ({ p1: x.p1 + (won ? 1 : 0), p2: x.p2 + (won ? 0 : 1), round: x.round + 1 }));
            recordResult('tag', { score: won ? 1 : 0, win: won, mode: 'arcade' });
          } else {
            const p1won = w === p1Role;
            setSeries((x) => ({ p1: x.p1 + (p1won ? 1 : 0), p2: x.p2 + (p1won ? 0 : 1), round: x.round + 1 }));
          }
        }, 700);
        // keep drawing particles briefly
        let t = 0;
        const tail = (n2: number) => { t += 1 / 60; stepParticles(particles.current, 1 / 60); shake.current = Math.max(0, shake.current - 0.3); drawTag(ctx, s, { names, colors: COLORS, me: null, particles: particles.current, shake: shake.current, time: n2 / 1000, pixelFont: font }); if (t < 0.7) raf = requestAnimationFrame(tail); };
        raf = requestAnimationFrame(tail);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, mode, myRole, ai, p1Role]); // eslint-disable-line react-hooks/exhaustive-deps

  const swapAndGo = () => {
    if (mode === 'cpu') setMyRole((r) => (r === 'chaser' ? 'runner' : 'chaser'));
    else setP1Role((r) => (r === 'chaser' ? 'runner' : 'chaser'));
    setTimeout(startRound, 0);
  };

  const map = MAP_BY_ID[mapId];
  const W = map.rows[0].length * TILE, H = map.rows.length * TILE;
  const stats = getStats('tag');
  const youWon = mode === 'cpu' ? winner === myRole : null;

  return (
    <GameFrame
      id="tag"
      modes={[{ id: 'cpu', label: 'vs Computer' }, { id: 'local', label: 'Local 2P (same keyboard)' }]}
      mode={mode}
      onMode={(m) => { setMode(m as Mode); setPhase('setup'); setSeries({ p1: 0, p2: 0, round: 0 }); }}
      right={<span className="chip">Record <span className="text-paper">{stats.wins}–{stats.played - stats.wins}</span></span>}
      howTo={
        <>
          <p>One player is the <strong style={{ color: COLORS.chaser }}>Chaser</strong>, the other the <strong style={{ color: COLORS.runner }}>Runner</strong>. The chaser wins by touching the runner. The runner wins by surviving until the clock hits zero.</p>
          <p><strong className="text-paper">Dash</strong> for a burst of speed (chaser recharges faster). Grab power-ups: <span className="text-signal-amber">Speed</span>, <span className="text-signal-blue">Freeze</span> (stuns your opponent), <span className="text-signal-violet">Ghost</span> (near-invisible to your opponent). Boost pads launch you; mud slows you down.</p>
          <p>Roles swap every round. Play the computer, a friend on the same keyboard, or challenge a friend online — online matches run on the server so both players see the same truth.</p>
        </>
      }
      controls={mode === 'cpu' ? [['W A S D', 'Move'], ['↑ ← ↓ →', 'Move'], ['Space', 'Dash'], ['P', 'Pause']] : [['W A S D', 'P1 move'], ['Space', 'P1 dash'], ['↑ ← ↓ →', 'P2 move'], ['Enter', 'P2 dash'], ['P', 'Pause']]}
    >
      {phase === 'setup' ? (
        <div className="card space-y-6 p-6">
          <div>
            <div className="label mb-2">Arena</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MAPS.map((m) => (
                <button key={m.id} onClick={() => setMapId(m.id)} className={`rounded-xl border p-3 text-left transition ${mapId === m.id ? 'border-lime' : 'border-ink-500 hover:border-paper/40'}`}>
                  <MiniMap rows={m.rows} color={m.palette.wallTop} floor={m.palette.floor} />
                  <div className="mt-2 font-pixel text-xs">{m.name}</div>
                  <div className="text-[11px] text-paper-mute">{m.blurb}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="label mb-2">Round length</div>
              <Segmented size="sm" value={String(length)} onChange={(v) => setLength(Number(v))} options={[{ id: '30', label: '30s' }, { id: '60', label: '60s' }, { id: '90', label: '90s' }]} />
            </div>
            {mode === 'cpu' && (
              <>
                <div>
                  <div className="label mb-2">You start as</div>
                  <Segmented size="sm" value={myRole} onChange={setMyRole} options={[{ id: 'runner', label: 'Runner' }, { id: 'chaser', label: 'Chaser' }]} />
                </div>
                <div>
                  <div className="label mb-2">CPU</div>
                  <Segmented size="sm" value={ai} onChange={setAi} options={[{ id: 'easy', label: 'Easy' }, { id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Hard' }]} />
                </div>
              </>
            )}
            {mode === 'local' && (
              <div>
                <div className="label mb-2">P1 (WASD) starts as</div>
                <Segmented size="sm" value={p1Role} onChange={setP1Role} options={[{ id: 'chaser', label: 'Chaser' }, { id: 'runner', label: 'Runner' }]} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-ink-600 pt-5">
            <button className="btn-lime px-8 py-3" onClick={startRound}>Play</button>
            <ChallengeButton game="tag" settings={{ map: mapId, length }} label="Play a friend online" className="btn-paper" />
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between font-pixel text-sm">
            <span style={{ color: COLORS.chaser }}>{mode === 'cpu' ? (myRole === 'chaser' ? 'YOU' : 'CPU') : p1Role === 'chaser' ? 'P1' : 'P2'} · CHASER</span>
            <span className={`text-2xl tabular-nums ${hud.time < 10 ? 'text-signal-red' : 'text-paper'}`}>{Math.ceil(hud.time)}</span>
            <span style={{ color: COLORS.runner }}>RUNNER · {mode === 'cpu' ? (myRole === 'runner' ? 'YOU' : 'CPU') : p1Role === 'runner' ? 'P1' : 'P2'}</span>
          </div>
          <div className="game-surface relative overflow-hidden rounded-xl border border-ink-600">
            <canvas ref={canvas} width={W} height={H} tabIndex={0} className="pixelated block h-auto w-full outline-none" aria-label="TAG arena" />
            {hud.phase === 'countdown' && phase === 'play' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center font-pixel">
                  <div className="text-7xl text-paper drop-shadow-[0_4px_0_#000]">{Math.ceil(hud.countdown)}</div>
                  <div className="mt-2 text-sm" style={{ color: COLORS[mode === 'cpu' ? myRole : p1Role] }}>{mode === 'cpu' ? `YOU ARE THE ${myRole.toUpperCase()}` : `P1 IS THE ${p1Role.toUpperCase()}`}</div>
                </div>
              </div>
            )}
            {paused && phase === 'play' && (
              <div className="absolute inset-0 grid place-items-center bg-ink/80">
                <div className="text-center">
                  <div className="font-pixel text-3xl">PAUSED</div>
                  <div className="mt-4 flex gap-2">
                    <button className="btn-lime" onClick={() => setPaused(false)}>Resume</button>
                    <button className="btn-ghost" onClick={() => setPhase('setup')}>Quit</button>
                  </div>
                </div>
              </div>
            )}
            {phase === 'over' && (
              <div className="absolute inset-0 grid place-items-center bg-ink/80 p-4">
                <div className="text-center">
                  <div className="font-pixel text-sm" style={{ color: COLORS[winner ?? 'runner'] }}>{winner === 'chaser' ? 'TAGGED!' : 'SURVIVED!'}</div>
                  <div className="mt-1 font-pixel text-4xl sm:text-5xl">
                    {mode === 'cpu' ? (youWon ? 'YOU WIN' : 'CPU WINS') : `${winner === p1Role ? 'P1' : 'P2'} WINS`}
                  </div>
                  <div className="mt-3 font-pixel text-lg text-paper-dim">{mode === 'cpu' ? 'YOU' : 'P1'} {series.p1} — {series.p2} {mode === 'cpu' ? 'CPU' : 'P2'}</div>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button className="btn-lime" onClick={swapAndGo}>Swap roles ⇄ <span className="kbd ml-1 !bg-transparent !text-ink">Enter</span></button>
                    <button className="btn-paper" onClick={startRound}>Same roles</button>
                    <button className="btn-ghost" onClick={() => setPhase('setup')}>Settings</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <TouchPad stick={stick} actionLabel="Dash" />
          <p className="mt-3 hidden text-center text-xs text-paper-mute md:block">{player?.name ? `Playing as ${player.name} · ` : ''}P to pause · Space to dash</p>
        </div>
      )}
    </GameFrame>
  );
}

export function MiniMap({ rows, color, floor }: { rows: string[]; color: string; floor: string }) {
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} className="pixelated w-full rounded" shapeRendering="crispEdges">
      <rect width={rows[0].length} height={rows.length} fill={floor} />
      {rows.flatMap((r, y) => r.split('').map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : c === '~' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#3d2c17" /> : c === 'B' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#C8FF00" opacity={0.5} /> : null)))}
    </svg>
  );
}
