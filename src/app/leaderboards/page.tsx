'use client';
import { useEffect, useState } from 'react';
import { fetchBoard, type LbRow, type Scope } from '@/lib/leaderboard';
import { usePlayer, useNetStatus } from '@/lib/hooks';
import { AvatarBadge, Segmented } from '@/components/ui';
import { GAME_BY_ID } from '@/lib/catalog';

const BOARDS = ['krillion', 'wordle', 'connections', 'dodge', 'reflex', 'stack', 'pivot', 'escape', 'blockout'];

export default function LeaderboardsPage() {
  const me = usePlayer();
  const status = useNetStatus();
  const [game, setGame] = useState('krillion');
  const [scope, setScope] = useState<Scope>('daily');
  const [who, setWho] = useState<'global' | 'friends'>('global');
  const [rows, setRows] = useState<LbRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'open' || !me) return;
    setRows(null); setErr(null);
    const ids = who === 'friends' ? [me.id, ...me.friends.map((f) => f.id)] : undefined;
    fetchBoard(game, scope, ids).then((r) => setRows(r.rows)).catch((e) => setErr(e.message));
  }, [game, scope, who, status, me]);

  return (
    <div>
      <div className="mb-8">
        <div className="label mb-2">Leaderboards</div>
        <h1 className="font-display text-5xl font-bold tracking-tight">Ranks.</h1>
        <p className="mt-3 max-w-xl text-paper-dim">Only real, server-verified results. Daily boards for word games add up into weekly and all-time totals; arcade boards keep each player’s best.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {BOARDS.map((g) => (
          <button key={g} onClick={() => setGame(g)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${game === g ? 'border-paper bg-paper text-ink' : 'border-ink-500 text-paper-dim'}`}>{GAME_BY_ID[g].name}</button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Segmented size="sm" value={scope} onChange={setScope} options={[{ id: 'daily', label: 'Today' }, { id: 'weekly', label: 'This week' }, { id: 'all', label: 'All-time' }]} />
        <Segmented size="sm" value={who} onChange={setWho} options={[{ id: 'global', label: 'Everyone' }, { id: 'friends', label: 'Friends' }]} />
      </div>
      <div className="card divide-y divide-ink-600">
        {status !== 'open' ? (
          <div className="p-8 text-center text-paper-dim">Leaderboards need the game server ({status}).</div>
        ) : err ? (
          <div className="p-8 text-center text-signal-red">{err}</div>
        ) : !rows ? (
          <div className="p-8 text-center text-paper-mute">Loading…</div>
        ) : !rows.length ? (
          <div className="p-8 text-center text-paper-dim">No scores yet{who === 'friends' ? ' among your friends' : ''}. Be the first.</div>
        ) : rows.map((r, i) => (
          <div key={r.playerId} className={`flex items-center gap-4 px-5 py-3 ${r.playerId === me?.id ? 'bg-lime/5' : ''}`}>
            <span className={`w-8 font-mono text-sm ${i < 3 ? 'text-lime' : 'text-paper-mute'}`}>#{i + 1}</span>
            {r.avatar && <AvatarBadge avatar={r.avatar} size={28} />}
            <span className="flex-1 truncate font-semibold">{r.name}{r.playerId === me?.id ? ' (you)' : ''}</span>
            <span className="font-mono text-sm">{r.display}</span>
          </div>
        ))}
      </div>
      {who === 'friends' && me && !me.friends.length && <p className="mt-3 text-sm text-paper-mute">Add friends from a versus match or with a friend code on your profile.</p>}
    </div>
  );
}
