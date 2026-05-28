---
change_id: professor-note-history
title: Professor note history
status: planned
created: 2026-05-28
updated: 2026-05-28
owner: codex
---

# Plan: Professor note history

## Current State Analysis

- The roadmap marks `S-02` as the north-star slice and `ready`, with dependencies only on `F-01` and `F-02`, both already done: [roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md).
- The PRD contract for this slice is: professor can create a dated note for exactly one student, store short bullet items, and revisit that student's chronological history over time: [prd.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\prd.md).
- Professor-only protected routing is already in place and currently lands on a temporary placeholder dashboard: [middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts), [dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro).
- The supervision schema, RLS, and typed domain contracts already exist for `students`, `notes`, and `note_items`: [20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql), [20260526215500_enable_supervision_rls.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526215500_enable_supervision_rls.sql), [database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts).
- Seed data already creates a professor-owned student and at least one note thread, which is useful for manual verification and for a minimal student selector during this slice: [seed.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\seed.sql).
- There is no app-layer supervision feature code yet: no student-thread routes, no note-history queries, and no note creation handlers in `src/`.

## Key Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Student entry | Direct student-detail route with a temporary minimal selector on dashboard | Validates the real thread flow without absorbing full roster scope |
| Note creation | Inline on the student history page | Keeps context visible and matches the product promise of continuity |
| Bullet entry | Small structured list UI with add/remove rows and explicit `info` / `task` type | Matches schema and preserves later completion semantics |
| Manual verification | Verify both seeded-data rendering and fresh-create flow | Confirms history rendering and real note creation in one slice |
| Student creation | Explicitly out of scope | Preserves `S-02` boundary and keeps `S-01` meaningful |
| Data access shape | Add a focused supervision data-access helper instead of page-local queries | Avoids scattering Supabase query logic across routes |
| Route shape | Use professor dashboard as thin entry shell plus per-student thread route | Reuses existing protected professor surface with minimal IA change |

## Scope

**In scope**

- Replace or extend the placeholder professor dashboard with a thin student-thread entry surface
- Add a professor-facing route for one student's chronological note history
- Add data-loading helpers for professor-visible students and a single student's history
- Add inline note creation with meeting date and structured bullet items
- Render note items in stable chronological order with preserved per-note item order
- Provide manual verification flow using seeded student/note data and fresh note creation

**Out of scope**

- Full student roster management UI
- Creating or editing student records
- Student-facing history UI
- Shared note editing after creation
- Task completion toggling
- Revision log or append-only note history beyond existing `updated_at` / `updated_by`

## Architecture / Approach

Build `S-02` as a professor-only thread view anchored on one `students` record. The dashboard becomes a thin professor shell that can list existing supervised students only as an entry point, not as the full roster feature. A dedicated student-thread route loads one student's note history and renders notes in chronological order with ordered note items. Inline note creation on that thread writes a new `notes` row plus ordered `note_items` rows through the existing authenticated Supabase/RLS model. A small supervision data module in `src/lib/` should own all student/history queries and note-creation writes so pages stay presentation-oriented.

## Phases

### Phase 1: Professor thread entry and supervision data helpers

#### Goal

Create the minimal app-layer foundation needed to open a real student thread without turning this slice into the full roster feature.

#### Required changes

- **File:** new `src/lib/supervision.ts` or similar focused data module
  - **Goal:** Centralize professor-facing supervision reads and note-history writes.
  - **Contract:** Expose a small server-side API for:
    - listing professor-accessible students for the current professor
    - loading one student with chronological notes and ordered note items
    - creating one note with ordered items for one student
  - The module should use the existing SSR Supabase client pattern and typed shapes from [database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts).

