---
change_id: shared-note-continuity-contract
title: Shared note continuity contract
status: planned
created: 2026-06-05
updated: 2026-06-05
owner: codex
---

# Plan: Shared note continuity contract

## Current State Analysis

- The persistence layer already gives us durable note and item identity plus note-level editor metadata. `notes` store `created_by`, `updated_by`, `created_at`, and `updated_at`, while `note_items` already have stable `id`, `position`, `item_type`, `completed_at`, and `completed_by`: [supabase/migrations/20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql).
- RLS already allows accessible updates for both professors and linked students. `notes_update_accessible` locks down `student_id`, `meeting_date`, and `created_by`, while `note_items_update_accessible` preserves `note_id` and `position` and constrains completion ownership: [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526215500_enable_supervision_rls.sql).
- The app layer still supports only note creation, not mutation. `src/lib/supervision.ts` exposes shared reads plus `createStudentNote()`, but there is no update contract for an existing note or note items: [src/lib/supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).
- The current write route is professor-only and assumes every submitted item is new. `normalizeItems()` drops item ids and rebuilds a create-only payload, which would collapse shared editing into a naive overwrite flow if reused unchanged: [src/pages/api/dashboard/students/[studentId]/notes.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students[studentId]\notes.ts).
- The UI is already close to the right seam. Professor thread view shows chronological notes and note-level `updated_at`, the student branch is intentionally read-only, and `StudentNoteForm.tsx` already models ordered `info` / `task` drafts that can be generalized into an edit-capable form: [src/pages/dashboard/students/[studentId].astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students[studentId].astro), [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro), [src/components/supervision/StudentNoteForm.tsx](C:\Users\olguno5421\Documents\GitHub\10xdev\src\components\supervision\StudentNoteForm.tsx).
- The test layer already treats `supervision.ts` as the continuity seam. Existing integration tests cover chronology and semantic preservation, and the stub builder is narrow but extendable enough to support update-path tests: [tests/integration/supervision-read-model.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-read-model.test.ts), [tests/integration/support/supabaseStub.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\support\supabaseStub.ts).

## Key Decisions

| Area                   | Decision                                                                                                     | Why                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Edit scope             | Allow editing existing item text and appending new items; do not allow deleting existing items in this slice | Keeps continuity legible and avoids front-loading destructive semantics       |
| Continuity signal      | Use note-level `updated_at` / `updated_by` as the MVP continuity signal                                      | Already supported by schema and sufficient to unblock shared editing          |
| Shared update contract | Use one app-layer update contract for professor and student                                                  | Reduces semantic drift and prepares the ground for task completion            |
| Immutable fields       | Keep `meeting_date`, `student_id`, and `created_by` immutable                                                | Matches current RLS and avoids accidental thread reshaping                    |
| Task completion        | Explicitly out of scope for this change                                                                      | Preserves a clean handoff to `S-05` once durable item identity survives edits |

## Scope

**In scope**

- add an app-layer update path for one existing note and its items
- preserve existing note-item ids while allowing content edits and appending new items
- expose note-level `updated_by` through the read model so the UI can show who last edited the note
- allow both professor and linked student to use the same update contract through role-appropriate routes and UI entry points
- keep continuity-focused integration coverage around the update contract and read model

**Out of scope**

- deleting existing note items
- changing `meeting_date`, note ownership, or student linkage
- task completion toggles and completion-state UI
- full revision history or append-only audit logs
- conflict-resolution UX for simultaneous edits beyond the current last-write data model

## Architecture / Approach

Implement `S-04` as a single-note update slice. Extend `src/lib/database.ts` with explicit update payload types that distinguish existing items from newly appended ones. Add an app-layer update function in `src/lib/supervision.ts` that validates note accessibility, updates the note’s `updated_by`, updates existing item rows in place by id, and inserts new item rows at stable trailing positions without deleting prior rows. Reuse the current `StudentNoteForm` shape by expanding it to accept existing item defaults and to serialize item ids when present. Keep routing thin: professor and student can submit through role-appropriate endpoints, but both routes should delegate to the same app-layer update contract. Surface note-level `updated_at` and last-editor identity in both professor and student thread UIs so continuity is visible even without a full revision trail.

