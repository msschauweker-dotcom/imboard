// NUMBER SEQUENCE generator: each rule has exactly one natural next term.
import { createRng, type Rng } from '../../lib/rng';

export type Seq = { terms: number[]; answer: number; rule: string; level: number };

type Maker = (r: Rng) => { terms: number[]; rule: string };
const take = (n: number, f: (i: number, prev: number[]) => number) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(f(i, out));
  return out;
};

const L1: Maker[] = [
  (r) => { const a = r.int(1, 20), d = r.int(2, 9); return { terms: take(6, (i) => a + d * i), rule: `Add ${d} each time` }; },
  (r) => { const a = r.int(60, 120), d = r.int(3, 9); return { terms: take(6, (i) => a - d * i), rule: `Subtract ${d} each time` }; },
  (r) => { const a = r.int(1, 4), k = r.int(2, 3); return { terms: take(6, (i) => a * k ** i), rule: `Multiply by ${k}` }; },
  (r) => { const o = r.int(1, 4); return { terms: take(6, (i) => (i + o) ** 2), rule: 'Square numbers' }; },
];
const L2: Maker[] = [
  (r) => { const a = r.int(1, 5), b = r.int(1, 5); return { terms: take(7, (i, p) => (i === 0 ? a : i === 1 ? b : p[i - 1] + p[i - 2])), rule: 'Each term is the sum of the previous two' }; },
  (r) => { const a = r.int(1, 10), d = r.int(1, 4); return { terms: take(6, (i, p) => (i === 0 ? a : p[i - 1] + d * i)), rule: `The gap grows by ${d} each step` }; },
  (r) => { const a = r.int(2, 9), x = r.int(3, 7), y = r.int(1, 3); return { terms: take(7, (i, p) => (i === 0 ? a : i % 2 ? p[i - 1] + x : p[i - 1] - y)), rule: `Alternate +${x} and −${y}` }; },
  () => ({ terms: [2, 3, 5, 7, 11, 13, 17], rule: 'Prime numbers' }),
  (r) => { const o = r.int(1, 3); return { terms: take(6, (i) => (i + o) ** 3), rule: 'Cube numbers' }; },
  () => ({ terms: take(7, (i) => ((i + 1) * (i + 2)) / 2), rule: 'Triangular numbers' }),
];
const L3: Maker[] = [
  (r) => { const a = r.int(1, 4), k = r.int(2, 3), c = r.int(1, 3); return { terms: take(6, (i, p) => (i === 0 ? a : p[i - 1] * k + c)), rule: `Multiply by ${k}, then add ${c}` }; },
  (r) => { const a = r.int(1, 3), b = r.int(1, 3), c = r.int(1, 3); return { terms: take(7, (i, p) => (i === 0 ? a : i === 1 ? b : i === 2 ? c : p[i - 1] + p[i - 2] + p[i - 3])), rule: 'Each term is the sum of the previous three' }; },
  (r) => { const o = r.int(1, 4); return { terms: take(6, (i) => (i + o) ** 2 + (i + o)), rule: 'n² + n' }; },
  (r) => { const a = r.int(2, 6); return { terms: take(7, (i, p) => (i === 0 ? a : i % 2 ? p[i - 1] * 2 : p[i - 1] + 3)), rule: 'Alternate ×2 and +3' }; },
  (r) => { const a = r.int(1, 3); return { terms: take(6, (i, p) => (i === 0 ? a : p[i - 1] * (i + 1))), rule: 'Multiply by 2, then 3, then 4…' }; },
  (r) => { const o = r.int(2, 5); return { terms: take(6, (i) => 2 ** (i + o) - 1), rule: 'One less than powers of two' }; },
];

export function generateSequence(seed: string, level: number): Seq {
  const r = createRng(`seq:${level}:${seed}`);
  const pool = level <= 1 ? L1 : level === 2 ? L2 : L3;
  const { terms, rule } = r.pick(pool)(r);
  const shown = terms.slice(0, terms.length - 1);
  return { terms: shown, answer: terms[terms.length - 1], rule, level };
}

/** Daily set: five sequences of rising difficulty. */
export function dailySequences(day: number): Seq[] {
  return [1, 1, 2, 2, 3].map((lv, i) => generateSequence(`daily-${day}-${i}`, lv));
}
