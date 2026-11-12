// BLOCKOUT rules — the single source of truth used by the UI and the tests.
import { DIRS, type Level } from './gen';

export type BState = {
  player: number;
  boxes: number[];
  moves: number;
  pushes: number;
  status: 'play' | 'won' | 'trapped' | 'crushed' | 'out-of-moves';
  lastPush: number | null;
};

export const initState = (L: Level): BState => ({ player: L.player, boxes: L.boxes.slice(), moves: 0, pushes: 0, status: 'play', lastPush: null });

export function applyMove(L: Level, s: BState, key: 'U' | 'R' | 'D' | 'L'): BState {
  if (s.status !== 'play') return s;
  const d = DIRS.find((x) => x.key === key)!;
  const step = d.y * L.w + d.x;
  const to = s.player + step;
  if (L.cells[to] === 'wall') return s;
  const bi = s.boxes.indexOf(to);
  let boxes = s.boxes;
  let pushes = s.pushes;
  let status: BState['status'] = 'play';
  let lastPush: number | null = null;
  if (bi >= 0) {
    const dest = to + step;
    if (L.cells[dest] === 'wall' || s.boxes.includes(dest)) return s;
    boxes = s.boxes.slice();
    boxes[bi] = dest;
    pushes++;
    lastPush = dest;
    if (L.cells[dest] === 'trap') status = 'crushed';
  } else if (L.cells[to] === 'trap') {
    status = 'trapped';
  }
  const moves = s.moves + 1;
  if (status === 'play' && boxes.every((b) => L.targets.includes(b))) status = 'won';
  if (status === 'play' && L.moveLimit && moves >= L.moveLimit) status = 'out-of-moves';
  return { player: to, boxes, moves, pushes, status, lastPush };
}

export function replay(L: Level, moves: string): BState {
  let s = initState(L);
  for (const m of moves) s = applyMove(L, s, m as 'U');
  return s;
}
