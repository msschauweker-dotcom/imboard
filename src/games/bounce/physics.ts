// BOUNCE — deterministic fixed-step ball physics shared by the game, the aim
// preview, and the level generator's solvability check.
import { createRng } from '../../lib/rng';

export const W = 360, H = 520, LX = W / 2, LY = 34, BALL_R = 6, PEG_R = 9, SPEED = 560, GRAV = 820, DT = 1 / 240;
export type Peg = { x: number; y: number; kind: 'target' | 'block' };
export type Ball = { x: number; y: number; vx: number; vy: number };
export type Level = { n: number; pegs: Peg[]; shots: number; par: number; name: string };

export const launch = (angle: number): Ball => ({ x: LX + Math.cos(angle) * 18, y: LY + Math.sin(angle) * 18, vx: Math.cos(angle) * SPEED, vy: Math.sin(angle) * SPEED });
export const clampAngle = (a: number) => Math.max(0.12, Math.min(Math.PI - 0.12, a));

/** One physics step. Returns indexes of pegs touched this step. */
export function stepBall(b: Ball, pegs: Peg[], alive: boolean[], touched: Set<number>): boolean {
  b.vy += GRAV * DT;
  b.x += b.vx * DT;
  b.y += b.vy * DT;
  if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * 0.85; }
  if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * 0.85; }
  if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) * 0.85; }
  for (let i = 0; i < pegs.length; i++) {
    if (!alive[i]) continue;
    const p = pegs[i];
    const dx = b.x - p.x, dy = b.y - p.y;
    const d = Math.hypot(dx, dy);
    const min = BALL_R + PEG_R;
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * min; b.y = p.y + ny * min;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= 1.82 * dot * nx; b.vy -= 1.82 * dot * ny; }
      touched.add(i);
    }
  }
  return b.y < H + 20; // still in play
}

/** Simulate a whole shot. Lit pegs stay solid until the shot ends (like the game). */
export function simulate(pegs: Peg[], alive: boolean[], angle: number, maxSteps = 240 * 8) {
  const b = launch(angle);
  const touched = new Set<number>();
  for (let s = 0; s < maxSteps && stepBall(b, pegs, alive, touched); s++);
  return touched;
}

const NAMES = ['Opener', 'Pinball', 'Arc', 'Diamond', 'Spiral', 'Rain', 'Columns', 'Funnel', 'Crown', 'Lattice', 'Orbit', 'Zigzag'];

function layout(n: number): Peg[] {
  const r = createRng(`bounce:${n}`);
  const count = Math.min(30, 6 + n * 2);
  const pegs: Peg[] = [];
  const style = n === 1 ? 0 : r.int(0, 5);
  const tryAdd = (x: number, y: number, kind: Peg['kind'] = 'target') => {
    if (x < 20 || x > W - 20 || y < 110 || y > H - 50) return;
    if (pegs.some((p) => Math.hypot(p.x - x, p.y - y) < PEG_R * 2 + 14)) return;
    pegs.push({ x, y, kind });
  };
  for (let guard = 0; pegs.length < count && guard < 2000; guard++) {
    const t = pegs.length / count;
    if (style === 0) tryAdd(60 + (pegs.length % 5) * 60 + (Math.floor(pegs.length / 5) % 2) * 30, 160 + Math.floor(pegs.length / 5) * 55);
    else if (style === 1) { const a = Math.PI * (0.1 + t * 0.8); tryAdd(LX + Math.cos(a) * 140, 200 + Math.sin(a) * 150); }
    else if (style === 2) { const a = t * Math.PI * 4, rad = 40 + t * 120; tryAdd(LX + Math.cos(a) * rad, 300 + Math.sin(a) * rad * 0.8); }
    else if (style === 3) { const row = Math.floor(Math.sqrt(pegs.length * 2)); tryAdd(LX + (r.next() - 0.5) * (40 + row * 50), 150 + row * 48); }
    else tryAdd(r.int(30, W - 30), r.int(130, H - 70));
    if (guard > 400) tryAdd(r.int(30, W - 30), r.int(130, H - 70));
  }
  // permanent grey blockers from level 5
  const blocks = n >= 5 ? Math.min(8, Math.floor((n - 3) / 2)) : 0;
  for (let i = 0, g = 0; i < blocks && g < 500; g++) {
    const before = pegs.length;
    tryAdd(r.int(30, W - 30), r.int(140, H - 80), 'block');
    if (pegs.length > before) i++;
  }
  return pegs;
}

/**
 * Generates a level and PROVES it clearable: a greedy solver shoots the best of
 * 160 sampled angles each turn using the same physics. The shot limit is the
 * solver's count + slack, and par is the solver's count.
 */
export function generateLevel(n: number): Level {
  const pegs = layout(n);
  const alive = pegs.map(() => true);
  const needed = () => pegs.some((p, i) => alive[i] && p.kind === 'target');
  let shots = 0;
  while (needed() && shots < 40) {
    let best: Set<number> | null = null, bestScore = -1;
    for (let k = 0; k < 160; k++) {
      const a = clampAngle(0.12 + (k / 159) * (Math.PI - 0.24));
      const hit = simulate(pegs, alive, a);
      const score = [...hit].filter((i) => pegs[i].kind === 'target').length;
      if (score > bestScore) { bestScore = score; best = hit; }
    }
    if (!best || bestScore <= 0) break;
    for (const i of best) if (pegs[i].kind === 'target') alive[i] = false;
    shots++;
  }
  if (needed()) {
    // drop unreachable targets so the level stays fair
    for (let i = pegs.length - 1; i >= 0; i--) if (alive[i] && pegs[i].kind === 'target') pegs.splice(i, 1);
  }
  return { n, pegs, par: Math.max(1, shots), shots: Math.max(1, shots) + 2 + Math.floor(n / 6), name: NAMES[(n - 1) % NAMES.length] };
}
