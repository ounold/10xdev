---
change_id: student-account-linking-flow
title: Student account linking flow
status: implemented
created: 2026-06-05
updated: 2026-06-09
owner: codex
---

# Plan: Student account linking flow

## Current State Analysis

- The product now has a complete linked-student experience after linkage exists: middleware admits only professors or linked students, and the student dashboard branch already reads the current student record by `student_profile_id = auth.uid()`: [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts), [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts), [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro).
- The missing product seam is account linking itself. Signup/signin are still generic Supabase auth flows, and `pending-access` remains purely informational for unlinked users: [src/pages/api/auth/signup.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/signup.ts), [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro).
- The `students` schema already anticipates email-based linking through `email` plus optional `student_profile_id`, but it does not yet guarantee unique claimability by email: [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql).
- Current RLS allows professor-owned updates to `students`, but not student self-linking through the normal session client. Existing sensitive mutations already rely on narrow server-side admin-client seams after route-level session validation: [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql), [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts).
- The professor roster already captures optional student email and currently uses “No linked email yet” language, which makes it the natural place for a lightweight linking-status signal: [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro).
- README and previous slices explicitly document that hosted student verification still depends on manual `students.student_profile_id -> profiles.id` setup, so this feature should remove a known operational gap rather than inventing a new product direction: [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md), [context/changes/student-read-history/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-read-history/plan.md), [context/changes/student-account-linking-flow/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-account-linking-flow/research.md).

## Key Decisions

| Area                 | Decision                                                                        | Why                                                                      | Source          |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| Claim model          | Student claims exactly one existing unlinked row by matching signed-in email    | Reuses current data model and avoids a second identity system            | Research + Plan |
| Ambiguous matches    | Block claim if more than one unlinked row matches the same email                | Prevents linking the wrong student record                                | User choice     |
| Entry surface        | Reuse `pending-access` as the actionable claim screen                           | Fits the current access gate and keeps auth generic                      | User choice     |
| Professor visibility | Add a lightweight linking-status signal in the roster                           | Helps diagnose onboarding state without opening full management scope    | User choice     |
| Recovery flow        | Relink/unlink stays out of scope for the first slice                            | Keeps the first implementation narrow and safe                           | User choice     |
| Write trust model    | Validate the student session in a narrow route, then link with the admin client | Matches current sensitive-mutation pattern and avoids broad RLS redesign | Research + Plan |
| Data contract        | Treat duplicate claimable emails as invalid state, not a user choice            | Keeps wrong-account risk low and makes cleanup explicit                  | User choice     |

## Scope

**In scope**

- Detect whether a signed-in student account can claim exactly one unlinked `students` row by email
- Add a narrow server-side claim action that links `student_profile_id = auth.uid()` for the current account
- Turn `pending-access` into an actionable student-claim screen when claim conditions are met
- Keep ambiguous or missing matches in a safe blocked state with clear messaging
- Add a lightweight professor-visible linking-status signal in the roster
- Document the new local/hosted verification path for student linking

**Out of scope**

- Professor-managed relink or unlink tools
- Student self-service unlink/recovery
- Invite tokens, magic invite URLs, or email-delivered claim links
- Broad auth-flow redesign in sign-up/sign-in pages
- Multi-professor or cross-workspace student identity management

## Architecture / Approach

Build this slice as a thin claim layer between generic auth and the already-shipped linked-student dashboard flow. Keep Supabase Auth as the identity source and continue treating `students` as professor-owned domain records. After sign-in, an unlinked student still lands on `pending-access`, but that page now asks the server whether the current signed-in email maps to exactly one unlinked student row. If yes, the student can submit a dedicated claim action that re-validates the session, normalizes the current email, verifies there is exactly one claimable row, and then performs the link through the admin client by setting `student_profile_id`. Middleware and the student dashboard remain mostly unchanged; once the link exists, the current `isLinkedStudent` and `getLinkedStudentHistoryForUser()` path naturally admit the student into `/dashboard`. On the professor side, the roster gains a lightweight linking-status hint derived from `email` and `student_profile_id`, but no recovery controls.

