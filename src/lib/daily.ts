// Daily puzzle scheduling. A "day" is the player's local calendar date, so the
// puzzle flips at local midnight — the same convention as most daily word games.
// Every player on the same date receives the identical puzzle (seeded by date).

export const EPOCH = '2026-01-01';

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Puzzle number: 1 on the epoch date, incrementing daily. */
export function puzzleNumber(key: string = dateKey()): number {
  const a = parseKey(EPOCH).getTime();
  const b = parseKey(key).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export function prevKey(key: string): string {
  const d = parseKey(key);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function msUntilReset(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** ISO week key (e.g. 2026-W46) for weekly leaderboards. */
export function weekKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
