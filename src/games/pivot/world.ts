// PIVOT — world generation + physics. One button flips gravity.
// The course is generated in columns. Each column says which surfaces are
// deadly; the generator always leaves a safe side and spaces side-switches far
// enough apart (scaled to speed) that a flip can make it — so every run is fair.
import { createRng, type Rng } from '../../lib/rng';

export const W = 400, H = 240, COL = 20, TOP = 28, BOT = 212, P = 10; // P = player half-size
export type Column = { floor: 'solid' | 'spike' | 'gap'; ceil: 'solid' | 'spike' | 'gap'; block: 'none' | 'low' | 'high' };
export type World = {
  rng: Rng; cols: Column[]; firstCol: number; scroll: number; speed: number;
  y: number; vy: number; g: 1 | -1; dead: boolean; dist: number; t: number; safe: 'floor' | 'ceil'; runLeft: number; flips: number; overlap: number;
};

export function newWorld(seed: string): World {
  const w: World = { rng: createRng(`pivot:${seed}`), cols: [], firstCol: 0, scroll: 0, speed: 170, y: BOT - P, vy: 0, g: 1, dead: false, dist: 0, t: 0, safe: 'floor', runLeft: 30, flips: 0, overlap: 0 };
  while (w.cols.length < Math.ceil(W / COL) + 4) w.cols.push(genCol(w));
  return w;
}

function genCol(w: World): Column {
  const r = w.rng;
  const warm = w.firstCol + w.cols.length < 22; // a calm start
  if (w.overlap > 0) { w.overlap--; return { floor: 'solid', ceil: 'solid', block: 'none' }; }
  if (w.runLeft <= 0 && !warm) {
    // Switch the safe side. A flip takes ~0.37s to cross, so the "both sides safe"
    // window is sized to the current speed (plus margin) — always reachable.
    w.safe = w.safe === 'floor' ? 'ceil' : 'floor';
    w.overlap = Math.ceil((w.speed * 0.5) / COL) + 1;
    w.runLeft = 6 + r.int(0, 8);
    return { floor: 'solid', ceil: 'solid', block: 'none' };
  }
  w.runLeft--;
  if (warm) return { floor: 'solid', ceil: 'solid', block: 'none' };
  const danger = r.chance(0.55 + Math.min(0.3, w.dist / 40000));
  const hazard = (): Column['floor'] => (danger ? (r.chance(0.5) ? 'spike' : 'gap') : 'solid');
  const col: Column = { floor: 'solid', ceil: 'solid', block: 'none' };
  // the unsafe side gets hazards, the safe side stays solid
  if (w.safe === 'floor') { col.ceil = hazard(); if (danger && r.chance(0.25)) col.block = 'high'; }
  else { col.floor = hazard(); if (danger && r.chance(0.25)) col.block = 'low'; }
  return col;
}

export function flip(w: World) {
  if (w.dead) return;
  w.g = w.g === 1 ? -1 : 1;
  w.flips++;
}

/** Advance the simulation. Returns 'dead' on the frame the player dies. */
export function step(w: World, dt: number): 'ok' | 'dead' {
  if (w.dead) return 'ok';
  w.t += dt;
  w.speed = Math.min(430, 170 + w.t * 4.2);
  const dx = w.speed * dt;
  w.scroll += dx;
  w.dist += dx;
  while (w.scroll >= COL) { w.scroll -= COL; w.cols.shift(); w.firstCol++; w.cols.push(genCol(w)); }
  // gravity
  w.vy += w.g * 2400 * dt;
  w.vy = Math.max(-620, Math.min(620, w.vy));
  w.y += w.vy * dt;
  const px = 80;
  const col = colAt(w, px);
  // landing / gaps
  if (w.y + P >= BOT) {
    if (col.floor === 'gap') { if (w.y - P > H + 20) return die(w); }
    else { w.y = BOT - P; w.vy = 0; if (col.floor === 'spike') return die(w); }
  }
  if (w.y - P <= TOP) {
    if (col.ceil === 'gap') { if (w.y + P < -20) return die(w); }
    else { w.y = TOP + P; w.vy = 0; if (col.ceil === 'spike') return die(w); }
  }
  // mid blocks: low = rises 70px from floor, high = hangs 70px from ceiling
  for (const x of [px - P + 2, px + P - 2]) {
    const c = colAt(w, x);
    if (c.block === 'low' && w.y + P > BOT - 70) return die(w);
    if (c.block === 'high' && w.y - P < TOP + 70) return die(w);
  }
  if (w.y > H + 40 || w.y < -40) return die(w);
  return 'ok';
}
const die = (w: World): 'dead' => { w.dead = true; return 'dead'; };
export function colAt(w: World, screenX: number): Column {
  return w.cols[Math.floor((screenX + w.scroll) / COL)] ?? { floor: 'solid', ceil: 'solid', block: 'none' };
}
export const meters = (w: World) => Math.floor(w.dist / 10);
