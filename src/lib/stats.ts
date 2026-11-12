'use client';
// Shared per-game statistics: plays, wins, streaks, personal bests, daily records.
import { load, save } from './storage';
import { dateKey, prevKey } from './daily';

export type GameStats = {
  played: number;
  wins: number;
  streak: number; // daily streak (consecutive days completed / won)
  maxStreak: number;
  lastDaily: string | null;
  best: number | null; // personal best (meaning depends on game; see lowerIsBetter)
  bestAt: number | null;
  distribution: Record<string, number>;
  recent: { at: number; score: number; win: boolean; mode: string }[];
};

const empty = (): GameStats => ({
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  lastDaily: null,
  best: null,
  bestAt: null,
  distribution: {},
  recent: [],
});

export function getStats(game: string): GameStats {
  const s = { ...empty(), ...load<Partial<GameStats>>(`stats:${game}`, {}) };
  // A streak is broken if yesterday's daily wasn't completed.
  if (s.lastDaily && s.lastDaily !== dateKey() && s.lastDaily !== prevKey(dateKey())) s.streak = 0;
  return s;
}

export type ResultInput = {
  score: number;
  win?: boolean;
  mode: 'daily' | 'unlimited' | 'versus' | 'arcade';
  lowerIsBetter?: boolean;
  bucket?: string; // distribution bucket, e.g. guesses used
  countStreak?: boolean; // daily: advance streak only if true
};

/** Records a finished game. Returns {stats, newBest}. */
export function recordResult(game: string, r: ResultInput): { stats: GameStats; newBest: boolean } {
  const s = getStats(game);
  s.played += 1;
  if (r.win) s.wins += 1;
  let newBest = false;
  if (s.best == null || (r.lowerIsBetter ? r.score < s.best : r.score > s.best)) {
    if (!(r.lowerIsBetter && r.score <= 0)) {
      newBest = s.best != null || r.score > 0 || !!r.lowerIsBetter;
      s.best = r.score;
      s.bestAt = Date.now();
    }
  }
  if (r.bucket) s.distribution[r.bucket] = (s.distribution[r.bucket] || 0) + 1;
  if (r.mode === 'daily') {
    const today = dateKey();
    if (s.lastDaily !== today) {
      if (r.countStreak !== false) {
        s.streak = s.lastDaily === prevKey(today) ? s.streak + 1 : 1;
        s.maxStreak = Math.max(s.maxStreak, s.streak);
      } else {
        s.streak = 0;
      }
      s.lastDaily = today;
    }
  }
  s.recent = [{ at: Date.now(), score: r.score, win: !!r.win, mode: r.mode }, ...s.recent].slice(0, 30);
  save(`stats:${game}`, s);
  pushRecord(game, r.score, newBest, r.mode);
  return { stats: s, newBest };
}

// ---- Daily attempt ledger (one official attempt per day per game) ----
export type DailyAttempt<T = unknown> = {
  date: string;
  status: 'in-progress' | 'complete' | 'void';
  startedAt: number;
  data?: T;
  reason?: string;
};

export function getDaily<T>(game: string, key = dateKey()): DailyAttempt<T> | null {
  return load<DailyAttempt<T> | null>(`daily:${game}:${key}`, null);
}

export function setDaily<T>(game: string, attempt: DailyAttempt<T>): void {
  save(`daily:${game}:${attempt.date}`, attempt);
}

// ---- Recent records feed for the homepage ----
export type RecordEntry = { game: string; score: number; at: number; newBest: boolean; mode: string };
function pushRecord(game: string, score: number, newBest: boolean, mode: string) {
  const list = load<RecordEntry[]>('records', []);
  list.unshift({ game, score, at: Date.now(), newBest, mode });
  save('records', list.slice(0, 50));
}
export function getRecords(): RecordEntry[] {
  return load<RecordEntry[]>('records', []);
}
