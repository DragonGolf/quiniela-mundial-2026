# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Project overview

**Quiniela Mundial 2026** is a mobile + web app where users predict
(score-guess) the results of the 2026 FIFA World Cup matches and compete on a
points-based ranking. It is built with **Expo / React Native** (using
expo-router file-based navigation) and backed by **Supabase** (Postgres +
Auth + Edge Functions).

The app's UI language is **Spanish (es-MX)**. Keep user-facing strings,
labels, alerts, and comments in Spanish to match the existing style. Code
identifiers (variables, functions, types) are in English.

### Scoring rules
Points are computed in Postgres, not in the app:
- **Exact score** (`pred_home == real_home` and `pred_away == real_away`) → **3 pts**
- **Correct result** (right winner, or both draws) → **1 pt**
- **Wrong** → **0 pts**

See `calculate_points()` in `supabase/schema.sql`.

## Tech stack

- **Expo** `~54` / **React Native** `0.81` / **React** `19` (new architecture enabled)
- **expo-router** `~55` — file-based routing with typed routes (`experiments.typedRoutes`)
- **TypeScript** `~5.9`, `strict: true`
- **Supabase JS** `@supabase/supabase-js` v2 — Auth, Postgres, Edge Functions
- **expo-secure-store** — secure session storage on native (web uses default storage)
- Supabase **Edge Functions** run on **Deno** (`supabase/functions/`)

## Commands

```bash
npm install            # install dependencies

npm start              # expo start (dev server / Metro bundler)
npm run android        # expo start --android
npm run ios            # expo start --ios
npm run web            # expo start --web

npx tsc --noEmit       # typecheck (no dedicated lint/test scripts exist)
```

There is **no test suite, linter, or CI** configured yet. The only
verification available is `npx tsc --noEmit` for type safety. Prefer running
it after making code changes.

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Client-side vars must
be prefixed with `EXPO_PUBLIC_` to be bundled by Expo.

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `EXPO_PUBLIC_FOOTBALL_API_KEY` — key for football-data.org (used by the sync Edge Function)

The Edge Function reads its own secrets from the Deno environment
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_API_KEY`) — set these
as Supabase function secrets, **not** in the client `.env`.

`.env` and `.env*.local` are gitignored. Never commit secrets.

## Directory structure

```
app/                       # expo-router screens (file = route)
  _layout.tsx              # root Stack; wraps app in AuthProvider, handles auth redirect
  +not-found.tsx           # 404 route
  (auth)/                  # auth route group (login / register)
    _layout.tsx
    login.tsx
    register.tsx
  (tabs)/                  # main app, bottom-tab navigator
    _layout.tsx            # Tabs config (Partidos / Ranking / Mi Perfil)
    index.tsx              # Partidos — match list grouped by date, prediction entry
    ranking.tsx            # Ranking — standings leaderboard
    perfil.tsx             # Mi Perfil — user stats + sign out
  admin/                   # admin-only area (manual score entry + API sync)
    _layout.tsx
    index.tsx
components/                # reusable presentational components
  MatchCard.tsx            # one match row/card
  PredictionModal.tsx      # bottom-sheet to enter a score prediction
  RankingRow.tsx           # one leaderboard row
  EmptyState.tsx           # shared empty-state placeholder
constants/
  Colors.ts                # Colors palette + StageLabels + StatusLabels (Spanish)
lib/                       # data + auth layer (the "backend client")
  supabase.ts              # configured Supabase client (SecureStore adapter)
  auth.tsx                 # AuthProvider context + useAuth() hook
  api.ts                   # all data-access functions (matches, predictions, ranking, admin)
  types.ts                 # shared TypeScript types/interfaces
supabase/
  schema.sql               # full DB schema: tables, functions, triggers, RLS, seed data
  functions/sync-matches/
    index.ts               # Deno Edge Function: pull fixtures from football-data.org
