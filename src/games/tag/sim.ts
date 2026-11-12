// TAG simulation — deterministic, framework-free. Runs in the browser for solo /
// local play and on the game server as the AUTHORITATIVE simulation for online
// matches (clients only send inputs; the server decides tags and wins).
import { MAP_BY_ID, type TagMap } from './maps';

export type Role = 'chaser' | 'runner';
export type Input = { x: number; y: number; dash?: boolean };
export type PowerType = 'speed' | 'freeze' | 'ghost';
export type Actor = {
  x: number; y: number; vx: number; vy: number;
  dashCd: number; dashT: number; speedT: number; frozenT: number; ghostT: number; boostT: number;
  fx: number; fy: number; // facing
};
export type Power = { x: number; y: number; type: PowerType; respawn: number };
export type MatchState = {
  mapId: string;
  phase: 'countdown' | 'play' | 'over';
  countdown: number;
  timeLeft: number;
  roundLength: number;
  winner: Role | null;
  chaser: Actor;
  runner: Actor;
  powers: Power[];
  rng: number;
  events: { t: string; who?: Role; type?: PowerType }[]; // transient, cleared by consumer
  tick: number;
};

export const R = 0.33; // actor radius (tiles)
export const MAX_SPEED = 5.4; // tiles / s
const ACCEL = 48;
const FRICTION = 14;
const DASH_SPEED = 2.4;
const DASH_TIME = 0.2;
export const DASH_COOLDOWN: Record<Role, number> = { chaser: 2.2, runner: 3.4 };
const POWER_TYPES: PowerType[] = ['speed', 'freeze', 'ghost'];

