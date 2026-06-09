---
date: 2026-06-05T14:45:12.5916242+02:00
researcher: Codex
git_commit: dd03b71
branch: main
repository: 10xdev
topic: "Current completion model and the smallest safe shared task-completion slice after shared note continuity"
tags: [research, codebase, supervision, tasks, completion, continuity, rls]
status: complete
last_updated: 2026-06-05
last_updated_by: Codex
---

# Research: Current completion model and the smallest safe shared task-completion slice after shared note continuity

**Date**: 2026-06-05T14:45:12.5916242+02:00
**Researcher**: Codex
**Git Commit**: dd03b71
**Branch**: main
**Repository**: 10xdev

## Research Question

What is the smallest safe next slice for shared task completion now that shared note continuity is implemented, and where do the current schema, RLS, app layer, UI, tests, and historical decisions already constrain the design?

## Summary

The repository is already structurally ready for task completion at the data layer, but not at the application layer. The schema includes `completed_at` and `completed_by` on `note_items`, and SQL constraints already enforce that only `task` items may carry completion metadata. RLS also already permits accessible `note_items` updates while constraining completion ownership to the current actor or null. What is missing is the full app-facing contract: there is no TypeScript input shape for completion toggles, no supervision helper that updates completion state, no route that expresses the role-safe mutation, and no UI that renders or toggles completion.

The safest next slice is narrower than “full shared note editing plus task workflow.” It should target only durable existing `task` items, leave `info` items untouched, keep `position`, `note_id`, `meeting_date`, `student_id`, and `created_by` immutable, and introduce a focused completion toggle path on top of the stable `note_item.id` contract delivered by `shared-note-continuity-contract`. That makes `shared-task-completion-flow` a follow-on app-layer and UI slice, not a schema or RLS initiative.

The most important design choice still open is role policy at the product layer. The database currently permits both professor and linked student to update accessible items, so the next slice must decide whether both may toggle completion, whether completion is reversible, and how the UI should signal “who completed this task and when” without weakening the continuity model that was just established.

## Detailed Findings

### The schema already models task completion explicitly

- `note_items` already persist `completed_at` and `completed_by`, and both fields are nullable on the row shape exposed to the app in [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts:31).
- The supervision-domain migration defines `completed_at timestamptz` and `completed_by uuid` on `public.note_items`, so no new schema column is needed for the next slice in [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql:50).
- The `note_items_task_completion_consistent` check already encodes the core business invariant: completion metadata must be either fully null, or both fields must be present and the item must be a `task` in [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql:62).

Implication:

- The next change should not spend scope on migrations unless product rules require richer completion states than the current boolean-like model.
- The smallest safe slice should keep the model binary: incomplete (`null`, `null`) vs. completed (`timestamp`, actor id).

### RLS already permits completion updates, but only within an accessible supervision graph

- `note_items_update_accessible` already allows updates on accessible note items for authenticated actors who can reach the owning note, and it keeps both `note_id` and `position` immutable in [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql:208).
- The same policy constrains `completed_by` so it must be either `null` or the current authenticated actor, which means the database already supports “mark complete as me” and “clear completion” semantics, but not “pretend someone else completed this” in [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql:226).
- `can_access_note_item()` resolves item accessibility through the note and student ownership graph, so completion on a foreign note item is already blocked by the same access boundary as shared note editing in [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql:34).

Implication:

- The security-sensitive part of the next slice is primarily route and product orchestration, not raw SQL permissioning.
- Browser tests should focus on role-safe entry points and denial paths, because the underlying SQL boundary is already present.

### The current app layer exposes completion data, but has no completion mutation contract

- `loadNoteItems()` already selects `completed_at` and `completed_by`, so all existing thread views receive completion state today even though they do not render it in [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts:149).
- `updateStudentNote()` preserves durable item identity and position, but it only updates `item_type` and `content` for existing items and appends new ones; it does not touch completion metadata at all in [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts:251).
- The current typed inputs stop at `UpdateExistingNoteItemInput` and `UpdateNoteInput`, which means there is no app-level payload that can express “toggle completion for one durable task item” without overloading the broader note-edit contract in [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts:50).

Implication:

- The cleanest seam for `S-05` is a dedicated app-layer helper next to `updateStudentNote()` rather than embedding completion toggles inside the broad note-edit payload.
- A narrow helper such as `setNoteItemCompletion()` or `toggleTaskCompletion()` would better preserve the contract separation that `S-04` intentionally established.

### The UI currently distinguishes `task` visually, but avoids any completion behavior

- Both student and professor thread views already render `info` and `task` with distinct visual treatment, so the user can tell which items are actionable even before completion exists in [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro:146) and [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro:115).
- The student dashboard explicitly says the branch still avoids task completion controls, which makes the absence of toggles an intentional contract, not an omission, in [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro:184) and [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro:225).
- The professor student-thread page also states that the continuity contract does not yet imply delete or task completion, so both branches are already prepared for a future slice to introduce completion deliberately in [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro:59).
- `StudentNoteForm` currently treats note editing as text/type mutation plus append-only growth. It has no control surface for completion, which reinforces that `S-05` can either extend the thread cards directly or consciously generalize the form rather than smuggling completion into the existing item editor in [src/components/supervision/StudentNoteForm.tsx](C:/Users/olguno5421/Documents/GitHub/10xdev/src/components/supervision/StudentNoteForm.tsx:158).