assets/                    # app icons / splash images
```

Path alias: `@/*` maps to the repo root (e.g. `@/lib/api`, `@/constants/Colors`).

## Architecture & conventions

### Routing & auth flow
- `app/_layout.tsx` wraps everything in `AuthProvider` and renders a `Stack`
  with three groups: `(auth)`, `(tabs)`, `admin`. Headers are hidden at the
  root; each group sets its own.
- `RootNavigator` redirects based on session: signed-in → `/(tabs)`, signed-out
  → `/(auth)/login`. Don't add redundant auth guards in individual screens;
  the admin screen additionally checks `profile.is_admin` and `router.back()`s
  if not an admin.
- Navigate with `router` / `Link` from `expo-router`. Routes are typed.

### Auth & profile
- `lib/auth.tsx` exposes `useAuth()` → `{ session, profile, loading, signOut, refreshProfile }`.
- On sign-up (`register.tsx`), a row is inserted into `profiles` with the
  user's display name. `profile.name` is what shows on the ranking.
- Admin status lives on `profiles.is_admin` (set manually in the DB).

### Data access — keep it in `lib/api.ts`
- All Supabase reads/writes for matches, predictions, ranking, and admin
  actions live in `lib/api.ts`. **Add new queries there** rather than calling
  `supabase` directly inside screens (a couple of screens do inline queries for
  one-off stats — follow the `lib/api.ts` pattern for anything reusable).
- Predictions are saved via `upsert` on the `(user_id, match_id)` unique
  constraint (`savePrediction`).
- The ranking comes from the `standings` SQL **view**, not computed in JS.
- `triggerMatchSync()` invokes the `sync-matches` Edge Function.

### Database (`supabase/schema.sql`)
This file is the source of truth for the schema. To set up a project, run it
in the Supabase SQL Editor. Key points:
- Tables: `profiles`, `matches`, `predictions`.
- `calculate_points(...)` SQL function implements the scoring rules.
- Trigger `trigger_recalculate_points` (BEFORE UPDATE on `matches`)
  **recalculates every prediction's `points`** when a match becomes
  `finished` with scores set. → Points are never written from the client.
- `standings` view aggregates the leaderboard (total points, exact scores,
  correct results, count) for finished matches only.
- **Row Level Security is enabled on all tables.** Notably:
  - Predictions can only be inserted/updated while the match is `upcoming`.
  - You can always read your own predictions; others' predictions are only
    visible once the match is `live`/`finished` (so picks stay hidden
    pre-kickoff).
  - Only `is_admin` users can write to `matches`; `service_role` (the Edge
    Function) bypasses for syncing.

  **When changing access rules, update the RLS policies in `schema.sql`** — the
  app relies on them for correctness and security, not just convenience.
- The bottom of `schema.sql` has **seed match data** for local testing;
  remove it once real API data is synced.

### Match sync Edge Function (`supabase/functions/sync-matches/index.ts`)
- Runs on Deno. Fetches the WC 2026 fixtures from
  `api.football-data.org/v4` and upserts into `matches` (matched on
  `api_match_id`).
- Maps API status → app `status` (`upcoming`/`live`/`finished`) and API stage →
  app `Stage`. Maintains a `FLAG_MAP` (team name → emoji flag).
- Uses the **service role key** and runs server-side only.

### Status / stage model
- `MatchStatus`: `upcoming` | `live` | `finished` (drives editability + visibility).
- `Stage`: `group`, `round_of_32`, `round_of_16`, `quarterfinal`, `semifinal`,
  `third_place`, `final`. Human labels live in `constants/Colors.ts`
  (`StageLabels`, `StatusLabels`) — both in Spanish.

### Styling
- Use the shared palette in `constants/Colors.ts` (`Colors.primary`, `accent`,
  `gold`, etc.) — avoid hardcoding hex values in components.
- Styling uses React Native `StyleSheet.create`, colocated at the bottom of
  each component file. Follow that pattern.
- UI uses emoji (flags, trophy, tab icons) liberally; that's intentional.

## Conventions checklist for changes

- Match the existing code style: functional components, hooks, `StyleSheet`
  at the bottom of the file, Spanish UI strings, English identifiers.
- Put reusable data access in `lib/api.ts` and shared types in `lib/types.ts`.
- Keep scoring/points logic in Postgres (`schema.sql`), never compute and
  write `points` from the client.
- If you change table shapes or access rules, update `supabase/schema.sql`
  (and the corresponding types in `lib/types.ts`).
- Run `npx tsc --noEmit` before considering a change done.
- Don't commit `.env` or any secrets.

## Git / workflow

- Active development branch: `claude/claude-md-docs-707ggh` (default branch is `main`).
- Use clear, descriptive commit messages. Do not open a pull request unless
  explicitly asked.
</content>
</invoke>
