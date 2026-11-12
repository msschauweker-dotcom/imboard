// GHOST RUN — courses, run recording, ghost replay and share-link encoding.
// A run is a list of steps (direction + start time). Replays are exact because
// movement is tile-to-tile at a fixed speed, so a ghost is tiny and link-shareable.
import { generateMaze } from '../escape/maze';

export const STEP_MS = 110; // time to cross one tile
export const DIRS: Record<string, [number, number]> = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
export type Step = { t: number; d: keyof typeof DIRS };
export type Ghost = { v: 1; course: string; name: string; ms: number; steps: Step[] };
export type Course = { id: string; name: string; tiles: string[]; W: number; H: number; start: [number, number]; finish: [number, number] };

export function course(id: string): Course {
  const m = id.match(/^c(\d+)$/);
  const n = m ? Math.max(1, Number(m[1])) : 6;
  const cw = Math.min(21, 7 + n), ch = Math.min(13, 5 + Math.ceil(n / 2));
  const maze = generateMaze(`ghost:${id}`, cw, ch, 0.12);
  const W = cw * 2 + 1, H = ch * 2 + 1;
  return { id, name: id.startsWith('daily-') ? `Daily course #${id.slice(6)}` : `Course ${n}`, tiles: maze.tiles, W, H, start: [1, 1], finish: [W - 2, H - 2] };
}

export const open = (c: Course, x: number, y: number) => c.tiles[y]?.[x] === '.';

/** Ghost position at time t (ms since GO). */
export function ghostAt(c: Course, g: Ghost, t: number): { x: number; y: number; done: boolean } {
  let [x, y] = c.start;
  for (const s of g.steps) {
    if (t < s.t) break;
    const [dx, dy] = DIRS[s.d];
    const k = Math.min(1, (t - s.t) / STEP_MS);
    if (k < 1) return { x: x + dx * k, y: y + dy * k, done: false };
    x += dx; y += dy;
  }
  return { x, y, done: t >= g.ms };
}

/** Replays a ghost against the course rules; rejects tampered or broken ghosts. */
export function validGhost(c: Course, g: Ghost): boolean {
  if (g.course !== c.id || !Array.isArray(g.steps) || g.steps.length > 5000) return false;
  let [x, y] = c.start;
  let last = -Infinity;
  for (const s of g.steps) {
    if (!DIRS[s.d] || s.t < last + STEP_MS - 5) return false; // can't move faster than the game allows
    last = s.t;
    x += DIRS[s.d][0]; y += DIRS[s.d][1];
    if (!open(c, x, y)) return false;
  }
  return x === c.finish[0] && y === c.finish[1] && g.ms >= last + STEP_MS - 5;
}

// ---------- share links ----------
export function encodeGhost(g: Ghost): string {
  let prev = 0; // encode against the rounded timeline so error never accumulates
  const deltas = g.steps.map((s) => { const d = Math.max(0, Math.round((s.t - prev) / 5)); prev += d * 5; return d.toString(36); }).join('.');
  const raw = [1, g.course, g.name.replace(/[|]/g, ''), g.ms, g.steps.map((s) => s.d).join(''), deltas].join('|');
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeGhost(code: string): Ghost | null {
  try {
    const raw = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))));
    const [v, courseId, name, ms, dirs, deltas] = raw.split('|');
    if (v !== '1') return null;
    const ds = deltas ? deltas.split('.').map((d) => parseInt(d, 36) * 5) : [];
    if (ds.length !== dirs.length) return null;
    let t = 0;
    const steps: Step[] = dirs.split('').map((d, i) => { t += ds[i]; return { t, d: d as Step['d'] }; });
    return { v: 1, course: courseId, name: name.slice(0, 18) || 'Friend', ms: Number(ms), steps };
  } catch {
    return null;
  }
}
