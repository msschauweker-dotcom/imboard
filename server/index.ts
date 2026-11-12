// OFFGRID game server — WebSocket rooms, matchmaking, an AUTHORITATIVE real-time
// TAG simulation, server-verified versus results and leaderboards.
//
//   npm run server        (or `npm run dev`, which starts web + server)
//   PORT=3001 by default. Data persists to server/data/db.json.
import { WebSocketServer, type WebSocket } from 'ws';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createMatch, stepMatch, type MatchState, type Input, type Role } from '../src/games/tag/sim';
import { MAP_BY_ID } from '../src/games/tag/maps';
import { scoreVersus, scoreDaily, checkRun, ARCADE_BOARDS } from './verify';
import { Store } from './store';
import { puzzleNumber, dateKey, weekKey, parseKey } from '../src/lib/daily';

const PORT = Number(process.env.PORT) || 3001;
const store = new Store();

type Avatar = { color: string; glyph: string };
type Client = { ws: WebSocket; id: string; name: string; avatar: Avatar; room: string | null; msgs: number; window: number };
type RP = { id: string; name: string; avatar: Avatar; ready: boolean; connected: boolean; leftAt: number | null };
type Sub = { verdict: ReturnType<typeof scoreVersus>; at: number };
type Room = {
  code: string;
  game: string;
  settings: Record<string, unknown>;
  bestOf: number;
  hostId: string;
  players: RP[];
  status: 'lobby' | 'countdown' | 'playing' | 'round-over' | 'match-over';
  round: number;
  scores: Record<string, number>;
  seed: string;
  roundStart: number;
  subs: Record<string, Sub>;
  history: { round: number; winner: string | null; results: Record<string, string> }[];
  winner: string | null;
  roundDeadline: number;
  tag: { s: MatchState; inputs: Record<string, Input>; roles: Record<string, Role>; timer: ReturnType<typeof setInterval>; tick: number; events: MatchState['events'] } | null;
  public: boolean;
  lastActive: number;
};

const clients = new Map<WebSocket, Client>();
const rooms = new Map<string, Room>();
const queues = new Map<string, Client[]>();
const VERSUS_GAMES = new Set(['tag', 'wordle', 'connections', 'krillion', 'reflex', 'stack', 'dodge', 'blockout', 'escape']);
const ROUND_TIMEOUT: Record<string, number> = { wordle: 600e3, connections: 600e3, krillion: 260e3, reflex: 180e3, stack: 600e3, dodge: 600e3, blockout: 900e3, escape: 900e3 };

const now = () => Date.now();
const newCode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  do { c = Array.from(randomBytes(5)).map((b) => A[b % A.length]).join(''); } while (rooms.has(c));
  return c;
};
const send = (ws: WebSocket, msg: object) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const reply = (c: Client, rid: string | undefined, msg: object) => send(c.ws, { ...msg, rid });
const clientsOf = (room: Room) => [...clients.values()].filter((c) => c.room === room.code);
const broadcast = (room: Room, msg: object) => clientsOf(room).forEach((c) => send(c.ws, msg));

function publicRoom(r: Room) {
  return {
    code: r.code, game: r.game, settings: r.settings, bestOf: r.bestOf, hostId: r.hostId,
    players: r.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, connected: p.connected })),
    status: r.status, round: r.round, scores: r.scores, history: r.history, winner: r.winner,
    roles: r.tag?.roles ?? null, seed: r.status === 'playing' || r.status === 'countdown' ? r.seed : null,
    roundStart: r.roundStart, deadline: r.roundDeadline, serverTime: now(),
  };
}
const pushRoom = (r: Room) => { r.lastActive = now(); broadcast(r, { t: 'room:state', room: publicRoom(r) }); };

