# post-meeting-notes

![](./public/template.png)

A focused web app for post-meeting notes, shared follow-up items, and per-student supervision history.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/ounold/10xdev.git
cd 10xdev
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

If `npm run dev` fails inside Codex on Windows with `Access is denied` or `Cannot read directory "../../.."`, rerun the same command from a normal PowerShell session outside Codex. In this repository, that error pattern points to Codex sandbox filesystem limits rather than broken app dependencies.

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test:e2e` - Run the critical-path Playwright dashboard role-flow spec against an already-running local server
- `npm run test:e2e:headed` - Run the same e2e spec with a visible browser
- `npm run test:e2e:install` - Install the Chromium browser used by the local e2e spec
- `npm run test:integration` - Run the shared read-model continuity integration checks
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

## Testing Access Safety and Critical Flows

The repository now includes a first browser-level regression check for the shared `/dashboard` route in [tests/e2e/dashboard-role-flow.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\dashboard-role-flow.spec.ts).

Run it like this:

1. Start the local server first:

```bash
npm run dev
```

2. In a second shell, run the e2e spec:

```bash
npm run test:e2e
```

Important local note:

- the Playwright setup intentionally does not start Astro for you
- in this Windows/Codex environment, Playwright-managed `npm run dev` was not reliable
- if no server is already listening on `http://127.0.0.1:4321`, the spec will fail with `ERR_CONNECTION_REFUSED`

### Local dashboard role-flow coverage

Without any extra credentials, the spec always proves:

- unauthenticated `/dashboard` requests redirect to `/auth/signin`

If you also provide role-specific test credentials in `.env` or `.dev.vars`, the same spec can additionally verify:

- unlinked student -> `/pending-access`
- linked student -> read-only `/dashboard`
- professor -> roster visibility plus thread-entry sentinel

Supported variables:

```bash
E2E_PROFESSOR_EMAIL=
E2E_PROFESSOR_PASSWORD=
E2E_LINKED_STUDENT_EMAIL=
E2E_LINKED_STUDENT_PASSWORD=
E2E_UNLINKED_STUDENT_EMAIL=
E2E_UNLINKED_STUDENT_PASSWORD=
```

If one of those account pairs is missing, the corresponding check is skipped intentionally. A partial green run does not replace hosted verification.

### Stored Playwright auth states in this repo

Before assuming a browser-level check needs fresh credentials, inspect the repo-local `.auth/` directory.

Current repo-specific fixtures:

- `.auth/user.json` - saved Playwright `storageState` for a professor session on `http://127.0.0.1:4321`
- `.auth/linked-student-olgierd.json` - saved Playwright `storageState` for one linked student session
- `.auth/linked-student-olgierd.meta.json` - companion metadata for the linked-student fixture, including own and foreign student ids used by cross-student access checks

Important usage note:

- these saved states are not wired into every existing spec automatically
- `tests/e2e/dashboard-role-flow.spec.ts` still uses `E2E_*_EMAIL` / `E2E_*_PASSWORD`
- `tests/e2e/linked-student-foreign-thread.spec.ts` already uses a repo-local `storageState` fixture by default
- `tests/e2e/linked-student-note-edit.spec.ts` and `tests/e2e/linked-student-note-append.spec.ts` can also reuse that linked-student fixture through `E2E_LINKED_STUDENT_STORAGE_STATE`
- `tests/e2e/linked-student-foreign-note-post.spec.ts` can derive a real foreign note id from the saved professor fixture in `.auth/user.json`

Agent rule for this repository:

- before concluding that professor or student E2E verification is blocked on missing credentials, check whether an appropriate `.auth/*.json` Playwright state already exists and whether the target spec can use it directly or with a small test-only adaptation

### Shared-note continuity E2E coverage

The repo now includes linked-student browser checks around the shared-note continuity slice:

- `tests/e2e/linked-student-note-edit.spec.ts` - linked student can update an existing shared note without seeing professor-only surfaces
- `tests/e2e/linked-student-note-append.spec.ts` - linked student can append a new item at the tail of a shared note and the spec restores state afterward
- `tests/e2e/linked-student-foreign-thread.spec.ts` - linked student cannot open another student's thread by direct URL
- `tests/e2e/linked-student-foreign-note-post.spec.ts` - linked student cannot submit direct POST updates to another student's note id

