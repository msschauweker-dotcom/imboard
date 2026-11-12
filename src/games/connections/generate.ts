// Validated CONNECTIONS puzzle generation.
// A board is accepted only if:
//  - its four groups share no tags (no overlapping themes),
//  - all 16 shown words are distinct,
//  - no shown word appears in (members ∪ also) of any OTHER group on the board.
// That rules out the classic "this word fits two groups" ambiguity.
import { GROUPS, type Group } from './groups';
import { createRng } from '../../lib/rng';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type PuzzleGroup = { id: string; name: string; level: number; words: string[] };
export type Puzzle = { seed: string; difficulty: Difficulty; groups: PuzzleGroup[]; order: string[] };

export const LEVEL_PLAN: Record<Difficulty, number[]> = {
  easy: [1, 1, 2, 2],
  normal: [1, 2, 3, 4],
  hard: [2, 3, 4, 4],
};
export const MISTAKES_ALLOWED: Record<Difficulty, number> = { easy: 6, normal: 4, hard: 3 };

const fits = (word: string, group: Group) => group.members.includes(word) || (group.also ?? []).includes(word);

export function validateBoard(groups: { group: Group; words: string[] }[]): string | null {
  const all = groups.flatMap((x) => x.words);
  if (new Set(all).size !== all.length) return 'duplicate word';
  for (let i = 0; i < groups.length; i++) {
    for (let j = 0; j < groups.length; j++) {
      if (i === j) continue;
      if (groups[i].group.tags.some((t) => groups[j].group.tags.includes(t))) return `tag clash ${groups[i].group.id}/${groups[j].group.id}`;
      for (const w of groups[i].words) if (fits(w, groups[j].group)) return `${w} fits ${groups[j].group.id}`;
    }
  }
  return null;
}

export function generatePuzzle(seed: string, difficulty: Difficulty = 'normal'): Puzzle {
  const rng = createRng(`connections:${difficulty}:${seed}`);
  for (let attempt = 0; attempt < 500; attempt++) {
    const chosen: { group: Group; words: string[] }[] = [];
    let ok = true;
    for (const level of LEVEL_PLAN[difficulty]) {
      const candidates = rng.shuffle(GROUPS.filter((gr) => gr.level === level && !chosen.some((c) => c.group.id === gr.id)));
      let placed = false;
      for (const group of candidates.slice(0, 25)) {
        const words = rng.shuffle(Array.from(new Set(group.members))).slice(0, 4);
        const trial = [...chosen, { group, words }];
        if (!validateBoard(trial)) {
          chosen.push({ group, words });
          placed = true;
          break;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok && chosen.length === 4 && !validateBoard(chosen)) {
      const groups = chosen.map((c) => ({ id: c.group.id, name: c.group.name, level: c.group.level, words: c.words }));
      return { seed, difficulty, groups, order: rng.shuffle(groups.flatMap((x) => x.words)) };
    }
  }
  throw new Error('Could not generate a valid board');
}

/** Checks a guess of four words; returns the matching group id, or how many were right ("one away"). */
export function checkGuess(puzzle: Puzzle, guess: string[]): { correct: string | null; best: number } {
  let best = 0;
  for (const gr of puzzle.groups) {
    const n = guess.filter((w) => gr.words.includes(w)).length;
    if (n === 4) return { correct: gr.id, best: 4 };
    best = Math.max(best, n);
  }
  return { correct: null, best };
}

/** Server-side replay of a whole game from the ordered guesses. */
export function verifyGame(puzzle: Puzzle, guesses: string[][]) {
  const solved: string[] = [];
  let mistakes = 0;
  const max = MISTAKES_ALLOWED[puzzle.difficulty];
  for (const gs of guesses) {
    if (gs.length !== 4 || new Set(gs).size !== 4) return { ok: false as const, reason: 'malformed guess' };
    if (solved.length === 4 || mistakes >= max) break;
    const r = checkGuess(puzzle, gs);
    if (r.correct && !solved.includes(r.correct)) solved.push(r.correct);
    else if (!r.correct) mistakes++;
  }
  return { ok: true as const, solved: solved.length, mistakes, won: solved.length === 4 };
}
