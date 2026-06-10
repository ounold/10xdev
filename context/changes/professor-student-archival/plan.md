---
change_id: professor-student-archival
title: Professor student archival
status: planned
created: 2026-06-10
updated: 2026-06-10
owner: codex
---

# Plan: Professor student archival

## Current State Analysis

- The archive lifecycle contract is already present in the data model and app seams. `students` rows now carry `lifecycle`, `archived_at`, and `archived_student_profile_id`, while active professor roster reads already exclude archived rows by filtering `lifecycle = 'active'`: [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).
- Student-side access revocation after archival is already defined centrally. Linked-student lookup ignores archived rows, claimability excludes archived matches, and archived former students fall back to the pending-access path rather than reaching `/dashboard`: [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/lib/pending-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/pending-access.ts).
- The professor dashboard currently renders only active roster data and exposes no lifecycle action. Students link from the roster into a professor-only thread page, but there is no server mutation for archiving a student yet: [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro), [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro).
- The supervision helper already contains the right mutation style to reuse for archival. Professor-owned create/update flows and student linking mutations all live in `src/lib/supervision.ts`, convert Supabase errors into user-safe messages, and keep row-shape selection explicit: [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).
- Lessons learned for this repo reinforce two planning constraints here: do not treat remote schema rollout as automatic, and keep verification layered as repo gates plus targeted proof rather than assuming browser work is always required first: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area               | Decision                                                                 | Why                                                                                                           | Source |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| Entry point        | Trigger archive only from the professor student thread page              | Keeps the first slice narrow and places the action on the surface with the most context                       | User   |
| Confirmation       | Use a strong explicit confirmation step before archive                   | Archival is intentionally irreversible in-product and deserves a clear friction point                         | User   |
| Success navigation | Redirect back to `/dashboard` after success                              | Matches the goal of removing the student from the active roster and avoids a half-built archived thread state | User   |
| Slice boundary     | Do not add archived thread UI in this slice                              | Keeps `S-01` focused on the lifecycle transition; archived-history UX belongs to `S-02`                       | User   |
| Data behavior      | Preserve notes/tasks as-is; no extra archival metadata on thread content | The lifecycle contract already preserves history at the student-thread boundary                               | User   |
| Success feedback   | Show a success banner on the dashboard roster after redirect             | Gives the professor a visible completion signal on the surface where the result matters                       | User   |
| Test gate          | Require `lint` + `build` + targeted integration coverage                 | Fits the risk profile of a professor-only lifecycle mutation without forcing early E2E                        | User   |
| Forward seam       | Prepare an archived-roster helper/list seam now, even without UI         | Avoids re-cutting the same read-model boundary in `S-02`                                                      | User   |

## Scope

**In scope**

- Add a professor-only archive mutation for a single active student
- Expose the archive action from the professor student thread page
- Require explicit confirmation before the archive POST is submitted
- Move the archived student out of the active roster via existing active-only roster queries
- Redirect the professor back to `/dashboard` with success feedback after archival
- Prepare a helper seam for later archived-roster reads, without rendering archive UI yet
- Add targeted integration coverage for the archive mutation contract and active/archived helper split

**Out of scope**

- Archive action on the main roster surface
- Archived thread read-only UI or archived-route presentation
- Restore/unarchive flow
- Archive reason capture or richer audit UI
- Re-registration UX beyond the already-shipped access contract
- New E2E coverage in this slice unless integration proof shows a gap

## Architecture / Approach

Implement archival as a professor-owned mutation at the supervision helper boundary. The new helper should operate only on active rows, verify professor ownership through the authenticated Supabase context, and update the student row into the archived lifecycle shape by copying the current `student_profile_id` into `archived_student_profile_id`, clearing the active link, and setting `lifecycle = 'archived'` plus `archived_at`. The professor thread page becomes the only UI entry point in this slice: it renders an explicit confirmation-backed form, submits to a new professor-only API route, and then redirects to the dashboard with a success banner. The active roster needs no special removal logic beyond its existing active-only query, but this slice should also introduce the next helper seam for archived-list retrieval so `S-02` can add archive UI without reworking the read model again.

## Phases

### Phase 1: Add the professor-owned archival mutation contract

#### Goal

Create the server-side mutation that safely archives an active student row and preserves historical linkage metadata.

#### Required changes

- **File:** [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts)
  - **Goal:** Add any missing mutation/result types for professor-driven archival.
  - **Contract:** Represent the archiveable student row and any archive result shape explicitly enough that later routes and tests do not rely on ad-hoc objects.

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts)
  - **Goal:** Add the archive mutation and the first archived-roster helper seam.
  - **Contract:** Introduce:
    - a professor-owned archive helper that only acts on an active accessible student row
    - lifecycle update behavior that sets `lifecycle = 'archived'`, stamps `archived_at`, copies the current `student_profile_id` into `archived_student_profile_id`, and clears `student_profile_id`
    - a read helper boundary for archived professor students, even if the UI does not yet consume it
  - The helper should surface a clear not-found-or-not-accessible error when the selected row is unavailable.

- **File:** integration tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove the archive mutation semantics without needing browser coverage.
  - **Contract:** Cover at least:
    - archiving an active linked student clears the active link and preserves historical linkage
    - archiving an active unlinked prepared student still produces a valid archived row
    - archived rows no longer appear in the active roster helper but are visible through the archived helper seam
    - attempting to archive a missing/inaccessible row fails clearly

#### Success criteria

