// HOT POTATO — two players, one bomb. Touch the other player to pass it.
// Built on the TAG arenas and movement physics. The fuse length is random and
// hidden; the bomb's spark speeds up as it gets close. Holder at boom = loses.
import { MAP_BY_ID } from '../tag/maps';
import { moveActor, aiInput, R, type Actor, type Input, type AiLevel, type AiMemory, type MatchState } from '../tag/sim';
import { createRng } from '../../lib/rng';

export type Who = 'p1' | 'p2';
export type HPState = {
  mapId: string; phase: 'countdown' | 'play' | 'boom'; countdown: number;
  p1: Actor; p2: Actor; holder: Who; fuse: number; fuseTotal: number; passCd: number; passes: number; loser: Who | null;
  events: string[];
};

const actor = (x: number, y: number): Actor => ({ x, y, vx: 0, vy: 0, dashCd: 0, dashT: 0, speedT: 0, frozenT: 0, ghostT: 0, boostT: 0, fx: 1, fy: 0 });

export function createRound(mapId: string, seed: string): HPState {
  const map = MAP_BY_ID[mapId] ?? MAP_BY_ID.courtyard;
  const r = createRng(`hp:${seed}`);
  const spots = (ch: string) => map.rows.flatMap((row, y) => row.split('').map((c, x) => (c === ch ? [x + 0.5, y + 0.5] : null)).filter(Boolean) as number[][]);
  const a = r.pick(spots('C')), b = r.pick(spots('R'));
  const fuse = 14 + r.next() * 14; // 14–28 s, hidden from players
  return {
    mapId: map.id, phase: 'countdown', countdown: 3, p1: actor(a[0], a[1]), p2: actor(b[0], b[1]),
    holder: r.chance(0.5) ? 'p1' : 'p2', fuse, fuseTotal: fuse, passCd: 0, passes: 0, loser: null, events: [],
  };
}

export function stepRound(s: HPState, inp: Record<Who, Input>, dt: number) {
  const map = MAP_BY_ID[s.mapId];
  if (s.phase === 'boom') return s;
  if (s.phase === 'countdown') {
    const before = Math.ceil(s.countdown);
    s.countdown -= dt;
    if (Math.ceil(s.countdown) !== before && s.countdown > 0) s.events.push('count');
    if (s.countdown <= 0) { s.phase = 'play'; s.events.push('go'); }
    return s;
  }
  // Same top speed for both; the holder's dash recharges faster (chaser rules).
  for (const who of ['p1', 'p2'] as Who[]) moveActor(map, s[who], inp[who], s.holder === who ? 'chaser' : 'runner', dt);
  s.passCd = Math.max(0, s.passCd - dt);
  if (s.passCd === 0 && Math.hypot(s.p1.x - s.p2.x, s.p1.y - s.p2.y) < R * 2) {
    s.holder = s.holder === 'p1' ? 'p2' : 'p1';
    s.passCd = 1.2; // no instant pass-backs
    s.passes++;
    s[s.holder].frozenT = 0.35; // brief stun on receiving
    s.events.push('pass');
  }
  s.fuse -= dt;
  if (s.fuse <= 0) { s.phase = 'boom'; s.loser = s.holder; s.events.push('boom'); }
  return s;
}

/** 0 → 1 as the fuse burns; the UI only reveals it as spark speed, never as a number. */
export const heat = (s: HPState) => 1 - Math.max(0, s.fuse) / s.fuseTotal;

/** CPU opponent: reuses TAG's pathfinding AI — chase when holding, flee when not. */
export function cpuInput(s: HPState, cpu: Who, level: AiLevel, mem: AiMemory, now: number): Input {
  const other: Who = cpu === 'p1' ? 'p2' : 'p1';
  const holding = s.holder === cpu;
  const fake = { mapId: s.mapId, phase: s.phase === 'play' ? 'play' : 'countdown', chaser: holding ? s[cpu] : s[other], runner: holding ? s[other] : s[cpu], powers: [] } as unknown as MatchState;
  if (holding && s.passCd > 0) return { x: 0, y: 0 }; // can't pass yet
  return aiInput(fake, holding ? 'chaser' : 'runner', level, mem, now);
}