## Phases

### Phase 1: Define claimability rules and the narrow linking contract

#### Goal

Create the app-layer and route-layer contract for safe student self-claim by signed-in email.

#### Required changes

- **File:** [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts)
  - **Goal:** Add typed contracts for student-link claimability and the link mutation result.
  - **Contract:** Introduce narrow types for:
    - current claim status (`claimable`, `missing-match`, `ambiguous-match`, `already-linked`)
    - claim target metadata safe for UI use
    - link mutation input/result
  - Keep these separate from professor roster create/update payloads.

- **File:** [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts) and/or a focused helper under `src/lib/`
  - **Goal:** Add one read helper that evaluates claimability for the current signed-in student account.
  - **Contract:** The helper should:
    - normalize the current auth email
    - reject accounts with no email
    - detect if the current user is already linked
    - find unlinked `students` rows matching that email
    - return one explicit status instead of leaking raw row-selection logic into pages

- **File:** new narrow claim route under `src/pages/api/`
  - **Goal:** Expose one dedicated student-facing POST action for claiming access.
  - **Contract:** The route should:
    - require an authenticated `student` session
    - refuse already-linked users
    - re-check claimability at submit time
    - link only when exactly one unlinked row matches
    - use the admin client for the final `student_profile_id` write
    - redirect back to `/pending-access` or `/dashboard` with explicit success/error signals

- **File:** integration coverage under `tests/integration/`
  - **Goal:** Prove that the claim contract is safe at the app boundary.
  - **Contract:** Cover at least:
    - exactly one unlinked email match becomes claimable
    - duplicate matches become blocked/ambiguous
    - already-linked users cannot claim again
    - the link mutation sets only `student_profile_id` on the intended row

#### Success criteria

#### Automated verification:

- [ ] The app exposes an explicit claimability result instead of ad hoc page-level email matching
- [ ] The claim route links only one exact unlinked student row for the current student account
- [ ] Ambiguous or already-linked states are rejected before mutation

#### Manual verification:

- [ ] A signed-in unlinked student with one matching email can trigger a claim flow
- [ ] A conflicting email state stays blocked and does not silently pick a student row

### Phase 2: Turn pending-access into the student claim surface

#### Goal

Give unlinked students a real in-app path out of `pending-access` without changing generic auth screens.

#### Required changes

- **File:** [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro)
  - **Goal:** Evolve the page from passive status copy into a role-aware claim screen.
  - **Contract:** The page should:
    - keep professors and already-linked students out through existing middleware behavior
    - show clear, safe messaging for:
      - one claimable record
      - no matching record
      - ambiguous duplicate matches
    - render a claim action only for the one-record claimable state
    - show result feedback after a claim attempt

- **File:** [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts)
  - **Goal:** Keep route behavior stable while claim state changes underneath.
  - **Contract:** Middleware should continue to:
    - send unlinked student users to `/pending-access`
    - admit linked students into `/dashboard`
    - avoid hidden linking side effects during request routing

- **File:** [src/pages/auth/signup.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/signup.astro) and/or [src/pages/api/auth/signup.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/signup.ts) only if copy needs adjustment
  - **Goal:** Keep auth expectations aligned with the new claim step.
  - **Contract:** Any changes here should remain copy-level or redirect-level only; auth itself stays generic.

#### Success criteria

#### Automated verification:

- [ ] `pending-access` renders a claim action only when the current signed-in email is safely claimable
- [ ] Successful claim attempts route the same user into the existing linked-student dashboard flow
- [ ] Unlinked users with no match or duplicate matches remain on `pending-access` with explicit messaging

#### Manual verification:

- [ ] A student can sign in, claim access from `pending-access`, and then land on `/dashboard`
- [ ] A student with no matching roster email still gets a clear blocked state instead of professor-only content or a redirect loop

### Phase 3: Surface professor-visible linking status and document the new verification path

#### Goal

Close the loop for operators: professors can see lightweight link state, and docs/manual verification reflect the new product reality.