function sanitizeSettings(game: string, s: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  if (game === 'tag') {
    out.map = typeof s.map === 'string' && MAP_BY_ID[s.map] ? s.map : 'courtyard';
    out.length = [30, 60, 90].includes(Number(s.length)) ? Number(s.length) : 60;
  }
  if (game === 'wordle' || game === 'connections') out.difficulty = ['easy', 'normal', 'hard'].includes(String(s.difficulty)) ? s.difficulty : 'normal';
  if (game === 'wordle') out.timeLimit = [0, 60, 120, 180].includes(Number(s.timeLimit)) ? Number(s.timeLimit) : 0;
  if (game === 'krillion') out.theme = typeof s.theme === 'string' ? s.theme.slice(0, 20) : 'mixed';
  if (game === 'blockout') out.level = Math.max(3, Math.min(30, Number(s.level) || 8));
  return out;
}

function makeRoom(host: Client, game: string, settings: Record<string, unknown>, bestOf: number, isPublic = false): Room {
  const r: Room = {
    code: newCode(), game, settings: sanitizeSettings(game, settings), bestOf: [1, 3, 5].includes(bestOf) ? bestOf : game === 'tag' ? 3 : 1,
    hostId: host.id, players: [], status: 'lobby', round: 0, scores: {}, seed: '', roundStart: 0, subs: {}, history: [], winner: null,
    roundDeadline: 0, tag: null, public: isPublic, lastActive: now(),
  };
  rooms.set(r.code, r);
  return r;
}

function joinRoom(c: Client, r: Room): string | null {
  const existing = r.players.find((p) => p.id === c.id);
  if (!existing && r.players.length >= 2) return 'Room is full';
  if (c.room && c.room !== r.code) leaveRoom(c);
  c.room = r.code;
  if (existing) { existing.connected = true; existing.leftAt = null; existing.name = c.name; existing.avatar = c.avatar; }
  else { r.players.push({ id: c.id, name: c.name, avatar: c.avatar, ready: false, connected: true, leftAt: null }); r.scores[c.id] = 0; }
  pushRoom(r);
  // Resync a reconnecting player mid-round
  if (r.status === 'playing' || r.status === 'countdown') send(c.ws, { t: 'match:start', round: r.round, seed: r.seed, settings: r.settings, startsAt: r.roundStart, roles: r.tag?.roles ?? null, serverTime: now(), resumed: true });
  return null;
}

function leaveRoom(c: Client, explicit = false) {
  const r = c.room ? rooms.get(c.room) : null;
  c.room = null;
  if (!r) return;
  const p = r.players.find((x) => x.id === c.id);
  if (!p) return;
  if (explicit && (r.status === 'lobby' || r.status === 'match-over')) {
    r.players = r.players.filter((x) => x.id !== c.id);
    delete r.scores[c.id];
    if (r.hostId === c.id && r.players[0]) r.hostId = r.players[0].id;
  } else {
    p.connected = false;
    p.leftAt = now();
    p.ready = false;
  }
  if (!r.players.length) { destroyRoom(r); return; }
  pushRoom(r);
}

function destroyRoom(r: Room) {
  if (r.tag) clearInterval(r.tag.timer);
  rooms.delete(r.code);
}

// ---------------- rounds ----------------
function maybeStart(r: Room) {
  if (r.players.length !== 2 || !r.players.every((p) => p.ready && p.connected)) return;
  if (!['lobby', 'round-over'].includes(r.status)) return;
  r.round += 1;
  r.seed = randomBytes(6).toString('hex');
  r.subs = {};
  r.players.forEach((p) => (p.ready = false));
  if (r.game === 'tag') return startTag(r);
  r.status = 'countdown';
  r.roundStart = now() + 3000;
  r.roundDeadline = r.roundStart + (r.game === 'wordle' && r.settings.timeLimit ? Number(r.settings.timeLimit) * 1000 + 15000 : ROUND_TIMEOUT[r.game]);
  pushRoom(r);
  broadcast(r, { t: 'match:start', round: r.round, seed: r.seed, settings: r.settings, startsAt: r.roundStart, serverTime: now() });
  setTimeout(() => { if (r.status === 'countdown') { r.status = 'playing'; pushRoom(r); } }, 3000);
}

