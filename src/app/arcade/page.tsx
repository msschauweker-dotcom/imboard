'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import GameArt from '@/components/GameArt';
import { ARCADE, ARCADE_CATEGORIES, type Category } from '@/lib/catalog';

export default function ArcadePage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'All'>('All');
  const list = useMemo(
    () =>
      ARCADE.filter((g) => (cat === 'All' || g.categories.includes(cat)) && (!q || `${g.name} ${g.tagline} ${g.blurb} ${g.categories.join(' ')}`.toLowerCase().includes(q.toLowerCase()))),
    [q, cat],
  );
  const tag = ARCADE.find((g) => g.id === 'tag')!;
  return (
    <div>
      <div className="mb-8">
        <div className="label mb-2">Arcade · unlimited · no sign-up</div>
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Press start.</h1>
        <p className="mt-3 max-w-lg text-paper-dim">Open a game, play instantly. No daily limits, no penalties for switching tabs.</p>
      </div>

      <Link href="/arcade/tag" className="card group mb-10 grid overflow-hidden md:grid-cols-[1.4fr_1fr]">
        <div className="relative h-56 bg-ink-900 md:h-auto"><GameArt id="tag" /></div>
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
          <span className="chip w-fit !border-lime/50 !text-lime">Flagship · Multiplayer</span>
          <h2 className="font-pixel text-4xl">TAG</h2>
          <p className="text-paper-dim">{tag.blurb}</p>
          <span className="btn-lime mt-2 w-fit">Play TAG →</span>
        </div>
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="input sm:max-w-xs" placeholder="Search games…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search games" />
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...ARCADE_CATEGORIES] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${cat === c ? 'border-paper bg-paper text-ink' : 'border-ink-500 text-paper-dim hover:text-paper'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((g) => <GameCard key={g.id} game={g} />)}</div>
      ) : (
        <div className="card p-10 text-center text-paper-dim">No games match “{q}”.</div>
      )}

    </div>
  );
}
