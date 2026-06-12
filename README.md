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

## Testing Policy

Use the layers below for different kinds of evidence. They are not interchangeable.

### Required gates

- `npm run lint`
- `npm run build`
- the risk-appropriate local test layer for the change:
  - `npm run test:e2e` for browser/auth/role-flow changes
  - `npm run test:integration` for read-model/ordering/contract changes
- hosted smoke when the feature depends on real Supabase auth, linkage, RLS, or remote data shape

Current GitHub CI still enforces only `npm run lint` and `npm run build`, so stronger product checks must still be run locally before merge or release.

### E2E evidence

Use Playwright as browser proof for user-visible flows:

- redirects and route guards
- role separation
- authenticated thread behavior

Green E2E means the browser flow works locally. It does not, by itself, prove that hosted Supabase state is correct.

### Integration and mutation hardening

- `npm run test:integration` is the cheaper gate for read-model composition, chronology, and continuity semantics
- `npm run test:mutation` is extra hardening for test strength, not a replacement for lint/build/E2E/integration gates
- high coverage percentages do not mean the mutation layer is satisfied

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
- this spec is browser-level evidence for the shared dashboard seam, not a substitute for hosted smoke when remote Supabase state matters

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

Current repo-specific fixtures or local fixture targets:

- `.auth/user.json` - saved Playwright `storageState` for a professor session on `http://127.0.0.1:4321`
- `.auth/linked-student-olgierd.json` - saved Playwright `storageState` for one linked student session
- `.auth/linked-student-olgierd.meta.json` - companion metadata for the linked-student fixture, including own and foreign student ids used by cross-student access checks
- `.auth/claim-student.json` - local Playwright `storageState` target for a student account that should begin on `/pending-access`
- `.auth/claim-student.meta.json` - local companion metadata target for the claim-flow fixture, currently storing the claim-student email anchor

Important usage note:

- `.auth/` is gitignored in this repository, so `claim-student.*` fixtures are local artifacts that must be generated or refreshed on your machine
- these saved states are not wired into every existing spec automatically
- `tests/e2e/dashboard-role-flow.spec.ts` still uses `E2E_*_EMAIL` / `E2E_*_PASSWORD`
- `tests/e2e/linked-student-foreign-thread.spec.ts` already uses a repo-local `storageState` fixture by default
- `tests/e2e/linked-student-note-edit.spec.ts` and `tests/e2e/linked-student-note-append.spec.ts` can also reuse that linked-student fixture through `E2E_LINKED_STUDENT_STORAGE_STATE`
- `tests/e2e/linked-student-foreign-note-post.spec.ts` can derive a real foreign note id from the saved professor fixture in `.auth/user.json`
- `tests/e2e/student-claim-flow.spec.ts` first looks for `.auth/claim-student.json`, then falls back to `E2E_CLAIM_STUDENT_*` or `E2E_UNLINKED_STUDENT_*` only if that saved state is absent

Agent rule for this repository:

- before concluding that professor or student E2E verification is blocked on missing credentials, check whether an appropriate `.auth/*.json` Playwright state already exists and whether the target spec can use it directly or with a small test-only adaptation

### Student claim-flow fixture prep

The claim-flow E2E follow-up uses a dedicated prep helper instead of manual Studio edits:

- helper path: `tests/e2e/support/studentClaimFixture.ts`
- purpose: reset all `students` rows for one email, then rebuild either a single claim-ready row or a duplicate-email blocked state
- auth model: this prep is server-side and requires `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`
- safety scope: this prep also requires `E2E_PROFESSOR_PROFILE_ID` so fixture rows are always attached to the intended professor workspace instead of guessing globally

Planned repo-native paths:

- `prepareClaimReadyFixture(...)` - creates exactly one unlinked `students` row for the target email
- `prepareDuplicateClaimFixture(...)` - creates two unlinked rows for the same email so `/pending-access` must stay blocked
- `resetStudentClaimFixture(...)` - cleanup helper for the same email anchor
- `readClaimStudentFixtureMeta()` - reads the local email anchor from `.auth/claim-student.meta.json` when `.env` does not define a dedicated claim-student account

Required env for safe fixture prep:

```bash
E2E_PROFESSOR_PROFILE_ID=
```

