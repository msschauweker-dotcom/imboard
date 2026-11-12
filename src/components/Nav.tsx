'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayer, useSound, useNetStatus } from '@/lib/hooks';
import { Logo, AvatarBadge } from './ui';

const LINKS = [
  { href: '/', label: 'Home', icon: '◉' },
  { href: '/daily', label: 'Daily', icon: '◐' },
  { href: '/arcade', label: 'Arcade', icon: '▣' },
  { href: '/versus', label: 'Versus', icon: '⚔' },
];

export default function Nav() {
  const path = usePathname();
  const player = usePlayer();
  const [sound, setSound] = useSound();
  const net = useNetStatus();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-600/70 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="OFFGRID home" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative isolate rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] transition-colors ${
                  active(l.href) ? 'text-ink' : 'text-paper-dim hover:text-paper'
                }`}
              >
                {active(l.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-paper" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/leaderboards" className="hidden rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-widest text-paper-dim hover:text-paper sm:block">
              Ranks
            </Link>
            <button
              onClick={() => setSound(!sound)}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-500 text-sm text-paper-dim transition hover:text-paper"
              aria-label={sound ? 'Mute sound' : 'Enable sound'}
              title={sound ? 'Sound on' : 'Sound off'}
            >
              {sound ? '♪' : <span className="opacity-60">♪̸</span>}
            </button>
            <Link href="/profile" className="flex items-center gap-2 rounded-full border border-ink-500 py-1 pl-1 pr-3 transition hover:border-paper/50" title={`Game server: ${net}`}>
              {player ? <AvatarBadge avatar={player.avatar} size={28} /> : <span className="h-7 w-7 rounded-full bg-ink-600" />}
              <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:block">{player?.name ?? 'Guest'}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${net === 'open' ? 'bg-lime' : net === 'connecting' ? 'bg-signal-amber' : 'bg-ink-500'}`} />
            </Link>
          </div>
        </div>
      </header>
      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-ink-600 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main mobile">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-widest ${active(l.href) ? 'text-lime' : 'text-paper-mute'}`}>
            {active(l.href) && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-10 rounded-full bg-lime" />}
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
