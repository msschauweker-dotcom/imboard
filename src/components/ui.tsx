'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Avatar } from '@/lib/identity';
import { formatCountdown, msUntilReset } from '@/lib/daily';

export function Logo({ size = 'md' }: { size?: 'md' | 'xl' }) {
  const big = size === 'xl';
  return (
    <span className={`inline-flex items-center font-display font-bold tracking-[0.22em] ${big ? 'text-6xl sm:text-8xl md:text-[9rem] tracking-[0.08em]' : 'text-lg'}`}>
      OFF
      <span className={`mx-[0.08em] inline-block bg-lime ${big ? 'h-[0.55em] w-[0.18em]' : 'h-[0.6em] w-[0.22em]'}`} aria-hidden />
      GRID
    </span>
  );
}

export function AvatarBadge({ avatar, size = 32 }: { avatar: Avatar; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-ink"
      style={{ width: size, height: size, background: avatar.color, fontSize: size * 0.5 }}
      aria-hidden
    >
      {avatar.glyph}
    </span>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="card max-h-[88vh] w-full max-w-lg overflow-y-auto p-6"
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="font-display text-2xl font-bold">{title}</h2>}
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-ink-500 text-paper-dim hover:text-paper" aria-label="Close">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ResetCountdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    setMs(msUntilReset());
    const id = setInterval(() => setMs(msUntilReset()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{ms == null ? '--:--:--' : formatCountdown(ms)}</span>;
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display text-2xl font-bold tabular-nums ${accent ? 'text-lime' : ''}`}>{value}</span>
      <span className="label !text-[10px]">{label}</span>
    </div>
  );
}

export function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label mb-2">{kicker}</div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-full border border-ink-500 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full font-semibold transition ${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${value === o.id ? 'bg-paper text-ink' : 'text-paper-dim hover:text-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lg"
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast(): [string | null, (t: string, ms?: number) => void] {
  const [text, setText] = useState<string | null>(null);
  const show = (t: string, ms = 1600) => {
    setText(t);
    setTimeout(() => setText((cur) => (cur === t ? null : cur)), ms);
  };
  return [text, show];
}
