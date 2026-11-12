// The game registry: one place that describes every game on OFFGRID.

export type Section = 'daily' | 'arcade';
export type Category = 'Action' | 'Puzzle' | 'Strategy' | 'Reaction' | 'Multiplayer' | 'Classic' | 'Word' | 'Logic';

export type GameMeta = {
  id: string;
  name: string;
  section: Section;
  tagline: string;
  blurb: string;
  categories: Category[];
  accent: string;
  status: 'live' | 'soon';
  versus: false | 'async' | 'realtime';
  leaderboard?: { lowerIsBetter?: boolean; unit: string };
  href: string;
};

export const GAMES: GameMeta[] = [
  // DAILY
  { id: 'krillion', name: 'Krillion', section: 'daily', tagline: 'Seven prompts. 25 seconds. Be rare.', blurb: 'Answer open-ended prompts — the rarer your valid answer, the bigger the score.', categories: ['Word'], accent: '#C8FF00', status: 'live', versus: 'async', leaderboard: { unit: 'pts' }, href: '/daily/krillion' },
  { id: 'wordle', name: 'Wordle', section: 'daily', tagline: 'Five letters. Six guesses.', blurb: 'The classic five-letter deduction game — daily, unlimited and head-to-head.', categories: ['Word', 'Classic'], accent: '#7BE495', status: 'live', versus: 'async', leaderboard: { unit: 'pts' }, href: '/daily/wordle' },
  { id: 'connections', name: 'Connections', section: 'daily', tagline: 'Sixteen words. Four groups.', blurb: 'Find four groups of four that share something. Watch for red herrings.', categories: ['Word', 'Logic'], accent: '#A66BFF', status: 'live', versus: 'async', leaderboard: { unit: 'pts' }, href: '/daily/connections' },
  { id: 'sequence', name: 'Sequence', section: 'daily', tagline: 'What comes next?', blurb: 'Five number sequences of rising difficulty. Spot the rule.', categories: ['Logic'], accent: '#3DA9FF', status: 'live', versus: false, href: '/daily/sequence' },
  { id: 'recall', name: 'Recall', section: 'daily', tagline: 'Remember the grid.', blurb: 'A memory puzzle: patterns flash, you rebuild them. Gets longer every level.', categories: ['Logic'], accent: '#FFB800', status: 'live', versus: false, href: '/daily/recall' },
  { id: 'mini', name: 'Mini Crossword', section: 'daily', tagline: 'Coming soon.', blurb: 'A 5×5 crossword. Being built — not playable yet.', categories: ['Word'], accent: '#FF6BD6', status: 'soon', versus: false, href: '/daily' },

  // ARCADE
  { id: 'tag', name: 'TAG', section: 'arcade', tagline: 'Catch them. Or survive.', blurb: 'Top-down pixel chase. One chaser, one runner, 60 seconds. Online, local or vs CPU.', categories: ['Action', 'Multiplayer', 'Classic'], accent: '#C8FF00', status: 'live', versus: 'realtime', href: '/arcade/tag' },
  { id: 'blockout', name: 'Blockout', section: 'arcade', tagline: 'Push every block home.', blurb: 'Block-pushing puzzles with traps and move limits. Every level guaranteed solvable.', categories: ['Puzzle', 'Strategy'], accent: '#FFB800', status: 'live', versus: 'async', leaderboard: { unit: 'levels' }, href: '/arcade/blockout' },
  { id: 'dodge', name: 'Dodge', section: 'arcade', tagline: 'Survive the arena.', blurb: 'Falling blocks, projectiles and expanding hazards. It only gets worse.', categories: ['Action', 'Reaction'], accent: '#FF3D3D', status: 'live', versus: 'async', leaderboard: { unit: 's' }, href: '/arcade/dodge' },
  { id: 'reflex', name: 'Reflex', section: 'arcade', tagline: 'Wait for it…', blurb: 'Five rounds of pure reaction time. Jump the gun and it counts against you.', categories: ['Reaction'], accent: '#3DA9FF', status: 'live', versus: 'async', leaderboard: { unit: 'ms', lowerIsBetter: true }, href: '/arcade/reflex' },
  { id: 'stack', name: 'Stack', section: 'arcade', tagline: 'One tap. Perfect timing.', blurb: 'Stop the sliding block. Misses shave your platform. How high can you go?', categories: ['Reaction', 'Classic'], accent: '#A66BFF', status: 'live', versus: 'async', leaderboard: { unit: 'floors' }, href: '/arcade/stack' },
  { id: 'ghostrun', name: 'Ghost Run', section: 'arcade', tagline: 'Race your friend’s ghost.', blurb: 'Maze time trials against a frame-perfect replay — your best, or a friend’s shared run.', categories: ['Action', 'Multiplayer'], accent: '#C8FF00', status: 'live', versus: false, href: '/arcade/ghostrun' },
  { id: 'hotpotato', name: 'Hot Potato', section: 'arcade', tagline: 'Pass it. Fast.', blurb: 'Two-player survival with a hidden fuse. Touch to pass the bomb — don’t be holding it.', categories: ['Multiplayer', 'Action'], accent: '#FF6BD6', status: 'live', versus: false, href: '/arcade/hotpotato' },
  { id: 'pivot', name: 'Pivot', section: 'arcade', tagline: 'One button. Flip gravity.', blurb: 'An endless runner where your only move is flipping between floor and ceiling.', categories: ['Reaction', 'Action'], accent: '#7FD8FF', status: 'live', versus: false, leaderboard: { unit: 'm' }, href: '/arcade/pivot' },
  { id: 'bounce', name: 'Bounce', section: 'arcade', tagline: 'Angle it. Clear it.', blurb: 'Tiny physics: aim the launcher and clear every gold peg in as few shots as you can.', categories: ['Puzzle', 'Strategy'], accent: '#FFB800', status: 'live', versus: false, href: '/arcade/bounce' },
  { id: 'escape', name: 'Escape', section: 'arcade', tagline: 'Find the exit. Stay unseen.', blurb: 'Generated mazes, patrolling sentries, a ticking clock. Deeper levels, faster enemies.', categories: ['Action', 'Puzzle'], accent: '#00E5A8', status: 'live', versus: 'async', leaderboard: { unit: 'levels' }, href: '/arcade/escape' },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<string, GameMeta>;
export const DAILY = GAMES.filter((g) => g.section === 'daily');
export const ARCADE = GAMES.filter((g) => g.section === 'arcade');
export const VERSUS_GAMES = GAMES.filter((g) => g.versus && g.status === 'live');
export const ARCADE_CATEGORIES: Category[] = ['Action', 'Puzzle', 'Strategy', 'Reaction', 'Multiplayer', 'Classic'];
