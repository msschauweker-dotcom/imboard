'use client';
// Leaderboard client. Scores are never trusted blindly:
//  - Daily word games submit their RAW play (guesses / answers); the server
//    recomputes the score from the same puzzle logic.
//  - Arcade runs open a server-issued run token first; the server rejects scores
//    that are impossible for the elapsed time it measured itself, and each token
//    can be used once.
import { net } from './net';
import { dateKey } from './daily';

export type Scope = 'daily' | 'weekly' | 'all';
export type LbRow = { playerId: string; name: string; avatar?: { color: string; glyph: string }; score: number; display: string; at: number };

export async function submitDaily(game: string, day: number, dateKey: string, payload: unknown) {
  return net.request<{ ok: boolean; rank?: number; score?: number; reason?: string }>('lb:daily', { game, day, dateKey, payload });
}

export async function startRun(game: string): Promise<string | null> {
  try {
    const r = await net.request<{ token: string }>('lb:start', { game }, 3000);
    return r.token;
  } catch {
    return null; // offline: play still works, just no global ranking
  }
}

export async function submitRun(game: string, token: string | null, score: number, payload: unknown = {}) {
  if (!token) return { ok: false, reason: 'offline' };
  try {
    return await net.request<{ ok: boolean; rank?: number; reason?: string }>('lb:run', { game, token, score, payload });
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export async function fetchBoard(game: string, scope: Scope, ids?: string[]) {
  return net.request<{ rows: LbRow[]; lowerIsBetter: boolean; unit: string }>('lb:get', { game, scope, ids, dateKey: dateKey() }, 5000);
}
