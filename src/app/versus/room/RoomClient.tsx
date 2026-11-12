'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { net, roomPath } from '@/lib/net';
import { GAME_BY_ID } from '@/lib/catalog';
import { usePlayer, useCopy, useNetStatus } from '@/lib/hooks';
import { addFriend } from '@/lib/identity';
import { recordResult } from '@/lib/stats';
import { AvatarBadge, Segmented } from '@/components/ui';
import { MAPS } from '@/games/tag/maps';
import { blip } from '@/lib/sound';
import type { VersusProps } from '@/lib/versus';
import type { Role } from '@/games/tag/sim';

const Loading = () => <div className="card h-80 animate-pulse" />;
const ASYNC: Record<string, React.ComponentType<{ versus?: VersusProps }>> = {
  wordle: dynamic(() => import('@/games/wordle/Wordle'), { ssr: false, loading: Loading }),
  connections: dynamic(() => import('@/games/connections/Connections'), { ssr: false, loading: Loading }),
  krillion: dynamic(() => import('@/games/krillion/Krillion'), { ssr: false, loading: Loading }),
  reflex: dynamic(() => import('@/games/reflex/Reflex'), { ssr: false, loading: Loading }),
  stack: dynamic(() => import('@/games/stack/Stack'), { ssr: false, loading: Loading }),
  dodge: dynamic(() => import('@/games/dodge/Dodge'), { ssr: false, loading: Loading }),
  blockout: dynamic(() => import('@/games/blockout/Blockout'), { ssr: false, loading: Loading }),
  escape: dynamic(() => import('@/games/escape/Escape'), { ssr: false, loading: Loading }),
};
const TagOnline = dynamic(() => import('@/games/tag/TagOnline'), { ssr: false, loading: Loading });

