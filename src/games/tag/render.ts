// TAG pixel-art renderer (Canvas 2D). Draws at 16px per tile; the canvas is
// scaled up with CSS `image-rendering: pixelated` for crisp retro pixels.
import { MAP_BY_ID } from './maps';
import { DASH_COOLDOWN, type Actor, type MatchState, type Role } from './sim';

export const TILE = 16;
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
export type RenderOpts = {
  names: Record<Role, string>;
  colors: Record<Role, string>;
  me?: Role | null; // the local viewer (affects ghost visibility)
  particles: Particle[];
  shake: number;
  time: number;
  pixelFont: string;
};

let fontFamily = '';
export function pixelFont(): string {
  if (!fontFamily && typeof document !== 'undefined') {
    fontFamily = getComputedStyle(document.body).getPropertyValue('--font-pixel').trim() || 'monospace';
  }
  return fontFamily || 'monospace';
}

export function drawTag(ctx: CanvasRenderingContext2D, s: MatchState, o: RenderOpts) {
  const map = MAP_BY_ID[s.mapId];
  const W = map.rows[0].length * TILE, H = map.rows.length * TILE;
  const pal = map.palette;
  ctx.save();
  if (o.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * o.shake), Math.round((Math.random() - 0.5) * o.shake));
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // Tiles
  for (let y = 0; y < map.rows.length; y++) {
    for (let x = 0; x < map.rows[y].length; x++) {
      const c = map.rows[y][x];
      const px = x * TILE, py = y * TILE;
      if (c === '#') continue;
      ctx.fillStyle = (x + y) % 2 ? pal.floor : pal.floor2;
      ctx.fillRect(px, py, TILE, TILE);
      if (c === '~') {
        ctx.fillStyle = '#3d2c17';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#4e3a20';
        const k = (x * 7 + y * 13) % 5;
        ctx.fillRect(px + 3 + k, py + 4, 2, 2);
        ctx.fillRect(px + 10 - k, py + 11, 3, 2);
        ctx.fillRect(px + 7, py + 8 + (k % 3), 2, 1);
      }
      if (c === 'B') {
        const phase = Math.floor(o.time * 6) % 3;
        ctx.fillStyle = '#0e1406';
        ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === phase ? pal.accent : `${pal.accent}55`;
          ctx.fillRect(px + 3 + i * 4, py + 5, 2, 6);
          ctx.fillRect(px + 5 + i * 4, py + 7, 1, 2);
        }
      }
    }
  }
  // Walls with a faux-3D top face
  for (let y = 0; y < map.rows.length; y++) {
    for (let x = 0; x < map.rows[y].length; x++) {
      if (map.rows[y][x] !== '#') continue;
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = pal.wall;
      ctx.fillRect(px, py, TILE, TILE);
      const below = map.rows[y + 1]?.[x];
      ctx.fillStyle = pal.wallTop;
      ctx.fillRect(px, py, TILE, below && below !== '#' ? TILE - 5 : TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(px, py, TILE, 1);
      if (below && below !== '#') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px, py + TILE, TILE, 3); // drop shadow on floor
      }
    }
  }

  // Power-ups
  for (const p of s.powers) {
    if (p.respawn > 0) continue;
    const bob = Math.sin(o.time * 5 + p.x) * 1.5;
    const cx = p.x * TILE, cy = p.y * TILE + bob;
    const col = p.type === 'speed' ? '#FFB800' : p.type === 'freeze' ? '#3DA9FF' : '#A66BFF';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(cx - 4, p.y * TILE + 5, 8, 2);
    ctx.fillStyle = col;
    ctx.fillRect(cx - 5, cy - 5, 10, 10);
    ctx.fillStyle = '#0A0A0A';
    if (p.type === 'speed') { ctx.fillRect(cx - 3, cy - 2, 2, 4); ctx.fillRect(cx - 1, cy - 1, 1, 2); ctx.fillRect(cx + 1, cy - 2, 2, 4); }
    if (p.type === 'freeze') { ctx.fillRect(cx - 1, cy - 4, 2, 8); ctx.fillRect(cx - 4, cy - 1, 8, 2); }
    if (p.type === 'ghost') { ctx.fillRect(cx - 3, cy - 3, 6, 5); ctx.fillStyle = col; ctx.fillRect(cx - 2, cy - 1, 1, 1); ctx.fillRect(cx + 1, cy - 1, 1, 1); ctx.fillStyle = '#0A0A0A'; ctx.fillRect(cx - 3, cy + 2, 1, 1); ctx.fillRect(cx + 2, cy + 2, 1, 1); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - 5, cy - 5, 3, 1);
  }

  // Particles
  for (const pt of o.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x * TILE - pt.size / 2), Math.round(pt.y * TILE - pt.size / 2), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // Actors (runner first so the chaser draws on top at the moment of the tag)
  drawActor(ctx, s.runner, 'runner', o, s);
  drawActor(ctx, s.chaser, 'chaser', o, s);
  ctx.restore();
}

