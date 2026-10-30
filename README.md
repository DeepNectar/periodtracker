# 🌸 Period Tracker

Vite + React period/cycle tracker. Works fully offline via localStorage, and optionally syncs to Supabase when env vars are configured.

## Features
- Log period days (today button or any past date picker)
- Auto-detects your average cycle & period length from history (or set manually)
- Predictions: next period window, estimated ovulation, fertile window
- Live status card: period day count, late warning, fertile-window indicator
- Delete individual entries
- Optional Supabase sync (`period_logs` table — see `supabase_schema.sql`)

## Local development
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serve the production build locally
```

Optional env (copy `.env.example` → `.env.local`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deploying to Vercel
This repo is already configured (`vercel.json`: framework `vite`, build `npm run build`, output `dist`).

1. Push this branch to GitHub.
2. Import the repo in Vercel (or push to the existing project's Production Branch).
3. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in **Settings → Environment Variables** if you want cloud sync (app works without them).
4. Wait for deployment status **Ready**, then open the production URL.

### If you see 404 NOT_FOUND after deploying
- The latest deployment must be **Ready** (Deployments tab) — a failed build serves the previous (empty) deployment.
- Check Build Logs for *"No Output Directory named "dist" found"* → means build failed or wrong output dir.
- Confirm Vercel is importing the branch that actually contains this code.

## Supabase setup (optional)
Run `supabase_schema.sql` in the Supabase SQL Editor, then set the two env vars above and redeploy.
