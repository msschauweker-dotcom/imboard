import ArcadeGame from './ArcadeGame';

export const dynamicParams = false;
export function generateStaticParams() {
  return ['tag', 'blockout', 'dodge', 'reflex', 'stack', 'escape', 'ghostrun', 'hotpotato', 'pivot', 'bounce'].map((game) => ({ game }));
}

export default function ArcadeGamePage({ params }: { params: { game: string } }) {
  return <ArcadeGame id={params.game} />;
}
