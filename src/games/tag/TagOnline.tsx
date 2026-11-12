'use client';
// Online TAG client. The server runs the authoritative simulation; this client
// sends inputs, PREDICTS its own movement for responsiveness, reconciles toward
// the server's position, and INTERPOLATES the opponent ~100ms in the past.
import { useEffect, useRef, useState } from 'react';
import { MAP_BY_ID } from './maps';
import { moveActor, type Actor, type MatchState, type Role, type PowerType } from './sim';
import { drawTag, spawnBurst, stepParticles, pixelFont, TILE, type Particle } from './render';
import { readInput } from './input';
import { net } from '@/lib/net';
import { useHeldKeys } from '@/lib/hooks';
import { TouchPad, type StickState } from '@/components/kit';
import { blip, prefersReducedMotion } from '@/lib/sound';

type Snap = { at: number; phase: MatchState['phase']; countdown: number; timeLeft: number; winner: Role | null; c: number[]; r: number[]; pw: [number, number, PowerType, number][] };
const COLORS: Record<Role, string> = { chaser: '#FF3D3D', runner: '#C8FF00' };
const unpack = (a: number[]): Actor => ({ x: a[0], y: a[1], vx: a[2], vy: a[3], fx: a[4], fy: a[5], dashCd: a[6], dashT: a[7], speedT: a[8], frozenT: a[9], ghostT: a[10], boostT: a[11] });
const INTERP_MS = 100;

