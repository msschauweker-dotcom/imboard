// OFFGRID logic test suite. Run: npm test
import { judge, PROMPTS, generateGame, dailyGame, scoreGame, editDistance, getPrompt, ALL_PROMPT_IDS } from '../src/games/krillion/engine';
import { scoreGuess, isValidWord, verifyGame as verifyWordle, dailyAnswer, hardModeViolation, DIFFICULTY } from '../src/games/wordle/logic';
import { generatePuzzle, validateBoard, verifyGame as verifyConn } from '../src/games/connections/generate';
import { GROUPS } from '../src/games/connections/groups';
import { generateLevel } from '../src/games/blockout/gen';
import { solve } from '../src/games/blockout/solver';
import { replay } from '../src/games/blockout/game';
import { generateSequence } from '../src/games/sequence/gen';
import { MAPS, mapConnected } from '../src/games/tag/maps';
import { createMatch, stepMatch } from '../src/games/tag/sim';
import { generateMaze } from '../src/games/escape/maze';
import { newWorld as pvNew, step as pvStep, flip as pvFlip, colAt as pvCol } from '../src/games/pivot/world';
import { generateLevel as bnGen } from '../src/games/bounce/physics';
import { course as grCourse, open as grOpen, validGhost as grValid, encodeGhost as grEncode, decodeGhost as grDecode, DIRS as GDIRS } from '../src/games/ghostrun/ghost';
import { createRound as hpCreate, stepRound as stepHP, cpuInput as hpCpu } from '../src/games/hotpotato/sim';