#### Required changes

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts) and [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts) if needed
  - **Goal:** Expose the minimum roster-level linking-status data.
  - **Contract:** Add only a lightweight status shape based on existing fields, such as:
    - linked
    - email set, waiting to claim
    - no email on record
  - Do not add professor relink actions in this slice.

- **File:** [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro)
  - **Goal:** Show lightweight student-link state in the professor roster.
  - **Contract:** The professor branch should display a compact status hint without expanding into account-management UI.

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md)
  - **Goal:** Replace the manual hosted-linking caveat with the new claim verification path.
  - **Contract:** Document:
    - how a professor prepares a student row with email
    - how a student claims access
    - how duplicate or missing matches behave

- **Files:** focused browser/manual verification coverage under `tests/e2e/` or explicit docs guidance, depending on implementation fit
  - **Goal:** Verify the real student-claim journey plus one blocked conflict state.
  - **Contract:** Prefer existing repo-local auth fixtures first if browser coverage is added.

#### Success criteria

#### Automated verification:

- [ ] The professor roster exposes a lightweight linking-status signal without adding relink management
- [ ] README reflects the new student-linking verification path instead of manual DB linking as the expected route
- [ ] Lint/build and any new integration/e2e coverage pass

#### Manual verification:

- [ ] A professor can tell whether a student is linked, claimable by email, or still missing an email anchor
- [ ] Hosted/manual verification no longer depends on editing `students.student_profile_id` by hand for the primary happy path

## Risks and Mitigations

- **Risk:** Duplicate student emails make self-claim unsafe.
  - **Mitigation:** Treat duplicate matches as a hard blocked state with clear UI messaging and no automatic selection.

- **Risk:** Claim logic drifts into generic auth screens and makes sign-up/sign-in brittle.
  - **Mitigation:** Keep linking on `pending-access` and preserve generic Supabase auth routes.

- **Risk:** Student self-claim broadens into recovery/relink workflows and blows up scope.
  - **Mitigation:** Hold relink/unlink out of scope and ship only the first correct-link path.

- **Risk:** Hosted Supabase behaves differently from local assumptions around claim writes.
  - **Mitigation:** Use the same narrow admin-client mutation pattern already proven in other sensitive flows, and verify the happy path manually against hosted state.

- **Risk:** Professors still cannot diagnose onboarding failures after the student-side flow ships.
  - **Mitigation:** Add a lightweight roster status signal, but keep it read-only in this slice.

## Progress

### Phase 1: Define claimability rules and the narrow linking contract

#### Automated Verification:

- [x] 1.1 Add explicit claimability result types and linking contracts
- [x] 1.2 Implement a narrow claimability helper and a dedicated student claim route
- [x] 1.3 Cover exact-match, duplicate-match, and already-linked claim outcomes in integration tests

#### Manual Verification:

- [x] 1.4 Confirm a signed-in unlinked student with one matching email can enter the claim flow
- [x] 1.5 Confirm duplicate matches remain blocked and do not silently choose a row

### Phase 2: Turn pending-access into the student claim surface

#### Automated Verification:

- [x] 2.1 Render a claim action on `pending-access` only for the safe one-record claimable state
- [x] 2.2 Route successful claims into the existing linked-student `/dashboard` path without hidden middleware writes
- [x] 2.3 Keep no-match and duplicate-match students on `pending-access` with explicit messaging

#### Manual Verification:

- [x] 2.4 A student can claim access from `pending-access` and then reach `/dashboard`
- [x] 2.5 A student with no matching roster email stays safely blocked without confusing redirects or professor UI leakage

### Phase 3: Surface professor-visible linking status and document the new verification path

#### Automated Verification:

- [x] 3.1 Add a lightweight professor-visible linking-status signal in the roster
- [x] 3.2 Update README and verification guidance to use the new claim flow instead of manual DB linking
- [x] 3.3 `npm run lint` and `npm run build` pass, plus any new verification coverage

#### Manual Verification:

- [x] 3.4 A professor can recognize linked vs claimable-by-email vs missing-email student states from the roster
- [x] 3.5 The primary verification path no longer requires editing `students.student_profile_id` by hand