function submitResult(c: Client, r: Room, payload: Record<string, unknown>, round: number) {
  if (r.status !== 'playing' || round !== r.round || r.game === 'tag') return 'Not accepting results';
  if (!r.players.some((p) => p.id === c.id)) return 'Not in this room';
  if (r.subs[c.id]) return 'Result already submitted'; // duplicate-submission guard
  const elapsed = now() - r.roundStart;
  if (elapsed < 0) return 'Round has not started';
  r.subs[c.id] = { verdict: scoreVersus(r.game, r.settings, r.seed, payload, elapsed), at: now() };
  broadcast(r, { t: 'match:progress', submitted: Object.keys(r.subs) });
  if (r.players.every((p) => r.subs[p.id])) resolveRound(r);
  return null;
}

function resolveRound(r: Room, forfeits: string[] = []) {
  const [a, b] = r.players;
  const val = (p: RP) => {
    if (forfeits.includes(p.id)) return -Infinity;
    const s = r.subs[p.id];
    // A player who stayed (e.g. TAG, which has no submissions) beats a forfeiter.
    if (!s) return forfeits.length ? -1e15 : -Infinity;
    return s.verdict.ok ? s.verdict.value : -Infinity; // rejected (cheating/invalid) results lose
  };
  const va = val(a), vb = val(b);
  const winner = va === vb ? null : va > vb ? a.id : b.id;
  const results: Record<string, string> = {};
  for (const p of r.players) {
    const s = r.subs[p.id];
    results[p.id] = forfeits.includes(p.id) ? 'Forfeit' : !s ? (forfeits.length ? 'Win by forfeit' : 'No result') : s.verdict.ok ? s.verdict.display : `Rejected: ${s.verdict.reason}`;
  }
  endRound(r, winner, results);
}

function endRound(r: Room, winner: string | null, results: Record<string, string>) {
  if (winner) r.scores[winner] = (r.scores[winner] || 0) + 1;
  r.history.push({ round: r.round, winner, results });
  const need = Math.floor(r.bestOf / 2) + 1;
  const champ = r.players.find((p) => (r.scores[p.id] || 0) >= need);
  if (champ || r.history.length >= r.bestOf * 2) {
    r.status = 'match-over';
    const [a, b] = r.players;
    r.winner = champ ? champ.id : (r.scores[a.id] || 0) === (r.scores[b?.id] || 0) ? null : (r.scores[a.id] || 0) > (r.scores[b?.id] || 0) ? a.id : b.id;
  } else r.status = 'round-over';
  if (r.tag) { clearInterval(r.tag.timer); }
  broadcast(r, { t: 'round:result', round: r.round, winner, results });
  pushRoom(r);
}

// ---------------- authoritative TAG ----------------
function startTag(r: Room) {
  const [a, b] = r.players;
  // roles alternate each round; host chases first
  const hostFirst = r.round % 2 === 1;
  const host = r.players.find((p) => p.id === r.hostId) ?? a;
  const other = host === a ? b : a;
  const roles: Record<string, Role> = hostFirst ? { [host.id]: 'chaser', [other.id]: 'runner' } : { [host.id]: 'runner', [other.id]: 'chaser' };
  const s = createMatch(String(r.settings.map), r.seed, Number(r.settings.length));
  const tag = { s, inputs: { [a.id]: { x: 0, y: 0 }, [b.id]: { x: 0, y: 0 } } as Record<string, Input>, roles, tick: 0, events: [] as MatchState['events'], timer: undefined as unknown as ReturnType<typeof setInterval> };
  r.tag = tag;
  r.status = 'playing';
  r.roundStart = now();
  r.roundDeadline = now() + (Number(r.settings.length) + 10) * 1000;
  pushRoom(r);
  broadcast(r, { t: 'match:start', round: r.round, seed: r.seed, settings: r.settings, startsAt: r.roundStart, roles, serverTime: now() });
  const DT = 1 / 60;
  let lastT = now();
  let acc = 0;
  tag.timer = setInterval(() => {
    const t = now();
    acc += Math.min(0.25, (t - lastT) / 1000);
    lastT = t;
    const id = (role: Role) => Object.keys(roles).find((k) => roles[k] === role)!;
    while (acc >= DT) {
      acc -= DT;
      stepMatch(s, { chaser: tag.inputs[id('chaser')] ?? { x: 0, y: 0 }, runner: tag.inputs[id('runner')] ?? { x: 0, y: 0 } }, DT);
      tag.events.push(...s.events);
      s.events.length = 0;
      tag.tick++;
      if (s.phase === 'over') break;
    }
    if (tag.tick % 3 === 0 || s.phase === 'over') {
      const pack = (x: MatchState['chaser']) => [x.x, x.y, x.vx, x.vy, x.fx, x.fy, x.dashCd, x.dashT, x.speedT, x.frozenT, x.ghostT, x.boostT].map((v) => Math.round(v * 1000) / 1000);
      broadcast(r, { t: 'tag:state', tick: tag.tick, st: { phase: s.phase, countdown: s.countdown, timeLeft: s.timeLeft, winner: s.winner, c: pack(s.chaser), r: pack(s.runner), pw: s.powers.map((p) => [p.x, p.y, p.type, p.respawn > 0 ? 1 : 0]) }, ev: tag.events.splice(0), at: now() });
    }
    if (s.phase === 'over') {
      clearInterval(tag.timer);
      const winnerId = id(s.winner!);
      const results: Record<string, string> = {};
      for (const p of r.players) results[p.id] = `${roles[p.id] === 'chaser' ? 'Chaser' : 'Runner'} — ${s.winner === roles[p.id] ? (s.winner === 'chaser' ? 'made the tag' : 'survived') : s.winner === 'chaser' ? 'got tagged' : 'ran out of time'}`;
      setTimeout(() => endRound(r, winnerId, results), 400);
    }
  }, 1000 / 60);
}

