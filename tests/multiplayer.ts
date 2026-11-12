// End-to-end multiplayer test against a RUNNING game server (npm run server).
// Two independent WebSocket clients create/join rooms and play real rounds.
import WebSocket from 'ws';
import { seededAnswer } from '../src/games/wordle/logic';
import { dailyAnswer } from '../src/games/wordle/logic';
import { puzzleNumber, dateKey } from '../src/lib/daily';

const URL = process.env.SERVER ?? 'ws://localhost:3001';
let pass = 0, fail = 0;
const t = (n: string, c: boolean, info = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n} ${info}`); } };

type Cl = { ws: WebSocket; msgs: any[]; wait: (pred: (m: any) => boolean, ms?: number) => Promise<any>; send: (m: object) => void }; // eslint-disable-line @typescript-eslint/no-explicit-any
function client(id: string, name: string): Promise<Cl> {
  return new Promise((res) => {
    const ws = new WebSocket(URL);
    const msgs: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const waiters: { pred: (m: any) => boolean; res: (m: any) => void }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      msgs.push(m);
      for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.res(m); }
    });
    const c: Cl = {
      ws, msgs,
      send: (m) => ws.send(JSON.stringify(m)),
      wait: (pred, ms = 8000) => new Promise((ok, bad) => {
        const hit = msgs.find(pred);
        if (hit) { msgs.splice(msgs.indexOf(hit), 1); return ok(hit); }
        const to = setTimeout(() => bad(new Error('timeout')), ms);
        waiters.push({ pred, res: (m) => { clearTimeout(to); msgs.splice(msgs.indexOf(m), 1); ok(m); } });
      }),
    };
    ws.on('open', () => { c.send({ t: 'hello', player: { id, name, avatar: { color: '#C8FF00', glyph: '●' } } }); res(c); });
  });
}

async function main() {
  const uniq = Math.random().toString(36).slice(2, 8);
  const A = await client(`alice${uniq}`, 'Alice');
  const B = await client(`bobby${uniq}`, 'Bob');

  console.log('\n▸ Wordle versus (async, server-verified)');
  A.send({ t: 'room:create', rid: 'c1', game: 'wordle', bestOf: 1, settings: { difficulty: 'normal' } });
  const created = await A.wait((m) => m.rid === 'c1');
  t('room created with code', /^[A-Z0-9]{5}$/.test(created.code), created.code);
  B.send({ t: 'room:join', rid: 'j1', code: created.code.toLowerCase() });
  t('second player joins by code (case-insensitive)', (await B.wait((m) => m.rid === 'j1')).t === 'room:joined');
  const C = await client(`carol${uniq}`, 'Carol');
  C.send({ t: 'room:join', rid: 'j2', code: created.code });
  t('third player rejected (room full)', (await C.wait((m) => m.rid === 'j2')).error === 'Room is full');
  A.send({ t: 'room:ready', ready: true });
  B.send({ t: 'room:ready', ready: true });
  const sa = await A.wait((m) => m.t === 'match:start');
  const sb = await B.wait((m) => m.t === 'match:start');
  t('both players receive the same seed', sa.seed === sb.seed);
  const answer = seededAnswer(sa.seed, 'normal');
  // early submission is rejected (round hasn't started — countdown)
  A.send({ t: 'match:result', rid: 'early', round: 1, payload: { guesses: [answer] } });
  t('submission during countdown rejected', !!(await A.wait((m) => m.rid === 'early')).error);
  await new Promise((r) => setTimeout(r, 3300));
  A.send({ t: 'match:result', rid: 'r1', round: 1, payload: { guesses: ['crane', answer] } });
  t('valid result accepted', (await A.wait((m) => m.rid === 'r1')).t === 'ok');
  A.send({ t: 'match:result', rid: 'r1b', round: 1, payload: { guesses: [answer] } });
  t('duplicate submission rejected', (await A.wait((m) => m.rid === 'r1b')).error === 'Result already submitted');
  // Bob lies: claims a solve with a fake word list
  B.send({ t: 'match:result', rid: 'r2', round: 1, payload: { guesses: ['zzzzz'] } });
  await B.wait((m) => m.rid === 'r2');
  const res = await A.wait((m) => m.t === 'round:result');
  t('server picks the verified winner', res.winner === `alice${uniq}`, JSON.stringify(res));
  t('cheater result marked rejected', String(res.results[`bobby${uniq}`]).startsWith('Rejected'), res.results[`bobby${uniq}`]);
  const st = await A.wait((m) => m.t === 'room:state' && m.room.status === 'match-over');
  t('match over with winner', st.room.winner === `alice${uniq}`);
  A.send({ t: 'room:rematch' });
  const re = await B.wait((m) => m.t === 'room:state' && m.room.status === 'lobby');
  t('rematch resets to lobby', re.room.scores[`alice${uniq}`] === 0);
  A.send({ t: 'room:leave', rid: 'l' }); await A.wait((m) => m.rid === 'l');
  B.send({ t: 'room:leave', rid: 'l2' }); await B.wait((m) => m.rid === 'l2');

  console.log('\n▸ TAG versus (real-time, authoritative)');
  A.send({ t: 'room:create', rid: 'c2', game: 'tag', bestOf: 1, settings: { map: 'courtyard', length: 30 } });
  const tagRoom = await A.wait((m) => m.rid === 'c2');
  B.send({ t: 'room:join', rid: 'j3', code: tagRoom.code });
  await B.wait((m) => m.rid === 'j3');
  A.send({ t: 'room:ready', ready: true });
  B.send({ t: 'room:ready', ready: true });
  const ts = await A.wait((m) => m.t === 'match:start');
  t('tag roles assigned', ts.roles[`alice${uniq}`] === 'chaser' && ts.roles[`bobby${uniq}`] === 'runner', JSON.stringify(ts.roles));
  let snaps = 0; let lastRun: number[] = []; let firstRun: number[] | null = null;
  B.ws.on('message', (d) => { const m = JSON.parse(String(d)); if (m.t === 'tag:state') { snaps++; lastRun = m.st.r; firstRun ||= m.st.r; } });
  // Bob (runner) holds RIGHT; Alice idles. Inputs must move Bob on the server.
  const inp = setInterval(() => B.send({ t: 'tag:input', x: 1, y: 0 }), 50);
  await new Promise((r) => setTimeout(r, 4500));
  clearInterval(inp);
  t('server streams snapshots (~20Hz)', snaps > 50, String(snaps));
  t('runner input moved the runner on the server', firstRun != null && lastRun[0] !== firstRun[0], `${firstRun?.[0]} → ${lastRun[0]}`);
  // Inputs are clamped: a cheat speed vector of 50 must not outrun max speed
  B.send({ t: 'tag:input', x: 50, y: 0 });
  // Disconnect Alice: after 20s, Bob wins by forfeit
  B.msgs.length = 0;
  A.ws.close();
  const fr = await B.wait((m) => m.t === 'round:result', 30000);
  t('disconnect → forfeit win for remaining player', fr.winner === `bobby${uniq}`, JSON.stringify(fr));

  console.log('\n▸ Leaderboards');
  const day = puzzleNumber();
  const ans = dailyAnswer(day);
  B.send({ t: 'lb:daily', rid: 'd1', game: 'wordle', day, dateKey: dateKey(), payload: { guesses: ['crane', ans] } });
  const d1 = await B.wait((m) => m.rid === 'd1');
  t('verified daily score accepted', d1.ok && d1.score === (ans === 'crane' ? 6 : 5), JSON.stringify(d1));
  B.send({ t: 'lb:daily', rid: 'd2', game: 'wordle', day, dateKey: dateKey(), payload: { guesses: [ans] } });
  t('second daily submission rejected', (await B.wait((m) => m.rid === 'd2')).ok === false);
  B.send({ t: 'lb:start', rid: 's1', game: 'dodge' });
  const tok = (await B.wait((m) => m.rid === 's1')).token;
  B.send({ t: 'lb:run', rid: 'r9', game: 'dodge', token: tok, score: 999999 });
  t('impossible arcade score rejected', (await B.wait((m) => m.rid === 'r9')).ok === false);
  B.send({ t: 'lb:run', rid: 'r10', game: 'dodge', token: tok, score: 10 });
  t('run token single-use', /Invalid/.test((await B.wait((m) => m.rid === 'r10')).reason));
  B.send({ t: 'lb:get', rid: 'g', game: 'wordle', scope: 'daily', dateKey: dateKey() });
  const g = await B.wait((m) => m.rid === 'g');
  t('leaderboard returns verified row', g.rows.some((r: { playerId: string }) => r.playerId === `bobby${uniq}`));

  console.log(`\n${pass} passed, ${fail} failed`);
  B.ws.close(); C.ws.close();
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
