// BLOCKOUT level generator — solvable BY CONSTRUCTION.
//
// We start from the solved state (every block on a target) and play the game
// BACKWARDS: the player walks and *pulls* blocks. Every reverse pull is exactly
// the inverse of a forward push, so replaying the history forwards is a valid
// solution. Traps are only placed on cells that solution never touches, and the
// move limit is derived from that real solution (with shortest walks between
// pushes), so limited-move levels are always beatable.
import { createRng } from '../../lib/rng';

export type Cell = 'wall' | 'floor' | 'trap';
export type Level = {
  id: number;
  w: number;
  h: number;
  cells: Cell[]; // row-major
  targets: number[];
  boxes: number[];
  player: number;
  moveLimit: number | null;
  par: number; // moves in our reference solution
  solution: string; // reference solution, e.g. "UURDL…" (used by tests + hint)
  name: string;
};

export const DIRS = [
  { x: 0, y: -1, key: 'U' },
  { x: 1, y: 0, key: 'R' },
  { x: 0, y: 1, key: 'D' },
  { x: -1, y: 0, key: 'L' },
] as const;

const NAMES = ['Warmup', 'Shuffle', 'Corner Case', 'Cold Storage', 'Loading Dock', 'Tight Squeeze', 'Back Alley', 'Crossfire', 'Signal Box', 'Freight', 'Labyrinth', 'Vault', 'Overflow', 'Static', 'Gridlock', 'Deadline', 'Bunker', 'Relay', 'Junction', 'Last Call'];

export function configFor(level: number) {
  const boxes = Math.min(5, 1 + Math.floor((level + 1) / 4));
  const w = Math.min(11, 7 + Math.floor(level / 5));
  const h = Math.min(10, 7 + Math.floor(level / 6));
  const walls = Math.min(0.2, 0.06 + level * 0.006);
  const pulls = 30 + level * 8;
  const traps = level >= 4 ? Math.min(6, 1 + Math.floor((level - 4) / 3)) : 0;
  const limited = level >= 5 && level % 3 === 2;
  return { boxes, w, h, walls, pulls, traps, limited };
}

export function generateLevel(level: number, salt = ''): Level {
  for (let attempt = 0; attempt < 200; attempt++) {
    const lv = tryGenerate(level, `${salt}blockout-${level}-${attempt}`);
    if (lv) return lv;
  }
  throw new Error('level generation failed');
}

function tryGenerate(level: number, seed: string): Level | null {
  const rng = createRng(seed);
  const c = configFor(level);
  const { w, h } = c;
  const cells: Cell[] = Array(w * h).fill('floor');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) cells[y * w + x] = 'wall';
  for (let i = 0; i < w * h; i++) if (cells[i] === 'floor' && rng.chance(c.walls)) cells[i] = 'wall';
  const floors = () => cells.map((v, i) => (v === 'floor' ? i : -1)).filter((i) => i >= 0);
  // Keep only the largest connected floor region.
  const region = largestRegion(cells, w, h);
  for (let i = 0; i < cells.length; i++) if (cells[i] === 'floor' && !region.has(i)) cells[i] = 'wall';
  const fl = floors();
  if (fl.length < c.boxes * 4 + 8) return null;

  // Targets: prefer non-corner cells (blocks in corners are unpushable).
  const notCorner = fl.filter((i) => openNeighbours(cells, w, i) >= 3);
  if (notCorner.length < c.boxes + 1) return null;
  const sh = rng.shuffle(notCorner);
  const targets = sh.slice(0, c.boxes);
  let boxes = targets.slice();
  let player = sh[c.boxes];
  const visited = new Set<number>([player, ...boxes]);
  // history of reverse moves: {dir, pulled}
  const history: { d: number; pulled: boolean }[] = [];

  for (let step = 0; step < c.pulls * 3 && history.filter((x) => x.pulled).length < c.pulls; step++) {
    const d = rng.int(0, 3);
    const D = DIRS[d];
    const px = player % w, py = Math.floor(player / w);
    const nx = px + D.x, ny = py + D.y;
    const next = ny * w + nx;
    if (cells[next] !== 'floor' || boxes.includes(next)) continue;
    const behind = (py - D.y) * w + (px - D.x);
    const bi = boxes.indexOf(behind);
    const pull = bi >= 0 && rng.chance(0.75);
    if (pull) {
      boxes = boxes.slice();
      boxes[bi] = player;
    }
    player = next;
    visited.add(player);
    if (pull) visited.add(boxes[bi]);
    history.push({ d, pulled: pull });
  }
  const offTarget = boxes.filter((b) => !targets.includes(b)).length;
  if (offTarget < Math.min(c.boxes, 1 + Math.floor(c.boxes / 2)) || offTarget === 0) return null;
  // no box should start in a dead corner (cannot happen by construction, but double-check)
  if (boxes.some((b) => !targets.includes(b) && openNeighbours(cells, w, b) < 2)) return null;

  // Traps on floor cells the reference solution never uses.
  const free = fl.filter((i) => !visited.has(i) && !targets.includes(i));
  const trapCells = rng.shuffle(free).slice(0, c.traps);
  for (const t of trapCells) cells[t] = 'trap';

  // Forward reference solution: reverse the pushes, walk shortest paths between them.
  const pushes = history
    .map((hst, idx) => ({ ...hst, idx }))
    .filter((x) => x.pulled)
    .reverse();
  // Recompute forward: each reverse pull at (player P moving dir d, box from P-d → P)
  // becomes forward: player stands at P+d... We just replay by simulation instead:
  const solution = forwardMoves(cells, w, h, boxes, player, targets, history);
  if (solution == null) return null;
  const par = solution.length;
  if (par < Math.min(60, 8 + level * 2)) return null; // keep difficulty rising
  void pushes;

  return {
    id: level,
    w,
    h,
    cells,
    targets,
    boxes,
    player,
    moveLimit: c.limited ? par + Math.max(4, Math.floor(par * 0.25)) : null,
    par,
    solution,
    name: NAMES[(level - 1) % NAMES.length],
  };
}