let pass = 0, fail = 0;
const t = (name: string, cond: boolean, info = '') => {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${name} ${info}`); }
};
const section = (s: string) => console.log(`\n▸ ${s}`);

section('Krillion validation');
const accept: [string, string, string][] = [
  ['pizza', 'Pepperoni', 'common'], ['pizza', 'pepperonis', 'common'], ['pizza', 'jalapeños', 'uncommon'],
  ['pizza', 'Jalepeno', 'uncommon'], ['pizza', 'the anchovies', 'uncommon'], ['pizza', 'artichoke hearts', 'rare'],
  ['pizza', 'Prosciuto', 'rare'], ['pizza', 'clams', 'deep'], ['fruit', 'Strawberries', 'common'],
  ['fruit', 'dragonfruit', 'rare'], ['fruit', 'durian', 'deep'], ['dog', 'lab', 'common'], ['dog', 'Xolo', 'deep'],
  ['europe', 'Czechia', 'rare'], ['capital', 'Ulan Bator', 'deep'], ['superhero', 'spiderman', 'common'],
  ['superhero', 'Spider-Man', 'common'], ['element', 'aluminium', 'uncommon'], ['element', 'oganesson', 'deep'],
  ['cheese', 'gruyère', 'rare'], ['app', 'tik tok', 'common'], ['holiday', "Valentine's Day", 'uncommon'],
  ['dessert', 'creme brulee', 'rare'], ['bird', 'Hummingbirds', 'uncommon'], ['transport', 'tuk-tuk', 'deep'],
  ['body', 'kneecap', 'deep'], ['weather', 'Thundersnow', 'deep'], ['pasta', 'Fettucini', 'common'],
];
for (const [p, a, tier] of accept) {
  const v = judge(p, a);
  t(`${p}:${a}`, v.status === 'valid' && v.tier === tier, JSON.stringify(v));
}
const reject: [string, string][] = [
  ['pizza', 'car'], ['pizza', 'banana split'], ['fruit', 'carrot'], ['dog', 'cat'], ['europe', 'japan'],
  ['state', 'texass city'], ['element', 'water'], ['pizza', ''], ['fruit', 'pea'], ['bird', 'bat'],
  ['capital', 'new york'], ['ocean', 'cow'], ['color', 'loud'], ['superhero', 'joker'], ['nba', 'yankees'],
];
for (const [p, a] of reject) t(`reject ${p}:${a}`, judge(p, a).status === 'invalid', JSON.stringify(judge(p, a)));
t('edit distance transposition', editDistance('pepreoni', 'pepperoni') <= 2);
t('7 prompts per game', generateGame('abc').length === 7);
t('game deterministic', generateGame('xyz').join() === generateGame('xyz').join());
t('daily deterministic', dailyGame(42).join() === dailyGame(42).join() && dailyGame(42).join() !== dailyGame(43).join());
const sg = scoreGame(['pizza', 'fruit'], ['pepperoni', 'durian']);
t('scoreGame total', sg.total === 110, String(sg.total));
t('letter variant accepts matching letter', judge('fruit@p', 'Pomegranate').status === 'valid');
t('letter variant rejects wrong letter', (judge('fruit@p', 'apple') as { reason?: string }).reason === 'wrong-letter');
t('letter variant rejects garbage', judge('fruit@p', 'purple').status === 'invalid');
t('variant prompt text', getPrompt('dog@b')?.text === 'Name a dog breed starting with “B”.', getPrompt('dog@b')?.text);
const sets = new Set<string>();
let dupBase = 0, badId = 0;
for (let d = 1; d <= 3650; d++) {
  const g = dailyGame(d);
  sets.add(g.join());
  if (new Set(g.map((x) => x.split('@')[0])).size !== 7) dupBase++;
  if (g.some((x) => !getPrompt(x))) badId++;
}
t('10 years of daily dives are all different sets', sets.size === 3650, String(sets.size));
t('no repeated base prompt within a day', dupBase === 0, String(dupBase));
t('all daily prompt ids resolve', badId === 0);
let tooTwisty = 0;
for (let d = 1; d <= 3650; d++) if (dailyGame(d).filter((x) => x.includes('@')).length > 2) tooTwisty++;
for (let s = 0; s < 500; s++) if (generateGame(`u${s}`).filter((x) => x.includes('@')).length > 2) tooTwisty++;
t('at most 2 letter twists per dive', tooTwisty === 0, String(tooTwisty));
const consecutive = dailyGame(400).filter((x) => dailyGame(401).includes(x)).length;
t('consecutive days share no prompts', consecutive === 0);
console.log(`  ${ALL_PROMPT_IDS.length} prompt forms (base + letter variants)`);
let entries = 0; for (const p of PROMPTS) entries += p.entries.length;
console.log(`  ${PROMPTS.length} prompts, ${entries} curated answers`);
for (const p of PROMPTS) t(`prompt ${p.id} has every tier`, ['common', 'uncommon', 'rare', 'deep'].every((tier) => p.entries.some((e) => e.tier === tier)));

section('Wordle');
const m = (g: string, a: string) => scoreGuess(g, a).map((x) => x[0]).join('');
t('all correct', m('crane', 'crane') === 'ccccc');
t('duplicate letters handled', m('speed', 'abide') === 'aapap', m('speed', 'abide'));
t('duplicate present once', m('eerie', 'there') === 'papac', m('eerie', 'there'));
t('extra duplicate absent', m('lolly', 'hello') === 'apcca', m('lolly', 'hello'));
t('dictionary valid', isValidWord('crane') && !isValidWord('xqzvb'));
const missing = DIFFICULTY.hard.pool.filter((w) => !isValidWord(w));
t('answers are valid words', missing.length === 0, missing.join(','));
t('daily answer stable', dailyAnswer(10) === dailyAnswer(10));
t('hard mode violation', hardModeViolation('table', [{ guess: 'crane', marks: scoreGuess('crane', 'cigar') }]) !== null);
const vw = verifyWordle('cigar', ['crane', 'cigar'], 'normal');
t('verify wordle', vw.ok && vw.solved === true && vw.used === 2);

section('Connections');
let bad = 0;
for (const d of ['easy', 'normal', 'hard'] as const) {
  for (let i = 0; i < 700; i++) {
    const pz = generatePuzzle(`s${i}`, d);
    const board = pz.groups.map((gr) => ({ group: GROUPS.find((x) => x.id === gr.id)!, words: gr.words }));
    if (validateBoard(board) || pz.order.length !== 16 || new Set(pz.order).size !== 16) bad++;
  }
}
t('2100 generated boards valid & unambiguous', bad === 0, String(bad));
const pz = generatePuzzle('test');
const vc = verifyConn(pz, pz.groups.map((x) => x.words));
t('verify connections win', vc.ok && vc.won && vc.mistakes === 0);
const words = new Set<string>();
let combos = 0;
for (const a of GROUPS) for (const w of a.members) words.add(w);
for (let i = 0; i < 4; i++) combos += GROUPS.filter((x) => x.level === i + 1).length;
console.log(`  ${GROUPS.length} groups, ${words.size} distinct words`);

section('Blockout (guaranteed-solvable generator)');
let unsolved = 0;
for (let lv = 1; lv <= 60; lv++) {
  const L = generateLevel(lv);
  const end = replay(L, L.solution);
  if (end.status !== 'won') { unsolved++; console.log(`  level ${lv}: reference solution ends ${end.status}`); }
}
t('60 levels: reference solution wins under real game rules (incl. traps & move limits)', unsolved === 0, String(unsolved));
let bfsFail = 0;
for (let lv = 1; lv <= 10; lv++) if (!solve(generateLevel(lv), 300000)) bfsFail++;
t('levels 1-10 independently solved by BFS', bfsFail === 0, String(bfsFail));

section('Sequence');
for (let i = 0; i < 200; i++) {
  const s = generateSequence(`q${i}`, 1 + (i % 3));
  if (s.terms.length < 4 || !Number.isFinite(s.answer)) { t('sequence sane', false, JSON.stringify(s)); break; }
}
t('sequence generator', true);

section('Tag sim');
for (const map of MAPS) {
  t(`map ${map.id} 24x15`, map.rows.length === 15 && map.rows.every((r) => r.length === 24));
  t(`map ${map.id} fully connected`, mapConnected(map));
  const mt = createMatch(map.id, 'seed', 60);
  let s = mt;
  for (let i = 0; i < 60 * 70; i++) s = stepMatch(s, { chaser: { x: 1, y: 0 }, runner: { x: -1, y: 0 } }, 1 / 60);
  t(`map ${map.id} round ends`, s.phase === 'over', s.phase);
}
const mz = generateMaze('m', 10, 8);
t('maze generated', mz.cells.length === 8 && mz.cells[0].length === 10);

section('Pivot (every course is passable)');
{
  let deaths = 0, totalM = 0;
  for (let s = 0; s < 40; s++) {
    const w = pvNew(`bot${s}`);
    // Bot: look ahead; if the side we're heading for becomes deadly soon, flip.
    for (let i = 0; i < 60 * 90 && !w.dead; i++) {
      const lead = 80 + w.speed * 0.42;
      const c = pvCol(w, lead);
      const onFloor = w.g === 1;
      const bad = onFloor ? c.floor !== 'solid' || c.block === 'low' : c.ceil !== 'solid' || c.block === 'high';
      if (bad) pvFlip(w);
      pvStep(w, 1 / 120); pvStep(w, 1 / 120);
    }
    if (w.dead) deaths++;
    totalM += Math.floor(w.dist / 10);
  }
  t('lookahead bot survives 90s on 40 courses', deaths === 0, `${deaths} deaths`);
  console.log(`  bot average ${Math.round(totalM / 40)}m`);
}

section('Bounce (levels proven clearable)');
{
  const t0 = Date.now();
  let bad = 0;
  for (let n = 1; n <= 15; n++) {
    const L = bnGen(n);
    if (!L.pegs.some((p) => p.kind === 'target') || L.par > L.shots) bad++;
  }
  t('15 levels generated with a solver-proven par', bad === 0, String(bad));
  console.log(`  generation ${Date.now() - t0}ms for 15 levels`);
}

section('Ghost Run');
{
  const c = grCourse('c3');
  // drive a BFS path to build a legal run
  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, [number, number, string] | null>([[key(...c.start), null]]);
  const q: [number, number][] = [c.start];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [d, [dx, dy]] of Object.entries(GDIRS)) {
      const nx = x + dx, ny = y + dy;
      if (grOpen(c, nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), [x, y, d]); q.push([nx, ny]); }
    }
  }
  const path: string[] = [];
  let cur: [number, number] = c.finish;
  while (prev.get(key(...cur))) { const p = prev.get(key(...cur))!; path.unshift(p[2]); cur = [p[0], p[1]]; }
  const steps = path.map((d, i) => ({ t: i * 113, d: d as 'U' }));
  const ghost = { v: 1 as const, course: 'c3', name: 'Tester', ms: steps.length * 113 + 110, steps };
  t('legal ghost validates', grValid(c, ghost));
  const round = grDecode(grEncode(ghost));
  t('ghost survives share-link round trip', !!round && grValid(c, round) && round.steps.length === steps.length);
  const fast = { ...ghost, steps: steps.map((s, i) => ({ ...s, t: i * 50 })) };
  t('too-fast ghost rejected', !grValid(c, fast));
  const wall = { ...ghost, steps: [{ t: 0, d: 'U' as const }, ...steps] };
  t('wall-clipping ghost rejected', !grValid(c, wall));
  console.log(`  share link length ${grEncode(ghost).length} chars for ${steps.length} steps`);
}

section('Hot Potato');
{
  let ok = 0;
  for (let s = 0; s < 20; s++) {
    const st = hpCreate('maze', `s${s}`);
    const mem1 = { target: 0, until: 0, wobble: 0 }, mem2 = { target: 0, until: 0, wobble: 0 };
    for (let i = 0; i < 60 * 40 && st.phase !== 'boom'; i++) stepHP(st, { p1: hpCpu(st, 'p1', 'hard', mem1, i / 60), p2: hpCpu(st, 'p2', 'hard', mem2, i / 60) }, 1 / 60);
    if (st.phase === 'boom' && st.loser) ok++;
  }
  t('20 CPU-vs-CPU rounds all end in a boom', ok === 20, String(ok));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