Recommended local run for this slice:

```bash
npx playwright test tests/e2e/linked-student-note-edit.spec.ts tests/e2e/linked-student-note-append.spec.ts tests/e2e/linked-student-foreign-thread.spec.ts tests/e2e/linked-student-foreign-note-post.spec.ts
```

## Testing Continuity and Read-Model Integration

The repository now includes a first integration-level continuity check for the shared supervision read model in [tests/integration/supervision-read-model.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-read-model.test.ts).

Run it like this:

```bash
npm run test:integration
```

What it protects:

- newest-first note ordering
- same-`meeting_date`, different-`created_at` tie-break behavior
- item ordering by `position`
- `info` / `task` semantic preservation through `src/lib/supervision.ts`

Important local note:

- this suite is intentionally below the browser layer and exercises Supabase-shaped reads with local stubs
- if `npm run test:integration` fails inside Codex on Windows with config-loading or esbuild filesystem errors, rerun it from a normal PowerShell session outside Codex
- a green local integration run does not replace hosted smoke for remote Supabase drift

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

This repository now includes supervision-domain migrations under `supabase/migrations/`. After the local stack starts, apply the repository schema with the usual Supabase migration workflow so local development includes the app's `profiles`, `students`, `notes`, and `note_items` tables in addition to `auth.users`.

Recommended local reset/apply flow after schema changes:

```bash
npx supabase db reset
```

That applies the checked-in migrations and the minimal development seed from `supabase/seed.sql`.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

If your change adds or modifies database schema, RLS, or SQL helpers, deploy the hosted Supabase changes explicitly before treating the Cloudflare release as complete:

```powershell
# one-time auth if needed
& '.\node_modules\supabase\bin\supabase.exe' login

# one-time link to the hosted project
& '.\node_modules\supabase\bin\supabase.exe' link --project-ref <project-ref>

# apply checked-in migrations to the linked remote project
& '.\node_modules\supabase\bin\supabase.exe' db push --linked
```

Only after the remote database is updated should you proceed with the Cloudflare release flow.

### Professor bootstrap configuration

If you run the `professor-bootstrap` change against a hosted Supabase project, also configure:

```
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
BOOTSTRAP_PROFESSOR_EMAIL=<professor-email>
```

`SUPABASE_SERVICE_ROLE_KEY` is required because the first-professor claim is performed by a dedicated server-side bootstrap endpoint with an admin client. This is intentional: current RLS blocks self-service role escalation for normal authenticated clients.

`BOOTSTRAP_PROFESSOR_EMAIL` is the single allowlisted account that may claim the first professor role when no professor exists yet.

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

### Local professor bootstrap verification

To verify the MVP professor bootstrap locally with a hosted Supabase project:

1. Set `BOOTSTRAP_PROFESSOR_EMAIL` to the account that should become the first professor.
2. Sign in with that allowlisted account and open `/dashboard`.
3. Confirm the app lands on the professor shell and shows `Current app role: professor`.
4. Sign out, then sign in with a different non-allowlisted account.
5. Confirm that second account lands on `/pending-access` rather than seeing professor content.

This two-account flow is the expected manual verification path for `professor-bootstrap`.

### Professor note-history verification

To verify the current `professor-note-history` slice against a hosted Supabase project:

1. Sign in as the bootstrap professor and open `/dashboard`.
2. Confirm at least one student thread is visible. If the hosted project has no students yet, create one manually in Supabase Studio under `public.students` with `professor_profile_id` set to the professor profile id.
3. Open a student thread and confirm existing notes render in chronological order when present.
4. Create a fresh dated note with multiple `info` / `task` rows and confirm it appears on the same thread after submit.

Current hosted-project note:

- the shipped write path verifies professor access with the session client, then persists note writes with the server-side admin client because the hosted Supabase project currently rejects session-client note inserts under RLS. Treat that as a temporary hardening adaptation until the hosted RLS/session-write path is reconciled.

### Professor student-roster verification

To verify the current `professor-student-roster` slice against a hosted Supabase project:

