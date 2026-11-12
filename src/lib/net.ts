'use client';
// WebSocket client for the OFFGRID game server (server/index.ts).
// One shared connection per tab, auto-reconnect, request/response helper,
// and server-clock offset estimation for synchronized countdowns.
import { getPlayer } from './identity';

type Listener = (msg: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Where the multiplayer/leaderboard server lives. In order:
 *  1. window.OFFGRID_GAME_SERVER — set in /offgrid-config.js (edit after deploy, no rebuild)
 *  2. NEXT_PUBLIC_GAME_SERVER_URL — baked in at build time
 *  3. local development: ws://<this host>:3001
 * On a public host with nothing configured, multiplayer is simply switched off.
 */
export function serverUrl(): string {
  if (typeof window === 'undefined') return '';
  const cfg = (window as unknown as { OFFGRID_GAME_SERVER?: string }).OFFGRID_GAME_SERVER;
  if (cfg) return cfg;
  const env = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (env) return env;
  const h = window.location.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h);
  if (!local) return '';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${h}:3001`;
}

export const roomPath = (code: string) => `/versus/room/?code=${encodeURIComponent(code)}`;
export const NOT_CONFIGURED = 'Multiplayer server not set up for this site';

class Net {
  ws: WebSocket | null = null;
  status: 'idle' | 'connecting' | 'open' | 'closed' | 'disabled' = 'idle';
  listeners = new Map<string, Set<Listener>>();
  statusListeners = new Set<(s: Net['status']) => void>();
  pending = new Map<string, (msg: any) => void>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  queue: string[] = [];
  clockOffset = 0; // serverTime - localTime
  rtt = 0;
  retry = 0;
  timer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.status === 'open' || this.status === 'connecting')) return;
    const url = serverUrl();
    if (!url) { this.queue = []; this.setStatus('disabled'); return; }
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.setStatus('closed');
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      const p = getPlayer();
      this.raw({ t: 'hello', player: { id: p.id, name: p.name, avatar: p.avatar } });
      this.ping();
      for (const q of this.queue.splice(0)) ws.send(q);
    };
    ws.onmessage = (ev) => {
      let msg: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'pong') {
        const now = Date.now();
        this.rtt = now - msg.c;
        this.clockOffset = msg.s + this.rtt / 2 - now;
      }
      if (msg.rid && this.pending.has(msg.rid)) {
        this.pending.get(msg.rid)!(msg);
        this.pending.delete(msg.rid);
      }
      this.listeners.get(msg.t)?.forEach((l) => l(msg));
      this.listeners.get('*')?.forEach((l) => l(msg));
    };
    ws.onclose = () => {
      this.setStatus('closed');
      this.ws = null;
      this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  scheduleReconnect() {
    if (this.timer) return;
    const delay = Math.min(8000, 500 * 2 ** this.retry++);
    this.timer = setTimeout(() => { this.timer = null; this.connect(); }, delay);
  }

  ping() {
    this.raw({ t: 'ping', c: Date.now() });
  }

  setStatus(s: Net['status']) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  raw(msg: object) {
    const data = JSON.stringify(msg);
    if (this.ws && this.status === 'open') this.ws.send(data);
    else if (this.status !== 'disabled') { this.queue.push(data); this.connect(); }
  }

  send(t: string, payload: object = {}) {
    this.raw({ t, ...payload });
  }

  request<T = any>(t: string, payload: object = {}, timeout = 6000): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const rid = Math.random().toString(36).slice(2);
    if (typeof window !== 'undefined' && !serverUrl()) return Promise.reject(new Error(NOT_CONFIGURED));
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => { this.pending.delete(rid); reject(new Error('Game server did not respond')); }, timeout);
      this.pending.set(rid, (m) => { clearTimeout(to); m.error ? reject(new Error(m.error)) : resolve(m); });
      this.raw({ t, rid, ...payload });
    });
  }

  on(t: string, l: Listener) {
    if (!this.listeners.has(t)) this.listeners.set(t, new Set());
    this.listeners.get(t)!.add(l);
    return (): void => { this.listeners.get(t)?.delete(l); };
  }

  onStatus(l: (s: Net['status']) => void) {
    this.statusListeners.add(l);
    return (): void => { this.statusListeners.delete(l); };
  }

  serverNow() {
    return Date.now() + this.clockOffset;
  }
}

export const net = new Net();

/** Re-announce identity after the player edits their name/avatar. */
export function refreshIdentity() {
  const p = getPlayer();
  if (net.status === 'open') net.raw({ t: 'hello', player: { id: p.id, name: p.name, avatar: p.avatar } });
}
