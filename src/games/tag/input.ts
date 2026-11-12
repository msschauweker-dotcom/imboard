import type { Input } from './sim';

export type Scheme = 'wasd' | 'arrows' | 'both';

export function readInput(held: Set<string>, scheme: Scheme, stick?: { x: number; y: number; action: boolean }): Input {
  const k = (c: string) => held.has(c);
  let x = 0, y = 0, dash = false;
  if (scheme !== 'arrows') {
    x += (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
    y += (k('KeyS') ? 1 : 0) - (k('KeyW') ? 1 : 0);
    dash ||= k('Space') || k('ShiftLeft');
  }
  if (scheme !== 'wasd') {
    x += (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0);
    y += (k('ArrowDown') ? 1 : 0) - (k('ArrowUp') ? 1 : 0);
    dash ||= scheme === 'arrows' ? k('Enter') || k('Slash') || k('ShiftRight') || k('Period') : k('ShiftRight') || k('Enter');
  }
  if (stick) { x += stick.x; y += stick.y; dash ||= stick.action; }
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), dash };
}