const rnd = (s: MatchState) => {
  // mulberry32 step on the state's own seed → identical on server & client
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const actor = (x: number, y: number): Actor => ({ x, y, vx: 0, vy: 0, dashCd: 0, dashT: 0, speedT: 0, frozenT: 0, ghostT: 0, boostT: 0, fx: 1, fy: 0 });

function spots(map: TagMap, ch: string) {
  const out: [number, number][] = [];
  map.rows.forEach((row, y) => row.split('').forEach((c, x) => c === ch && out.push([x + 0.5, y + 0.5])));
  return out;
}

export function createMatch(mapId: string, seed: string, roundLength = 60): MatchState {
  const map = MAP_BY_ID[mapId] ?? MAP_BY_ID.courtyard;
  if (map.rows.some((r) => r.length !== map.rows[0].length)) throw new Error(`map ${mapId} rows uneven`);
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const s: MatchState = {
    mapId: map.id, phase: 'countdown', countdown: 3, timeLeft: roundLength, roundLength, winner: null,
    chaser: actor(1.5, 1.5), runner: actor(2.5, 2.5), powers: [], rng: h | 0, events: [], tick: 0,
  };
  const cs = spots(map, 'C'), rs = spots(map, 'R');
  // Randomized starts, kept far apart so the runner gets a fair opening.
  for (let i = 0; i < 40; i++) {
    const c = cs[Math.floor(rnd(s) * cs.length)], r = rs[Math.floor(rnd(s) * rs.length)];
    if (Math.hypot(c[0] - r[0], c[1] - r[1]) >= 9 || i === 39) {
      s.chaser = actor(c[0], c[1]);
      s.runner = actor(r[0], r[1]);
      break;
    }
  }
  const ps = spots(map, '*');
  const shuffled = ps.map((p) => [rnd(s), p] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  s.powers = shuffled.slice(0, Math.min(3, ps.length)).map(([x, y]) => ({ x, y, type: POWER_TYPES[Math.floor(rnd(s) * 3)], respawn: 0 }));
  return s;
}

export function tileAt(map: TagMap, x: number, y: number): string {
  const row = map.rows[Math.floor(y)];
  return row?.[Math.floor(x)] ?? '#';
}
const solid = (map: TagMap, x: number, y: number) => tileAt(map, x, y) === '#';

function collides(map: TagMap, x: number, y: number) {
  return solid(map, x - R, y - R) || solid(map, x + R, y - R) || solid(map, x - R, y + R) || solid(map, x + R, y + R);
}

export function moveActor(map: TagMap, a: Actor, input: Input, role: Role, dt: number, events?: MatchState['events']) {
  a.dashCd = Math.max(0, a.dashCd - dt);
  a.dashT = Math.max(0, a.dashT - dt);
  a.speedT = Math.max(0, a.speedT - dt);
  a.ghostT = Math.max(0, a.ghostT - dt);
  a.boostT = Math.max(0, a.boostT - dt);
  if (a.frozenT > 0) {
    a.frozenT = Math.max(0, a.frozenT - dt);
    a.vx *= 0.8; a.vy *= 0.8;
    return;
  }
  let ix = Math.max(-1, Math.min(1, input.x || 0));
  let iy = Math.max(-1, Math.min(1, input.y || 0));
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  if (len > 0.1) { a.fx = ix; a.fy = iy; }
  if (input.dash && a.dashCd === 0 && len > 0.1) {
    a.dashT = DASH_TIME;
    a.dashCd = DASH_COOLDOWN[role];
    events?.push({ t: 'dash', who: role });
  }
  const tile = tileAt(map, a.x, a.y);
  if (tile === 'B' && a.boostT < 0.9) { a.boostT = 1.2; events?.push({ t: 'boost', who: role }); }
  let max = MAX_SPEED;
  if (tile === '~') max *= 0.55;
  if (len > 0.1) max *= Math.max(0.3, Math.min(1, len)); // analog / AI precision
  if (a.speedT > 0) max *= 1.4;
  if (a.boostT > 0) max *= 1.35;
  if (a.dashT > 0) {
    a.vx = a.fx * MAX_SPEED * DASH_SPEED;
    a.vy = a.fy * MAX_SPEED * DASH_SPEED;
  } else {
    a.vx += ix * ACCEL * dt;
    a.vy += iy * ACCEL * dt;
    if (len < 0.1) {
      const f = Math.max(0, 1 - FRICTION * dt);
      a.vx *= f; a.vy *= f;
    }
    const sp = Math.hypot(a.vx, a.vy);
    if (sp > max) { a.vx = (a.vx / sp) * max; a.vy = (a.vy / sp) * max; }
  }
  // Axis-separated movement with sub-steps so fast dashes can't tunnel walls.
  const steps = Math.ceil((Math.hypot(a.vx, a.vy) * dt) / 0.2) || 1;
  for (let i = 0; i < steps; i++) {
    const nx = a.x + (a.vx * dt) / steps;
    if (!collides(map, nx, a.y)) a.x = nx; else a.vx = 0;
    const ny = a.y + (a.vy * dt) / steps;
    if (!collides(map, a.x, ny)) a.y = ny; else a.vy = 0;
  }
}

export function stepMatch(s: MatchState, inputs: { chaser: Input; runner: Input }, dt: number): MatchState {
  const map = MAP_BY_ID[s.mapId];
  s.tick++;
  if (s.phase === 'over') return s;
  if (s.phase === 'countdown') {
    const before = Math.ceil(s.countdown);
    s.countdown -= dt;
    if (Math.ceil(s.countdown) !== before && s.countdown > 0) s.events.push({ t: 'count' });
    if (s.countdown <= 0) { s.phase = 'play'; s.events.push({ t: 'go' }); }
    return s;
  }
  moveActor(map, s.chaser, inputs.chaser, 'chaser', dt, s.events);
  moveActor(map, s.runner, inputs.runner, 'runner', dt, s.events);

  // Power-ups
  for (const p of s.powers) {
    if (p.respawn > 0) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        const ps = spots(map, '*').filter(([x, y]) => !s.powers.some((o) => o !== p && o.respawn <= 0 && o.x === x && o.y === y));
        const [x, y] = ps[Math.floor(rnd(s) * ps.length)] ?? [p.x, p.y];
        p.x = x; p.y = y; p.type = POWER_TYPES[Math.floor(rnd(s) * 3)]; p.respawn = 0;
      }
      continue;
    }
    for (const role of ['chaser', 'runner'] as Role[]) {
      const a = s[role];
      if (Math.hypot(a.x - p.x, a.y - p.y) < R + 0.35) {
        const other = s[role === 'chaser' ? 'runner' : 'chaser'];
        if (p.type === 'speed') a.speedT = 3;
        if (p.type === 'freeze') other.frozenT = 1.1;
        if (p.type === 'ghost') a.ghostT = 3.5;
        s.events.push({ t: 'power', who: role, type: p.type });
        p.respawn = 6;
        break;
      }
    }
  }

  // Tag check
  if (Math.hypot(s.chaser.x - s.runner.x, s.chaser.y - s.runner.y) < R * 2) {
    s.phase = 'over';
    s.winner = 'chaser';
    s.events.push({ t: 'tag' });
    return s;
  }
  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    s.phase = 'over';
    s.winner = 'runner';
    s.events.push({ t: 'timeup' });
  }
  return s;
}

