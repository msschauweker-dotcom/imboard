'use client';
import { useEffect, useState } from 'react';
import { QuickCreate, JoinRoom, QuickMatch } from '@/components/RoomEntry';
import { getStats } from '@/lib/stats';
import { useNetStatus, usePlayer } from '@/lib/hooks';
import { AvatarBadge } from '@/components/ui';

export default function VersusPage() {
  const status = useNetStatus();
  const player = usePlayer();
  const [rec, setRec] = useState({ w: 0, l: 0 });
  useEffect(() => { const s = getStats('versus'); setRec({ w: s.wins, l: s.played - s.wins }); }, []);
  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2 text-lime">Versus</div>
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Play with friends.</h1>
          <p className="mt-3 max-w-lg text-paper-dim">Private rooms, invite links, no accounts. Real opponents only — every result is checked by the game server.</p>
        </div>
        <div className="card flex items-center gap-4 px-5 py-3">
          {player && <AvatarBadge avatar={player.avatar} size={36} />}
          <div>
            <div className="text-sm font-semibold">{player?.name}</div>
            <div className="font-mono text-xs text-paper-mute">Versus record {rec.w}–{rec.l}</div>
          </div>
        </div>
      </div>
      {status !== 'open' && (
        <div className="mb-6 rounded-xl border border-signal-amber/40 bg-signal-amber/10 p-4 text-sm text-signal-amber">
          {status === 'connecting'
            ? 'Connecting to the game server…'
            : status === 'disabled'
              ? 'Online play isn’t switched on for this site yet. Everything else works offline — the site owner just needs to point offgrid-config.js at a running OFFGRID game server (see README).'
              : 'The game server isn’t reachable right now. It may be waking up — refresh in a moment.'}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="label mb-1">1 · Private room</div>
          <h2 className="mb-4 font-display text-2xl font-bold">Create a room</h2>
          <QuickCreate />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <div className="label mb-1">2 · Got an invite?</div>
            <h2 className="mb-4 font-display text-2xl font-bold">Join with a code</h2>
            <JoinRoom />
          </div>
          <div className="card p-6">
            <div className="label mb-1">3 · Public matchmaking</div>
            <h2 className="mb-4 font-display text-2xl font-bold">Quick match</h2>
            <QuickMatch />
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-4 text-sm text-paper-dim md:grid-cols-3">
        <div className="card p-5"><div className="font-semibold text-paper">Real-time</div>TAG runs live on the server at 60 ticks/s. Both players steer their own character; the server decides every tag.</div>
        <div className="card p-5"><div className="font-semibold text-paper">Same puzzle, head to head</div>Wordle, Connections, Krillion, Reflex, Stack, Dodge, Blockout and Escape: identical seeds for both players, compared when you both finish.</div>
        <div className="card p-5"><div className="font-semibold text-paper">Best of 1, 3 or 5</div>Rematch in one click. Add your opponent as a friend to compare on the friends leaderboard.</div>
      </div>
    </div>
  );
}