// ---------------- leaderboards ----------------
function rankOf(rows: { playerId: string; score: number }[], playerId: string, lower = false) {
  const best = new Map<string, number>();
  for (const x of rows) { const b = best.get(x.playerId); if (b == null || (lower ? x.score < b : x.score > b)) best.set(x.playerId, x.score); }
  const sorted = [...best.entries()].sort((a, b) => (lower ? a[1] - b[1] : b[1] - a[1]));
  return sorted.findIndex(([id]) => id === playerId) + 1;
}

const runTokens = new Map<string, { game: string; playerId: string; issued: number }>();

// ---------------- message handling ----------------
type Msg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function handle(c: Client, m: Msg) {
  const rid = typeof m.rid === 'string' ? m.rid : undefined;
  switch (m.t) {
    case 'ping': return send(c.ws, { t: 'pong', c: m.c, s: now() });
    case 'hello': {
      const p = m.player ?? {};
      if (typeof p.id === 'string' && /^[a-z0-9]{6,24}$/.test(p.id)) c.id = p.id;
      c.name = String(p.name ?? 'Guest').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 18) || 'Guest';
      c.avatar = { color: /^#[0-9a-f]{6}$/i.test(p.avatar?.color) ? p.avatar.color : '#C8FF00', glyph: String(p.avatar?.glyph ?? '●').slice(0, 2) };
      // re-attach to a room this player was in (refresh / reconnect)
      for (const r of rooms.values()) {
        const rp = r.players.find((x) => x.id === c.id);
        if (rp) { rp.name = c.name; rp.avatar = c.avatar; if (!rp.connected) { rp.connected = true; rp.leftAt = null; c.room = r.code; pushRoom(r); } }
      }
      return send(c.ws, { t: 'welcome', id: c.id, serverTime: now() });
    }
    case 'room:create': {
      if (!VERSUS_GAMES.has(m.game)) return reply(c, rid, { t: 'error', error: 'Game does not support versus' });
      const r = makeRoom(c, m.game, m.settings, Number(m.bestOf));
      joinRoom(c, r);
      return reply(c, rid, { t: 'room:created', code: r.code });
    }
    case 'room:join': {
      const r = rooms.get(String(m.code ?? '').toUpperCase());
      if (!r) return reply(c, rid, { t: 'error', error: 'Room not found — check the code' });
      const err = joinRoom(c, r);
      return reply(c, rid, err ? { t: 'error', error: err } : { t: 'room:joined', code: r.code });
    }
    case 'room:leave': leaveRoom(c, true); return reply(c, rid, { t: 'ok' });
    case 'room:ready': {
      const r = c.room ? rooms.get(c.room) : null;
      const p = r?.players.find((x) => x.id === c.id);
      if (!r || !p || !['lobby', 'round-over'].includes(r.status)) return;
      p.ready = !!m.ready;
      pushRoom(r);
      return maybeStart(r);
    }
    case 'room:config': {
      const r = c.room ? rooms.get(c.room) : null;
      if (!r || r.hostId !== c.id || r.status !== 'lobby') return;
      if (m.settings) r.settings = sanitizeSettings(r.game, { ...r.settings, ...m.settings });
      if ([1, 3, 5].includes(Number(m.bestOf))) r.bestOf = Number(m.bestOf);
      r.players.forEach((p) => (p.ready = false));
      return pushRoom(r);
    }
    case 'room:rematch': {
      const r = c.room ? rooms.get(c.room) : null;
      if (!r || r.status !== 'match-over') return;
      r.status = 'lobby'; r.round = 0; r.history = []; r.winner = null;
      r.players.forEach((p) => { r.scores[p.id] = 0; p.ready = false; });
      return pushRoom(r);
    }
    case 'match:result': {
      const r = c.room ? rooms.get(c.room) : null;
      if (!r) return reply(c, rid, { t: 'error', error: 'Not in a room' });
      const err = submitResult(c, r, m.payload ?? {}, Number(m.round));
      return reply(c, rid, err ? { t: 'error', error: err } : { t: 'ok' });
    }
    case 'tag:input': {
      const r = c.room ? rooms.get(c.room) : null;
      if (!r?.tag) return;
      const clamp = (v: unknown) => Math.max(-1, Math.min(1, Number(v) || 0));
      r.tag.inputs[c.id] = { x: clamp(m.x), y: clamp(m.y), dash: !!m.dash };
      return;
    }
    case 'queue:join': {
      if (!VERSUS_GAMES.has(m.game)) return;
      const q = (queues.get(m.game) ?? []).filter((x) => x.ws.readyState === 1 && x.id !== c.id);
      const opp = q.shift();
      if (opp) {
        queues.set(m.game, q);
        const r = makeRoom(opp, m.game, {}, m.game === 'tag' ? 3 : 1, true);
        joinRoom(opp, r); joinRoom(c, r);
        [opp, c].forEach((x) => send(x.ws, { t: 'queue:matched', code: r.code }));
      } else {
        q.push(c);
        queues.set(m.game, q);
        send(c.ws, { t: 'queue:waiting', game: m.game });
      }
      return;
    }
    case 'queue:leave': {
      for (const [g, q] of queues) queues.set(g, q.filter((x) => x !== c));
      return;
    }
    case 'lb:daily': {
      const game = String(m.game), day = Number(m.day), key = String(m.dateKey);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || puzzleNumber(key) !== day) return reply(c, rid, { t: 'error', error: 'Bad date' });
      // accept the player's local date if it's within a day of the server's
      if (Math.abs(parseKey(key).getTime() - parseKey(dateKey()).getTime()) > 1.5 * 86400e3) return reply(c, rid, { t: 'error', error: 'Date out of range' });
      if (store.hasDaily(game, key, c.id)) return reply(c, rid, { t: 'lb:ok', ok: false, reason: 'Already submitted today' });
      const v = scoreDaily(game, day, m.payload ?? {});
      if (!v.ok) return reply(c, rid, { t: 'lb:ok', ok: false, reason: `Rejected: ${v.reason}` });
      store.addDaily({ game, dateKey: key, week: weekKey(parseKey(key)), playerId: c.id, name: c.name, avatar: c.avatar, score: v.value, display: v.display, at: now() });
      return reply(c, rid, { t: 'lb:ok', ok: true, score: v.value, rank: rankOf(store.daily.filter((x) => x.game === game && x.dateKey === key), c.id) });
    }
    case 'lb:start': {
      const token = randomBytes(12).toString('hex');
      runTokens.set(token, { game: String(m.game), playerId: c.id, issued: now() });
      return reply(c, rid, { t: 'lb:token', token });
    }
    case 'lb:run': {
      const tk = runTokens.get(String(m.token));
      if (!tk || tk.playerId !== c.id || tk.game !== m.game) return reply(c, rid, { t: 'lb:ok', ok: false, reason: 'Invalid or used run token' });
      runTokens.delete(String(m.token)); // one submission per run
      const board = ARCADE_BOARDS[tk.game];
      const score = Number(m.score);
      const err = board ? checkRun(tk.game, score, m.payload ?? {}, now() - tk.issued) : 'no board';
      if (err) return reply(c, rid, { t: 'lb:ok', ok: false, reason: `Rejected: ${err}` });
      const key = dateKey();
      store.addRun({ game: tk.game, dateKey: key, week: weekKey(), playerId: c.id, name: c.name, avatar: c.avatar, score, display: board.fmt(score), at: now() });
      return reply(c, rid, { t: 'lb:ok', ok: true, rank: rankOf(store.runs.filter((x) => x.game === tk.game), c.id, board.lowerIsBetter) });
    }
    case 'lb:get': {
      const game = String(m.game), scope = String(m.scope);
      const ids: string[] | null = Array.isArray(m.ids) ? m.ids.slice(0, 200).map(String) : null;
      return reply(c, rid, { t: 'lb:data', ...store.board(game, scope as 'daily' | 'weekly' | 'all', ids, typeof m.dateKey === 'string' ? m.dateKey : dateKey()) });
    }
  }
}

