'use client';
// Tiny synthesized sound effects (no audio files to load). Muted by default
// until the player opts in via the sound toggle; preference persists.
import { load, save } from './storage';

let ctx: AudioContext | null = null;
let enabled: boolean | null = null;

export function soundEnabled(): boolean {
  if (enabled === null) enabled = load<boolean>('sound', false);
  return enabled;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  save('sound', v);
  if (v) blip('select');
}

type Fx = 'select' | 'good' | 'bad' | 'tick' | 'win' | 'lose' | 'pickup' | 'tag' | 'place' | 'go' | 'type' | 'ping' | 'deep' | 'nope';

const FX: Record<Fx, { f: number[]; d: number; type: OscillatorType; v?: number }> = {
  select: { f: [660, 880], d: 0.07, type: 'square', v: 0.05 },
  good: { f: [523, 784], d: 0.12, type: 'triangle' },
  bad: { f: [220, 150], d: 0.18, type: 'sawtooth', v: 0.05 },
  tick: { f: [1200], d: 0.03, type: 'square', v: 0.03 },
  win: { f: [523, 659, 784, 1046], d: 0.4, type: 'triangle' },
  lose: { f: [392, 311, 247], d: 0.45, type: 'sawtooth', v: 0.05 },
  pickup: { f: [880, 1320], d: 0.1, type: 'square', v: 0.05 },
  tag: { f: [180, 90], d: 0.25, type: 'square', v: 0.08 },
  place: { f: [330, 440], d: 0.06, type: 'triangle' },
  go: { f: [988], d: 0.12, type: 'square', v: 0.06 },
  type: { f: [700], d: 0.02, type: 'square', v: 0.02 },
  ping: { f: [1568, 1175], d: 0.16, type: 'sine', v: 0.07 },
  deep: { f: [196, 392, 587, 784, 1175, 1568], d: 0.7, type: 'triangle', v: 0.07 },
  nope: { f: [260, 220], d: 0.12, type: 'square', v: 0.035 },
};

export function blip(name: Fx) {
  if (!soundEnabled() || typeof window === 'undefined') return;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    const spec = FX[name];
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    const step = spec.d / spec.f.length;
    spec.f.forEach((f, i) => osc.frequency.setValueAtTime(f, t0 + i * step));
    gain.gain.setValueAtTime(spec.v ?? 0.06, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + spec.d + 0.02);
  } catch {
    /* audio unavailable */
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
