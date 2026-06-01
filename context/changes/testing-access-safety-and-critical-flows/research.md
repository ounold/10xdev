---
date: 2026-06-01T21:09:32.9670006+02:00
researcher: Codex
git_commit: b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc
branch: main
repository: ounold/10xdev
topic: "Phase 1 test rollout: access safety and critical flows"
tags: [research, codebase, auth, dashboard, supabase, testing]
status: complete
last_updated: 2026-06-01
last_updated_by: Codex
---

# Badanie: Phase 1 test rollout: access safety and critical flows

**Data**: 2026-06-01T21:09:32.9670006+02:00  
**Badacz**: Codex  
**Git Commit**: `b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc`  
**Gałąź**: `main`  
**Repozytorium**: `ounold/10xdev`

## Pytanie badawcze

Ground rollout Phase 1 of `context/foundation/test-plan.md` for risks `#1`, `#2`, `#3`, and `#5`: access denial for unlinked/wrong students, safe access for linked students, regression risk on professor flows within the shared `/dashboard` route, and hosted Supabase mismatches that local checks may miss.

## Podsumowanie

The real access boundary is split across two layers: middleware admits only professors and linked students into `/dashboard`, while the student dashboard branch loads data by `student_profile_id = auth.uid()` rather than by URL parameter. That is a strong starting point for cross-student isolation because the student-facing branch never accepts a student-selected `studentId`. The professor branch remains materially different: it lists all supervised students and exposes roster creation, so any regression in the role switch inside `src/pages/dashboard.astro` would immediately leak professor UI to student sessions.

The cheapest high-signal rollout for Phase 1 is therefore browser-led verification, not unit tests. There is no existing test runner in the repo, and the highest-risk behavior depends on real auth cookies, middleware redirects, hosted student linking, and the shared server-rendered dashboard branch. A narrow e2e/smoke phase should prove four paths first: unauthenticated to `/auth/signin`, unlinked student to `/pending-access`, linked student to read-only `/dashboard`, and professor to roster/dashboard actions. Hosted smoke must remain explicit because README documents that student linking exists only through remote `students.student_profile_id -> profiles.id` setup, not through an in-app flow.

## Szczegółowe ustalenia

### 1. Access control is enforced first by middleware, then by role-specific dashboard loading

