'use client';
// Guest-first player identity. A stable random id + editable name + pixel avatar,
// stored locally. The game server receives this id for rooms and leaderboards.
import { load, save } from './storage';

export type Avatar = { color: string; glyph: string };
export type Player = { id: string; name: string; avatar: Avatar; created: number; friends: Friend[] };
export type Friend = { id: string; name: string; avatar: Avatar; addedAt: number };

export const AVATAR_COLORS = ['#C8FF00', '#FF3D3D', '#3DA9FF', '#FFB800', '#A66BFF', '#00E5A8', '#FF6BD6', '#F2F0E9'];
export const AVATAR_GLYPHS = ['◆', '●', '▲', '■', '✶', '☻', '♠', '♣', '✚', '◐', '⚡', '☾'];

const ADJ = ['Lime', 'Quiet', 'Rapid', 'Static', 'Neon', 'Lucky', 'Feral', 'Hidden', 'Rogue', 'Pixel', 'Analog', 'Solar'];
const NOUN = ['Fox', 'Otter', 'Comet', 'Signal', 'Moth', 'Raven', 'Gecko', 'Ghost', 'Lynx', 'Pilot', 'Koi', 'Wolf'];

function rid(len = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const arr = new Uint32Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1e9);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

export function getPlayer(): Player {
  let p = load<Player | null>('player', null);
  if (!p || !p.id) {
    const r = () => Math.floor(Math.random() * 1e6);
    p = {
      id: rid(),
      name: `${ADJ[r() % ADJ.length]} ${NOUN[r() % NOUN.length]}`,
      avatar: { color: AVATAR_COLORS[r() % AVATAR_COLORS.length], glyph: AVATAR_GLYPHS[r() % AVATAR_GLYPHS.length] },
      created: Date.now(),
      friends: [],
    };
    save('player', p);
  }
  if (!p.friends) p.friends = [];
  return p;
}

export function updatePlayer(patch: Partial<Player>): Player {
  const p = { ...getPlayer(), ...patch };
  p.name = (p.name || 'Guest').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 18).trim() || 'Guest';
  save('player', p);
  return p;
}

/** Shareable friend code: id + name, so a friend can add you without accounts. */
export function friendCode(p: Player = getPlayer()): string {
  return `${p.id}`;
}

export function addFriend(f: Omit<Friend, 'addedAt'>): Player {
  const p = getPlayer();
  if (f.id === p.id) return p;
  const friends = p.friends.filter((x) => x.id !== f.id);
  friends.unshift({ ...f, addedAt: Date.now() });
  return updatePlayer({ friends: friends.slice(0, 100) });
}

export function removeFriend(id: string): Player {
  const p = getPlayer();
  return updatePlayer({ friends: p.friends.filter((f) => f.id !== id) });
}
