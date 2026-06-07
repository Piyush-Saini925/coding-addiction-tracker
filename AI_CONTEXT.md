# AI Context

## Project
- **Coding Addiction Tracker**: gamified coding habit web app; streaks, missions, tasks, XP/levels, stats, timer, notes, AI-shareable report.

## Stack
| Layer | Tech |
|---|---|
| UI | React 19, TypeScript, plain CSS |
| Build | Vite 8 |
| Auth/DB | Supabase JS 2, Postgres, RLS |
| Hosting | Vercel |
| APIs | Supabase Auth + REST |

## Structure
- `src/App.tsx`: auth callback/session flow + all screens/features.
- `src/lib/supabase.ts`: client/env/auth config.
- `src/ErrorBoundary.tsx`: render-crash fallback.
- `src/utils.ts`: XP/level/streak/badges/journey report.
- `src/types.ts`: DB/app types.
- `src/styles.css`: responsive UI.
- `supabase/schema.sql`: tables, RLS, seed missions.
- `supabase/repair-profiles-fk.sql`: checks/repairs `profiles.id -> auth.users.id`.
- `vercel.json`: Vite build/output config.
- `.env.example`: required env names; `.env` ignored.
- `README.md`: setup/deploy/test guide.

## Status
- `[D]` Local production build passes.
- `[D]` npm audit: 0 vulnerabilities.
- `[D]` Supabase project/schema; users appear in `auth.users`.
- `[D]` Vercel site: `https://coding-addiction-tracker.vercel.app`.
- `[W]` Public login/register page.
- `[B]` Verification -> dashboard: deployed old build gets profile FK `409`, then hangs.
- `[P]` Push latest local fixes to GitHub/Vercel; retest live.

## Features
| Feature | Status |
|---|---|
| Email/password auth + verification callback | `[W]` fixed locally; live deploy stale |
| Missions/tasks + custom items | `[D]` |
| XP/levels/streak/badges | `[D]` |
| Dashboard/heatmap/XP bars | `[D]` |
| Focus timer persistence + completion popup | `[D]` |
| Daily notes + history | `[D]` |
| Copy Journey Report Markdown | `[D]` |
| Show/hide password | `[D]` |

## Decisions
- Free client-only v1; no custom backend/server.
- Supabase is source of truth; RLS isolates users.
- Built-in missions: `missions.user_id=null`; custom data user-owned.
- Username not unique; email is auth identity.
- Auth URL handling explicit: implicit tokens or PKCE `code`; `detectSessionInUrl=false`.
- Timer persists in `localStorage`; DB stores completed sessions.

## Current Issue / Evidence
- Live asset observed: `assets/index-BQcq6cBi.js`.
- Latest local build observed: `assets/index-DgKDnsFE.js`.
- Therefore live Vercel is not latest local code.
- Old live failure: `POST /rest/v1/profiles?select=*` -> `409 profiles_id_fkey`; insert occurs in `ensureProfile()`.
- Local fix validates `auth.getUser()`, catches dashboard load errors, handles callback tokens/errors, adds ErrorBoundary.
- Do **not** assume repair SQL needed: first deploy latest code. Run FK repair only if latest deploy still produces FK error.

## Current Focus
- Deploy latest local source; verify live asset changes; retest full auth/profile flow.

## Next Actions
1. Ensure latest source exists in GitHub (`App.tsx`, `supabase.ts`, `ErrorBoundary.tsx`).
2. Trigger Vercel production redeploy; confirm asset is not `index-BQcq6cBi.js`.
3. Verify Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL=https://coding-addiction-tracker.vercel.app`.
4. Verify Supabase Auth Site URL + redirect: `https://coding-addiction-tracker.vercel.app/**`.
5. Incognito signup -> email verify -> session -> profile -> dashboard.
6. If FK error remains, compare `auth.users.id` with attempted `profiles.id`; then run `repair-profiles-fk.sql` only if constraint target is wrong.

## Commands
```powershell
cd "C:\Users\Lenovo\Documents\Making life in python"
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
npm.cmd run build
npm.cmd audit --audit-level=moderate
npx.cmd vercel --prod
```

## AI Notes
- Keep edits incremental; do not rebuild working features.
- Never commit `.env`, DB password, service-role key, or verification links/tokens.
- Public anon/publishable key belongs in Vercel env.
- Full live verification needs GitHub/Vercel/Supabase account access or user actions.
- Before debugging DB again, prove latest commit/build is deployed via asset hash.
