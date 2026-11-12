// A second, real network player for manual testing: joins a room code, readies
// up, and plays (TAG: wanders; async games: submits a valid result).
//   npx tsx tests/bot.ts ROOMCODE
import WebSocket from 'ws';
import { seededAnswer } from '../src/games/wordle/logic';

const code = process.argv[2];
const ws = new WebSocket(process.env.SERVER ?? 'ws://localhost:3001');
const send = (m: object) => ws.send(JSON.stringify(m));
let game = '';
ws.on('open', () => {
  send({ t: 'hello', player: { id: 'testbot' + Math.floor(Math.random() * 1e6), name: 'Test Bot', avatar: { color: '#FF6BD6', glyph: '☻' } } });
  send({ t: 'room:join', code, rid: 'j' });
});
let wander: ReturnType<typeof setInterval> | null = null;
ws.on('message', (d) => {
  const m = JSON.parse(String(d));
  if (m.rid === 'j') console.log('join:', m.t, m.error ?? '');
  if (m.t === 'room:state') {
    game = m.room.game;
    const me = m.room.players.find((p: { name: string }) => p.name === 'Test Bot');
    if (me && !me.ready && (m.room.status === 'lobby' || m.room.status === 'round-over')) send({ t: 'room:ready', ready: true });
    console.log('room:', m.room.status, 'scores', JSON.stringify(m.room.scores));
  }
  if (m.t === 'match:start') {
    console.log('start round', m.round, 'roles', JSON.stringify(m.roles));
    if (game === 'tag') {
      if (wander) clearInterval(wander);
      let a = Math.random() * 6.28;
      wander = setInterval(() => { a += (Math.random() - 0.5) * 0.8; send({ t: 'tag:input', x: Math.cos(a), y: Math.sin(a), dash: Math.random() < 0.05 }); }, 100);
    } else if (game === 'wordle') {
      setTimeout(() => send({ t: 'match:result', round: m.round, payload: { guesses: ['crane', 'slate', seededAnswer(m.seed, (m.settings.difficulty as 'normal') ?? 'normal')] } }), m.startsAt - Date.now() + 8000);
    }
  }
  if (m.t === 'round:result') { console.log('round result', JSON.stringify(m)); if (wander) clearInterval(wander); }
});
setTimeout(() => process.exit(0), 240000);