Implication:

- The UI seam is already clean: add completion to thread rendering and to a focused action path, not to the current “edit note content” form by default.
- Completion controls should almost certainly live on rendered task items, not inside the text-edit form, if the goal is to keep content editing and workflow state as separate concerns.

### Shared note continuity intentionally prepared this slice by preserving durable item identity

- The `shared-note-continuity-contract` research explicitly identified stable `note_item.id` preservation as the key prerequisite for later completion toggles in [context/changes/shared-note-continuity-contract/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/research.md:39).
- Its plan locked in task completion as out of scope for `S-04` specifically to keep the follow-on slice clean once durable item identity survived edits in [context/changes/shared-note-continuity-contract/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/plan.md:29).
- The implemented update contract now validates item accessibility by stable `id`, preserves existing positions, and appends only new rows, which means a completion toggle can safely target one durable existing item without ambiguity in [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts:265).

Implication:

- The most important thing not to regress in `S-05` is the durable-item contract delivered by `S-04`.
- Completion should be modeled as a mutation of one existing task item, not as a side effect of re-saving the whole note.

### Seed data and tests already give a practical completion starting point

- The development seed already creates at least one `task` note item with `completed_at` and `completed_by` both null, which is enough to support manual verification for a first completion toggle in [supabase/seed.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/seed.sql:97).
- Integration stubs already carry `completed_at` and `completed_by` through the local Supabase-shaped doubles, so extending tests to cover completion metadata is incremental rather than foundational in [tests/integration/support/supabaseStub.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/support/supabaseStub.ts:95).
- The new E2E continuity pack proves that linked-student and professor fixture-based verification is already viable around shared-note history, which reduces the setup cost for a future completion-path browser test in [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md:130).

Implication:

- The next slice can and should start with at least one integration-level completion contract test and one browser-level task toggle path.
- Manual verification can begin from the existing seeded task item instead of inventing an all-new fixture path.

## Code References

- [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts:31) - note-item completion fields and current update input boundaries
- [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts:149) - read-model selection of completion metadata
- [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts:251) - current shared note update contract that excludes completion
- [src/components/supervision/StudentNoteForm.tsx](C:/Users/olguno5421/Documents/GitHub/10xdev/src/components/supervision/StudentNoteForm.tsx:158) - current edit form seam that avoids completion controls
- [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro:184) - student-branch copy that explicitly defers task completion
- [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro:59) - professor-branch copy that explicitly defers task completion
- [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql:50) - completion columns and consistency constraint
- [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql:208) - note-item update policy and completion ownership constraint
- [supabase/seed.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/seed.sql:97) - seeded incomplete task item

## Architectural Conclusions

- `shared-task-completion-flow` should be an app-layer and UI slice, not a schema slice.
- The narrowest safe mutation unit is one existing durable `task` item, addressed by `note_item.id`.
- Completion should likely travel through a focused route/helper pair rather than the broader note-edit payload, because content editing and workflow state are now separate seams.
- The most stable MVP rule is binary completion on `task` items only: set or clear `completed_at` / `completed_by`.
- Reversibility is a product decision, not a technical limitation. The current schema and RLS support both “complete” and “undo” as long as the actor only claims or clears their own completion state.
- The next slice should preserve the existing continuity rule that professor-only and student-only surfaces remain separated even when they share the same durable task item model.

## Historical Context

- The original product-data-model change deliberately introduced completion fields at the schema level so later slices could avoid follow-up migrations for task workflow in [context/archive/2026-05-26-product-data-model/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/archive/2026-05-26-product-data-model/plan.md:28).
- `professor-note-history` intentionally deferred task completion while still choosing explicit `info` / `task` item semantics to preserve this future seam in [context/changes/professor-note-history/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/professor-note-history/plan.md:27).
- `shared-note-continuity-contract` explicitly promised a clean handoff to the next slice once stable item identity survived edits in [context/changes/shared-note-continuity-contract/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/plan.md:29).
- The repository lessons now reinforce that repo-local Playwright auth fixtures should be the first browser-level verification path, which matters for future professor/student completion checks in [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md:43).

## Related Research

- [context/changes/shared-note-continuity-contract/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-note-continuity-contract/research.md)
- [context/changes/testing-continuity-and-read-model-integration/research.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/testing-continuity-and-read-model-integration/research.md)

## Open Questions

- Should both professor and linked student be allowed to toggle completion, or should the first slice restrict completion authority to one role?
- If both roles can complete a task, should undo be allowed for any accessible actor, or only for the actor who set completion?
- Should completion metadata be surfaced as plain text (“Completed by X on Y”) or as a stronger visual state change on the task row in the first MVP?
- Should completed tasks stay in-place in note order, or should the UI visually separate them while preserving persisted `position`?
