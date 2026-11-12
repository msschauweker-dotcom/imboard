'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode, type MutableRefObject } from 'react';
import { motion } from 'framer-motion';
import { Modal, Segmented } from './ui';
import { GAME_BY_ID } from '@/lib/catalog';
import { net, roomPath } from '@/lib/net';
import { useCopy, useSound } from '@/lib/hooks';
import { shareImage, type ShareCard } from '@/lib/share';

// ---------------- GameFrame ----------------
export function GameFrame({
  id,
  children,
  howTo,
  controls,
  modes,
  mode,
  onMode,
  right,
  back = true,
  versus = false,
}: {
  id: string;
  children: ReactNode;
  howTo: ReactNode;
  controls?: [string, string][];
  modes?: { id: string; label: string }[];
  mode?: string;
  onMode?: (m: string) => void;
  right?: ReactNode;
  back?: boolean;
  versus?: boolean;
}) {
  const meta = GAME_BY_ID[id];
  const [help, setHelp] = useState(false);
  const [sound, setSound] = useSound();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {back && !versus && (
            <Link href={meta.section === 'daily' ? '/daily' : '/arcade'} className="grid h-9 w-9 place-items-center rounded-full border border-ink-500 text-paper-dim hover:text-paper" aria-label="Back">
              ←
            </Link>
          )}
          <div>
            <div className="label" style={{ color: meta.accent }}>{versus ? 'Versus match' : meta.section === 'daily' ? 'Daily' : 'Arcade'}</div>
            <h1 className="font-display text-3xl font-bold leading-none tracking-tight">{meta.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button onClick={() => setSound(!sound)} className="btn-ghost btn-sm" aria-label="Toggle sound">{sound ? '♪ On' : '♪ Off'}</button>
          <button onClick={() => setHelp(true)} className="btn-ghost btn-sm">How to play</button>
        </div>
      </div>
      {modes && mode && onMode && !versus && (
        <div className="mb-5 overflow-x-auto no-scrollbar">
          <Segmented value={mode} options={modes} onChange={onMode} />
        </div>
      )}
      {children}
      <Modal open={help} onClose={() => setHelp(false)} title={`How to play ${meta.name}`}>
        <div className="space-y-3 text-sm leading-relaxed text-paper-dim">{howTo}</div>
        {controls && (
          <div className="mt-5 space-y-2 border-t border-ink-600 pt-4">
            <div className="label">Controls</div>
            {controls.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-paper-dim">{v}</span>
                <span className="flex gap-1">{k.split(' ').map((x) => <span key={x} className="kbd">{x}</span>)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------- Share ----------------
export function ShareBar({ text, card }: { text: string; card?: ShareCard }) {
  const [copied, copy] = useCopy();
  const [imgState, setImgState] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-lime" onClick={() => copy(text)}>{copied ? 'Copied ✓' : 'Copy result'}</button>
      {card && (
        <button
          className="btn-ghost"
          onClick={async () => {
            setImgState('…');
            const r = await shareImage(card, text);
            setImgState(r === 'downloaded' ? 'Saved ✓' : r === 'shared' ? 'Shared ✓' : 'Failed');
            setTimeout(() => setImgState(null), 1800);
          }}
        >
          {imgState ?? 'Share card'}
        </button>
      )}
    </div>
  );
}

// ---------------- Challenge a friend ----------------
export function ChallengeButton({ game, settings = {}, label = 'Challenge a friend', className = 'btn-paper' }: { game: string; settings?: Record<string, unknown>; label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const r = await net.request<{ code: string }>('room:create', { game, settings, bestOf: 1 });
            router.push(roomPath(r.code));
          } catch (e) {
            setErr((e as Error).message.includes('respond') ? 'Game server offline — it may be waking up. Try again in a moment.' : (e as Error).message);
            setBusy(false);
          }
        }}
      >
        ⚔ {busy ? 'Creating room…' : label}
      </button>
      {err && <span className="text-xs text-signal-red">{err}</span>}
    </div>
  );
}

// ---------------- SIGNAL LOST ----------------
export function SignalLost({ reason, onClose }: { reason: string; onClose?: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px)' }} />
      <div className="relative px-6 text-center">
        <div className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-signal-red">Official attempt void</div>
        <h2 className="animate-glitch font-display text-6xl font-bold tracking-tight text-paper sm:text-8xl">SIGNAL LOST</h2>
        <p className="mx-auto mt-6 max-w-md text-paper-dim">
          {reason}. Official daily challenges must be played start-to-finish in one sitting. This attempt has been recorded as void — there are no second official attempts.
        </p>
        <p className="mt-2 text-sm text-paper-mute">Unlimited mode is always open, and the next official challenge arrives at midnight.</p>
        {onClose && <button className="btn-paper mt-8" onClick={onClose}>Understood</button>}
      </div>
    </motion.div>
  );
}

/** Pre-game warning for official daily challenges. */
export function OfficialNotice({ onStart, children }: { onStart: () => void; children?: ReactNode }) {
  return (
    <div className="card p-6 text-center sm:p-10">
      <div className="label mb-3 text-lime">Official daily challenge</div>
      <p className="mx-auto max-w-md text-paper-dim">
        One attempt. Leave this tab or switch apps mid-challenge and the attempt is <strong className="text-paper">voided</strong>. Ready?
      </p>
      {children}
      <button className="btn-lime mt-6 px-8 py-3 text-base" onClick={onStart}>Start</button>
    </div>
  );
}

// ---------------- Touch controls ----------------
export type StickState = { x: number; y: number; action: boolean };
/** Virtual d-pad that writes into a ref (for real-time games). */
export function TouchPad({ stick, onPress, actionLabel }: { stick?: MutableRefObject<StickState>; onPress?: (dir: 'U' | 'D' | 'L' | 'R' | 'A') => void; actionLabel?: string }) {
  const set = (x: number, y: number) => { if (stick) { stick.current.x = x; stick.current.y = y; } };
  const btn = (dir: 'U' | 'D' | 'L' | 'R', label: string, x: number, y: number, cls: string) => (
    <button
      className={`absolute grid h-14 w-14 place-items-center rounded-xl border border-ink-500 bg-ink-700/80 text-xl active:bg-lime active:text-ink ${cls}`}
      onPointerDown={(e) => { e.preventDefault(); set(x, y); onPress?.(dir); }}
      onPointerUp={() => set(0, 0)}
      onPointerLeave={() => set(0, 0)}
      onPointerCancel={() => set(0, 0)}
      aria-label={dir}
    >
      {label}
    </button>
  );
  return (
    <div className="game-surface mt-4 flex items-center justify-between md:hidden">
      <div className="relative h-44 w-44">
        {btn('U', '▲', 0, -1, 'left-[3.75rem] top-0')}
        {btn('L', '◀', -1, 0, 'left-0 top-[3.75rem]')}
        {btn('R', '▶', 1, 0, 'right-0 top-[3.75rem]')}
        {btn('D', '▼', 0, 1, 'left-[3.75rem] bottom-0')}
      </div>
      {actionLabel && (
        <button
          className="grid h-20 w-20 place-items-center rounded-full border border-ink-500 bg-ink-700/80 font-display text-xs font-bold uppercase active:bg-lime active:text-ink"
          onPointerDown={(e) => { e.preventDefault(); if (stick) stick.current.action = true; onPress?.('A'); }}
          onPointerUp={() => { if (stick) stick.current.action = false; }}
          onPointerLeave={() => { if (stick) stick.current.action = false; }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ---------------- Misc ----------------
export function PB({ label = 'Best', value }: { label?: string; value: ReactNode }) {
  return (
    <span className="chip">
      {label} <span className="text-paper">{value}</span>
    </span>
  );
}

export function Overlay({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 z-10 grid place-items-center bg-ink/80 p-4 text-center backdrop-blur-[2px]">{children}</div>;
}
