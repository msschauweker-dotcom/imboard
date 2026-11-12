'use client';
import { useEffect, useState } from 'react';
import { usePlayer, useCopy, useStorageTick } from '@/lib/hooks';
import { updatePlayer, addFriend, removeFriend, AVATAR_COLORS, AVATAR_GLYPHS } from '@/lib/identity';
import { refreshIdentity } from '@/lib/net';
import { getStats, type GameStats } from '@/lib/stats';
import { GAMES } from '@/lib/catalog';
import { AvatarBadge } from '@/components/ui';

export default function ProfilePage() {
  const p = usePlayer();
  const tick = useStorageTick();
  const [name, setName] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [friendName, setFriendName] = useState('');
  const [copied, copy] = useCopy();
  const [stats, setStats] = useState<Record<string, GameStats>>({});
  useEffect(() => { if (p) setName(p.name); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setStats(Object.fromEntries([...GAMES.map((g) => g.id), 'versus'].map((id) => [id, getStats(id)]))); }, [tick]);
  if (!p) return null;
  const myCode = `${p.id}`;
  const vs = stats.versus;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card flex flex-wrap items-center gap-6 p-6">
        <AvatarBadge avatar={p.avatar} size={84} />
        <div className="flex-1 space-y-3">
          <div className="label">Guest profile · stored on this device</div>
          <form className="flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); updatePlayer({ name }); refreshIdentity(); }}>
            <input className="input" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
            <button className="btn-lime shrink-0" disabled={name === p.name}>Save</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_COLORS.map((c) => <button key={c} onClick={() => { updatePlayer({ avatar: { ...p.avatar, color: c } }); refreshIdentity(); }} className={`h-7 w-7 rounded-full border-2 ${p.avatar.color === c ? 'border-paper' : 'border-transparent'}`} style={{ background: c }} aria-label={`Color ${c}`} />)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_GLYPHS.map((g) => <button key={g} onClick={() => { updatePlayer({ avatar: { ...p.avatar, glyph: g } }); refreshIdentity(); }} className={`grid h-8 w-8 place-items-center rounded-lg border ${p.avatar.glyph === g ? 'border-paper bg-white/10' : 'border-ink-500'}`}>{g}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-center">
          <div><div className="font-display text-3xl font-bold text-lime">{vs?.wins ?? 0}–{(vs?.played ?? 0) - (vs?.wins ?? 0)}</div><div className="label !text-[10px]">Versus W–L</div></div>
          <div><div className="font-display text-3xl font-bold">{Math.max(0, ...['krillion', 'wordle', 'connections'].map((g) => stats[g]?.maxStreak ?? 0))}</div><div className="label !text-[10px]">Best streak</div></div>
        </div>
      </div>

      <div className="card p-6">
        <div className="label mb-4">Statistics & personal records</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.filter((g) => g.status === 'live').map((g) => {
            const s = stats[g.id];
            return (
              <div key={g.id} className="rounded-xl border border-ink-600 p-4">
                <div className="flex items-center justify-between"><span className="font-semibold">{g.name}</span><span className="h-2 w-2 rounded-full" style={{ background: g.accent }} /></div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div><div className="font-display text-xl font-bold">{s?.played ?? 0}</div><div className="label !text-[9px]">Played</div></div>
                  <div><div className="font-display text-xl font-bold">{s?.best ?? '—'}</div><div className="label !text-[9px]">Best</div></div>
                  <div><div className="font-display text-xl font-bold">{g.section === 'daily' ? s?.streak ?? 0 : s?.wins ?? 0}</div><div className="label !text-[9px]">{g.section === 'daily' ? 'Streak' : 'Wins'}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <div className="label mb-4">Friends</div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm text-paper-dim">Your friend code — share it so friends can add you:</div>
            <div className="flex gap-2"><input readOnly className="input font-mono" value={myCode} aria-label="Your friend code" /><button className="btn-paper shrink-0" onClick={() => copy(myCode)}>{copied ? 'Copied ✓' : 'Copy'}</button></div>
            <form className="space-y-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (/^[a-z0-9]{6,24}$/.test(friendCode.trim())) { addFriend({ id: friendCode.trim(), name: friendName.trim() || 'Friend', avatar: { color: '#7D7A72', glyph: '●' } }); setFriendCode(''); setFriendName(''); } }}>
              <div className="text-sm text-paper-dim">Add a friend by code:</div>
              <input className="input font-mono" placeholder="friend code" value={friendCode} onChange={(e) => setFriendCode(e.target.value.toLowerCase())} aria-label="Friend code" />
              <div className="flex gap-2"><input className="input" placeholder="Their name (optional)" value={friendName} maxLength={18} onChange={(e) => setFriendName(e.target.value)} aria-label="Friend name" /><button className="btn-lime shrink-0">Add</button></div>
            </form>
          </div>
          <div>
            {p.friends.length ? p.friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-ink-600 py-2 last:border-0">
                <AvatarBadge avatar={f.avatar} size={28} />
                <span className="flex-1 truncate">{f.name}</span>
                <button className="text-xs text-paper-mute hover:text-signal-red" onClick={() => removeFriend(f.id)}>Remove</button>
              </div>
            )) : <p className="text-sm text-paper-mute">No friends yet. Finish a versus match and tap “Add as friend”, or add a code.</p>}
          </div>
        </div>
      </div>

      <div className="card p-6 text-sm text-paper-dim">
        <div className="label mb-2">Accounts</div>
        You’re playing as a guest — your identity, stats and friends live in this browser. Optional cross-device accounts (Supabase Auth) are wired into the roadmap; see the README for setup.
      </div>
    </div>
  );
}
