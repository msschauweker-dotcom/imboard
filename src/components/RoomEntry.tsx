'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { net, roomPath } from '@/lib/net';
import { VERSUS_GAMES } from '@/lib/catalog';
import { useNetStatus } from '@/lib/hooks';

export function QuickCreate({ initialGame = 'tag' }: { initialGame?: string }) {
  const router = useRouter();
  const [game, setGame] = useState(initialGame);
  const [bestOf, setBestOf] = useState(initialGame === 'tag' ? 3 : 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const status = useNetStatus();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VERSUS_GAMES.map((g) => (
          <button key={g.id} onClick={() => { setGame(g.id); setBestOf(g.id === 'tag' ? 3 : 1); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${game === g.id ? 'border-lime bg-lime text-ink' : 'border-ink-500 text-paper-dim hover:text-paper'}`}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-ink-500 p-1 text-xs">
          {[1, 3, 5].map((n) => (
            <button key={n} onClick={() => setBestOf(n)} className={`rounded-full px-3 py-1 font-semibold ${bestOf === n ? 'bg-paper text-ink' : 'text-paper-dim'}`}>{n === 1 ? 'Single' : `Best of ${n}`}</button>
          ))}
        </div>
        <button
          className="btn-lime px-6 py-3"
          disabled={busy}
          onClick={async () => {
            setBusy(true); setErr(null);
            try {
              const r = await net.request<{ code: string }>('room:create', { game, bestOf, settings: {} });
              router.push(roomPath(r.code));
            } catch (e) {
              setErr((e as Error).message.includes('respond') ? 'Game server offline — it may be waking up. Try again in a moment.' : (e as Error).message);
              setBusy(false);
            }
          }}
        >
          {busy ? 'Creating…' : 'Create private room'}
        </button>
      </div>
      {err && <p className="text-sm text-signal-red">{err}</p>}
      {status !== 'open' && !err && <p className="text-xs text-paper-mute">Game server: {status}</p>}
    </div>
  );
}

export function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState('');
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) router.push(roomPath(code.trim().toUpperCase())); }}>
      <input className="input font-mono uppercase tracking-[0.3em]" maxLength={8} placeholder="ROOM CODE" value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, ''))} aria-label="Room code" />
      <button className="btn-paper shrink-0" disabled={code.length < 4}>Join</button>
    </form>
  );
}

export function QuickMatch() {
  const router = useRouter();
  const [game, setGame] = useState('tag');
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const off1 = net.on('queue:matched', (m) => { setWaiting(false); router.push(roomPath(m.code)); });
    return () => { off1(); net.send('queue:leave'); };
  }, [router]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VERSUS_GAMES.map((g) => (
          <button key={g.id} disabled={waiting} onClick={() => setGame(g.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${game === g.id ? 'border-paper bg-paper text-ink' : 'border-ink-500 text-paper-dim'}`}>{g.name}</button>
        ))}
      </div>
      {waiting ? (
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-ping rounded-full bg-lime" />
          <span className="text-sm text-paper-dim">Looking for an opponent… (only real players — no bots)</span>
          <button className="btn-ghost btn-sm" onClick={() => { net.send('queue:leave'); setWaiting(false); }}>Cancel</button>
        </div>
      ) : (
        <button className="btn-ghost" onClick={() => { net.send('queue:join', { game }); setWaiting(true); }}>Find a match</button>
      )}
    </div>
  );
}