// ---------------- housekeeping ----------------
setInterval(() => {
  const t = now();
  for (const r of rooms.values()) {
    // forfeit players gone > 20s mid-round; drop idle rooms after 2h
    if ((r.status === 'playing' || r.status === 'countdown')) {
      const gone = r.players.filter((p) => !p.connected && p.leftAt && t - p.leftAt > 20000).map((p) => p.id);
      if (gone.length) { if (r.tag) clearInterval(r.tag.timer); resolveRound(r, gone); continue; }
      if (r.game !== 'tag' && t > r.roundDeadline) { resolveRound(r, r.players.filter((p) => !r.subs[p.id]).map((p) => p.id)); continue; }
    }
    if (t - r.lastActive > 2 * 3600e3 || (r.players.every((p) => !p.connected) && t - r.lastActive > 10 * 60e3)) destroyRoom(r);
  }
  for (const [k, v] of runTokens) if (t - v.issued > 6 * 3600e3) runTokens.delete(k);
}, 2000);

// Plain HTTP for health checks (Render/Fly/Railway), WebSocket upgrades on the same port.
const http = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify({ ok: true, service: 'offgrid-game-server', rooms: rooms.size, players: clients.size }));
});
const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });
http.listen(PORT, '0.0.0.0');
wss.on('connection', (ws) => {
  const c: Client = { ws, id: randomBytes(6).toString('hex'), name: 'Guest', avatar: { color: '#C8FF00', glyph: '●' }, room: null, msgs: 0, window: now() };
  clients.set(ws, c);
  ws.on('message', (data) => {
    // basic flood protection: 120 messages / second
    const t = now();
    if (t - c.window > 1000) { c.window = t; c.msgs = 0; }
    if (++c.msgs > 120) return;
    let m: Msg;
    try { m = JSON.parse(String(data)); } catch { return; }
    try { handle(c, m); } catch (e) { console.error('handler error', e); }
  });
  ws.on('close', () => {
    for (const [g, q] of queues) queues.set(g, q.filter((x) => x !== c));
    if (c.room) {
      const r = rooms.get(c.room);
      const p = r?.players.find((x) => x.id === c.id);
      // only mark disconnected if no other socket of this player is still in the room
      const other = [...clients.values()].some((x) => x !== c && x.id === c.id && x.room === c.room);
      if (r && p && !other) { p.connected = false; p.leftAt = now(); p.ready = false; pushRoom(r); }
    }
    clients.delete(ws);
  });
});
console.log(`[offgrid] game server listening on ws://localhost:${PORT}`);
