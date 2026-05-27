---
change_id: professor-bootstrap
title: Professor bootstrap
status: planned
created: 2026-05-27
updated: 2026-05-27
owner: codex
---

# Plan: Professor bootstrap

## Current State Analysis

- Auth exists and creates generic Supabase sessions, but sign-in and sign-up currently redirect without any role-aware bootstrap behavior: [signin.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\auth\signin.ts), [signup.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\auth\signup.ts)
- The supervision schema already includes `profiles.role` plus professor/student ownership relations, and every `auth.users` row auto-provisions a `profiles` row with default role `student`: [20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql)
- RLS assumes professor access is granted through `profiles.role = 'professor'`, but the app has no flow yet for the first claim of that role: [20260526215500_enable_supervision_rls.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526215500_enable_supervision_rls.sql)
- Protected routing currently checks only authentication for `/dashboard`; it does not route by bootstrap state, role, or pending-access state: [middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts), [dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)

## Key Decisions

| Area | Decision | Why |
| --- | --- | --- |
| First professor designation | Manual allowlist by email | Safest MVP path; avoids accidental workspace takeover |
| Allowlist storage | Server-side env/config | Smallest viable contract without expanding the data model |
| Claim trigger | Auto-claim on first successful app entry | Keeps bootstrap real and user-facing without an extra claim screen |
| Bootstrap execution | Dedicated server-side endpoint/action | Keeps role mutation explicit, testable, and out of middleware side effects |
| Professor uniqueness | One active professor, future replacement is manual outside app | Matches MVP ownership model while preserving an operational escape hatch |
| Non-professor fallback | Pending-access page | Gives safe and clear UX for authenticated but unlinked users |
| F-02 scope | Role claim, guarded routing, pending-access view | Fully unlocks `S-01` and `S-02` app flow without drifting into slice work |
| Product verification | Manual end-to-end with two accounts | Best way to validate both professor bootstrap and blocked non-professor state |

## Scope

**In scope**

- Add a bootstrap configuration contract for the professor allowlist email
- Add a server-side bootstrap step that can promote the allowlisted first professor exactly once
- Load app-level profile/role state during authenticated request handling
- Add role-aware routing for professor and pending-access states
- Add a pending-access page for authenticated users without professor access and without linked student access
- Document the bootstrap configuration and manual verification flow

**Out of scope**

- Student roster UI or note-history UI from `S-01` / `S-02`
- Multi-professor support
- In-app owner transfer or admin management UI
- Student linking UX beyond safe pending-access fallback

## Architecture / Approach

The app should keep Supabase Auth as the identity source and add a thin app-level bootstrap layer on top. After successful authentication, the server loads the current user's `profiles` row and determines whether the user is already a professor, already a linked student, or still pending. If no professor exists yet and the authenticated user's email matches the configured allowlist, the first protected app entry should redirect through a dedicated server-side bootstrap endpoint that claims the professor role exactly once and then returns the user to the professor landing route. Middleware stays read-oriented: it decides when the current request should continue, redirect to the bootstrap endpoint, redirect to the pending-access page, or allow the existing public/auth pages to render. Linked students should not receive professor shell content during `F-02`; until `S-03` exists they should be routed to the same pending-access page, but with deterministic role-aware handling instead of falling through the generic professor path.

## Phases

### Phase 1: Bootstrap contract and first-professor claim

#### Goal

Establish the configuration and server-side mutation path that can safely promote exactly one allowlisted account to professor.

#### Required changes

- **File:** [astro.config.mjs](C:\Users\olguno5421\Documents\GitHub\10xdev\astro.config.mjs)
  - **Goal:** Add a server-only env contract for the bootstrap professor email.
  - **Contract:** Introduce one explicit env such as `BOOTSTRAP_PROFESSOR_EMAIL`, validated alongside existing server secrets.

- **File:** [src/lib/supabase.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supabase.ts)
  - **Goal:** Keep a reusable server client path that bootstrap logic can share.
  - **Contract:** The bootstrap flow must be able to perform authenticated server-side reads/writes against `profiles` using the existing SSR cookie session.

- **File:** `src/lib/profile.ts` or similar new app helper module
  - **Goal:** Centralize app-level profile lookup and professor-bootstrap eligibility checks.
  - **Contract:** Expose a small server-side API for loading the current profile, checking whether any professor exists, and evaluating whether the current user matches the bootstrap allowlist.

- **File:** `src/pages/api/bootstrap/professor.ts` or similar new endpoint
  - **Goal:** Make professor role claim an explicit server-side action instead of hidden middleware mutation.
  - **Contract:** The endpoint must require an authenticated user, verify that no professor already exists, verify the current user's email matches `BOOTSTRAP_PROFESSOR_EMAIL`, promote only that current profile to `professor`, and leave all other profiles unchanged. It should be invoked only as a redirect target from the first protected app entry for an allowlisted authenticated user and should redirect back to the professor landing route after success.

#### Success criteria

#### Automated verification:
- [ ] The env schema rejects missing or malformed bootstrap professor configuration in environments that expect it.
- [ ] A dedicated server-side bootstrap path exists and references `profiles.role` rather than inventing a parallel ownership model.

#### Manual verification:
- [ ] Reviewing the bootstrap code shows that only the current authenticated allowlisted user can claim professor and only when no professor exists yet.
- [ ] The bootstrap logic supports later manual owner replacement operationally by not hard-coding professor identity anywhere except current role state and env allowlist.

### Phase 2: Role-aware request state and guarded routing

#### Goal

Teach the app to distinguish professor, pending-access, and unauthenticated states on real requests.

#### Required changes

