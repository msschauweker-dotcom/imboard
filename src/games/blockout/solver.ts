// Independent push-based BFS solver, used by tests to double-check the
// generator's "solvable by construction" guarantee. Returns the push list or null.
import { DIRS, type Level } from './gen';

export function solve(level: Level, maxStates = 200000): { box: number; d: number }[] | null {
  const { w, cells, targets } = level;
  const tset = new Set(targets);
  const open = (i: number) => cells[i] === 'floor';
  const reach = (boxes: Set<number>, from: number) => {
    const seen = new Set([from]);
    const q = [from];
    let min = from;
    while (q.length) {
      const c = q.pop()!;
      for (const D of DIRS) {
        const n = c + D.y * w + D.x;
        if (!seen.has(n) && open(n) && !boxes.has(n)) { seen.add(n); q.push(n); if (n < min) min = n; }
      }
    }
    return { seen, min };
  };
  const key = (boxes: number[], pmin: number) => `${boxes.slice().sort((a, b) => a - b).join(',')}|${pmin}`;
  const start = { boxes: level.boxes.slice(), player: level.player, path: [] as { box: number; d: number }[] };
  const r0 = reach(new Set(start.boxes), start.player);
  const seen = new Set([key(start.boxes, r0.min)]);
  let frontier = [start];
  while (frontier.length && seen.size < maxStates) {
    const next: typeof frontier = [];
    for (const s of frontier) {
      if (s.boxes.every((b) => tset.has(b))) return s.path;
      const bset = new Set(s.boxes);
      const { seen: area } = reach(bset, s.player);
      for (let bi = 0; bi < s.boxes.length; bi++) {
        const b = s.boxes[bi];
        for (let d = 0; d < 4; d++) {
          const step = DIRS[d].y * w + DIRS[d].x;
          const stand = b - step;
          const dest = b + step;
          if (!area.has(stand) || !open(dest) || bset.has(dest)) continue;
          const nb = s.boxes.slice();
          nb[bi] = dest;
          const nr = reach(new Set(nb), b);
          const k = key(nb, nr.min);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ boxes: nb, player: b, path: [...s.path, { box: b, d }] });
        }
      }
    }
    frontier = next;
  }
  return null;
}
