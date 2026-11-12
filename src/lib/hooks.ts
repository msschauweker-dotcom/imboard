'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getPlayer, type Player } from './identity';
import { net } from './net';
import { soundEnabled, setSoundEnabled } from './sound';

/** Re-renders when anything in offgrid storage changes. */
export function useStorageTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    window.addEventListener('offgrid:storage', f);
    window.addEventListener('storage', f);
    return () => { window.removeEventListener('offgrid:storage', f); window.removeEventListener('storage', f); };
  }, []);
  return tick;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function usePlayer(): Player | null {
  const tick = useStorageTick();
  const [p, setP] = useState<Player | null>(null);
  useEffect(() => setP(getPlayer()), [tick]);
  return p;
}

export function useNetStatus() {
  const [s, setS] = useState(net.status);
  useEffect(() => {
    net.connect();
    setS(net.status);
    return net.onStatus(setS);
  }, []);
  return s;
}

export function useSound(): [boolean, (v: boolean) => void] {
  const tick = useStorageTick();
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundEnabled()), [tick]);
  return [on, (v: boolean) => { setSoundEnabled(v); setOn(v); }];
}

export const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);

/**
 * Tracks held keys for real-time games. While `active`, arrow keys, WASD and
 * Space are captured (preventDefault) so the page never scrolls mid-game.
 * Typing in inputs is never hijacked.
 */
export function useHeldKeys(active: boolean) {
  const held = useRef(new Set<string>());
  useEffect(() => {
    if (!active) { held.current.clear(); return; }
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (GAME_KEYS.has(e.code) || e.code.startsWith('Shift')) e.preventDefault();
      held.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    const blur = () => held.current.clear();
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [active]);
  return held;
}

/** Discrete key presses (turn-based games). Captures game keys while active. */
export function useKeyPress(active: boolean, onKey: (code: string, e: KeyboardEvent) => void) {
  const cb = useRef(onKey);
  cb.current = onKey;
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      cb.current(e.code, e);
    };
    window.addEventListener('keydown', down, { passive: false });
    return () => window.removeEventListener('keydown', down);
  }, [active]);
}

/**
 * FAIR PLAY for official daily attempts only. If the document becomes hidden
 * (tab switch, app switch, minimise) while `armed`, `onViolation` fires once.
 * Never used for casual arcade or unlimited modes.
 */
export function useFairPlay(armed: boolean, onViolation: (reason: string) => void) {
  const cb = useRef(onViolation);
  cb.current = onViolation;
  useEffect(() => {
    if (!armed) return;
    let fired = false;
    const fire = (reason: string) => { if (!fired) { fired = true; cb.current(reason); } };
    const vis = () => { if (document.visibilityState === 'hidden') fire('Left the challenge tab'); };
    const hide = () => fire('Navigated away mid-challenge');
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', hide); };
  }, [armed]);
}

/** Auto-pause casual games when the tab is hidden (no penalty). */
export function useAutoPause(active: boolean, pause: () => void) {
  const cb = useRef(pause);
  cb.current = pause;
  useEffect(() => {
    if (!active) return;
    const vis = () => { if (document.visibilityState === 'hidden') cb.current(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [active]);
}

export function useInterval(fn: () => void, ms: number | null) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => cb.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useRaf(fn: (dt: number, now: number) => void, running: boolean) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(dt, now);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
      else fallback(text, done);
    } catch { fallback(text, done); }
  }, []);
  return [copied, copy];
}
function fallback(text: string, done: () => void) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch { /* ignore */ }
  ta.remove();
}

export function useIsTouch() {
  const [t, setT] = useState(false);
  useEffect(() => setT(window.matchMedia?.('(pointer: coarse)').matches ?? false), []);
  return t;
}
