// Tiny JSON-file persistence for leaderboards. Swap for Supabase/Postgres in
// production (see README → "Production backend"); the interface stays the same.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { weekKey } from '../src/lib/daily';
import { ARCADE_BOARDS } from './verify';

export type Row = { game: string; dateKey: string; week: string; playerId: string; name: string; avatar: { color: string; glyph: string }; score: number; display: string; at: number };

const DIR = join(__dirname, 'data');
const FILE = join(DIR, 'db.json');

export class Store {
  daily: Row[] = [];
  runs: Row[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    try {
      if (existsSync(FILE)) {
        const d = JSON.parse(readFileSync(FILE, 'utf8'));
        this.daily = d.daily ?? [];
        this.runs = d.runs ?? [];
      }
    } catch (e) {
      console.error('[store] could not read db, starting fresh', e);
    }
  }

  private persist() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
        writeFileSync(FILE, JSON.stringify({ daily: this.daily, runs: this.runs.slice(-50000) }));
      } catch (e) {
        console.error('[store] write failed', e);
      }
    }, 1500);
  }

  hasDaily(game: string, dateKey: string, playerId: string) {
    return this.daily.some((r) => r.game === game && r.dateKey === dateKey && r.playerId === playerId);
  }
  addDaily(r: Row) { this.daily.push(r); this.persist(); }
  addRun(r: Row) { this.runs.push(r); this.persist(); }

  board(game: string, scope: 'daily' | 'weekly' | 'all', ids: string[] | null, today: string) {
    const isDaily = ['wordle', 'connections', 'krillion'].includes(game);
    const arcade = ARCADE_BOARDS[game];
    const lower = !!arcade?.lowerIsBetter;
    const week = weekKey(new Date(today + 'T12:00:00'));
    let rows = (isDaily ? this.daily : this.runs).filter((r) => r.game === game);
    if (scope === 'daily') rows = rows.filter((r) => r.dateKey === today);
    if (scope === 'weekly') rows = rows.filter((r) => r.week === week);
    if (ids) rows = rows.filter((r) => ids.includes(r.playerId));
    const agg = new Map<string, Row & { n: number }>();
    for (const r of rows) {
      const cur = agg.get(r.playerId);
      if (isDaily && scope !== 'daily') {
        // weekly / all-time for daily games = total points accumulated
        if (cur) { cur.score += r.score; cur.n++; cur.name = r.name; cur.avatar = r.avatar; }
        else agg.set(r.playerId, { ...r, n: 1 });
      } else if (!cur || (lower ? r.score < cur.score : r.score > cur.score)) agg.set(r.playerId, { ...r, n: 1 });
    }
    const out = [...agg.values()]
      .map((r) => ({ playerId: r.playerId, name: r.name, avatar: r.avatar, score: r.score, display: isDaily && scope !== 'daily' ? `${r.score} pts · ${r.n} day${r.n === 1 ? '' : 's'}` : r.display, at: r.at }))
      .sort((a, b) => (lower ? a.score - b.score : b.score - a.score) || a.at - b.at)
      .slice(0, 50);
    return { rows: out, lowerIsBetter: lower, unit: arcade?.unit ?? 'pts' };
  }
}