function openNeighbours(cells: Cell[], w: number, i: number) {
  let n = 0;
  for (const D of DIRS) if (cells[i + D.y * w + D.x] !== 'wall') n++;
  return n;
}

function largestRegion(cells: Cell[], w: number, h: number): Set<number> {
  const seen = new Set<number>();
  let best = new Set<number>();
  for (let i = 0; i < w * h; i++) {
    if (cells[i] !== 'floor' || seen.has(i)) continue;
    const comp = new Set<number>([i]);
    const q = [i];
    seen.add(i);
    while (q.length) {
      const cur = q.pop()!;
      for (const D of DIRS) {
        const n = cur + D.y * w + D.x;
        if (cells[n] === 'floor' && !seen.has(n)) { seen.add(n); comp.add(n); q.push(n); }
      }
    }
    if (comp.size > best.size) best = comp;
  }
  return best;
}

/** BFS walk distance for the player avoiding walls, traps and boxes. */
export function walkPath(cells: Cell[], w: number, boxes: number[], from: number, to: number): number[] | null {
  if (from === to) return [];
  const prev = new Map<number, number>([[from, -1]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (let d = 0; d < 4; d++) {
      const n = cur + DIRS[d].y * w + DIRS[d].x;
      if (prev.has(n) || cells[n] !== 'floor' || boxes.includes(n)) continue;
      prev.set(n, cur * 4 + d);
      if (n === to) {
        const path: number[] = [];
        let c = n;
        while (c !== from) { const p = prev.get(c)!; path.unshift(p % 4); c = Math.floor(p / 4); }
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

/**
 * Converts the reverse history into a forward solution and counts its moves,
 * using shortest walks between pushes. Returns null if anything is inconsistent.
 */
function forwardMoves(cells: Cell[], w: number, _h: number, startBoxes: number[], startPlayer: number, targets: number[], history: { d: number; pulled: boolean }[]): string | null {
  // Reconstruct the reverse states to obtain each forward push as (box position, direction).
  // Reverse pull: player at P moves in dir d to P+d, box at P-d moves to P.
  // Forward equivalent: player at P+d pushes in dir -d: box P → P-d, player → P.
  // Walk the reverse history backwards from the final state.
  let boxes = startBoxes.slice();
  let player = startPlayer;
  let moves = '';
  // Rebuild positions along the reverse path by replaying it from the solved state.
  const states: { player: number; boxes: number[] }[] = [];
  {
    let b = targets.slice();
    // find initial reverse player: replay requires it; derive by undoing history from the end.
    let p = startPlayer;
    let bs = startBoxes.slice();
    for (let k = history.length - 1; k >= 0; k--) {
      const D = DIRS[history[k].d];
      const prevP = p - (D.y * w + D.x);
      states.unshift({ player: p, boxes: bs });
      if (history[k].pulled) {
        const bi = bs.indexOf(prevP);
        if (bi < 0) return null;
        bs = bs.slice();
        bs[bi] = prevP - (D.y * w + D.x);
      }
      p = prevP;
    }
    void b;
    b = bs;
    if (b.slice().sort().join() !== targets.slice().sort().join()) return null;
  }
  // Forward: iterate reverse pulls from last to first.
  for (let k = history.length - 1; k >= 0; k--) {
    if (!history[k].pulled) continue;
    const D = DIRS[history[k].d];
    const step = D.y * w + D.x;
    const after = states[k]; // state right after reverse pull k
    const P = after.player - step; // where the player stood before pulling
    // Forward push: player must stand at P+step (= after.player), box at P, push dir -step.
    const stand = P + step;
    const walk = walkPath(cells, w, boxes, player, stand);
    if (walk == null) return null;
    moves += walk.map((d) => DIRS[d].key).join('') + DIRS[(history[k].d + 2) % 4].key;
    const bi = boxes.indexOf(P);
    if (bi < 0) return null;
    boxes = boxes.slice();
    boxes[bi] = P - step;
    player = P;
  }
  if (boxes.slice().sort().join() !== targets.slice().sort().join()) return null;
  return moves;
}