- **File:** [src/middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts)
  - **Goal:** Load app-level auth state, not just raw Supabase user presence.
  - **Contract:** Middleware should populate request-local state with the authenticated user plus profile/role/bootstrap status, and it should route protected areas according to that richer state. The deterministic branch should be: unauthenticated -> sign-in; authenticated allowlisted user with no existing professor -> bootstrap endpoint; authenticated professor -> professor landing route; authenticated linked student -> pending-access until `S-03`; authenticated unlinked/non-allowlisted user -> pending-access.

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Stop using the generic authenticated-only placeholder as the only post-login destination.
  - **Contract:** Professor users may land here temporarily as a shell, but non-professor authenticated users must no longer see a misleading generic dashboard.

- **File:** `src/pages/pending-access.astro` or similar new page
  - **Goal:** Provide a clear authenticated fallback for users who have accounts but do not yet have professor access or linked student access.
  - **Contract:** The page must explain that the account exists but product access is not yet assigned, without exposing professor-only functionality. In `F-02`, both linked students and still-unlinked authenticated users should land here until student-facing `S-03` exists.

- **File:** [src/pages/api/auth/signin.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\auth\signin.ts), [src/pages/api/auth/signup.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\auth\signup.ts)
  - **Goal:** Align auth entry points with the new bootstrap/routing model.
  - **Contract:** Successful auth should send users into the app flow where bootstrap or pending-access routing can occur consistently.

#### Success criteria

#### Automated verification:
- [ ] Middleware or equivalent server request handling reads both the authenticated user and app-level profile state before deciding protected-route behavior.
- [ ] There is a dedicated pending-access route/page for authenticated but not-yet-authorized users.

#### Manual verification:
- [ ] A professor user no longer gets treated as just “authenticated”; the app has a role-aware post-login path.
- [ ] A non-professor authenticated user is routed to pending-access rather than seeing professor shell content or an ambiguous redirect loop.

### Phase 3: Documentation and end-to-end bootstrap verification

#### Goal

Make the bootstrap flow operable for future implementers and verify it with the intended two-account product test.

#### Required changes

- **File:** [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md)
  - **Goal:** Document the new bootstrap env/config and local/hosted verification flow.
  - **Contract:** README must explain how to configure the allowlisted bootstrap professor email and how to exercise the two-account flow.

- **File:** [AGENTS.md](C:\Users\olguno5421\Documents\GitHub\10xdev\AGENTS.md)
  - **Goal:** Keep future agent work aligned with the new bootstrap contract.
  - **Contract:** Repository guidance should mention the app-level professor bootstrap contract if later slices depend on it.

- **File:** [context/foundation/tasks-github.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\tasks-github.md) and mirrored backlog systems after close-out
  - **Goal:** Ensure the change close-out follows the recorded process rule.
  - **Contract:** After implementation, sync `tasks-github.md`, then GitHub Issues, then Linear.

#### Success criteria

#### Automated verification:
- [ ] README documents the bootstrap professor env and the intended verification flow.
- [ ] The change artifacts are sufficient for `/10x-implement` to proceed without reopening unresolved design questions.

#### Manual verification:
- [ ] End-to-end testing with two accounts proves the allowlisted account can become professor exactly once.
- [ ] End-to-end testing with a second non-allowlisted account proves it lands in pending-access instead of receiving professor privileges.

## Risks and Mitigations

- **Risk:** Bootstrap side effects inside middleware would make failures opaque.
  - **Mitigation:** Keep professor claim in a dedicated endpoint/action and let middleware only orchestrate routing/state loading.

- **Risk:** Environment-driven bootstrap can drift across local, preview, and production.
  - **Mitigation:** Add the env to documented setup and CI/deploy configuration expectations.

- **Risk:** `S-01` and `S-02` may still need to reshape post-login routing if professor shell is too placeholder-like.
  - **Mitigation:** Keep `F-02` limited to safe routing and access-state shells, not final slice UI.

## Progress

### Phase 1: Bootstrap contract and first-professor claim

#### Automated Verification:
- [x] 1.1 Env schema rejects missing or malformed bootstrap professor configuration in environments that expect it — 4bc31fc
- [x] 1.2 Dedicated server-side bootstrap path exists and references `profiles.role` rather than inventing a parallel ownership model — 4bc31fc

#### Manual Verification:
- [x] 1.3 Bootstrap code allows only the current authenticated allowlisted user to claim professor and only when no professor exists yet — 4bc31fc
- [x] 1.4 Bootstrap logic supports later manual owner replacement operationally by not hard-coding professor identity anywhere except current role state and env allowlist — 4bc31fc

### Phase 2: Role-aware request state and guarded routing

#### Automated Verification:
- [x] 2.1 Middleware or equivalent server request handling reads both the authenticated user and app-level profile state before deciding protected-route behavior — 4bc31fc
- [x] 2.2 Dedicated pending-access route/page exists for authenticated but not-yet-authorized users — 4bc31fc

#### Manual Verification:
- [x] 2.3 Professor users no longer get treated as just authenticated; the app has a role-aware post-login path — 4bc31fc
- [x] 2.4 Non-professor authenticated users are routed to pending-access rather than seeing professor shell content or entering an ambiguous redirect loop — 4bc31fc

### Phase 3: Documentation and end-to-end bootstrap verification

#### Automated Verification:
- [x] 3.1 README documents the bootstrap professor env and the intended verification flow — 4bc31fc
- [x] 3.2 Change artifacts are sufficient for `/10x-implement` to proceed without reopening unresolved design questions — 4bc31fc

#### Manual Verification:
- [x] 3.3 End-to-end testing with two accounts proves the allowlisted account can become professor exactly once — 4bc31fc
- [x] 3.4 End-to-end testing with a second non-allowlisted account proves it lands in pending-access instead of receiving professor privileges — 4bc31fc
