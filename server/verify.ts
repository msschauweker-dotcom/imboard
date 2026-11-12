// Server-side verification & scoring. Every competitive result is recomputed
// here from raw play data using the SAME game logic the browser uses.
import { seededAnswer, dailyAnswer, verifyGame as verifyWordle, type Difficulty as WDiff } from '../src/games/wordle/logic';
import { generatePuzzle, verifyGame as verifyConnections, type Difficulty as CDiff } from '../src/games/connections/generate';
import { generateGame, dailyGame, scoreGame, type ThemeChoice } from '../src/games/krillion/engine';
import { generateLevel } from '../src/games/blockout/gen';
import { replay } from '../src/games/blockout/game';

export type Verdict = { ok: true; value: number; display: string } | { ok: false; reason: string };
type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const strArr = (v: unknown, max: number, maxLen = 64): string[] | null =>
  Array.isArray(v) && v.length <= max && v.every((s) => typeof s === 'string' && s.length <= maxLen) ? (v as string[]) : null;

const DIFFS = ['easy', 'normal', 'hard'];
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** Versus round scoring: higher `value` wins; equal values draw. `elapsed` is measured by the server. */
export function scoreVersus(game: string, settings: Any, seed: string, payload: Any, elapsed: number): Verdict {
  switch (game) {
    case 'wordle': {
      const diff = (DIFFS.includes(settings.difficulty) ? settings.difficulty : 'normal') as WDiff;
      const guesses = strArr(payload.guesses, 7, 5);
      if (!guesses) return { ok: false, reason: 'bad guesses' };
      const r = verifyWordle(seededAnswer(seed, diff), guesses.map((g) => g.toLowerCase()), diff);
      if (!r.ok) return { ok: false, reason: r.reason };
      return r.solved
        ? { ok: true, value: (10 - r.used) * 1e8 - Math.min(elapsed, 1e8 - 1), display: `Solved in ${r.used} · ${secs(elapsed)}` }
        : { ok: true, value: -1e12, display: 'Not solved' };
    }
    case 'connections': {
      const diff = (DIFFS.includes(settings.difficulty) ? settings.difficulty : 'normal') as CDiff;
      if (!Array.isArray(payload.guesses) || payload.guesses.length > 20) return { ok: false, reason: 'bad guesses' };
      const guesses = (payload.guesses as unknown[]).map((g) => strArr(g, 4, 20));
      if (guesses.some((g) => !g)) return { ok: false, reason: 'bad guesses' };
      const r = verifyConnections(generatePuzzle(seed, diff), guesses as string[][]);
      if (!r.ok) return { ok: false, reason: r.reason };
      return { ok: true, value: r.solved * 1e10 + (10 - r.mistakes) * 1e8 - Math.min(elapsed, 1e8 - 1), display: r.won ? `Solved · ${r.mistakes} mistake${r.mistakes === 1 ? '' : 's'} · ${secs(elapsed)}` : `${r.solved}/4 groups` };
    }
    case 'krillion': {
      const answers = strArr(payload.answers, 7, 48);
      if (!answers) return { ok: false, reason: 'bad answers' };
      const { total } = scoreGame(generateGame(seed, (settings.theme as ThemeChoice) || 'mixed'), answers);
      return { ok: true, value: total * 1e7 - Math.min(elapsed, 1e7 - 1), display: `${total} pts` };
    }
    case 'reflex': {
      const times = payload.times;
      const fs = Number(payload.falseStarts) || 0;
      if (!Array.isArray(times) || times.length !== 5 || !times.every((t) => typeof t === 'number' && t >= 90 && t <= 5000)) return { ok: false, reason: 'implausible reaction times' };
      const sum = times.reduce((a: number, b: number) => a + b, 0);
      if (elapsed < 5 * 1200 + sum - 1500) return { ok: false, reason: 'finished faster than possible' };
      const avg = Math.round(sum / 5 + (fs * 1000) / 5);
      return { ok: true, value: -avg, display: `${avg}ms avg` };
    }
    case 'stack': {
      const floors = Math.floor(Number(payload.floors));
      if (!(floors >= 0) || floors > elapsed / 250 + 2) return { ok: false, reason: 'implausible height' };
      return { ok: true, value: floors, display: `${floors} floors` };
    }
    case 'dodge': {
      const ms = Math.floor(Number(payload.survivedMs));
      if (!(ms >= 0) || ms > elapsed + 1500) return { ok: false, reason: 'survived longer than the round lasted' };
      return { ok: true, value: ms, display: `${(ms / 1000).toFixed(2)}s` };
    }
    case 'blockout': {
      const moves = typeof payload.moves === 'string' && /^[URDL]{1,2000}$/.test(payload.moves) ? payload.moves : null;
      if (!moves) return { ok: false, reason: 'bad moves' };
      const L = generateLevel(Number(settings.level) || 8, seed);
      const end = replay(L, moves);
      if (end.status !== 'won') return { ok: true, value: -1e12, display: 'Not solved' };
      if (elapsed < moves.length * 40) return { ok: false, reason: 'moved faster than possible' };
      return { ok: true, value: 1e10 - elapsed, display: `Solved · ${moves.length} moves · ${secs(elapsed)}` };
    }
    case 'escape': {
      const levels = Math.floor(Number(payload.levels));
      if (!(levels >= 0 && levels <= 3) || elapsed < levels * 2500) return { ok: false, reason: 'implausible run' };
      return { ok: true, value: levels * 1e10 - (payload.finished ? elapsed : 1e9), display: payload.finished ? `Escaped · ${secs(elapsed)}` : `${levels}/3 levels` };
    }
  }
  return { ok: false, reason: 'unknown game' };
}