Rule for future E2E work on this slice:

- start from repo-local Playwright `storageState` when available
- use the claim-fixture helper to prepare data states
- ask for fresh credentials only if neither repo-local state nor controlled fixture prep can satisfy the scenario

Recommended local run for the claim-flow slice:

```powershell
$env:E2E_BASE_URL='http://localhost:4325'
& 'C:\Program Files\nodejs\npx.cmd' playwright test tests/e2e/student-claim-flow.spec.ts
```

What that spec now proves:

- one prepared unlinked row lets the student claim access and land on `/dashboard?claimReady=1`
- duplicate prepared rows keep the same student blocked on `/pending-access`
- both scenarios can be rerun without hand-editing `students.student_profile_id`

### Shared-note continuity E2E coverage

The repo now includes linked-student browser checks around the shared-note continuity slice:

- `tests/e2e/linked-student-note-edit.spec.ts` - linked student can update an existing shared note without seeing professor-only surfaces
- `tests/e2e/linked-student-note-append.spec.ts` - linked student can append a new item at the tail of a shared note and the spec restores state afterward
- `tests/e2e/shared-note-cross-role-visibility.spec.ts` - professor can see the linked student's shared-note edit in the same thread
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
- use this layer as the cheaper required gate when the risk is chronology, ordering, or continuity composition rather than browser navigation

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

| Route                   | Description                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`          | Email/password sign-in form                                             |
| `/auth/signup`          | Email/password sign-up form                                             |
| `/auth/confirm`         | Server-side recovery/email confirmation handoff for token-hash links    |
| `/auth/confirm-email`   | Post-signup "check your inbox" page                                     |
| `/auth/update-password` | Change-password page reached from the reset email                       |
| `/dashboard`            | Example protected page (redirects to `/auth/signin` if unauthenticated) |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

### Password recovery verification

For the current password-recovery flow, use the token-hash email template pattern from Supabase Auth:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}">
  Reset password
</a>
```

Recommended local verification:

1. Set `Site URL` to `http://localhost:4325` in Supabase Auth URL configuration.
2. Add `http://localhost:4325/auth/update-password` to Redirect URLs.
3. Request a reset from `/auth/reset-password`.
4. Open the newest reset email and confirm it lands on `/auth/update-password?recovery=ready`.
5. Submit a new password and confirm the app continues into `/dashboard?passwordUpdated=1`.
6. Repeat the flow with the current password and confirm the recovery page stays on `/auth/update-password` with the app-owned message `Choose a password different from the current one.` instead of raw provider text.

Hosted verification follows the same route contract, but with the hosted domain in `Site URL` and Redirect URLs.

Important hosted recovery note:

- Supabase may reject reusing the current password during recovery even when the reset link itself is valid
- the expected app behavior is to stay on `/auth/update-password` and show `Choose a password different from the current one.`
- treat the older provider text `New password should be different from the old password.` as a sign that the hosted runtime is still serving an outdated build

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

### Student claim-and-read verification

To verify the current `student-read-history` slice against a hosted Supabase project:

1. As the professor, make sure exactly one `public.students` row exists for the student's email.
2. Set that row's `email` to the real student account email and leave `student_profile_id = null`.
3. Sign in with that student account and open `/pending-access`.
4. Confirm the page shows the claim action and lets the student link access without leaving the in-app flow.
5. Confirm the app redirects the same user into `/dashboard` after claim.
6. Confirm the student sees only their own chronological supervision history and no professor roster surfaces.
7. Sign out and sign in with an account that has no matching roster email.
8. Confirm the unlinked account stays on `/pending-access` with a blocked-state explanation.
9. Create a duplicate-email conflict in `public.students` and confirm the student still stays blocked on `/pending-access`.

Current hosted-project note:

- the primary happy path no longer requires manual `student_profile_id` editing
- duplicate matching emails intentionally block claim until the professor resolves the roster conflict

### Hosted smoke for dashboard role-flow checks

Use this when local `npm run test:e2e` is green and you still need to confirm the hosted auth/linking reality behind the same shared `/dashboard` seam.

1. Student claim check
   - sign in with a hosted student account whose email matches exactly one unlinked `public.students.email`
   - open `/pending-access`
   - confirm the claim action is visible
   - submit the claim and confirm the account lands on `/dashboard`

