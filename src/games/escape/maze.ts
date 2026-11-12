// ESCAPE maze generation: recursive backtracker (perfect maze) + a few knocked-out
// walls to create loops, so enemies can be outmanoeuvred.
import { createRng } from '../../lib/rng';

export type Maze = { cw: number; ch: number; cells: { n: boolean; e: boolean; s: boolean; w: boolean }[][]; tiles: string[] };

export function generateMaze(seed: string, cw: number, ch: number, loops = 0.08): Maze {
  const rng = createRng(`maze:${seed}`);
  const cells = Array.from({ length: ch }, () => Array.from({ length: cw }, () => ({ n: true, e: true, s: true, w: true })));
  const seen = Array.from({ length: ch }, () => Array(cw).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = rng.shuffle([
      [0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e'],
    ] as const).filter(([dx, dy]) => seen[y + dy]?.[x + dx] === false);
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy, a, b] = opts[0];
    cells[y][x][a] = false;
    cells[y + dy][x + dx][b] = false;
    seen[y + dy][x + dx] = true;
    stack.push([x + dx, y + dy]);
  }
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (x < cw - 1 && rng.chance(loops)) { cells[y][x].e = false; cells[y][x + 1].w = false; }
    if (y < ch - 1 && rng.chance(loops)) { cells[y][x].s = false; cells[y + 1][x].n = false; }
  }
  // Tile grid: (2cw+1) × (2ch+1)
  const W = cw * 2 + 1, H = ch * 2 + 1;
  const t: string[][] = Array.from({ length: H }, () => Array(W).fill('#'));
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const tx = x * 2 + 1, ty = y * 2 + 1;
    t[ty][tx] = '.';
    if (!cells[y][x].e) t[ty][tx + 1] = '.';
    if (!cells[y][x].s) t[ty + 1][tx] = '.';
  }
  return { cw, ch, cells, tiles: t.map((r) => r.join('')) };
}
