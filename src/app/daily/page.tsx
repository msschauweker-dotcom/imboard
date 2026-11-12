'use client';
import GameCard from '@/components/GameCard';
import { ResetCountdown, SectionHead } from '@/components/ui';
import { DAILY } from '@/lib/catalog';
import { puzzleNumber } from '@/lib/daily';
import { useMounted } from '@/lib/hooks';

export default function DailyPage() {
  const mounted = useMounted();
  const [a, b, c, ...rest] = DAILY;
  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-ink-600 pb-8">
        <div>
          <div className="label mb-2">Daily · #{mounted ? puzzleNumber() : '—'}</div>
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Today’s games.</h1>
          <p className="mt-3 max-w-lg text-paper-dim">Same puzzles for everyone, every day. One official attempt each — then unlimited practice.</p>
        </div>
        <div className="text-right">
          <div className="label">Resets in</div>
          <div className="font-display text-3xl font-bold"><ResetCountdown /></div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[a, b, c].map((g) => <GameCard key={g.id} game={g} size="lg" />)}
      </div>
      <div className="mt-12">
        <SectionHead kicker="More puzzles" title="Bonus rounds" />
        <div className="grid gap-4 sm:grid-cols-3">
          {rest.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </div>
      <div className="card mt-12 p-6 text-sm text-paper-dim">
        <div className="label mb-2 text-signal-red">Fair play</div>
        Official daily challenges are one sitting. If you leave the tab, switch apps or reload mid-attempt, the attempt is voided (<span className="font-semibold text-paper">SIGNAL LOST</span>) and can’t be retaken. Unlimited modes and the arcade never penalize you for switching tabs.
      </div>
    </div>
  );
}
