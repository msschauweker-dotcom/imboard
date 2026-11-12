// KRILLION engine: answer normalization, alias + plural + typo-tolerant matching,
// rarity scoring and deterministic game generation. Pure TS — the game server
// imports this too, so versus scores are recomputed server-side from raw answers.
import { RAW_PROMPTS, THEMES, type Theme } from './bank';
import { EXTRA, NEW_PROMPTS } from './bank-extra';
import { createRng, hashString } from '../../lib/rng';

export type Tier = 'common' | 'uncommon' | 'rare' | 'deep';
export const TIERS: Record<Tier, { label: string; points: number; color: string }> = {
  common: { label: 'Common', points: 10, color: '#B9B6AC' },
  uncommon: { label: 'Uncommon', points: 25, color: '#3DA9FF' },
  rare: { label: 'Rare', points: 50, color: '#A66BFF' },
  deep: { label: 'Deep Cut', points: 100, color: '#C8FF00' },
};
export const TIER_ORDER: Tier[] = ['common', 'uncommon', 'rare', 'deep'];
export const PROMPTS_PER_GAME = 7;
export const SECONDS_PER_PROMPT = 25;

type Entry = { canonical: string; tier: Tier; keys: string[] };
export type Prompt = { id: string; text: string; theme: Theme; entries: Entry[]; index: Map<string, Entry> };

