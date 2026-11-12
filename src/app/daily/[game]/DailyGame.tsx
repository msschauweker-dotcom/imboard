'use client';
import dynamic from 'next/dynamic';

const Loading = () => <div className="card h-96 animate-pulse" />;
const GAMES: Record<string, React.ComponentType> = {
  krillion: dynamic(() => import('@/games/krillion/Krillion'), { ssr: false, loading: Loading }),
  wordle: dynamic(() => import('@/games/wordle/Wordle'), { ssr: false, loading: Loading }),
  connections: dynamic(() => import('@/games/connections/Connections'), { ssr: false, loading: Loading }),
  sequence: dynamic(() => import('@/games/sequence/Sequence'), { ssr: false, loading: Loading }),
  recall: dynamic(() => import('@/games/recall/Recall'), { ssr: false, loading: Loading }),
};
export const DAILY_IDS = Object.keys(GAMES);

export default function DailyGame({ id }: { id: string }) {
  const G = GAMES[id];
  return G ? <G /> : null;
}