- **File:** [src/lib/database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
  - **Goal:** Extend typed contracts only if the current interfaces are insufficient for the exact query/result shapes the slice will use.
  - **Contract:** Keep one canonical typed home for supervision-domain row and view-model shapes. If new types are added, they should reflect route-level needs such as a compact student thread summary or note-create payload rather than duplicate raw row types.

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Replace the professor placeholder with a thin entry shell for student threads.
  - **Contract:** The page should show professor-only context plus a minimal list or selector of existing students that links into a direct student-thread route. It must not include student creation or broad roster-management controls.

- **File:** new professor student-thread route, such as `src/pages/dashboard/students/[studentId].astro`
  - **Goal:** Establish the real route that anchors the slice.
  - **Contract:** The route must be professor-only by virtue of existing middleware, load only one accessible student, and render a deterministic empty/error state if the student id is missing or inaccessible.

#### Success criteria

#### Automated verification:
- [ ] `src/lib/` contains a focused supervision data-access module rather than page-local duplicated queries.
- [ ] The app has a dedicated professor-facing student-thread route under `src/pages/`.
- [ ] The dashboard no longer presents only a placeholder shell for professors.

#### Manual verification:
- [ ] A professor can land on the dashboard and open one existing student thread.
- [ ] The student-entry surface feels intentionally thin and does not drift into full roster-management behavior.

### Phase 2: Student history rendering and inline note creation

#### Goal

Deliver the smallest complete professor workflow: open one student, view chronological history, and add a new dated note with short bullet items inline.

#### Required changes

- **File:** the new student-thread route from Phase 1
  - **Goal:** Render the student's chronological note history.
  - **Contract:** Notes must belong to exactly one student, render in chronological order, and show each note's ordered bullet items. The route should make current continuity legible using existing metadata like `meeting_date`, `updated_at`, and item ordering.

- **File:** new note-creation form component(s), likely under `src/components/`
  - **Goal:** Provide inline note creation with a meeting date and structured bullet-item entry.
  - **Contract:** The form should support:
    - meeting date input
    - add/remove rows for short bullet items
    - explicit `info` / `task` type per row
    - required content validation at the form boundary
  - Keep the UI intentionally small and local to the thread page.

- **File:** new POST handler route or Astro action-style endpoint under `src/pages/api/` as needed
  - **Goal:** Persist a note plus ordered note items through one controlled server path.
  - **Contract:** The write path must:
    - require an authenticated professor session
    - create one `notes` row for the selected student
    - create ordered `note_items` rows with stable `position`
    - preserve the slice boundary by not creating students or editing existing notes

- **File:** [src/lib/utils.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\utils.ts) and UI helpers only if needed
  - **Goal:** Reuse project conventions like `cn()` and existing UI patterns instead of ad hoc styling logic.
  - **Contract:** Any shared presentation helper added here should be generic enough to justify reuse.

#### Success criteria

#### Automated verification:
- [ ] There is a write path that creates both `notes` and ordered `note_items` for one student.
- [ ] The thread route renders loaded history using app-layer data helpers rather than hard-coded seed assumptions.
- [ ] The note form supports explicit `info` / `task` rows and stable order.

#### Manual verification:
- [ ] On seeded data, a professor can open an existing student thread and see prior notes/items in chronological order.
- [ ] A professor can add a fresh note inline with multiple bullet items and see it appear on the same thread after submit.
- [ ] The flow feels like “working inside one supervision thread,” not like bouncing between unrelated screens.

### Phase 3: Slice hardening, documentation, and verification

#### Goal

Make the slice implementation stable enough for follow-on work and verify it against the repo’s current delivery rules.

#### Required changes

- **File:** [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md) if local verification steps need updating
  - **Goal:** Keep local setup and verification aligned if the new slice introduces non-obvious seeded/manual verification steps.
  - **Contract:** Document only what changed materially for local validation of professor note history.

- **File:** `context/changes/professor-note-history/change.md`
  - **Goal:** Keep the change artifact updated as implementation progresses and closes.
  - **Contract:** Change status should move through implementation and close-out without skipping the repo’s backlog-sync rule.

- **Files:** backlog mirrors after implementation closes
  - **Goal:** Apply the recorded lesson for change close-out.
  - **Contract:** After implementation is complete, sync:
    - `context/foundation/tasks-github.md`
    - GitHub Issue mirror
    - Linear mirror
  - in that order.

#### Success criteria

#### Automated verification:
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] The change artifacts remain sufficient for `/10x-impl-review` to validate scope and drift.

#### Manual verification:
- [ ] The professor note-history flow works both against seeded local data and a fresh note-creation attempt.
- [ ] No student-creation or broader roster-management behavior slipped into the slice.
- [ ] If build/release happens later, the plan honors the lesson that remote Supabase state must be verified before treating deployment as complete.

## Risks and Mitigations

- **Risk:** S-02 drifts into `S-01` by adding roster creation, management, or broader dashboard IA.
  - **Mitigation:** Keep dashboard entry thin and route-centered; student creation remains explicitly out of scope.

- **Risk:** Query and mutation logic gets duplicated across pages/endpoints because no supervision helper exists yet.
  - **Mitigation:** Introduce one small `src/lib/` supervision module in Phase 1 and route all slice reads/writes through it.

- **Risk:** The roadmap baseline text is stale about what foundations already exist, which could mislead implementers.
  - **Mitigation:** Anchor implementation decisions on the actual migrations, bootstrap code, and change research rather than the stale baseline prose.

- **Risk:** The dirty worktree increases the chance of accidental unrelated edits.
  - **Mitigation:** Keep edits tightly scoped to supervision pages/components/helpers and avoid cosmetic refactors.

## Progress

### Phase 1: Professor thread entry and supervision data helpers

#### Automated Verification:
- [x] 1.1 A focused supervision data-access module exists in `src/lib/` for this slice
- [x] 1.2 A dedicated professor student-thread route exists and the dashboard links into it
- [x] 1.3 The placeholder dashboard is replaced or extended with a real thin entry shell

#### Manual Verification:
- [x] 1.4 A professor can reach one accessible student thread from the protected app shell
- [x] 1.5 The entry surface stays intentionally thinner than the planned roster slice

### Phase 2: Student history rendering and inline note creation

#### Automated Verification:
- [ ] 2.1 The app can load one student's chronological history with ordered note items
- [ ] 2.2 The create-note path writes one note and its ordered items through the app layer
- [ ] 2.3 The note form supports explicit `info` / `task` rows with stable ordering

#### Manual Verification:
- [ ] 2.4 Seeded note history renders correctly for a professor-owned student
- [ ] 2.5 A newly created note appears on the same thread after submit
- [ ] 2.6 The flow preserves a clear single-thread mental model for the professor

### Phase 3: Slice hardening, documentation, and verification

#### Automated Verification:
- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run build` passes
- [ ] 3.3 Change artifacts and backlog mirrors are ready for close-out discipline

#### Manual Verification:
- [ ] 3.4 Local verification covers both seeded data and fresh-create paths
- [ ] 3.5 The delivered slice does not include student creation or full roster-management behavior
- [ ] 3.6 Deployment/release confirmation does not assume remote Supabase schema state automatically matches local code
