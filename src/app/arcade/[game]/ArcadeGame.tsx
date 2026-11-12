'use client';
import dynamic from 'next/dynamic';

const Loading = () => <div className="card h-96 animate-pulse" />;
const GAMES: Record<string, React.ComponentType> = {
  tag: dynamic(() => import('@/games/tag/Tag'), { ssr: false, loading: Loading }),
  blockout: dynamic(() => import('@/games/blockout/Blockout'), { ssr: false, loading: Loading }),
  dodge: dynamic(() => import('@/games/dodge/Dodge'), { ssr: false, loading: Loading }),
  reflex: dynamic(() => import('@/games/reflex/Reflex'), { ssr: false, loading: Loading }),
  stack: dynamic(() => import('@/games/stack/Stack'), { ssr: false, loading: Loading }),
  escape: dynamic(() => import('@/games/escape/Escape'), { ssr: false, loading: Loading }),
  ghostrun: dynamic(() => import('@/games/ghostrun/GhostRun'), { ssr: false, loading: Loading }),
  hotpotato: dynamic(() => import('@/games/hotpotato/HotPotato'), { ssr: false, loading: Loading }),
  pivot: dynamic(() => import('@/games/pivot/Pivot'), { ssr: false, loading: Loading }),
  bounce: dynamic(() => import('@/games/bounce/Bounce'), { ssr: false, loading: Loading }),
};

export default function ArcadeGame({ id }: { id: string }) {
  const G = GAMES[id];
  return G ? <G /> : null;
}
