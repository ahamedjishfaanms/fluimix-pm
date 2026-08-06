# Fluimix PM

A project management tool for the Fluimix team — main projects with nested
sub-projects, Kanban + list task views, due dates, assignees, documentation
pages, and a login restricted to **@fluimix.com** accounts.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase
(Postgres + Auth). Light/dark mode, mobile-responsive throughout.

## Features

- **Login restricted to @fluimix.com** — enforced both in the UI and in the
  database (a Postgres trigger rejects sign-ups from any other domain), so it
  can't be bypassed by calling the API directly.
- **Profiles** — name, title, avatar.
- **Main projects & sub-projects** — projects can be nested one level deep
  (or more, the schema supports it) to mirror how Jira epics/initiatives
  break down into smaller projects.
- **Tasks** — title, description, status (Backlog/To Do/In Progress/In
  Review/Done), priority, due date, assignee, comments. Drag-and-drop Kanban
  board, plus a filterable list view.
- **My Tasks** — every task assigned to you, across every project.
- **Documentation** — a Markdown page per project (specs, decisions,
  runbooks), plus a company-wide documentation index.
- **Dashboard** — overdue tasks, tasks due this week, recent projects.
- **Dark mode** — toggle in the top bar, respects system preference.
- **Mobile-friendly** — collapsible sidebar becomes a drawer + bottom nav on
  small screens.

This covers the core of what teams use Jira/Asana/ClickUp for day to day. It
intentionally does **not** try to clone every advanced Jira feature (sprints,
story points, automation rules, custom workflows) — the schema is simple
enough that you can extend it with your own migrations as you need more.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any
   name/region and set a database password.
2. Once it's ready, open **SQL Editor**, paste the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   all tables, the `@fluimix.com`-only signup trigger, and Row Level Security
   policies.
3. Open **Authentication → Providers → Email** and make sure "Confirm email"
   is enabled (recommended) so people verify they own the mailbox.
4. Open **Authentication → URL Configuration** and set:
   - **Site URL**: your production URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs**: add `https://your-app.vercel.app/auth/confirm` and,
     for local dev, `http://localhost:3000/auth/confirm`
5. Open **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

That's it for the backend — no separate server to run; the browser talks to
Supabase directly (protected by Row Level Security) and Next.js server
components use the same tables for fast initial loads.

> **Note on the domain restriction**: the trigger checks the email with a
> regex (`...@fluimix\.com`). If you ever need a second allowed domain, edit
> the `handle_new_user()` function in `supabase/schema.sql` and re-run just
> that `create or replace function ...` block in the SQL Editor.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# then edit .env.local with your Supabase URL + anon key
npm run dev
```

Visit `http://localhost:3000`, click **Create an account**, sign up with a
`@fluimix.com` address, confirm the email, and sign in.

The first person who signs up won't automatically be an admin — everyone
starts as `member`. To make someone an admin, run this once in the Supabase
SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@fluimix.com';
```

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Fluimix PM"
gh repo create fluimix-pm --private --source=. --push
# or, without the GitHub CLI:
git remote add origin https://github.com/YOUR-ORG/fluimix-pm.git
git branch -M main
git push -u origin main
```

`.env.local` is already excluded via `.gitignore`, so your Supabase keys
won't be committed (the anon key is safe to expose publicly, but the flow
above keeps things tidy).

## 4. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo
   you just pushed.
2. Framework preset: **Next.js** (auto-detected).
3. Add environment variables (same two as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.
5. Once deployed, go back to Supabase → **Authentication → URL Configuration**
   and make sure the Site URL / Redirect URLs match your real Vercel domain
   (see step 1.4 above) — otherwise confirmation emails will link to the
   wrong place.

Every push to `main` will now auto-deploy.

## Project structure

```
app/
  (auth)/login, (auth)/signup        — public auth pages
  (app)/dashboard, projects, tasks,  — protected app (behind middleware)
        docs, profile
  auth/confirm                       — email confirmation route handler
components/
  ui/                                — button, input, card, dialog, etc.
  layout/                            — sidebar / mobile nav shell
  projects/, tasks/, docs/, profile/ — feature components
  theme/                             — dark mode provider + toggle
lib/
  supabase/                          — browser/server/middleware clients
  types.ts, utils.ts
supabase/
  schema.sql                         — full DB schema + RLS + auth trigger
middleware.ts                        — session refresh + route protection
```

## Customizing the theme

Colors live as HSL CSS variables in `app/globals.css` (`:root` for light
mode, `.dark` for dark mode) and as a Tailwind palette in
`tailwind.config.ts` (`primary`, `accent`). Change those in one place to
retheme the whole app.

## Extending it

Ideas that fit naturally into the current schema:
- **Sprints**: add a `sprints` table + `sprint_id` on `tasks`.
- **Labels/tags**: add a `labels` table + join table on `tasks`.
- **File attachments**: use Supabase Storage + a `task_attachments` table.
- **Notifications**: Supabase's Realtime is already enabled on `tasks`,
  `projects`, and `documents` — subscribe to changes client-side to build
  live updates or a notification bell.