1. Sign in as the professor and open `/dashboard`.
2. Create one student using only `full_name`.
3. Create another student using both `full_name` and `email`.
4. Confirm each new student appears immediately in the dashboard roster.
5. Open the new roster entries and confirm they still link into `/dashboard/students/[studentId]`.

Current hosted-project note:

- the shipped roster write path first attempts the intended session-client insert and falls back to the server-side admin client only after the route verifies the authenticated professor session. This is a temporary adaptation for hosted Supabase environments where remote RLS currently rejects session-client student inserts.

### Student read-history verification

To verify the current `student-read-history` slice against a hosted Supabase project:

1. Make sure one `public.students` row is linked to a real student profile by setting `student_profile_id` to that student's `profiles.id`.
2. Sign in with the linked student account and open `/dashboard`.
3. Confirm the student sees only their own chronological supervision history in a read-only view.
4. Confirm the student dashboard does not expose professor roster, note-creation, or editing controls.
5. Sign out and sign in with an unlinked student account.
6. Confirm the unlinked account still lands on `/pending-access`.

Current hosted-project note:

- `student-read-history` depends on a real hosted link between `students.student_profile_id` and the student's `profiles.id`. The slice does not provide in-app linking yet; that setup still happens outside the UI.

### Hosted smoke for dashboard role-flow checks

Use this when local `npm run test:e2e` is green and you still need to confirm the hosted auth/linking reality behind the same shared `/dashboard` seam.

1. Linked student check
   - sign in with a hosted account whose `profiles.id` is already linked through `public.students.student_profile_id`
   - open `/dashboard`
   - confirm the account sees only its own read-only supervision history
   - confirm no professor roster or note-creation controls are visible

2. Unlinked student check
   - sign in with a hosted student account that has no matching `public.students.student_profile_id`
   - open `/dashboard`
   - confirm the account lands on `/pending-access`

3. Professor sentinel check
   - sign in as the hosted professor
   - open `/dashboard`
   - confirm the roster is visible
   - open one student thread
   - confirm the thread still renders its chronological history

For local browser-level verification, the repo also carries a saved professor Playwright state in `.auth/user.json`. Prefer checking that fixture before asking for fresh professor credentials.

Treat these hosted checks as required smoke, not optional confidence polish. The local e2e spec protects the route contract, but it cannot prove remote Supabase link state by itself.

## Supervision Domain Schema

The MVP now includes a first-pass supervision data model in Supabase:

- `profiles` — app-level identity and role over `auth.users`
- `students` — professor-owned student records, optionally linked to a student profile
- `notes` — dated post-meeting notes for a single student
- `note_items` — ordered bullet items for a note, with explicit item type

Row-level security for these tables is planned as a follow-up foundation step; this repository change introduces the schema first so later slices can build on a stable model.

## App-Level Database Contract

The app-facing TypeScript contract for the supervision domain lives in [src/lib/database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts). Follow-up slices should import these types through the `@/*` alias instead of recreating the row shapes ad hoc.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/).

1. Build the project:

```bash
npm run build
```

If Wrangler or `astro build` fails on Windows with `EPERM` while writing under `%APPDATA%`, run the build with workspace-local XDG directories instead:

```powershell
$env:XDG_CONFIG_HOME="$PWD\\.tmp-xdg"
$env:XDG_CACHE_HOME="$PWD\\.tmp-xdg-cache"
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\astro\bin\astro.mjs' build
```

2. Deploy with Wrangler:

```bash
npx wrangler deploy
```

Recommended release order for production:

1. Push remote Supabase migrations with `supabase db push --linked` if the change touches schema or RLS.
2. Verify the hosted Supabase project is at the expected schema level.
3. Deploy the Worker with `npx wrangler deploy`.

Set `SUPABASE_URL` and `SUPABASE_KEY` as secrets in your Cloudflare dashboard or via `npx wrangler secret put`. If you deploy professor bootstrap, also set `SUPABASE_SERVICE_ROLE_KEY` and `BOOTSTRAP_PROFESSOR_EMAIL` in the target environment.

## CI

GitHub Actions runs lint + build on every push and PR to `master`. Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets in GitHub for the build step.

## License

MIT