2. Linked student check
   - after claim, reopen `/dashboard`
   - confirm the account sees only its own read-only supervision history
   - confirm no professor roster or note-creation controls are visible

3. Unlinked student check
   - sign in with a hosted student account that has no matching `public.students.student_profile_id`
   - open `/pending-access`
   - confirm the account stays blocked with no claim action

4. Archived former student check
   - archive or manually convert the previously linked `students` row so it is no longer active and keeps only archived historical linkage
   - sign in with that same student account
   - confirm `/dashboard` redirects to `/pending-access`
   - confirm the page explains that the previous student access ended and that a new active student record is required

5. Duplicate-email blocked check
   - prepare two unlinked `public.students` rows with the same email as the student account
   - sign in with that student account
   - open `/pending-access`
   - confirm the account stays blocked and the page explains that the app will not choose automatically

6. Professor sentinel check
   - sign in as the hosted professor
   - open `/dashboard`
   - confirm the roster is visible
   - confirm the roster surfaces linked vs email-ready vs missing-email status hints
   - open one student thread
   - confirm the thread still renders its chronological history

For local browser-level verification, the repo also carries a saved professor Playwright state in `.auth/user.json`. Prefer checking that fixture before asking for fresh professor credentials.

Treat these hosted checks as required smoke, not optional confidence polish. The local e2e spec protects the route contract, but it cannot prove remote Supabase link state by itself.

### Professor student-archival verification

Recommended local verification for the current `professor-student-archival` slice:

1. Sign in as the professor and open `/dashboard`.
2. Open one active student thread whose row is already linked to a real student account.
3. In the thread danger zone, confirm the archive action and submit it.
4. Confirm the app redirects back to `/dashboard` with an archive success banner.
5. Confirm that student no longer appears in the active roster.
6. Sign in with the archived student's account and confirm `/dashboard` now falls back to `/pending-access`.
7. Confirm the page explains that the previous student access ended and that a new active student record is required.

Hosted release note:

- The same smoke should be repeated on the deployed environment only after the hosted Supabase project has the required archive lifecycle migration already applied.

### Archived student history verification

Recommended local verification for the current `archived-student-history` slice:

1. Sign in as the professor and open `/dashboard`.
2. Archive one already linked active student if the archive roster is still empty.
3. Switch the roster view from `Active` to `Archived`.
4. Confirm the archived student appears only in the archived roster with the archived badge and summary metadata.
5. Open that archived thread and confirm the app keeps the history visible on the direct thread URL.
6. Confirm the archived thread shows the read-only archive banner.
7. Confirm the archived thread exposes no note edit links, no note create/edit form, and no task completion or reopen buttons.
8. Return to the active roster and confirm active student threads still open through the normal editable path.

Hosted release note:

- Hosted archive-history smoke stays intentionally deferred until the next deploy-worthy batch, and only after the remote Supabase project is confirmed to include the archive lifecycle migration.

### Student re-registration reset verification

Recommended local verification for the current `student-reregistration-reset` slice:

1. Sign in as the professor and open `/dashboard`.
2. Make sure one previously linked student has already been archived and still appears in the `Archived` roster.
3. Return to the `Active` roster and create a fresh student row with the same email.
4. Confirm the add-student form shows the archived-history warning for that email.
5. Confirm the post-create success state keeps the new row active and explains that the older thread remains professor-only in `Archived`.
6. Sign in as that returning student and confirm `/pending-access` offers the standard claim action.
7. Complete the claim and confirm the student lands on `/dashboard?claimReady=1`.
8. Confirm the student sees only the fresh active thread and does not regain access to the archived history.
9. Prepare two fresh active rows with that same email and confirm the returning student stays blocked on `/pending-access` with the duplicate-match explanation.

Local automated proof for this slice:

- `vitest run tests/integration/student-account-linking-contract.test.ts`
- `playwright test tests/e2e/student-claim-flow.spec.ts`

Hosted release note:

- Hosted smoke for this slice stays optional until the next deploy-worthy batch, but any eventual hosted release still depends on the remote Supabase project already having the archive lifecycle migration applied.

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