## Phases

### Phase 1: Define the shared update contract and preserve durable item identity

#### Goal

Create the core write contract for editing an existing note without collapsing item identity or mutating note ownership fields.

#### Required changes

- **File:** [src/lib/database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
  - **Goal:** Introduce typed payloads for note updates and mixed existing/new item submissions.
  - **Contract:** Add narrow update types that can express:
    - target `note_id`
    - immutable note ownership context
    - `updated_by`
    - existing items by stable `id`
    - newly appended items without ids
  - Do not broaden the domain model into generic patch objects.

- **File:** [src/lib/supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts)
  - **Goal:** Add a shared app-layer update path for one existing note.
  - **Contract:** The new update function should:
    - load the current note and its items
    - reject inaccessible or missing notes
    - update `notes.updated_by`
    - update existing item content and item type in place by `id`
    - append new item rows after the current max `position`
    - preserve existing item ids and positions for unchanged rows
  - Do not delete rows or rewrite the full item set wholesale in this phase.

- **File:** [tests/integration/support/supabaseStub.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\support\supabaseStub.ts)
  - **Goal:** Support the minimum query/mutation shapes needed by the new update path.
  - **Contract:** Extend the stub narrowly for the actual chain shapes the new supervision helper uses. Keep it query-shape-oriented; do not turn it into a full fake ORM.

- **File:** [tests/integration/supervision-read-model.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-read-model.test.ts) or a sibling update-contract spec under `tests/integration/`
  - **Goal:** Prove that shared note updates preserve stable identity and visible continuity at the app boundary.
  - **Contract:** Cover at least:
    - existing item content updates keep the same item ids
    - new items append after existing positions
    - note `updated_by` changes to the actor performing the edit
    - immutable note fields are not changed by the update path

#### Success criteria

#### Automated verification:

- [ ] An integration-level update contract exists for one existing note and its items
- [ ] Editing an existing item preserves its `note_items.id`
- [ ] Appending a new item preserves existing positions and adds the new row at the tail

#### Manual verification:

- [ ] The chosen update contract is clearly distinguishable from “delete and recreate all items”
- [ ] The contract leaves task completion semantics untouched for the next slice

### Phase 2: Expose professor note editing with visible continuity metadata

#### Goal

Turn the existing professor thread into the first edit-capable shared note surface while making “last edited” visible in the UI.

#### Required changes

- **File:** [src/components/supervision/StudentNoteForm.tsx](C:\Users\olguno5421\Documents\GitHub\10xdev\src\components\supervision\StudentNoteForm.tsx)
  - **Goal:** Generalize the form so it can edit an existing note as well as create a new one.
  - **Contract:** Accept optional existing note/item defaults, preserve stable item ids in the serialized payload when present, and keep the no-delete MVP boundary explicit in the interaction model.

- **File:** [src/pages/api/dashboard/students/[studentId]/notes.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students[studentId]\notes.ts) and/or a sibling update route under the same area
  - **Goal:** Provide a professor-facing route for updating one existing note through the shared app-layer contract.
  - **Contract:** Keep role checks and thread accessibility enforcement at the route level, but delegate note mutation semantics to `src/lib/supervision.ts`.

- **File:** [src/pages/dashboard/students/[studentId].astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students[studentId].astro)
  - **Goal:** Make continuity visible and professor edits usable in the thread UI.
  - **Contract:** Show note-level “last edited” metadata, keep the current chronology layout, and add an edit entry point for a single existing note without replacing the whole thread with a bulk-edit surface.

#### Success criteria

#### Automated verification:

- [ ] The professor thread can submit a note update payload that preserves existing item ids
- [ ] The thread UI renders note-level continuity metadata using app-layer data
- [ ] Existing note creation behavior remains intact after the edit path lands

#### Manual verification:

- [ ] A professor can understand which note was last updated and that the thread still reads coherently after an edit
- [ ] The first edit UI does not imply item deletion or task completion support that the backend does not yet provide

### Phase 3: Open the same shared update contract to the linked student branch

#### Goal

Allow the assigned student to edit their own note through the same app-layer contract while preserving the student-only visibility boundary.

#### Required changes

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Evolve the student branch from read-only history to limited shared note editing.
  - **Contract:** Keep student scope to the linked student’s own notes only, expose edit entry points only where allowed, and continue to avoid completion controls.

- **File:** new student-facing update route or shared route wiring under `src/pages/api/`
  - **Goal:** Let a linked student submit the same note update payload for accessible notes.
  - **Contract:** Use the same app-layer update contract as the professor path; role-specific behavior should stay in orchestration and UI, not in duplicated mutation logic.

- **File:** e2e and/or focused integration coverage for student-originated note updates
  - **Goal:** Confirm the role boundary and shared update path work together.
  - **Contract:** Prefer the cheapest test that proves the risk:
    - integration for shared contract semantics
    - browser/e2e only if route/session behavior is the actual risk under test

#### Success criteria

#### Automated verification:

- [ ] A linked student can update an accessible note through the shared app-layer contract
- [ ] Student-originated edits update note-level continuity metadata without exposing professor-only routes
- [ ] Tests cover the student-side happy path and at least one unauthorized path

#### Manual verification:

- [ ] The student can edit only their own note history and still cannot reach professor-only thread surfaces
- [ ] The shared update experience feels like an extension of the existing thread, not a second disconnected workflow

## Risks and Mitigations

- **Risk:** The update path silently devolves into “replace every item row,” breaking future completion semantics.
  - **Mitigation:** Preserve existing item ids explicitly in the payload and test contract.

- **Risk:** The first shared-edit UI implies destructive capabilities that the backend intentionally excludes.
  - **Mitigation:** Keep deletion out of scope and make the form behavior explicit in copy and controls.

- **Risk:** Student edits leak into professor-only routes or orchestration paths.
  - **Mitigation:** Use one shared mutation contract but keep role-specific entry points and access checks at the route/UI level.

- **Risk:** Continuity remains too weak if “last edited” is not visible enough in the thread.
  - **Mitigation:** Make note-level editor/timestamp metadata part of the explicit UI contract in Phase 2 and Phase 3.

## Progress

### Phase 1: Define the shared update contract and preserve durable item identity

#### Automated Verification:

- [x] 1.1 Add note/item update payload types and a shared app-layer update path - c5b963d
- [x] 1.2 Extend integration test support and prove stable item identity survives edits - c5b963d
- [x] 1.3 Keep immutable note fields and no-delete semantics enforced in the first contract - c5b963d

#### Manual Verification:

- [x] 1.4 Confirm the update contract is not a wholesale rewrite of the item set - c5b963d
- [x] 1.5 Confirm the contract leaves task completion work cleanly for the next slice - c5b963d

### Phase 2: Expose professor note editing with visible continuity metadata

#### Automated Verification:

- [x] 2.1 Generalize the note form to carry existing item ids for edit flows
- [x] 2.2 Add a professor-facing note update route that delegates to the shared contract
- [x] 2.3 Render note-level continuity metadata and preserve note creation behavior

#### Manual Verification:

- [x] 2.4 Confirm the professor thread still reads coherently after editing an existing note
- [x] 2.5 Confirm the UI does not imply delete or completion behavior that is not yet supported

### Phase 3: Open the same shared update contract to the linked student branch

#### Automated Verification:

- [ ] 3.1 Allow linked students to submit the shared note update payload for accessible notes
- [ ] 3.2 Preserve student-only visibility and block professor-only thread surfaces
- [ ] 3.3 Cover student-side update behavior with the cheapest effective tests

#### Manual Verification:

- [ ] 3.4 Confirm the linked student can edit only their own note history
- [ ] 3.5 Confirm the shared update flow feels continuous across professor and student views
