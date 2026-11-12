import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono, Silkscreen } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const pixel = Silkscreen({ subsets: ['latin'], variable: '--font-pixel', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: { default: 'OFFGRID — Think for yourself.', template: '%s · OFFGRID' },
  description: 'Daily puzzles, an unlimited arcade, and real-time versus. Your daily dose of distraction.',
};

export const viewport: Viewport = { themeColor: '#0A0A0A', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${pixel.variable}`}>
      <head>
        {/* Runtime config (game server address) — editable after deploy */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/offgrid-config.js" />
      </head>
      <body className="grain min-h-screen bg-ink text-paper">
        {/* ambient light */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-lime/[0.07] blur-[120px]" />
          <div className="absolute -bottom-48 -right-40 h-[560px] w-[560px] rounded-full bg-signal-violet/[0.08] blur-[140px]" />
          <div className="absolute left-1/2 top-1/3 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-signal-blue/[0.04] blur-[120px]" />
        </div>
        <Nav />
        <main className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">{children}</main>
        <footer className="mx-auto hidden max-w-6xl items-center justify-between px-6 pb-10 text-xs text-paper-mute md:flex">
          <span className="font-display font-semibold tracking-[0.3em] text-paper-dim">OFFGRID</span>
          <span className="font-mono uppercase tracking-widest">Think for yourself.</span>
        </footer>
      </body>
    </html>
  );
}