function drawActor(ctx: CanvasRenderingContext2D, a: Actor, role: Role, o: RenderOpts, s: MatchState) {
  const cx = Math.round(a.x * TILE), cy = Math.round(a.y * TILE);
  const moving = Math.hypot(a.vx, a.vy) > 0.5;
  const bob = moving ? (Math.floor(o.time * 10) % 2) : 0;
  const color = o.colors[role];
  let alpha = 1;
  if (a.ghostT > 0) alpha = o.me && o.me !== role ? (Math.floor(o.time * 8) % 5 === 0 ? 0.35 : 0.08) : 0.45;
  ctx.globalAlpha = alpha;
  // speed afterimages
  if ((a.speedT > 0 || a.dashT > 0 || a.boostT > 0) && moving) {
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = alpha * (0.25 - i * 0.06);
      ctx.fillStyle = color;
      ctx.fillRect(cx - 5 - Math.round(a.vx * i * 0.6), cy - 6 - Math.round(a.vy * i * 0.6), 10, 11);
    }
    ctx.globalAlpha = alpha;
  }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(cx - 5, cy + 5, 10, 2);
  // body
  const y0 = cy - 7 - bob;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(cx - 6, y0, 12, 12);
  ctx.fillStyle = a.frozenT > 0 ? '#9fd8ff' : color;
  ctx.fillRect(cx - 5, y0 + 1, 10, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - 5, y0 + 1, 10, 2);
  // eyes look toward facing
  const ex = Math.round(a.fx * 1.5), ey = Math.round(a.fy * 1.5);
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(cx - 3 + ex, y0 + 4 + ey, 2, 3);
  ctx.fillRect(cx + 1 + ex, y0 + 4 + ey, 2, 3);
  if (role === 'chaser') {
    // angry brows + horns
    ctx.fillRect(cx - 4 + ex, y0 + 3 + ey, 3, 1);
    ctx.fillRect(cx + 1 + ex, y0 + 3 + ey, 3, 1);
    ctx.fillStyle = color;
    ctx.fillRect(cx - 6, y0 - 2, 2, 2);
    ctx.fillRect(cx + 4, y0 - 2, 2, 2);
  } else {
    // antenna
    ctx.fillStyle = color;
    ctx.fillRect(cx, y0 - 3, 1, 3);
    ctx.fillRect(cx - 1, y0 - 4, 3, 1);
  }
  // feet
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(cx - 4, y0 + 11, 3, 1 + (bob ? 0 : 1));
  ctx.fillRect(cx + 1, y0 + 11, 3, 1 + (bob ? 1 : 0));
  if (a.frozenT > 0) {
    ctx.strokeStyle = '#d9f1ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 7.5, y0 - 1.5, 15, 15);
  }
  ctx.globalAlpha = 1;
  // name tag
  if (alpha > 0.3) {
    ctx.font = `8px ${o.pixelFont}`;
    ctx.textAlign = 'center';
    const label = o.names[role];
    const w = ctx.measureText(label).width + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, y0 - 13, w, 9);
    ctx.fillStyle = color;
    ctx.fillText(label, cx, y0 - 6);
    // dash cooldown pip
    const cd = a.dashCd / DASH_COOLDOWN[role];
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(cx - 6, y0 + 14, 12, 1);
    ctx.fillStyle = cd === 0 ? color : '#666';
    ctx.fillRect(cx - 6, y0 + 14, Math.round(12 * (1 - cd)), 1);
  }
  void s;
}

export function spawnBurst(list: Particle[], x: number, y: number, color: string, n = 12, speed = 4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.4, color, size: Math.random() < 0.5 ? 2 : 1 });
  }
}

export function stepParticles(list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.9; p.vy *= 0.9;
    p.life -= dt;
    if (p.life <= 0) list.splice(i, 1);
  }
}
