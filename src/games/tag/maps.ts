// TAG arenas. 24×15 tiles.
// #: wall  .: floor  ~: mud (slow)  B: boost pad  *: power-up spawn
// C / R: candidate start spots for Chaser / Runner (randomized each round).

export type TagMap = { id: string; name: string; blurb: string; rows: string[]; palette: { floor: string; floor2: string; wall: string; wallTop: string; accent: string } };

export const MAPS: TagMap[] = [
  {
    id: 'courtyard',
    name: 'Courtyard',
    blurb: 'Open plaza, four pillars, two boost lanes.',
    palette: { floor: '#1d2417', floor2: '#202919', wall: '#3b4a2a', wallTop: '#5b7040', accent: '#C8FF00' },
    rows: [
      '########################',
      '#C.........##.........R#',
      '#..........##..........#',
      '#..##....*......*...##.#',
      '#..##...............##.#',
      '#......B........B......#',
      '#....####......####....#',
      '#.....R....*.....C.....#',
      '#....####......####....#',
      '#......B........B......#',
      '#..##...............##.#',
      '#..##....*......*...##.#',
      '#..........##..........#',
      '#R.........##.........C#',
      '########################',
    ],
  },
  {
    id: 'maze',
    name: 'The Maze',
    blurb: 'Tight corridors. Know your corners.',
    palette: { floor: '#181820', floor2: '#1c1c26', wall: '#33334d', wallTop: '#55557a', accent: '#A66BFF' },
    rows: [
      '########################',
      '#C.....#.......#......R#',
      '#.###..#..###..#..###..#',
      '#.#.....*..#.......#...#',
      '#.#..####..#..####.#.#.#',
      '#....#.........B.#...#.#',
      '###..#..######...#..##.#',
      '#R.......#*..#.........#',
      '#.####...#...#...####..#',
      '#....#.......B...#....C#',
      '#.##.#..#####....#.##..#',
      '#.#.....*....#.....#...#',
      '#.#..####....#..##.#.#.#',
      '#R.....#...........#..C#',
      '########################',
    ],
  },
  {
    id: 'mudflats',
    name: 'Mudflats',
    blurb: 'Mud slows everyone. Pick your path.',
    palette: { floor: '#231d15', floor2: '#272017', wall: '#4a3a24', wallTop: '#6e5733', accent: '#FFB800' },
    rows: [
      '########################',
      '#C......~~~~~~~~......R#',
      '#.......~~~~~~~~.......#',
      '#..##...~~~##~~~...##..#',
      '#..##..*~~~##~~~*..##..#',
      '#.......~~~~~~~~.......#',
      '#~~~~.....B..B.....~~~~#',
      '#~~R~......**......~C~~#',
      '#~~~~.....B..B.....~~~~#',
      '#.......~~~~~~~~.......#',
      '#..##..*~~~##~~~*..##..#',
      '#..##...~~~##~~~...##..#',
      '#.......~~~~~~~~.......#',
      '#R......~~~~~~~~......C#',
      '########################',
    ],
  },
  {
    id: 'loop',
    name: 'Neon Loop',
    blurb: 'Outer ring, boost corners, inner rooms.',
    palette: { floor: '#10171c', floor2: '#121b21', wall: '#1f3b4d', wallTop: '#2f6a8a', accent: '#3DA9FF' },
    rows: [
      '########################',
      '#C.B..........*.....B.R#',
      '#.####################.#',
      '#.#......#....#......#.#',
      '#.#.####.#.##.#.####.#.#',
      '#.#.#..........*...#.#.#',
      '#B..#.###.####.###.#..B#',
      '#...R....*....*.......C#',
      '#B..#.###.####.###.#..B#',
      '#.#.#...*..........#.#.#',
      '#.#.####.#.##.#.####.#.#',
      '#.#......#....#......#.#',
      '#.####################.#',
      '#R.B..........*.....B.C#',
      '########################',
    ],
  },
];

export const MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m])) as Record<string, TagMap>;

/** All non-wall tiles reachable from each other (tests use this). */
export function mapConnected(m: TagMap): boolean {
  const H = m.rows.length, W = m.rows[0].length;
  const open: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.rows[y][x] !== '#') open.push([x, y]);
  const seen = new Set([`${open[0][0]},${open[0][1]}`]);
  const q = [open[0]];
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (m.rows[ny]?.[nx] && m.rows[ny][nx] !== '#' && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen.size === open.length;
}
