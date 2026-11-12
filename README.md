# OFFGRID — Think for yourself.

Daily puzzles, an unlimited arcade, and real-time versus. Next.js 14 (static export) + React + TypeScript + Tailwind + Framer Motion, HTML Canvas games, and a small Node WebSocket game server for online play.

---

## Put it on Netlify

### Option A — drag and drop (fastest)
1. Unzip **offgrid-netlify-site.zip**.
2. Go to **app.netlify.com/drop** and drag the unzipped folder onto the page.
3. Done — every daily puzzle and arcade game works immediately.

### Option B — from Git (auto-deploys on every push)
1. Put the **source** folder in a GitHub repo.
2. Netlify → *Add new site → Import an existing project* → pick the repo.
3. Build settings come from `netlify.toml` (build `npm run build`, publish `out`).

### Turning on online play (Versus rooms, TAG online, quick match, global leaderboards)
Netlify only hosts static files, so the **game server** has to run somewhere that supports WebSockets. It's free on Render:

1. Push the source to GitHub → **render.com → New → Blueprint** → pick the repo (uses `render.yaml`).
2. When it's live, copy its address, e.g. `https://offgrid-game-server.onrender.com`, and change `https` → `wss`.
3. In your Netlify site, edit **`offgrid-config.js`** (top level of the site folder):
   ```js
   window.OFFGRID_GAME_SERVER = "wss://offgrid-game-server.onrender.com";
   ```
   Re-upload (Option A) or commit `public/offgrid-config.js` (Option B). No rebuild of the site is needed.

A `Dockerfile` is included for Fly.io / Railway / any Docker host instead. Notes: Render's free tier sleeps after inactivity (the first connection can take ~30s to wake), and leaderboard data is saved to `server/data/db.json`, which resets on redeploy unless you attach a persistent disk (or swap `server/store.ts` for a database).

Without a game server configured, the site still runs fully; Versus pages say online play isn't switched on.

---

## Run it locally

```bash
npm install
npm run dev          # web on http://localhost:3000 + game server on ws://localhost:3001
```
- `npm test` — logic suite (149 checks)
- `npx tsx tests/multiplayer.ts` — two real clients against a running game server (20 checks)
- `npm run build && npm run preview` — serve the exact static build on http://localhost:4173

---

## What's inside

| Section | Games |
|---|---|
| **Daily** | Krillion, Wordle, Connections (daily + unlimited), Sequence, Recall. Mini Crossword is a placeholder marked "In development". |
| **Arcade** | TAG, Blockout, Dodge, Reflex, Stack, Escape, **Ghost Run**, **Hot Potato**, **Pivot**, **Bounce** |
| **Versus** | Private rooms with invite links/codes, quick match, best-of 1/3/5, rematch. Real-time TAG; same-seed head-to-head for the other versus games. |

### Krillion
- **58 prompts, 11,296 hand-curated answers**, plus "starting with ⟨letter⟩" twists (693 prompt forms, max 2 twists per dive).
- Four editorial rarity levels: Common 10 · Uncommon 25 · Rare 50 · Deep Cut 100. Tiers are curators' judgment, not survey data.
- Guess as often as you like within each 25 seconds; misses cost only time.
- **No silent autocorrect**: a near-miss spelling triggers "Did you mean …?" — Enter to confirm, Esc to reject. Scoring is strict (unconfirmed fuzzy matches never score, also server-side).
- Fish reveal: the more common your answer, the bigger the school you swim with; a Deep Cut leaves you alone in the dark with an angler. Your total sets your fish rank for the day (Krill → Leviathan).
- The Daily Dive is identical for everyone and never repeats (tested over 10 years of dailies).

### New arcade games
- **Ghost Run** — maze time trials against a frame-perfect replay. Share your ghost as a link; ghosts are validated so tampered or impossible runs are rejected. New daily course every day.
- **Hot Potato** — two players, one bomb with a hidden fuse; touch to pass. vs CPU or local 2-player. First to 3.
- **Pivot** — one-button gravity flip runner. The course generator always leaves a passable route (a look-ahead bot survives every tested course).
- **Bounce** — aim and clear every gold peg. Each level is proven clearable by a solver using the same physics; par = solver's shot count.

### Fair play
- Official daily challenges: leaving the tab, switching apps or reloading mid-attempt voids it (SIGNAL LOST), with no second official attempt. Casual modes auto-pause instead.
- Versus and daily-leaderboard results are recomputed on the server from raw play. Arcade leaderboard runs need a single-use server token; impossible scores for the elapsed time are rejected. Blockout runs are fully replayed.

## Not built yet
- Mini crossword (placeholder card only).
- Cross-device accounts (guest profiles stored in the browser work now).
- Spectator mode for versus rooms.