- Middleware initializes `role` and `isLinkedStudent` from `loadCurrentProfileState(user)` before any route branching, then protects every `/dashboard` path with three gates: authenticated user, bootstrap-professor special case, and finally `professor || linked student` admission ([src/middleware.ts#L19-L32](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/middleware.ts#L19-L32), [src/middleware.ts#L35-L52](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/middleware.ts#L35-L52)).
- Anyone who is authenticated but neither professor nor linked student is redirected to `/pending-access`, while `/pending-access` itself bounces professors and linked students back to `/dashboard` ([src/middleware.ts#L50-L66](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/middleware.ts#L50-L66)).
- The linked-student flag is not computed from session claims. `loadCurrentProfileState` queries `students` by `student_profile_id = user.id` using the admin client, so the core truth for student admission is the existence of a linked row in the hosted database ([src/lib/profile.ts#L40-L73](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/lib/profile.ts#L40-L73)).

Implication:
- Risk `#1` and `#2` are integration/e2e risks, not unit-only risks. The behavior depends on a real auth session plus a real linked/unlinked row in Supabase.

### 2. The student dashboard path is isolated from student-chosen identifiers

- The shared `/dashboard` page computes `isStudentDashboard` from locals and only loads the student-facing data path when `role === "student" && isLinkedStudent` ([src/pages/dashboard.astro#L6-L11](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/dashboard.astro#L6-L11)).
- For linked students, the page calls `getLinkedStudentHistoryForUser(supabase, user.id)` rather than reading a `studentId` from the URL or form input ([src/pages/dashboard.astro#L8-L11](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/dashboard.astro#L8-L11)).
- `getLinkedStudentHistoryForUser` itself resolves the student row by `student_profile_id = userId` and then delegates to `getStudentHistory(student.id)`; this means the student branch is keyed from identity mapping, not from student navigation state ([src/lib/supervision.ts#L143-L165](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/lib/supervision.ts#L143-L165)).

Implication:
- The most important student-isolation regression to catch is not “student changes URL param.” It is “linked student is admitted into the wrong dashboard branch” or “profile/link lookup drifts and returns the wrong student row.”

### 3. The professor path is exposed through the same route and is therefore the main regression surface

- The professor branch begins at the `else` side of the shared route and immediately loads professor-only roster data via `listProfessorStudents(supabase)` ([src/pages/dashboard.astro#L161-L188](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/dashboard.astro#L161-L188)).
- That branch contains the inline roster creation form posting to `/api/dashboard/students`, success/error messaging via query params, and launch links into `/dashboard/students/[studentId]` ([src/pages/dashboard.astro#L197-L314](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/dashboard.astro#L197-L314)).
- The roster create API defends itself with both auth and role checks before insert; it redirects non-professors to `/pending-access`, then tries the session client and falls back to the admin client on hosted RLS failure `42501` ([src/pages/api/dashboard/students.ts#L16-L36](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/api/dashboard/students.ts#L16-L36), [src/pages/api/dashboard/students.ts#L66-L104](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/src/pages/api/dashboard/students.ts#L66-L104)).

Implication:
- Risk `#3` should be tested as a regression on the shared route itself, not only as separate professor-unit behavior. The critical assertion is that student admission never falls through into this branch and that professor roster behavior still works after student safety changes.

### 4. Hosted smoke is a first-class requirement because the repo already documents environment-specific divergence

- README documents that `student-read-history` works only when a real hosted `students.student_profile_id -> profiles.id` link exists, and that the UI does not provide this linkage ([README.md#L226-L238](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/README.md#L226-L238)).
- README separately documents that professor roster writes and professor note writes both have hosted fallback behavior when session-client writes hit remote RLS mismatches (`42501`) ([README.md#L210-L224](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/README.md#L210-L224)).
- CI currently runs only `npm run lint` and `npm run build`; there is no automated gate for auth/session/linking behavior today ([.github/workflows/ci.yml#L18-L24](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/.github/workflows/ci.yml#L18-L24)).

Implication:
- Risk `#5` is real, not speculative. Hosted smoke checks are currently the only defense against “local branch logic looks correct, but the real Supabase link state or RLS behavior breaks the flow.”

### 5. There is no existing test base to lean on, so Phase 1 should not start with runner plumbing for its own sake

- `package.json` contains `dev`, `build`, `preview`, `lint`, `lint:fix`, and `format`, but no test script and no test runner dependency such as Playwright, Vitest, or Jest ([package.json#L5-L13](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/package.json#L5-L13), [package.json#L36-L55](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/package.json#L36-L55)).
- A repo scan found no actual test suite; the only match was a scratch file `sandbox-temp-test.cmd`, which is not a real automated test base.

Implication:
- The cheapest useful Phase 1 rollout is to define and automate the critical browser-led flows first, then add integration coverage in Phase 2 once the first real safety net exists.

## Odniesienia do kodu

- `src/middleware.ts:19-66` - Session/user lookup, role derivation, `/dashboard` admission, and `/pending-access` rebound logic.
- `src/lib/profile.ts:40-73` - Admin-client profile load plus linked-student detection through `students.student_profile_id`.
- `src/pages/dashboard.astro:6-11` - Shared route role switch and branch-specific data loading.
- `src/pages/dashboard.astro:32-158` - Student-only read-only dashboard branch.
- `src/pages/dashboard.astro:161-340` - Professor roster and thread-launch branch sharing the same route surface.
- `src/lib/supervision.ts:94-165` - Student history loader and linked-student identity mapping.
- `src/pages/api/dashboard/students.ts:16-104` - Professor-only roster creation route with hosted RLS fallback.
- `src/pages/pending-access.astro:19-29` - User-facing denial path for unlinked accounts.
- `README.md:210-238` - Hosted verification notes for roster, note-history, and student-read-history slices.
- `.github/workflows/ci.yml:18-24` - Current CI gate limited to lint + build.
- `package.json:5-13` - No test script today.

## Wnioski architektoniczne

- Access safety is intentionally centralized in middleware, but role leakage can still happen at the shared dashboard branch if the route-level switch regresses. That makes the route switch itself an architectural seam worth testing end-to-end.
- Student visibility is safer than a URL-parameter-based design because the student branch resolves the student row from identity mapping. The main failure mode is therefore identity/link drift, not direct ID tampering inside the student dashboard.
- Professor flows and student flows now coexist on one SSR surface. That reduces route sprawl, but it means any future change to dashboard layout, locals, or data-loading order can impact both roles at once.
- Hosted Supabase is not an implementation detail here. The repo already carries documented hosted adaptations and manual verification steps, so a serious quality strategy must treat hosted smoke as part of the contract, not as optional QA theater.

## Kontekst historyczny (z poprzednich zmian)

- The product-data-model plan established explicit professor/student ownership and row-level access as a foundation requirement rather than a later hardening step, which explains why access risks remain top priority now ([context/archive/2026-05-26-product-data-model/plan.md#L13-L20](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/context/archive/2026-05-26-product-data-model/plan.md#L13-L20), [context/archive/2026-05-26-product-data-model/plan.md#L98-L126](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/context/archive/2026-05-26-product-data-model/plan.md#L98-L126)).
- `student-read-history` close-out explicitly recorded that hosted verification depends on a real link in remote Supabase and that student linking remains out of scope in the UI, which supports Phase 1 smoke checks against real hosted fixtures rather than fake local setup ([README.md#L226-L238](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/README.md#L226-L238)).
- Lessons learned already require safe remote Supabase checks through small Node `fetch()` scripts and fixed-order backlog reconciliation after close-out, which means this rollout can rely on that hosted verification pattern instead of inventing a new ops path ([context/foundation/lessons.md](https://github.com/ounold/10xdev/blob/b8d34a3a0ec667ec1b31ce9f87755bfdaaac8bcc/context/foundation/lessons.md)).

## Powiązane badania

- `context/changes/student-read-history/change.md` - final implementation record for the linked/unlinked student flow.
- `context/foundation/test-plan.md` - rollout strategy and risk map that this research grounds.

## Otwarte pytania

- Should Phase 1 introduce a dedicated e2e runner immediately, or should it first codify the critical-path browser smoke flow using the in-app browser/manual-hosted path and let Phase 2 pick the permanent runner?
- Should the first automated hosted smoke use seeded/reusable linked and unlinked accounts, or should the rollout also create a deterministic fixture-preparation script for remote student-link setup?
- Is the safest professor regression sentinel the roster create path, the thread-open path, or both as a minimum Phase 1 critical path?