#### Automated verification:

- [ ] Archive mutation updates lifecycle, timestamp, and link fields consistently
- [ ] Active roster helper excludes newly archived rows
- [ ] Archived-roster helper seam exposes professor-owned historical rows for later UI work

#### Manual verification:

- [ ] A professor-triggered archive removes an active student from the dashboard roster on the next load
- [ ] The archived row still preserves prior student identity metadata when applicable

### Phase 2: Expose archive on the professor student thread page

#### Goal

Give the professor a narrow, high-context UI action for archiving a student from the thread page with explicit confirmation.

#### Required changes

- **File:** new API route under [src/pages/api/dashboard/students/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students/)
  - **Goal:** Wire the professor UI to the supervision archive helper.
  - **Contract:** The route should:
    - require an authenticated professor session
    - accept only the thread student ID in the current route context
    - redirect back to the thread page with an error query on failure
    - redirect to `/dashboard?archived=1&studentName=...` or equivalent success params on success

- **File:** [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro)
  - **Goal:** Add the first archive control to the professor thread surface.
  - **Contract:** Render:
    - a clearly separated archive section or danger zone
    - strong explicit confirmation before submit
    - any thread-local error feedback returned by the route
  - Do not convert this page into an archived-history experience yet; after success the professor leaves this surface.

- **File:** [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro)
  - **Goal:** Show post-archive confirmation where the roster result is visible.
  - **Contract:** Read the success query params and render a success banner without changing the active roster structure itself.

#### Success criteria

#### Automated verification:

- [ ] Professor archive route redirects cleanly on success and failure
- [ ] Thread page renders archive action and thread-local error handling without affecting existing note/task flows
- [ ] Dashboard success banner appears from the archive redirect contract

#### Manual verification:

- [ ] From an active student thread, the professor can confirm archive and land back on the dashboard
- [ ] The archived student is gone from the active roster after redirect
- [ ] Existing non-archived student threads still behave normally

### Phase 3: Close verification and rollout guidance for the slice

#### Goal

Make the slice handoff-ready with the repo-required gates and concise manual verification guidance.

#### Required changes

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) or change-scoped notes if more appropriate
  - **Goal:** Capture the minimum manual verification path for professor archival.
  - **Contract:** Document:
    - open an active student thread as professor
    - archive with confirmation
    - verify redirect banner and disappearance from active roster
    - optionally confirm the archived row exists for future archive-list work

- **Files:** change artifact updates in [context/changes/professor-student-archival/](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/professor-student-archival/)
  - **Goal:** Keep plan progress and scope traceable through implementation.
  - **Contract:** The change stays scoped to `S-01` and should not absorb `S-02` archived-history UI.

#### Success criteria

#### Automated verification:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Targeted integration coverage proves the archival mutation and helper seams

#### Manual verification:

- [ ] Professor archive flow succeeds end-to-end on the local app
- [ ] Manual notes are clear enough to repeat later on hosted during release verification

## Risks and Mitigations

- **Risk:** The archive mutation writes an inconsistent lifecycle shape, especially for unlinked prepared students versus linked active students.
  - **Mitigation:** Centralize the mutation in `src/lib/supervision.ts` and cover both linked and unlinked active cases in integration tests.

- **Risk:** The first archive action drifts into archived-history UI and expands the slice past `S-01`.
  - **Mitigation:** Keep the only entry point on the thread page and always redirect to the dashboard after success.

- **Risk:** Archived rows become hard to consume later because this slice only removes them from the active roster.
  - **Mitigation:** Add the archived-roster helper seam now, even if unused by UI until `S-02`.

- **Risk:** Professor-only authorization is enforced in the page but not in the mutation route.
  - **Mitigation:** Require professor role and authenticated Supabase context again inside the API route; do not trust page-level navigation alone.

- **Risk:** Hosted verification later fails because remote Supabase schema is stale relative to the local mutation code.
  - **Mitigation:** Reuse the repo lesson: push remote Supabase migrations before treating hosted archival behavior as releasable.

## Progress

### Phase 1: Add the professor-owned archival mutation contract

#### Automated Verification:

- [x] 1.1 Add archive mutation types plus the supervision helper for professor-owned student archival
- [x] 1.2 Add archived-roster helper seam and keep active-roster behavior unchanged for non-archived rows
- [x] 1.3 Add targeted integration coverage for linked, unlinked, and inaccessible archive cases

#### Manual Verification:

- [ ] 1.4 Confirm an archived row preserves previous link metadata when starting from a linked active student
- [ ] 1.5 Confirm newly archived rows disappear from active roster reads

### Phase 2: Expose archive on the professor student thread page

#### Automated Verification:

- [ ] 2.1 Add the professor-only archive API route and redirect contract
- [ ] 2.2 Add the confirmed archive action to the professor thread page
- [ ] 2.3 Add dashboard success feedback for post-archive redirect

#### Manual Verification:

- [ ] 2.4 Confirm a professor can archive from the thread page and return to the dashboard
- [ ] 2.5 Confirm non-archived students remain visible and usable after archiving another student

### Phase 3: Close verification and rollout guidance for the slice

#### Automated Verification:

- [ ] 3.1 Run `npm run lint`
- [ ] 3.2 Run `npm run build`
- [ ] 3.3 Run targeted integration checks for professor student archival

#### Manual Verification:

- [ ] 3.4 Record the local professor archive smoke path
- [ ] 3.5 Leave hosted release verification explicitly deferred until a deploy-worthy batch
