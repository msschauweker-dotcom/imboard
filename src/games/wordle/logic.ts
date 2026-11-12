// Pure Wordle-style logic — shared by the browser and the game server so the
// server can independently verify a versus result from the raw guesses.
import { ANSWERS_COMMON, ANSWERS_HARD } from './answers';
import VALID from './valid.json';
import { createRng, hashString } from '../../lib/rng';

export type Mark = 'correct' | 'present' | 'absent';
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY: Record<Difficulty, { guesses: number; hardRule: boolean; pool: string[]; label: string; blurb: string }> = {
  easy: { guesses: 7, hardRule: false, pool: ANSWERS_COMMON, label: 'Easy', blurb: '7 guesses · everyday words' },
  normal: { guesses: 6, hardRule: false, pool: ANSWERS_COMMON, label: 'Normal', blurb: '6 guesses · everyday words' },
  hard: { guesses: 6, hardRule: true, pool: [...ANSWERS_COMMON, ...ANSWERS_HARD], label: 'Hard', blurb: '6 guesses · revealed hints must be used · tougher words' },
};

const validSet = new Set<string>([...(VALID as string[]), ...ANSWERS_COMMON, ...ANSWERS_HARD]);
export const isValidWord = (w: string) => validSet.has(w.toLowerCase());

export function scoreGuess(guess: string, answer: string): Mark[] {
  const g = guess.toLowerCase().split('');
  const a = answer.toLowerCase().split('');
  const marks: Mark[] = Array(5).fill('absent');
  const remaining: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) marks[i] = 'correct';
    else remaining[a[i]] = (remaining[a[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (marks[i] === 'correct') continue;
    if (remaining[g[i]] > 0) {
      marks[i] = 'present';
      remaining[g[i]]--;
    }
  }
  return marks;
}

/** Hard-mode rule: greens must stay in place, yellows must be reused. Returns an error or null. */
export function hardModeViolation(guess: string, history: { guess: string; marks: Mark[] }[]): string | null {
  const g = guess.toLowerCase();
  for (const h of history) {
    for (let i = 0; i < 5; i++) {
      if (h.marks[i] === 'correct' && g[i] !== h.guess[i]) return `${ordinal(i + 1)} letter must be ${h.guess[i].toUpperCase()}`;
    }
    const need: Record<string, number> = {};
    for (let i = 0; i < 5; i++) if (h.marks[i] !== 'absent') need[h.guess[i]] = (need[h.guess[i]] || 0) + 1;
    for (const [ch, n] of Object.entries(need)) {
      const have = g.split('').filter((c) => c === ch).length;
      if (have < n) return `Guess must contain ${ch.toUpperCase()}`;
    }
  }
  return null;
}

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10]}`;

/** Daily answer: identical for everyone on a date. Walks a seeded permutation so words don't repeat for ~years. */
export function dailyAnswer(dayNumber: number): string {
  const pool = ANSWERS_COMMON;
  const order = createRng('offgrid-wordle-v1').shuffle(pool.map((_, i) => i));
  return pool[order[((dayNumber - 1) % pool.length + pool.length) % pool.length]];
}

export function seededAnswer(seed: string, difficulty: Difficulty): string {
  const pool = DIFFICULTY[difficulty].pool;
  return pool[hashString(`wordle:${difficulty}:${seed}`) % pool.length];
}

/** Server-side / replay verification of a full game. */
export function verifyGame(answer: string, guesses: string[], difficulty: Difficulty) {
  const cfg = DIFFICULTY[difficulty];
  const history: { guess: string; marks: Mark[] }[] = [];
  if (guesses.length > cfg.guesses) return { ok: false as const, reason: 'too many guesses' };
  for (const guess of guesses) {
    if (!/^[a-z]{5}$/i.test(guess) || !isValidWord(guess)) return { ok: false as const, reason: `invalid word ${guess}` };
    if (cfg.hardRule && hardModeViolation(guess, history)) return { ok: false as const, reason: 'hard mode violation' };
    const marks = scoreGuess(guess, answer);
    history.push({ guess: guess.toLowerCase(), marks });
    if (guess.toLowerCase() === answer) return { ok: true as const, solved: true, used: history.length, history };
  }
  return { ok: true as const, solved: false, used: history.length, history };
}