// ---------------- Computer opponent ----------------
// BFS over tiles: the chaser paths to the runner; the runner picks a reachable
// tile that maximizes (chaser distance − own distance), preferring escape routes.
type Grid = { W: number; H: number; open: boolean[]; cost: number[] };
const gridCache = new Map<string, Grid>();
function gridFor(map: TagMap): Grid {
  let g = gridCache.get(map.id);
  if (!g) {
    const H = map.rows.length, W = map.rows[0].length;
    const open: boolean[] = [], cost: number[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = map.rows[y][x]; open.push(c !== '#'); cost.push(c === '~' ? 2 : 1); }
    g = { W, H, open, cost };
    gridCache.set(map.id, g);
  }
  return g;
}
function bfs(g: Grid, from: number): Int32Array {
  const dist = new Int32Array(g.W * g.H).fill(1e9);
  dist[from] = 0;
  // small Dijkstra with bucket queue (costs 1 or 2)
  const buckets: number[][] = [[from]];
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d];
    if (!b) continue;
    for (const cur of b) {
      if (dist[cur] !== d) continue;
      const x = cur % g.W, y = (cur / g.W) | 0;
      const ns = [x > 0 ? cur - 1 : -1, x < g.W - 1 ? cur + 1 : -1, y > 0 ? cur - g.W : -1, y < g.H - 1 ? cur + g.W : -1];
      for (const n of ns) {
        if (n < 0 || !g.open[n]) continue;
        const nd = d + g.cost[n];
        if (nd < dist[n]) { dist[n] = nd; (buckets[nd] ||= []).push(n); }
      }
    }
  }
  return dist;
}

export type AiLevel = 'easy' | 'normal' | 'hard';
export type AiMemory = { target: number; until: number; wobble: number };
const AI_CFG: Record<AiLevel, { think: number; slow: number; dash: boolean; noise: number }> = {
  easy: { think: 0.45, slow: 0.72, dash: false, noise: 0.35 },
  normal: { think: 0.22, slow: 0.88, dash: true, noise: 0.15 },
  hard: { think: 0.1, slow: 1, dash: true, noise: 0 },
};

export function aiInput(s: MatchState, role: Role, level: AiLevel, mem: AiMemory, now: number): Input {
  if (s.phase !== 'play') return { x: 0, y: 0 };
  const map = MAP_BY_ID[s.mapId];
  const g = gridFor(map);
  const cfg = AI_CFG[level];
  const me = s[role];
  const foe = s[role === 'chaser' ? 'runner' : 'chaser'];
  const idx = (a: Actor) => Math.floor(a.y) * g.W + Math.floor(a.x);
  const myI = idx(me);
  if (now >= mem.until) {
    mem.until = now + cfg.think;
    mem.wobble = (Math.random() - 0.5) * cfg.noise;
    if (role === 'chaser') {
      mem.target = idx(foe);
    } else {
      const dFoe = bfs(g, idx(foe));
      const dMe = bfs(g, myI);
      let best = myI, bestScore = -Infinity;
      for (let i = 0; i < g.open.length; i++) {
        if (!g.open[i] || dMe[i] > 7 || dMe[i] >= 1e9) continue;
        // degree bonus: avoid dead ends
        const x = i % g.W, y = (i / g.W) | 0;
        let deg = 0;
        for (const n of [i - 1, i + 1, i - g.W, i + g.W]) if (g.open[n]) deg++;
        const pw = s.powers.some((p) => p.respawn <= 0 && Math.floor(p.x) === x && Math.floor(p.y) === y) ? 3 : 0;
        const score = dFoe[i] * 1.6 - dMe[i] * 0.6 + deg * 0.8 + pw + (dMe[i] >= dFoe[i] ? -50 : 0);
        if (score > bestScore) { bestScore = score; best = i; }
      }
      mem.target = best;
    }
  }
  // Follow the gradient of BFS distance from the target toward it.
  const dT = bfs(g, mem.target);
  let next = myI;
  let bestD = dT[myI];
  for (const n of [myI - 1, myI + 1, myI - g.W, myI + g.W]) if (g.open[n] && dT[n] < bestD) { bestD = dT[n]; next = n; }
  let tx: number, ty: number;
  if (next === myI) { tx = role === 'chaser' ? foe.x : (myI % g.W) + 0.5; ty = role === 'chaser' ? foe.y : ((myI / g.W) | 0) + 0.5; }
  else { tx = (next % g.W) + 0.5; ty = ((next / g.W) | 0) + 0.5; }
  let dx = tx - me.x, dy = ty - me.y;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l; dy /= l;
  // wobble / reduced precision on easier levels
  const c = Math.cos(mem.wobble), sn = Math.sin(mem.wobble);
  const rx = dx * c - dy * sn, ry = dx * sn + dy * c;
  const dist = Math.hypot(foe.x - me.x, foe.y - me.y);
  const dash = cfg.dash && (role === 'chaser' ? dist < 2.4 : dist < 1.8);
  return { x: rx * cfg.slow, y: ry * cfg.slow, dash };
}