// ---------- normalization ----------
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`´]/g, '')
    .replace(/[^a-z0-9+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an|some) /, '')
    .trim();
}
const squash = (s: string) => s.replace(/ /g, '');

/** Singular/plural variants of a normalized phrase (applied to the last word). */
function forms(s: string): string[] {
  const out = new Set([s]);
  const m = s.match(/^(.*?)([a-z]+)$/);
  if (!m) return [...out];
  const [, head, last] = m;
  if (last.length > 3) {
    if (last.endsWith('ies')) out.add(head + last.slice(0, -3) + 'y');
    if (last.endsWith('oes')) out.add(head + last.slice(0, -2));
    if (/(ches|shes|xes|sses|zes)$/.test(last)) out.add(head + last.slice(0, -2));
    if (last.endsWith('s') && !last.endsWith('ss')) out.add(head + last.slice(0, -1));
    if (last.endsWith('ves')) out.add(head + last.slice(0, -3) + 'f');
  }
  if (!last.endsWith('s')) {
    out.add(head + last + 's');
    if (last.endsWith('y') && !/[aeiou]y$/.test(last)) out.add(head + last.slice(0, -1) + 'ies');
    if (/(ch|sh|x|z|o)$/.test(last)) out.add(head + last + 'es');
  }
  return [...out];
}

// Damerau-Levenshtein (optimal string alignment) with early exit.
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Fuzzy matches are only ever SUGGESTED ("Did you mean…?"), never auto-accepted,
// so the budget can be a little generous without "brok" silently becoming "book".
const allowedTypos = (len: number) => (len <= 3 ? 0 : len <= 7 ? 1 : len <= 11 ? 2 : 3);

// ---------- build prompts ----------
function buildPrompt(raw: (typeof RAW_PROMPTS)[number]): Prompt {
  const entries: Entry[] = [];
  const index = new Map<string, Entry>();
  const tiers: [Tier, string][] = [['common', raw.c], ['uncommon', raw.u], ['rare', raw.r], ['deep', raw.d]];
  for (const [tier, list] of tiers) {
    for (const chunk of list.split(';')) {
      const variants = chunk.split('|').map((v) => v.trim()).filter(Boolean);
      if (!variants.length) continue;
      const canonical = variants[0];
      const keys = new Set<string>();
      for (const v of variants) for (const f of forms(normalize(v))) { keys.add(f); keys.add(squash(f)); }
      // First listing wins: an answer listed twice keeps its more common tier.
      const fresh = [...keys].filter((k) => !index.has(k));
      if (!fresh.length) continue;
      const entry: Entry = { canonical, tier, keys: fresh };
      entries.push(entry);
      for (const k of fresh) index.set(k, entry);
    }
  }
  return { id: raw.id, text: raw.text, theme: raw.theme, entries, index };
}

const join = (a = '', b = '') => [a, b].filter((x) => x.trim()).join('; ');
const MERGED = [
  ...RAW_PROMPTS.map((p) => {
    const x = EXTRA[p.id];
    return x ? { ...p, c: join(p.c, x.c), u: join(p.u, x.u), r: join(p.r, x.r), d: join(p.d, x.d) } : p;
  }),
  ...NEW_PROMPTS,
];
export const PROMPTS: Prompt[] = MERGED.map(buildPrompt);
const BASE_BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

// ---------- letter variants ----------
// "Name a fruit." → "Name a fruit starting with P." Generated from the same
// curated bank, so the pool of prompts is many times larger than the base list.
const MIN_VARIANT_ANSWERS = 6;
const startsWith = (e: Entry, l: string) => normalize(e.canonical).startsWith(l);
export function variantLetters(p: Prompt): string[] {
  const counts: Record<string, number> = {};
  for (const e of p.entries) { const l = normalize(e.canonical)[0]; if (l && /[a-z]/.test(l)) counts[l] = (counts[l] || 0) + 1; }
  return Object.keys(counts).filter((l) => counts[l] >= MIN_VARIANT_ANSWERS).sort();
}
const VARIANTS = new Map(PROMPTS.map((p) => [p.id, variantLetters(p)]));

function derive(base: Prompt, letter: string): Prompt {
  const entries = base.entries.filter((e) => startsWith(e, letter));
  const index = new Map<string, Entry>();
  for (const [k, e] of base.index) if (entries.includes(e)) index.set(k, e);
  return { id: `${base.id}@${letter}`, text: `${base.text.replace(/\.$/, '')} starting with “${letter.toUpperCase()}”.`, theme: base.theme, entries, index };
}
const derivedCache = new Map<string, Prompt>();
export function getPrompt(id: string): Prompt | undefined {
  const [baseId, letter] = id.split('@');
  const base = BASE_BY_ID.get(baseId);
  if (!base || !letter) return base;
  if (!VARIANTS.get(baseId)?.includes(letter)) return undefined;
  let d = derivedCache.get(id);
  if (!d) { d = derive(base, letter); derivedCache.set(id, d); }
  return d;
}
/** Back-compat accessor used by the UI. */
export const PROMPT_BY_ID = { get: (id: string) => getPrompt(id) };
export const ALL_PROMPT_IDS: string[] = PROMPTS.flatMap((p) => [p.id, ...(VARIANTS.get(p.id) ?? []).map((l) => `${p.id}@${l}`)]);

// ---------- validation ----------
export type Verdict =
  | { status: 'valid'; canonical: string; tier: Tier; points: number; corrected: boolean }
  | { status: 'invalid'; reason: 'empty' | 'not-in-bank' | 'ambiguous' | 'timeout' | 'wrong-letter' };

export function judge(promptId: string, input: string): Verdict {
  const prompt = getPrompt(promptId);
  const n = normalize(input || '');
  if (!prompt || !n) return { status: 'invalid', reason: 'empty' };
  const letter = promptId.split('@')[1];
  if (letter && !n.startsWith(letter)) {
    // Valid for the category but wrong letter → tell the player, don't hide it.
    return { status: 'invalid', reason: 'wrong-letter' };
  }
  const tries = new Set<string>();
  for (const f of forms(n)) { tries.add(f); tries.add(squash(f)); }
  for (const t of tries) {
    const e = prompt.index.get(t);
    if (e) return { status: 'valid', canonical: e.canonical, tier: e.tier, points: TIERS[e.tier].points, corrected: false };
  }
  // Typo tolerance: nearest key within a length-scaled budget, same first letter,
  // and the best match must be unique (otherwise it's ambiguous → rejected).
  const q = squash(n);
  const budget = allowedTypos(q.length);
  if (budget === 0) return { status: 'invalid', reason: 'not-in-bank' };
  let best: Entry | null = null;
  let bestD = Infinity;
  let tie = false;
  for (const [key, entry] of prompt.index) {
    if (key.includes(' ') || key[0] !== q[0]) continue;
    if (allowedTypos(key.length) === 0) continue;
    const d = editDistance(q, key, budget);
    if (d > budget) continue;
    if (d < bestD) { bestD = d; best = entry; tie = false; }
    else if (d === bestD && best && entry !== best) tie = true;
  }
  if (best && tie) return { status: 'invalid', reason: 'ambiguous' };
  if (best) return { status: 'valid', canonical: best.canonical, tier: best.tier, points: TIERS[best.tier].points, corrected: true };
  return { status: 'invalid', reason: 'not-in-bank' };
}

// ---------- game generation ----------
export type ThemeChoice = Theme | 'mixed' | 'culture-sport';
export const THEMED_MODES: { id: ThemeChoice; label: string; emoji: string }[] = [
  { id: 'mixed', label: 'Mixed Bag', emoji: '🎲' },
  ...(['food', 'nature', 'world', 'science', 'everyday'] as Theme[]).map((t) => ({ id: t as ThemeChoice, label: THEMES[t].label, emoji: THEMES[t].emoji })),
  { id: 'culture-sport', label: 'Culture & Games', emoji: '🎬' },
];

function poolFor(theme: ThemeChoice): Prompt[] {
  if (theme === 'mixed') return PROMPTS;
  if (theme === 'culture-sport') return PROMPTS.filter((p) => p.theme === 'culture' || p.theme === 'sport');
  return PROMPTS.filter((p) => p.theme === theme);
}

const VARIANT_CHANCE = 0.4;

/** Seven prompts (some with a letter twist), spread across themes. Deterministic for a seed. */
export function generateGame(seed: string, theme: ThemeChoice = 'mixed'): string[] {
  const rng = createRng(`krillion:${theme}:${seed}`);
  const pool = rng.shuffle(poolFor(theme));
  let chosen: Prompt[];
  if (theme !== 'mixed') chosen = pool.slice(0, PROMPTS_PER_GAME);
  else {
    chosen = [];
    const usedThemes = new Set<string>();
    for (const p of pool) if (chosen.length < PROMPTS_PER_GAME && !usedThemes.has(p.theme)) { chosen.push(p); usedThemes.add(p.theme); }
    for (const p of pool) if (chosen.length < PROMPTS_PER_GAME && !chosen.includes(p)) chosen.push(p);
    chosen = rng.shuffle(chosen);
  }
  let twists = 0;
  return chosen.map((p) => {
    const letters = VARIANTS.get(p.id) ?? [];
    if (twists < MAX_TWISTS && letters.length && rng.chance(VARIANT_CHANCE)) { twists++; return `${p.id}@${rng.pick(letters)}`; }
    return p.id;
  });
}

/** At most this many "starting with ⟨letter⟩" twists per dive — they're spice, not the meal. */
export const MAX_TWISTS = 2;
const capTwists = (ids: string[]) => {
  let n = 0;
  return ids.map((id) => (id.includes('@') ? (++n <= MAX_TWISTS ? id : id.split('@')[0]) : id));
};

/**
 * Daily Dive — identical for everyone, and it never runs out.
 * Base prompts rotate through a seeded permutation (no prompt twice until the
 * whole bank has been used); every time a prompt comes back around it returns in
 * a different form (plain, or "starting with <letter>"). So a given day's set
 * effectively never repeats.
 */
export function dailyGame(dayNumber: number): string[] {
  const N = PROMPTS.length;
  const salt = hashString('krillion-daily-v2');
  const cycleOrder = (c: number) => createRng(`kd-order:${salt}:${c}`).shuffle(PROMPTS.map((_, i) => i));
  const formFor = (p: Prompt, c: number) => {
    const forms = ['', ...(VARIANTS.get(p.id) ?? [])];
    const order = createRng(`kd-form:${salt}:${p.id}`).shuffle(forms);
    const f = order[c % order.length];
    return f ? `${p.id}@${f}` : p.id;
  };
  const out: string[] = [];
  const used = new Set<string>();
  let i = (Math.max(1, dayNumber) - 1) * PROMPTS_PER_GAME;
  while (out.length < PROMPTS_PER_GAME) {
    const c = Math.floor(i / N);
    const p = PROMPTS[cycleOrder(c)[i % N]];
    if (!used.has(p.id)) { used.add(p.id); out.push(formFor(p, c)); }
    i++;
  }
  return capTwists(out);
}

// ---------- depth zones (your dive's "level") ----------
// Your run's rank — what kind of fish you are today.
export const ZONES = [
  { min: 0, name: 'Krill', color: '#FF9F7A' },
  { min: 100, name: 'Minnow', color: '#7FD8FF' },
  { min: 220, name: 'Mackerel', color: '#3DA9FF' },
  { min: 340, name: 'Barracuda', color: '#7A5CFF' },
  { min: 460, name: 'Swordfish', color: '#A66BFF' },
  { min: 580, name: 'Leviathan', color: '#C8FF00' },
];
export const zoneFor = (total: number) => [...ZONES].reverse().find((z) => total >= z.min)!;
export const TIER_DEPTH: Record<Tier, string> = { common: 'Surface', uncommon: 'Reef', rare: 'Abyss', deep: 'Trench' };

export function scoreGame(promptIds: string[], answers: string[]) {
  const results = promptIds.map((id, i) => {
    const raw = answers[i] ?? '';
    let v = raw.trim() ? judge(id, raw) : ({ status: 'invalid', reason: 'timeout' } as Verdict);
    // Scoring is strict: the client confirms any spelling fix and submits the
    // canonical answer, so an unconfirmed fuzzy match never scores.
    if (v.status === 'valid' && v.corrected) v = { status: 'invalid', reason: 'not-in-bank' };
    return { promptId: id, answer: raw, verdict: v };
  });
  const total = results.reduce((s, r) => s + (r.verdict.status === 'valid' ? r.verdict.points : 0), 0);
  return { results, total };
}

/** A few sample answers per tier (shown after the round, so players learn the scale). */
export function sampleAnswers(promptId: string, perTier = 3): Record<Tier, string[]> {
  const p = getPrompt(promptId)!;
  const out = { common: [], uncommon: [], rare: [], deep: [] } as Record<Tier, string[]>;
  for (const e of p.entries) if (out[e.tier].length < perTier) out[e.tier].push(e.canonical);
  return out;
}
