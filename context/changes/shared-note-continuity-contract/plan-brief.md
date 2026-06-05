# Plan Brief: Shared note continuity contract

Full plan: [plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\shared-note-continuity-contract\plan.md)

## Why This Change

`S-04` is the next product slice after the current professor and student read flows. The schema and RLS already support shared note updates, but the app layer still only knows how to create new notes. Without an explicit continuity contract, the easiest implementation would degrade into “rewrite the whole note,” which would blur change history and block `S-05` task completion later.

## Starting Point

- Shared note persistence already exists in Supabase with durable `notes.id`, `note_items.id`, `updated_at`, and `updated_by`.
- RLS already allows accessible updates for professors and linked students.
- The current app layer supports only note creation and drops item ids in the form payload.
- Professor thread UI already shows chronology and note-level `updated_at`; student UI is intentionally read-only today.

## Key Decisions

| Decision area     | Choice                                                    | Why                                                                 | Source          |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | --------------- |
| Edit scope        | Edit existing item text and append new items only         | Preserves continuity while avoiding destructive semantics too early | Plan            |
| Continuity signal | Note-level `last edited by / at` only                     | Smallest useful signal already supported by schema                  | Research + Plan |
| Shared contract   | One app-layer update contract for professor and student   | Avoids semantic drift and sets up `S-05`                            | Research + Plan |
| Immutable fields  | `meeting_date`, `student_id`, and `created_by` stay fixed | Matches current RLS invariants                                      | Research + Plan |
| Deletion          | Excluded from this slice                                  | Keeps the first shared-edit contract narrow and legible             | Plan            |

## Scope

**In scope:**

- app-layer update path for one existing note
- stable note-item identity through edits
- professor edit UI for an existing note
- student edit UI for the linked student’s own note
- note-level continuity metadata in the thread

**Out of scope:**

- deleting existing items
- changing meeting date or note ownership
- task completion toggles
- full revision history
- conflict-resolution UX beyond current last-write behavior

## Architecture / Approach

Add a shared note-update contract in `src/lib/supervision.ts` that updates one existing note, edits existing item rows by id, and appends new item rows at trailing positions without deleting prior rows. Generalize `StudentNoteForm.tsx` so it can submit existing item ids when editing. Keep professor and student entry points separate at the route/UI layer, but have both delegate to the same app-layer update path. Surface `updated_at` and last-editor identity in both thread views so continuity is visible without introducing a revision log.

## Phases in Brief

| Phase                       | What it delivers                                                                                  | Key risk                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1. Shared update contract   | Typed update payloads, app-layer note/item update path, integration proof of stable item identity | Accidental rewrite of the full item set             |
| 2. Professor edit flow      | Professor-facing note edit route and UI with visible continuity metadata                          | UI implies unsupported deletion/completion behavior |
| 3. Student shared edit flow | Linked student edits the same note through the same contract                                      | Role-boundary leakage into professor-only surfaces  |

**Prerequisites:** Existing note threads, current RLS policies, and the read-model integration test harness remain intact.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks and Assumptions

- “Last edited” is assumed to be enough as the MVP continuity signal.
- Not allowing deletion in the first slice is assumed to be acceptable for user value and plan sequencing.
- Shared app-layer mutation is assumed to be safer than separate professor/student mutation semantics.

## Success Criteria

- Existing note items keep their durable ids when edited.
- Professor and linked student can both update an existing note through role-safe entry points.
- The thread clearly shows that a note changed later, without implying a full revision history or task completion support.