export default function TagOnline({ mapId, myRole, names }: { mapId: string; myRole: Role; names: Record<Role, string> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const snaps = useRef<Snap[]>([]);
  const pred = useRef<Actor | null>(null);
  const particles = useRef<Particle[]>([]);
  const shake = useRef(0);
  const stick = useRef<StickState>({ x: 0, y: 0, action: false });
  const held = useHeldKeys(true);
  const [hud, setHud] = useState({ time: 0, phase: 'countdown' as MatchState['phase'], countdown: 3, ping: 0 });
  const other: Role = myRole === 'chaser' ? 'runner' : 'chaser';

  useEffect(() => {
    snaps.current = [];
    pred.current = null;
    const reduced = prefersReducedMotion();
    const off = net.on('tag:state', (m) => {
      const s: Snap = { at: m.at, ...m.st };
      snaps.current.push(s);
      if (snaps.current.length > 60) snaps.current.shift();
      const mine = unpack(myRole === 'chaser' ? s.c : s.r);
      if (!pred.current || s.phase !== 'play') pred.current = { ...mine };
      else {
        // copy effect timers from the authority; keep local dash state
        pred.current.frozenT = mine.frozenT; pred.current.speedT = mine.speedT; pred.current.ghostT = mine.ghostT; pred.current.boostT = mine.boostT;
        const lead = net.rtt / 2000 + 0.03;
        const tx = mine.x + mine.vx * lead, ty = mine.y + mine.vy * lead;
        const ex = tx - pred.current.x, ey = ty - pred.current.y;
        if (Math.hypot(ex, ey) > 1.5) { pred.current.x = tx; pred.current.y = ty; }
        else { pred.current.x += ex * 0.2; pred.current.y += ey * 0.2; }
      }
      for (const ev of m.ev as MatchState['events']) {
        if (ev.t === 'count') blip('tick');
        if (ev.t === 'go') blip('go');
        if (ev.t === 'power') { blip('pickup'); const a = unpack(ev.who === 'chaser' ? s.c : s.r); spawnBurst(particles.current, a.x, a.y, ev.type === 'speed' ? '#FFB800' : ev.type === 'freeze' ? '#3DA9FF' : '#A66BFF', 16); }
        if (ev.t === 'tag') { blip('tag'); const a = unpack(s.r); spawnBurst(particles.current, a.x, a.y, '#FF3D3D', 30, 6); if (!reduced) shake.current = 6; }
        if (ev.t === 'timeup') { blip('win'); const a = unpack(s.r); spawnBurst(particles.current, a.x, a.y, '#C8FF00', 30, 6); }
      }
    });
    return off;
  }, [myRole]);

  // input upload (on change + 20Hz keepalive)
  useEffect(() => {
    let lastSent = '';
    let lastAt = 0;
    const id = setInterval(() => {
      const i = readInput(held.current, 'both', stick.current);
      const k = `${i.x},${i.y},${i.dash ? 1 : 0}`;
      const t = performance.now();
      if (k !== lastSent || t - lastAt > 50) { net.send('tag:input', { x: i.x, y: i.y, dash: i.dash }); lastSent = k; lastAt = t; }
    }, 16);
    return () => { clearInterval(id); net.send('tag:input', { x: 0, y: 0, dash: false }); };
  }, [held]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const map = MAP_BY_ID[mapId];
    const font = pixelFont();
    let raf = 0, last = performance.now(), hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const list = snaps.current;
      const latest = list[list.length - 1];
      if (latest) {
        // local prediction for my actor
        if (pred.current && latest.phase === 'play') moveActor(map, pred.current, readInput(held.current, 'both', stick.current), myRole, dt);
        // interpolate opponent
        const rt = net.serverNow() - INTERP_MS;
        let a = list[0], b = latest;
        for (let i = 0; i < list.length - 1; i++) if (list[i].at <= rt && list[i + 1].at >= rt) { a = list[i]; b = list[i + 1]; break; }
        const k = b.at === a.at ? 1 : Math.max(0, Math.min(1, (rt - a.at) / (b.at - a.at)));
        const oa = unpack(other === 'chaser' ? a.c : a.r), ob = unpack(other === 'chaser' ? b.c : b.r);
        const opp: Actor = { ...ob, x: oa.x + (ob.x - oa.x) * k, y: oa.y + (ob.y - oa.y) * k };
        // on game over, show the authoritative final positions
        const mine = latest.phase === 'over' || !pred.current ? unpack(myRole === 'chaser' ? latest.c : latest.r) : pred.current;
        const oppFinal = latest.phase === 'over' ? unpack(other === 'chaser' ? latest.c : latest.r) : opp;
        const s = {
          mapId, phase: latest.phase, countdown: latest.countdown, timeLeft: latest.timeLeft, roundLength: 60, winner: latest.winner,
          chaser: myRole === 'chaser' ? mine : oppFinal, runner: myRole === 'runner' ? mine : oppFinal,
          powers: latest.pw.map(([x, y, type, gone]) => ({ x, y, type, respawn: gone ? 1 : 0 })), rng: 0, events: [], tick: 0,
        } as MatchState;
        stepParticles(particles.current, dt);
        shake.current = Math.max(0, shake.current - dt * 20);
        drawTag(ctx, s, { names, colors: COLORS, me: myRole, particles: particles.current, shake: shake.current, time: now / 1000, pixelFont: font });
        hudT += dt;
        if (hudT > 0.1) { hudT = 0; setHud({ time: latest.timeLeft, phase: latest.phase, countdown: latest.countdown, ping: Math.round(net.rtt) }); }
      } else {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const ping = setInterval(() => net.ping(), 2000);
    return () => { cancelAnimationFrame(raf); clearInterval(ping); };
  }, [mapId, myRole, other, names, held]);

  const map = MAP_BY_ID[mapId];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-pixel text-sm">
        <span style={{ color: COLORS.chaser }}>{names.chaser} · CHASER</span>
        <span className={`text-2xl tabular-nums ${hud.time < 10 ? 'text-signal-red' : ''}`}>{Math.ceil(hud.time)}</span>
        <span style={{ color: COLORS.runner }}>RUNNER · {names.runner}</span>
      </div>
      <div className="game-surface relative overflow-hidden rounded-xl border border-ink-600">
        <canvas ref={canvas} width={map.rows[0].length * TILE} height={map.rows.length * TILE} className="pixelated block h-auto w-full" aria-label="TAG online arena" />
        {hud.phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center font-pixel">
              <div className="text-7xl drop-shadow-[0_4px_0_#000]">{Math.max(1, Math.ceil(hud.countdown))}</div>
              <div className="mt-2 text-sm" style={{ color: COLORS[myRole] }}>YOU ARE THE {myRole.toUpperCase()}</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-paper-mute">
        <span>Server-authoritative · {hud.ping}ms ping</span>
        <span>WASD / arrows · Space to dash</span>
      </div>
      <TouchPad stick={stick} actionLabel="Dash" />
    </div>
  );
}
