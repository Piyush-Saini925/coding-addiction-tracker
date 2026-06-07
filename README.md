# Coding Addiction Tracker

A full-stack web app that makes coding feel like a game with missions, tasks, XP, levels, streaks, badges, a focus timer, and a one-click journey report.

## Status

- App build: working
- Supabase schema: ready in `supabase/schema.sql`
- Local env: requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Deploy target: Vercel

## Tech

- React + Vite + TypeScript
- Plain CSS
- Supabase Auth + Postgres + Row Level Security
- Vercel deployment

## Features

- Email/password login
- Daily coding streak and longest streak
- Built-in and custom missions
- Daily checklist tasks
- XP and level system
- Achievement badges
- Progress dashboard with heatmap and XP bars
- Focus timer
- Copy Journey Report button for Claude, ChatGPT, mentors, or LinkedIn reflection

## Local Setup

1. Install dependencies:

```bash
npm.cmd install
```

2. Create a Supabase project.

3. Open Supabase SQL Editor and run:

```sql
-- Copy and run the full file:
-- supabase/schema.sql
```

4. Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_URL=http://127.0.0.1:5173
```

Use the base Supabase project URL, for example:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Do not include `/rest/v1/` in `VITE_SUPABASE_URL`.

For local email verification, click confirmation emails on the same computer that runs the dev server. A phone cannot open `127.0.0.1` on your laptop.

5. Start the app:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

6. Open:

```text
http://127.0.0.1:5173
```

## Deploy To Vercel

1. Push this project to GitHub.
2. Import the GitHub repo in Vercel.
3. Keep the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` with your final Vercel URL
5. Deploy.

If Git is not installed, upload the project files to a new GitHub repository through the GitHub website. Do not upload `node_modules`, `dist`, or `.env`.

## GitHub Upload Commands

Run these after Git is installed:

```powershell
git init
git add .
git commit -m "Initial Coding Addiction Tracker app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Do not commit `.env`. It is already ignored in `.gitignore`.

## Supabase Notes

- Run `supabase/schema.sql` before using the app.
- Row Level Security is enabled on all user tables.
- Built-in missions are readable by every logged-in user.
- User-created data is private to that user.
- If email confirmation is enabled, new users must confirm email before full login works.
- If local env values change, restart the dev server.
- In Supabase Auth URL Configuration, set the production Site URL to your final Vercel URL.
- Add redirect URLs for development and Vercel:
  - `http://127.0.0.1:5173/**`
  - `http://localhost:5173/**`
  - your final Vercel URL, for example `https://your-app.vercel.app/**`

## Testing Checklist

- Register a test account.
- Login with the same account.
- Complete one mission and confirm XP increases by 20.
- Complete one task and confirm XP increases by 10.
- Refresh the page and confirm progress remains.
- Copy Journey Report and paste it into a text editor to verify the Markdown.

## Portfolio Description

Coding Addiction Tracker is a gamified productivity web app for beginner programmers. It helps users build coding consistency through daily missions, XP, levels, streak tracking, badges, and progress reports that can be shared with AI tools or mentors for feedback.
