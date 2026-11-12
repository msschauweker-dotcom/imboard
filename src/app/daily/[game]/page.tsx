import DailyGame from './DailyGame';

// Pre-render one static page per daily game (static export for Netlify).
export const dynamicParams = false;
export function generateStaticParams() {
  return ['krillion', 'wordle', 'connections', 'sequence', 'recall'].map((game) => ({ game }));
}

export default function DailyGamePage({ params }: { params: { game: string } }) {
  return <DailyGame id={params.game} />;
}
