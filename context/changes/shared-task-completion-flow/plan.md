---
change_id: shared-task-completion-flow
title: Shared task completion flow
status: planned
created: 2026-06-05
updated: 2026-06-05
owner: codex
---

# Plan: Shared task completion flow

## Current State Analysis

- The persistence layer already stores task-completion state on durable `note_items` through `completed_at` and `completed_by`, and SQL already enforces that only `task` items may carry those fields: [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql).
- RLS already allows completion-style updates for accessible note items, keeps `note_id` and `position` stable, and constrains `completed_by` to either `null` or the current actor: [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql).
- The shared read model already loads `completed_at` and `completed_by`, but the app layer has no helper or typed mutation contract for toggling completion on one durable task item: [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).
- The professor and linked-student thread UIs already render `task` items distinctly, but both explicitly defer task completion controls today: [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro), [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro).
- The previous continuity slice intentionally preserved stable `note_item.id` values and excluded completion so `S-05` could target one durable existing item without overloading whole-note edit semantics: [context/changes/shared-note-continuity-contract/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/research.md), [context/changes/shared-note-continuity-contract/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/plan.md).
- Repo-local Playwright auth fixtures already exist for linked student and professor flows, so browser-level completion checks can reuse the same first-path verification strategy as recent continuity tests: [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md), [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area                 | Decision                                                                    | Why                                                                          |
| -------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Completion authority | Both professor and linked student may toggle completion                     | Matches the shared-thread model already established in `S-04`                |
| Reversibility        | Completion is reversible for any accessible actor                           | Smallest practical workflow; already supported by schema and RLS             |
| Mutation shape       | Use a narrow item-level completion contract and dedicated route             | Preserves the separation between content editing and workflow state          |
| UI surface           | Put completion control directly on rendered task items in thread view       | Avoids forcing users through note-edit mode for a simple task state change   |
| Completion signal    | Show both a clear visual completed state and `Completed by X on Y` metadata | Makes status and continuity visible together                                 |
| Item ordering        | Completed tasks stay in-place in persisted note order                       | Preserves the stable `position` contract and avoids a bigger layout redesign |

## Scope

**In scope**

- add a typed app-layer completion mutation contract for one existing task item
- allow professor and linked student to mark a visible task as complete or incomplete
- render task completion state and completion metadata in both thread views
- keep completion controls on rendered task items, outside the existing note-edit form
- add focused integration coverage for the completion contract
- add focused browser coverage for the happy path and one role-boundary denial path

**Out of scope**

- schema migrations or RLS rewrites
- completion support for `info` items
- moving completed tasks into a separate section or changing persisted order
- full completion history or append-only audit logs
- bulk completion controls
- merging completion controls into the broad note-edit payload

## Architecture / Approach

Implement `S-05` as a dedicated task-state mutation slice on top of the durable-item contract from `S-04`. Extend `src/lib/database.ts` with a narrow completion input type for one existing note item. Add a focused helper in `src/lib/supervision.ts` that loads one accessible item, rejects non-task items or inaccessible rows, and then either sets or clears `completed_at` / `completed_by` without touching note identity, item order, or note content. Keep orchestration thin and role-specific: professor and student entry points may live in separate API routes or route branches, but both should delegate to the same app-layer completion helper. In the UI, render completion controls directly on task items inside existing thread cards and show both a visual completed state and `Completed by ... on ...` metadata. Keep note-content editing and task workflow as separate seams.

## Phases

### Phase 1: Define the shared completion contract and enforce task-only mutation

#### Goal

Create the narrow app-layer mutation contract for toggling completion on one durable existing task item.

#### Required changes

- **File:** [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts)
  - **Goal:** Introduce typed inputs for task-completion mutation without broadening the existing note-edit payload.
  - **Contract:** Add a narrow item-level completion type that can express:
    - target `note_item_id`
    - expected parent `note_id`
    - actor `completed_by`
    - desired completion state (`complete` vs `incomplete`)
  - Keep this separate from `UpdateNoteInput`.

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts)
  - **Goal:** Add one focused app-layer helper for toggling completion on an accessible task item.
  - **Contract:** The helper should:
    - load the current note item and its note accessibility context
    - reject inaccessible items
    - reject `info` items for completion mutation
    - set `completed_at` / `completed_by` when completing
    - clear both fields when undoing completion
    - preserve `note_id`, `position`, `item_type`, and `content`
  - Do not fold this into the broad note-edit mutation.

- **File:** [tests/integration/support/supabaseStub.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/support/supabaseStub.ts)
  - **Goal:** Support the minimum query and update shapes needed by the new completion helper.
  - **Contract:** Extend the stub only for the chained shapes the helper actually uses; keep it query-shape-oriented and small.

- **File:** new focused integration spec under `tests/integration/`, such as `task-completion-contract.test.ts`
  - **Goal:** Prove that completion mutation respects durable item identity and task-only semantics at the app boundary.
  - **Contract:** Cover at least:
    - completing a task sets both `completed_at` and `completed_by`
    - undoing completion clears both fields
    - trying to complete an `info` item is rejected
    - item identity and `position` stay stable through completion toggles

#### Success criteria

#### Automated verification:

- [ ] An integration-level completion contract exists for one durable existing task item
- [ ] Completing a task sets `completed_at` and `completed_by` without changing item identity or position
- [ ] Undoing completion clears both completion fields for the same durable item

#### Manual verification:

- [ ] The chosen completion contract is clearly separate from whole-note content editing
- [ ] The task-only rule is explicit enough that future work will not accidentally expose completion on `info` items

