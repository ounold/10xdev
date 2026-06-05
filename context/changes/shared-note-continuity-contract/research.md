---
date: 2026-06-05T13:11:24.4888664+02:00
researcher: Codex
git_commit: 99fd3b8
branch: main
repository: 10xdev
topic: "Minimal continuity model for shared note edits with stable item identity, visible last-edited state, and safe professor/student update permissions"
tags: [research, codebase, supervision, notes, rls, continuity]
status: complete
last_updated: 2026-06-05
last_updated_by: Codex
---

# Research: Minimal continuity model for shared note edits with stable item identity, visible last-edited state, and safe professor/student update permissions

**Date**: 2026-06-05T13:11:24.4888664+02:00
**Researcher**: Codex
**Git Commit**: 99fd3b8
**Branch**: main
**Repository**: 10xdev

## Research Question

What is the smallest safe continuity model that can unlock shared note edits for professor and assigned student without collapsing into naive overwrite behavior, while preserving stable note-item identity and keeping task completion work separable for the next slice?

## Summary

The codebase is already structurally close to supporting shared note updates. The schema provides durable note and note-item identity, `updated_at`/`updated_by` on notes, item ordering, and RLS paths that already allow both professor and linked student to update accessible `notes` and `note_items`. The missing layer is not database capability but a deliberate app-level update contract and UI model.

The narrowest viable continuity slice is: keep editing scoped to one existing note at a time; allow changing note item text, adding new items, and reordering/replacing the in-note item list in a controlled way; keep `meeting_date`, `student_id`, and `created_by` immutable; surface `updated_at` and the identity of the last editor in the thread UI; and postpone item deletion semantics and task completion toggles unless they are needed to keep the edit form usable.

This suggests `shared-note-continuity-contract` should be planned as an app-layer write-path and presentation change, not as a schema-first initiative. The main design decision still needed is whether the MVP continuity signal is only “last edited by / at” or whether edited items also need per-item visual marking in the same slice.

## Detailed Findings

### Schema and RLS already support a shared update path

