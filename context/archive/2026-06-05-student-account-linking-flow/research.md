---
date: 2026-06-05T21:53:41.2955276+02:00
researcher: Codex
git_commit: cc0491ec1a9c1425bbda40a0ee1f282d7e7b2659
branch: main
repository: 10xdev
topic: "Student account linking flow"
tags:
  - research
  - codebase
  - auth
  - students
  - linking
status: complete
last_updated: 2026-06-05
last_updated_by: Codex
---

# Research: Student account linking flow

**Date**: 2026-06-05T21:53:41.2955276+02:00
**Researcher**: Codex
**Git Commit**: `cc0491ec1a9c1425bbda40a0ee1f282d7e7b2659`
**Branch**: `main`
**Repository**: `10xdev`

## Research question

How should this app add a real student account linking flow so student dashboard access no longer depends on manual database linkage through `students.student_profile_id -> profiles.id`?

## Summary

The app already has a clean read/write model for linked students, but no product flow that creates the link. Today, a student can reach the student dashboard only if some outside process sets `students.student_profile_id = auth.users.id`; the UI, auth routes, and dashboard branch never establish that mapping themselves. The safest next slice is not student self-claim by arbitrary email entry, but a professor-prepared invitation/claim seam built on the existing student row email field and the existing pending-access gate.

The current architecture strongly suggests a narrow linking slice:

1. Professor creates or updates a student row with a unique email.
2. Student signs up/signs in with that same email.
3. A dedicated server-side linking action verifies there is exactly one unclaimed student row for that email and assigns `student_profile_id = auth.uid()`.
4. Middleware/profile loading then naturally admits the student into `/dashboard` through the already-shipped `isLinkedStudent` logic.

That path reuses the existing access model instead of inventing a second identity system. It also keeps risk localized to one write seam on `students`, which is easier to reason about than broadening sign-up or middleware into implicit role/link mutation.

## Detailed findings

### 1. The current student app path already assumes a linked record exists

- Middleware allows `/dashboard` only for professors or users flagged as `isLinkedStudent`, and that flag is derived before route branching on every request: [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts).
- `loadCurrentProfileState()` computes `isLinkedStudent` by querying `students` for `student_profile_id = user.id` with the admin client. There is no fallback based on email, token, or signup intent: [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts).
- The student dashboard branch loads history only through `getLinkedStudentHistoryForUser(supabase, user.id)`, which again resolves the student row by `student_profile_id = userId`: [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).

Implication:

- The product already has a stable “after linking” model.
- The missing piece is establishing `student_profile_id`, not redesigning dashboard access.

### 2. The data model already anticipates email-based linking, but the app does not use it yet

- `students` has both `student_profile_id` and `email`, and enforces that a linked row must have an email: `students_email_present_if_linked`: [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql).
- `student_profile_id` is `unique`, so one auth profile can link to at most one student row: same migration.
- Professor roster creation already captures `email` optionally and persists it on the student row: [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts).

Implication:

- The schema already points toward “professor records student email, student account later links to it.”
- Missing constraints remain around duplicate student emails across multiple rows, because `students.email` is not currently unique.

### 3. There is no current in-app linking flow anywhere in auth routes

- Signup is plain Supabase email/password sign-up and then redirect to `/dashboard` or `/auth/confirm-email`; it does not inspect `students`, pending invites, or professor-owned records: [src/pages/api/auth/signup.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/signup.ts).
- The public sign-up page is similarly generic and does not communicate any student claim flow: [src/pages/auth/signup.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/signup.astro).
- The pending-access page explicitly tells unlinked users to contact the professor and admits that the app has no assignment flow yet: [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro).

Implication:

- Linking can be added as a dedicated flow without conflicting with existing auth behavior.
- The cleanest UX insertion point is after sign-in/signup when a student reaches `pending-access`, not during professor bootstrap or generic middleware.

### 4. Current RLS allows professor-owned student updates, but not student self-linking

- `students_update_professor_owned` allows updates only when `professor_profile_id = auth.uid()` and the current role is `professor`: [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql).
- There is no student policy that would allow a student to set `student_profile_id` on their own row.
- Existing product code already uses the server-side admin client for flows that intentionally bypass session-client restrictions after validating a user at the route boundary, for example professor bootstrap and hosted roster/note writes: [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts).

Implication:

- A safe linking implementation should probably follow the same pattern: validate the current signed-in student session in a narrow route, then perform the actual link with the admin client under strict checks.
- Rewriting RLS for self-linking is possible later, but it is not required for the first product slice.

### 5. Existing product docs already name this as a deliberate gap

- README says `student-read-history` depends on a real hosted `students.student_profile_id -> profiles.id` link and that the UI does not provide in-app linking yet: [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md).
- The `student-read-history` plan explicitly kept “student self-linking or self-claim flows” and “student profile linking UI for professors” out of scope: [context/changes/student-read-history/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-read-history/plan.md).
- The just-finished note continuity/completion slices reuse the linked-student assumption rather than replacing it: [context/changes/shared-task-completion-flow/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-task-completion-flow/plan.md).

Implication:

- This is the natural next slice after shared-note workflows.
- It also unblocks cleaner hosted/manual verification because “prepare DB row manually” can be removed from the critical path.

## Code references

- [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts) - Current profile state, professor existence, linked-student detection via `student_profile_id`.
- [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts) - Access gate for `/dashboard`, `/pending-access`, and professor-only student routes.
- [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts) - `getLinkedStudentHistoryForUser()` read seam based on existing linkage.
- [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro) - Student branch that assumes linkage is already complete.
- [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro) - Current fallback UX for unlinked accounts.
- [src/pages/api/auth/signup.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/signup.ts) - Generic sign-up flow with no product-specific linking behavior.
- [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts) - Professor creates student rows with optional email, which is the likely anchor for linking.
- [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql) - `students` schema and current constraints.
- [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql) - Current RLS preventing student-side row linking through ordinary session writes.

## Architectural conclusions

### Recommended slice shape

The best next slice is a **claim existing student record by matching signed-in email to one unlinked student row** flow.

Recommended contract:

- keep professor roster creation as the source of truth for student rows
- require `students.email` to be present for claimable rows
- expose a narrow student-facing claim action only for authenticated `role = student` users
- validate:
  - current account is not already linked
  - current account email exists
  - exactly one unclaimed `students` row matches that normalized email
- then set `student_profile_id = auth.uid()` server-side

Why this is the best fit:

- it reuses current middleware and dashboard semantics
- it avoids creating professor-managed token systems too early
- it minimizes product surface while solving the real adoption blocker

### Likely implementation seams

- `src/lib/profile.ts`
  - add a focused helper to detect claimable student rows or current linking state
- `src/lib/supervision.ts` or a new narrow linking helper module
  - add app-layer link operation such as `claimStudentAccess(...)`
- `src/pages/api/...`
  - add one student-facing POST route for claim/link
- `src/pages/pending-access.astro`
  - evolve from passive explanation into an actionable “claim access” screen when a matching row exists

### Likely schema/RLS follow-up

For the first slice, admin-client linking after strict route validation is enough. But planning should consider whether to add at least one of:

- unique normalized email on `students` for claimable rows
- a stronger DB-level invariant preventing duplicate unlinked rows for the same email under one professor or globally
- optional `invited_at` / `linked_at` timestamps later, if the team wants explicit onboarding state

## Historical context

- `student-read-history` intentionally stopped at already-linked accounts and left in-app linking out of scope: [context/changes/student-read-history/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-read-history/plan.md).
- `professor-bootstrap` established the pattern that sensitive role/access mutation should happen in a dedicated server-side flow, not as a hidden middleware side effect: [context/changes/professor-bootstrap/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/professor-bootstrap/plan.md).
- `testing-access-safety-and-critical-flows` recorded that hosted smoke still depends on remote link state because there is no in-app linking flow today: [context/changes/testing-access-safety-and-critical-flows/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/testing-access-safety-and-critical-flows/research.md).

## Related research

- [context/changes/testing-access-safety-and-critical-flows/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/testing-access-safety-and-critical-flows/research.md)
- [context/changes/student-read-history/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-read-history/plan.md)
- [context/changes/shared-task-completion-flow/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-task-completion-flow/research.md)

## Open questions

- Should email matching be global-unique across all `students` rows, or only unique among unlinked rows?
- Should a professor be able to relink a student record to a different auth account later, or should unlink/recovery stay out of the first slice?
- Should the first UX live entirely on `pending-access`, or should the professor dashboard also expose explicit “invite/link status” to reduce support ambiguity?