type RP = { id: string; name: string; avatar: { color: string; glyph: string }; ready: boolean; connected: boolean };
type RoomState = {
  code: string; game: string; settings: Record<string, any>; bestOf: number; hostId: string; players: RP[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  status: 'lobby' | 'countdown' | 'playing' | 'round-over' | 'match-over'; round: number; scores: Record<string, number>;
  history: { round: number; winner: string | null; results: Record<string, string> }[]; winner: string | null; roles: Record<string, Role> | null;
};
type Start = { round: number; seed: string; settings: Record<string, unknown>; startsAt: number; roles?: Record<string, Role> | null };

export default function RoomClient({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const me = usePlayer();
  const status = useNetStatus();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{ winner: string | null; results: Record<string, string> } | null>(null);
  const [copied, copy] = useCopy();
  const recorded = useRef<number>(0);

  useEffect(() => {
    const offs = [
      net.on('room:state', (m) => { if (m.room.code === code) setRoom(m.room); }),
      net.on('match:start', (m) => { setStart(m); setSubmitted([]); setLastResult(null); }),
      net.on('match:progress', (m) => setSubmitted(m.submitted)),
      net.on('round:result', (m) => { setLastResult({ winner: m.winner, results: m.results }); }),
    ];
    const join = () => net.request('room:join', { code }).then(() => setError(null)).catch((e) => setError(e.message));
    join();
    const offOpen = net.onStatus((s) => { if (s === 'open') join(); });
    return () => { offs.forEach((o) => o()); offOpen(); };
  }, [code]);

  // synchronized countdown from server time
  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => {
      const left = start.startsAt - net.serverNow();
      if (left <= 0) { setCountdown(null); clearInterval(id); blip('go'); }
      else { const s = Math.ceil(left / 1000); setCountdown((c) => { if (c !== s) blip('tick'); return s; }); }
    }, 50);
    return () => clearInterval(id);
  }, [start]);

  // record versus win/loss once per match
  useEffect(() => {
    if (!room || !me || room.status !== 'match-over' || recorded.current === room.history.length) return;
    recorded.current = room.history.length;
    recordResult(`versus:${room.game}`, { score: room.scores[me.id] ?? 0, win: room.winner === me.id, mode: 'versus' });
    recordResult('versus', { score: room.winner === me.id ? 1 : 0, win: room.winner === me.id, mode: 'versus' });
  }, [room, me]);

  const meta = room ? GAME_BY_ID[room.game] : null;
  const mine = room?.players.find((p) => p.id === me?.id);
  const opp = room?.players.find((p) => p.id !== me?.id);
  const isHost = room?.hostId === me?.id;
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${roomPath(code)}` : '';
  const playing = room && (room.status === 'playing' || room.status === 'countdown') && start && start.round === room.round;
  const tagNames = useMemo(() => {
    if (!room?.roles) return null;
    const n: Record<Role, string> = { chaser: '', runner: '' };
    for (const p of room.players) n[room.roles[p.id]] = p.id === me?.id ? 'YOU' : p.name.toUpperCase().slice(0, 10);
    return n;
  }, [room?.roles, room?.players, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const versusProps: VersusProps | null = useMemo(() => (start && room ? {
    seed: start.seed, settings: start.settings, round: start.round,
    onDone: (payload) => { net.request('match:result', { round: start.round, payload }).catch((e) => setError(e.message)); },
  } : null), [start?.seed, start?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !room) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="font-display text-3xl font-bold">Can’t join {code}</div>
        <p className="mt-2 text-paper-dim">{error}{status !== 'open' ? ' — the game server may be offline.' : ''}</p>
        <Link href="/versus" className="btn-lime mt-6">Back to Versus</Link>
      </div>
    );
  }
  if (!room || !meta) return <div className="mx-auto max-w-3xl"><div className="card h-64 animate-pulse" /><p className="mt-3 text-center text-sm text-paper-mute">Connecting to room {code}… ({status})</p></div>;

  const AsyncGame = ASYNC[room.game];

  return (
    <div className="mx-auto max-w-4xl">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label text-lime">Versus · {room.bestOf === 1 ? 'Single game' : `Best of ${room.bestOf}`}{room.status !== 'lobby' ? ` · Round ${room.round}` : ''}</div>
          <h1 className="font-display text-3xl font-bold">{meta.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-ink-500 px-3 py-2 font-mono text-lg tracking-[0.3em]">{code}</span>
          <button className="btn-paper btn-sm" onClick={() => copy(inviteUrl)}>{copied ? 'Link copied ✓' : 'Copy invite link'}</button>
          <button className="btn-ghost btn-sm" onClick={() => { net.request('room:leave').catch(() => {}); router.push('/versus'); }}>Leave</button>
        </div>
      </div>

      {/* scoreboard */}
      <div className="card mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-4">
        {[mine, opp].map((p, i) => (
          <div key={i} className={`flex items-center gap-3 ${i === 1 ? 'order-3 flex-row-reverse text-right' : ''}`}>
            {p ? <AvatarBadge avatar={p.avatar} size={40} /> : <span className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-ink-500 text-paper-mute">?</span>}
            <div className="min-w-0">
              <div className="truncate font-semibold">{p ? (p.id === me?.id ? `${p.name} (you)` : p.name) : 'Waiting for opponent…'}</div>
              <div className="text-xs text-paper-mute">
                {p && !p.connected ? <span className="text-signal-amber">Reconnecting…</span> : p && (room.status === 'lobby' || room.status === 'round-over') ? (p.ready ? <span className="text-lime">Ready</span> : 'Not ready') : p && playing ? (submitted.includes(p.id) ? <span className="text-lime">Finished</span> : 'Playing…') : ''}
                {p && room.roles?.[p.id] && room.game === 'tag' ? ` · ${room.roles[p.id]}` : ''}
              </div>
            </div>
          </div>
        ))}
        <div className="order-2 text-center font-display text-4xl font-bold tabular-nums">
          {mine ? room.scores[mine.id] ?? 0 : 0}<span className="mx-2 text-paper-mute">–</span>{opp ? room.scores[opp.id] ?? 0 : 0}
        </div>
      </div>

      {/* LOBBY */}
      {room.status === 'lobby' && (
        <div className="card space-y-5 p-6">
          {room.players.length < 2 ? (
            <div className="text-center">
              <div className="font-display text-2xl font-bold">Send this to a friend</div>
              <p className="mt-1 text-sm text-paper-dim">They open the link (or enter code <span className="font-mono text-paper">{code}</span> on the Versus page) — no account needed.</p>
              <div className="mx-auto mt-4 flex max-w-lg gap-2">
                <input readOnly className="input font-mono text-sm" value={inviteUrl} onFocus={(e) => e.target.select()} aria-label="Invite link" />
                <button className="btn-lime shrink-0" onClick={() => copy(inviteUrl)}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button className="btn-ghost btn-sm mt-3" onClick={() => navigator.share({ title: 'OFFGRID', text: `Play me at ${meta.name} on OFFGRID`, url: inviteUrl }).catch(() => {})}>Share…</button>
              )}
            </div>
          ) : (
            <div className="text-center text-paper-dim">Both players here. Ready up to start — the game begins when both are ready.</div>
          )}
          {isHost && <HostSettings room={room} />}
          {!isHost && <SettingsSummary room={room} />}
          <div className="flex justify-center">
            <button className={mine?.ready ? 'btn-ghost px-8 py-3' : 'btn-lime px-8 py-3'} onClick={() => net.send('room:ready', { ready: !mine?.ready })}>
              {mine?.ready ? 'Not ready' : 'Ready'}
            </button>
          </div>
        </div>
      )}

      {/* COUNTDOWN */}
      {countdown != null && room.game !== 'tag' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/90">
          <div className="text-center">
            <div className="label">Round {room.round} · same {room.game === 'krillion' ? 'prompts' : 'challenge'} for both players</div>
            <div className="font-display text-[10rem] font-bold leading-none text-lime">{countdown}</div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {playing && countdown == null && room.game !== 'tag' && AsyncGame && versusProps && (
        <div key={start!.round}>
          <AsyncGame versus={versusProps} />
        </div>
      )}
      {playing && room.game === 'tag' && room.roles && me && tagNames && (
        <TagOnline key={start!.round} mapId={String(room.settings.map)} myRole={room.roles[me.id]} names={tagNames} />
      )}

      {/* ROUND / MATCH RESULT */}
      {(room.status === 'round-over' || room.status === 'match-over') && (
        <div className="card p-6 text-center">
          {room.status === 'match-over' ? (
            <>
              <div className="label">Match over</div>
              <div className={`font-display text-5xl font-bold ${room.winner === me?.id ? 'text-lime' : room.winner ? 'text-signal-red' : ''}`}>
                {room.winner ? (room.winner === me?.id ? 'You win!' : `${opp?.name ?? 'Opponent'} wins`) : 'Draw'}
              </div>
            </>
          ) : (
            <>
              <div className="label">Round {room.round}</div>
              <div className="font-display text-4xl font-bold">{lastResult?.winner ? (lastResult.winner === me?.id ? 'You took the round' : `${opp?.name} took the round`) : 'Round drawn'}</div>
            </>
          )}
          <div className="mx-auto mt-5 max-w-md divide-y divide-ink-600 text-left">
            {room.history.map((h) => (
              <div key={h.round} className="py-2 text-sm">
                <div className="label mb-1">Round {h.round}</div>
                {room.players.map((p) => (
                  <div key={p.id} className="flex justify-between gap-3">
                    <span className={h.winner === p.id ? 'font-semibold text-lime' : 'text-paper-dim'}>{p.id === me?.id ? 'You' : p.name}{h.winner === p.id ? ' ★' : ''}</span>
                    <span className="text-right text-paper-dim">{h.results[p.id]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {room.status === 'round-over' && (
              <button className={mine?.ready ? 'btn-ghost' : 'btn-lime'} onClick={() => net.send('room:ready', { ready: !mine?.ready })}>
                {mine?.ready ? 'Waiting for opponent…' : room.game === 'tag' ? 'Next round (swap roles) →' : 'Next round →'}
              </button>
            )}
            {room.status === 'match-over' && <button className="btn-lime" onClick={() => net.send('room:rematch')}>Rematch</button>}
            {opp && me && !me.friends.some((f) => f.id === opp.id) && (
              <button className="btn-ghost" onClick={() => addFriend({ id: opp.id, name: opp.name, avatar: opp.avatar })}>+ Add {opp.name} as friend</button>
            )}
          </div>
        </div>
      )}
      {error && room && <p className="mt-3 text-center text-sm text-signal-red">{error}</p>}
      <p className="mt-8 text-center text-xs text-paper-mute">Results are verified by the game server from your raw moves. Spectator mode is planned.</p>
    </div>
  );
}

function SettingsSummary({ room }: { room: RoomState }) {
  const s = room.settings;
  const parts = [
    s.map && `Map: ${MAPS.find((m) => m.id === s.map)?.name}`, s.length && `${s.length}s rounds`, s.difficulty && `Difficulty: ${s.difficulty}`,
    s.timeLimit ? `Timer: ${s.timeLimit}s` : null, s.theme && `Theme: ${s.theme}`, s.level && `Level ${s.level}`,
  ].filter(Boolean);
  return parts.length ? <div className="text-center text-sm text-paper-mute">{parts.join(' · ')}</div> : null;
}

function HostSettings({ room }: { room: RoomState }) {
  const set = (settings: Record<string, unknown>) => net.send('room:config', { settings });
  const s = room.settings;
  return (
    <div className="flex flex-wrap justify-center gap-5 border-y border-ink-600 py-4">
      <div><div className="label mb-1.5">Format</div><Segmented size="sm" value={String(room.bestOf)} onChange={(v) => net.send('room:config', { bestOf: Number(v) })} options={[{ id: '1', label: 'Single' }, { id: '3', label: 'Bo3' }, { id: '5', label: 'Bo5' }]} /></div>
      {room.game === 'tag' && (
        <>
          <div><div className="label mb-1.5">Map</div><Segmented size="sm" value={String(s.map)} onChange={(v) => set({ map: v })} options={MAPS.map((m) => ({ id: m.id, label: m.name }))} /></div>
          <div><div className="label mb-1.5">Round</div><Segmented size="sm" value={String(s.length)} onChange={(v) => set({ length: Number(v) })} options={[{ id: '30', label: '30s' }, { id: '60', label: '60s' }, { id: '90', label: '90s' }]} /></div>
        </>
      )}
      {(room.game === 'wordle' || room.game === 'connections') && (
        <div><div className="label mb-1.5">Difficulty</div><Segmented size="sm" value={String(s.difficulty)} onChange={(v) => set({ difficulty: v })} options={[{ id: 'easy', label: 'Easy' }, { id: 'normal', label: 'Normal' }, { id: 'hard', label: 'Hard' }]} /></div>
      )}
      {room.game === 'wordle' && (
        <div><div className="label mb-1.5">Timer</div><Segmented size="sm" value={String(s.timeLimit ?? 0)} onChange={(v) => set({ timeLimit: Number(v) })} options={[{ id: '0', label: 'Off' }, { id: '60', label: '60s' }, { id: '120', label: '2m' }, { id: '180', label: '3m' }]} /></div>
      )}
      {room.game === 'blockout' && (
        <div><div className="label mb-1.5">Level</div><Segmented size="sm" value={String(s.level)} onChange={(v) => set({ level: Number(v) })} options={[{ id: '4', label: 'Easy' }, { id: '8', label: 'Medium' }, { id: '14', label: 'Hard' }]} /></div>
      )}
    </div>
  );
}