### Phase 2: Expose professor task completion with visible continuity metadata

#### Goal

Add the first UI and route path for toggling task completion from the professor thread view.

#### Required changes

- **File:** professor-facing completion route under `src/pages/api/dashboard/students/` or an adjacent thread area
  - **Goal:** Provide a narrow professor entry point for completing or reopening one accessible task item.
  - **Contract:** The route should:
    - require an authenticated professor session
    - validate thread/item accessibility at the route boundary
    - delegate completion semantics to the new app-layer helper
    - return the user to the same student thread with a success or error signal
  - Do not reuse the broad note-edit payload shape.

- **File:** [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro)
  - **Goal:** Render completion state and controls on task items in the professor thread.
  - **Contract:** For `task` items:
    - show a completion control directly in the rendered thread item
    - apply a clear completed visual state
    - show `Completed by X on Y` when completed
  - For `info` items:
    - keep them visible but without completion controls
  - Keep persisted note order intact.

#### Success criteria

#### Automated verification:

- [ ] The professor thread has a narrow completion path for one task item
- [ ] Completed task items render both a changed visual state and completion metadata
- [ ] `info` items do not render completion controls

#### Manual verification:

- [ ] A professor can complete and reopen a task from the thread view without entering note-edit mode
- [ ] The UI makes it obvious which task is done and who marked it done

### Phase 3: Open the same completion contract to the linked student branch and verify boundaries

#### Goal

Allow the linked student to use the same durable task-completion contract while preserving student-only visibility boundaries.

#### Required changes

- **File:** student-facing completion route under `src/pages/api/dashboard/` or shared route wiring with role-specific orchestration
  - **Goal:** Let a linked student complete or reopen one accessible task item.
  - **Contract:** Use the same app-layer completion helper as the professor path. Role-specific logic should live in route orchestration and UI exposure, not in duplicated completion semantics.

- **File:** [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro)
  - **Goal:** Render student-visible task completion state and expose controls only for the linked student’s own accessible tasks.
  - **Contract:** Keep student scope limited to the linked student’s own history, add completion controls only on `task` items, and preserve the existing absence of professor-only surfaces.

- **File:** focused e2e coverage under `tests/e2e/`
  - **Goal:** Confirm that completion behavior works through real session-aware thread views and that boundaries still hold.
  - **Contract:** Cover at least:
    - one happy-path completion toggle through the linked-student or professor browser path
    - one denial path proving a student cannot complete a foreign task item
  - Reuse repo-local Playwright `storageState` fixtures first.

#### Success criteria

#### Automated verification:

- [ ] A linked student can toggle completion on an accessible task item through the shared app-layer contract
- [ ] Browser-level tests cover one happy-path completion flow and one foreign-item denial path
- [ ] Student task completion does not expose professor-only thread surfaces

#### Manual verification:

- [ ] The linked student can complete only tasks from their own shared history
- [ ] Completion feels like a small extension of the existing thread, not a second disconnected workflow

## Risks and Mitigations

- **Risk:** Completion logic gets folded into the note-edit payload and re-couples workflow state with content editing.
  - **Mitigation:** Keep a dedicated item-level completion contract and route path.

- **Risk:** Completion controls accidentally appear for `info` items because both item types share the same thread card rendering.
  - **Mitigation:** Make `task`-only rendering and rejection explicit in both UI and app-layer helper.

- **Risk:** UI redesign scope expands into “task inbox” behavior and breaks the stable note-order contract.
  - **Mitigation:** Keep completed tasks in-place and treat stronger task-list management as a later slice.

- **Risk:** Role semantics become inconsistent across professor and student flows.
  - **Mitigation:** Use one shared app-layer helper and keep only access orchestration role-specific.

- **Risk:** Browser verification gets blocked by fresh-login assumptions even though repo-local fixtures already exist.
  - **Mitigation:** Reuse the saved Playwright states in `.auth/` first, per repository lesson.

## Progress

### Phase 1: Define the shared completion contract and enforce task-only mutation

#### Automated Verification:

- [x] 1.1 Add typed item-level completion inputs and a focused app-layer completion helper
- [x] 1.2 Extend the integration stub and add contract coverage for complete/undo/task-only semantics
- [x] 1.3 Preserve item identity and position through completion toggles

#### Manual Verification:

- [x] 1.4 Confirm the completion contract stays separate from whole-note editing
- [x] 1.5 Confirm `info` items remain outside completion semantics

### Phase 2: Expose professor task completion with visible continuity metadata

#### Automated Verification:

- [x] 2.1 Add a professor-facing completion route that delegates to the shared helper
- [x] 2.2 Render visual completion state plus `Completed by ... on ...` metadata in the professor thread
- [x] 2.3 Keep `info` items free of completion controls

#### Manual Verification:

- [x] 2.4 Confirm a professor can complete and reopen a task directly from the thread view
- [x] 2.5 Confirm completion reads clearly without implying a larger task-inbox workflow

### Phase 3: Open the same completion contract to the linked student branch and verify boundaries

#### Automated Verification:

- [ ] 3.1 Allow a linked student to toggle completion for an accessible task item
- [ ] 3.2 Cover one happy-path completion flow and one foreign-item denial path at browser level
- [ ] 3.3 Preserve student-only visibility while exposing task completion controls

#### Manual Verification:

- [ ] 3.4 Confirm the linked student can complete only tasks from their own shared history
- [ ] 3.5 Confirm completion feels like a thread-local extension of the existing shared-note workflow