- `notes` rows already track both authorship and latest editor through `created_by`, `updated_by`, `created_at`, and `updated_at` in [20260526213000_create_supervision_domain.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526213000_create_supervision_domain.sql#L40-L47).
- `note_items` rows already have stable identity via `id`, stable per-note ordering via `position`, and future completion fields via `completed_at` / `completed_by` in [20260526213000_create_supervision_domain.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526213000_create_supervision_domain.sql#L50-L69).
- A `notes_update_accessible` policy already allows any authenticated actor who can access the note to update it, while locking down `student_id`, `meeting_date`, `created_by`, and requiring `updated_by = auth.uid()` in [20260526215500_enable_supervision_rls.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526215500_enable_supervision_rls.sql#L151-L174).
- A `note_items_update_accessible` policy already allows accessible item updates, keeps `note_id` and `position` stable, and constrains `completed_by` to null or the current actor in [20260526215500_enable_supervision_rls.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526215500_enable_supervision_rls.sql#L208-L229).
- `note_items_insert_accessible` also already allows both professor and linked student to insert new items into accessible notes in [20260526215500_enable_supervision_rls.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526215500_enable_supervision_rls.sql#L196-L206).

Implication:

- The database is already permissive enough for shared note updates.
- The real blocker is application contract clarity, not missing SQL capability.

### The current app layer only supports note creation, not note mutation

- The supervision module currently exposes `getStudentHistory`, `getLinkedStudentHistoryForUser`, and `createStudentNote`, but no note update or item update function in [src/lib/supervision.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/lib/supervision.ts#L94-L231).
- `createStudentNote` assumes the full payload is new: it inserts one `notes` row, then inserts fresh `note_items` rows with `position` derived from array order in [src/lib/supervision.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/lib/supervision.ts#L184-L231).
- The existing write route, [src/pages/api/dashboard/students/[studentId]/notes.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/api/dashboard/students/%5BstudentId%5D/notes.ts#L58-L133), is explicitly professor-only and only creates new notes; there is no route for updating an existing note or for student-originated edits.

Implication:

- `S-04` should add a dedicated update contract rather than overloading the create path.
- The clean seam is `src/lib/supervision.ts`, where a new “update note with items” function can sit next to the read model and create path.

### The UI is already continuity-oriented, but only read-only or professor-create

- Professor thread view already renders chronological notes and shows `note.updated_at`, which is the first usable continuity signal, in [src/pages/dashboard/students/[studentId].astro](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/dashboard/students/%5BstudentId%5D.astro#L42-L87).
- That same view still hardcodes the next step as “new note” and mounts `StudentNoteForm` only for note creation in [src/pages/dashboard/students/[studentId].astro](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/dashboard/students/%5BstudentId%5D.astro#L89-L117).
- Student dashboard view intentionally states that the thread is read-only and avoids creation/edit/completion controls in [src/pages/dashboard.astro](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/dashboard.astro#L19-L147).
- The current interactive form component, [src/components/supervision/StudentNoteForm.tsx](https://github.com/ounold/10xdev/blob/99fd3b8/src/components/supervision/StudentNoteForm.tsx#L1-L214), is already a strong basis for editing because it models ordered `info` / `task` items, validates empties, and serializes a structured item payload.

Implication:

- The least disruptive UI plan is to reuse or generalize `StudentNoteForm` into a note editor that can accept existing note/item defaults.
- The student branch can later expose this editor in a constrained way without inventing a parallel editing surface.

### Stable note-item identity exists in storage but is currently dropped from the form contract

- `NoteItemRow` includes `id`, `position`, `item_type`, and `content` in [src/lib/database.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/lib/database.ts#L31-L41).
- The client form contract currently serializes only `item_type` and trimmed `content`, losing `id` and any distinction between existing vs. newly added items in [src/components/supervision/StudentNoteForm.tsx](https://github.com/ounold/10xdev/blob/99fd3b8/src/components/supervision/StudentNoteForm.tsx#L28-L35).
- The create route’s `normalizeItems()` similarly only reconstructs `item_type` and `content`, again assuming every row is new in [src/pages/api/dashboard/students/[studentId]/notes.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/api/dashboard/students/%5BstudentId%5D/notes.ts#L20-L56).

Implication:

- The minimum continuity contract for editing must introduce an “item payload” that can preserve existing item IDs.
- Without item IDs in the update payload, the app cannot distinguish “edited existing item” from “delete all and recreate everything,” which would undermine later task completion semantics and blur continuity.

### The codebase is already hinting that S-05 should build on S-04 rather than the reverse

- `NoteItemType` already distinguishes `info` and `task` in [src/lib/database.ts](https://github.com/ounold/10xdev/blob/99fd3b8/src/lib/database.ts#L1-L2), and both professor/student read UIs already render that distinction in [src/pages/dashboard/students/[studentId].astro](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/dashboard/students/%5BstudentId%5D.astro#L73-L81) and [src/pages/dashboard.astro](https://github.com/ounold/10xdev/blob/99fd3b8/src/pages/dashboard.astro#L108-L128).
- Completion storage exists in the schema (`completed_at`, `completed_by`) and its consistency constraint already depends on `item_type = 'task'` in [20260526213000_create_supervision_domain.sql](https://github.com/ounold/10xdev/blob/99fd3b8/supabase/migrations/20260526213000_create_supervision_domain.sql#L56-L69).
- But current read-model tests focus only on chronology and semantic preservation, not item identity or edit behavior, in [tests/integration/supervision-read-model.test.ts](https://github.com/ounold/10xdev/blob/99fd3b8/tests/integration/supervision-read-model.test.ts#L1-L233).

Implication:

- `S-04` should explicitly preserve item IDs and positions so `S-05` can later toggle completion on durable items instead of re-derived bullets.
- This is another argument against naive “rewrite note contents wholesale” behavior in the first edit slice.

## Code References

- `supabase/migrations/20260526213000_create_supervision_domain.sql` - core schema for `notes`, `note_items`, update timestamps, and completion fields
- `supabase/migrations/20260526215500_enable_supervision_rls.sql` - RLS access/update rules for students, notes, and note items
- `src/lib/database.ts` - typed contracts that expose stable note/item identity and editor metadata
- `src/lib/supervision.ts` - shared read model and current note creation path; missing edit path
- `src/pages/api/dashboard/students/[studentId]/notes.ts` - professor-only create route; current write contract assumptions
- `src/pages/dashboard/students/[studentId].astro` - professor thread UI; already shows note `updated_at`
- `src/pages/dashboard.astro` - student read-only branch; current future boundary for shared editing
- `src/components/supervision/StudentNoteForm.tsx` - existing interactive form that can likely be generalized for editing
- `tests/integration/supervision-read-model.test.ts` - current continuity-focused integration baseline

## Architectural Conclusions

- The smallest workable slice is not “full collaboration” but “single-note editing with continuity signals.”
- Database and RLS are already far enough along that the key design work is API contract and UI behavior.
- The most important architectural invariant to preserve is stable note-item identity through edits.
- The cleanest MVP continuity signal is likely note-level `updated_at` + `updated_by`, possibly paired with item-level persistence, without forcing a full append-only revision log yet.
- The edit contract should treat `meeting_date`, `student_id`, and `created_by` as immutable.
- If deletion is included in the first edit slice, it should be deliberate and traceable in the UI contract; otherwise it is safer to exclude deletion from the first pass and allow only edit + append.

## Historical Context

- `context/foundation/roadmap.md` - marks `S-04` as blocked by the need for an explicit continuity model, not by schema absence.
- `context/foundation/prd.md` - `FR-006`, `FR-007`, and `FR-008` require shared editing and visible continuity, making plain overwrite behavior unacceptable.
- `context/foundation/test-plan.md` - risk #6 already frames this work as “shared-note continuity contract,” and rollout Phase 3 is specifically reserved for it.
- `context/changes/testing-continuity-and-read-model-integration/plan.md` - current integration strategy already established `supervision.ts` as the continuity seam and should be extended, not bypassed.
- `context/changes/student-read-history/plan.md` - the student slice intentionally kept the student UI read-only, preserving a clean opening for this next change to introduce shared editing intentionally rather than by leakage.

## Related Research

- `context/changes/testing-continuity-and-read-model-integration/plan.md` - identifies chronology and semantics as the cheapest meaningful continuity boundary
- `context/changes/student-read-history/plan.md` - documents the current role split and student read-only boundary

## Open Questions

- Is “last edited by / at” sufficient as the only continuity signal in the first shared-edit slice, or does the MVP need to visually mark newly added or edited items within a note?
- Should the first edit slice allow removing existing note items, or should it intentionally limit edits to text mutation plus item append to keep continuity legible?
- Should professor and student both edit through the same update route and form contract, with role checks only at the route/UI entry level, or do we want separate orchestration paths around a shared app-layer update function?