/** Daily leaderboard scoring from raw play. */
export function scoreDaily(game: string, day: number, payload: Any): Verdict {
  if (game === 'wordle') {
    const guesses = strArr(payload.guesses, 6, 5);
    if (!guesses) return { ok: false, reason: 'bad guesses' };
    const r = verifyWordle(dailyAnswer(day), guesses.map((g) => g.toLowerCase()), 'normal');
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, value: r.solved ? 7 - r.used : 0, display: r.solved ? `${r.used}/6` : 'X/6' };
  }
  if (game === 'connections') {
    if (!Array.isArray(payload.guesses) || payload.guesses.length > 20) return { ok: false, reason: 'bad guesses' };
    const guesses = (payload.guesses as unknown[]).map((g) => strArr(g, 4, 20));
    if (guesses.some((g) => !g)) return { ok: false, reason: 'bad guesses' };
    const r = verifyConnections(generatePuzzle(`daily-${day}`, 'normal'), guesses as string[][]);
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, value: r.won ? 100 + (4 - r.mistakes) * 25 : r.solved * 20, display: r.won ? `${r.mistakes} mistakes` : `${r.solved}/4` };
  }
  if (game === 'krillion') {
    const answers = strArr(payload.answers, 7, 48);
    if (!answers) return { ok: false, reason: 'bad answers' };
    const { total } = scoreGame(dailyGame(day), answers);
    return { ok: true, value: total, display: `${total} pts` };
  }
  return { ok: false, reason: 'not a daily game' };
}

export const ARCADE_BOARDS: Record<string, { lowerIsBetter?: boolean; unit: string; fmt: (n: number) => string }> = {
  dodge: { unit: 's', fmt: (n) => `${(n / 1000).toFixed(2)}s` },
  reflex: { unit: 'ms', lowerIsBetter: true, fmt: (n) => `${n}ms` },
  stack: { unit: 'floors', fmt: (n) => `${n} floors` },
  escape: { unit: 'levels', fmt: (n) => `Level ${n}` },
  blockout: { unit: 'levels', fmt: (n) => `Level ${n}` },
  pivot: { unit: 'm', fmt: (n) => `${n}m` },
};

/** Arcade run plausibility checks (elapsed measured from the server-issued run token). */
export function checkRun(game: string, score: number, payload: Any, elapsed: number): string | null {
  if (!Number.isFinite(score) || score < 0) return 'bad score';
  switch (game) {
    case 'dodge': return score > elapsed + 500 ? 'survived longer than the run lasted' : null;
    case 'reflex': {
      const t = payload.times;
      if (!Array.isArray(t) || t.length !== 5 || t.some((x: number) => typeof x !== 'number' || x < 90)) return 'implausible reaction times';
      const sum = t.reduce((a: number, b: number) => a + b, 0);
      if (elapsed < 5 * 1200 + sum - 1500) return 'finished faster than possible';
      return score < 90 ? 'implausible average' : null;
    }
    case 'stack': return score > elapsed / 250 + 2 ? 'implausible height' : null;
    case 'escape': return elapsed < score * 2500 ? 'implausible pace' : null;
    // Pivot top speed is 43 m/s; nobody can average more than that.
    case 'pivot': return score > (elapsed / 1000) * 43 + 5 ? 'ran faster than the game allows' : null;
    case 'blockout': {
      const moves = typeof payload.moves === 'string' ? payload.moves : '';
      if (!/^[URDL]+$/.test(moves)) return 'missing solution';
      const L = generateLevel(score);
      if (replay(L, moves).status !== 'won') return 'solution does not solve the level';
      return elapsed < moves.length * 40 ? 'moved faster than possible' : null;
    }
  }
  return 'no leaderboard for this game';
}
