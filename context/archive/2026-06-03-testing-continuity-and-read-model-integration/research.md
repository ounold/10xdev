---
change_id: testing-continuity-and-read-model-integration
title: Research for testing continuity and read model integration
generated: 2026-06-03
owner: codex
---

# Research

## Question

Ground rollout Phase 2 of `context/foundation/test-plan.md` for risks `#4` and `#5`:

- `#4` chronology and `info` / `task` meaning can drift in the shared read model
- `#5` local verification can still miss hosted Supabase behavior

The goal is to identify the cheapest useful integration boundary for continuity checks without over-promoting this phase into hosted e2e.

## Executive summary

The continuity contract currently lives in one real read-model path: `src/lib/supervision.ts` loads note history in reverse chronological order and then attaches note items ordered by `position`. Both the professor thread route and the student dashboard branch consume that same helper output, but they render it differently. That makes `getStudentHistory()` plus `getLinkedStudentHistoryForUser()` the cheapest meaningful integration boundary for Phase 2.

The strongest continuity invariants are not just visual:

- notes must be ordered by `meeting_date desc`, then `created_at desc`
- note items must be ordered by `position asc`
- `item_type` must stay inside the `info | task` enum
- task completion state is constrained at the database level

The main hosted drift risk for this phase is not chronology itself. It is that local-only tests can pass while the hosted project differs in real seed/link state, RLS behavior, or data shape. So the Phase 2 rollout should keep local integration as the main automated layer and retain one small hosted smoke expectation rather than trying to solve hosted drift with mocks.

## Findings

### 1. The shared read model is centralized enough for a true integration boundary

`src/lib/supervision.ts` is the real continuity seam:

- `getStudentHistory()` loads one student row, then all `notes` for that student ordered by:
  - `meeting_date desc`
  - `created_at desc`
- it then loads `note_items` for those notes ordered by:
  - `position asc`
- finally it groups items by `note_id` and returns `StudentWithHistory`

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts)
  - note ordering in `getStudentHistory()`
  - item ordering in `loadNoteItems()`
  - final note-item sort in `createStudentNote()`

This is the cheapest useful boundary because it already joins:

- student ownership
- note chronology
- note-item ordering
- typed item semantics

without requiring full browser automation.

### 2. Student and professor surfaces share the same continuity source, but present it differently

The student dashboard branch uses `getLinkedStudentHistoryForUser()` and renders:

- reverse chronological notes
- visual distinction between `info` and `task`
- item position labels

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - student branch loads `getLinkedStudentHistoryForUser(supabase, user.id)`
  - copy explicitly says the view is reverse chronological
  - item chips style `task` differently from `info`

The professor thread route uses `getStudentHistory()` and renders:

- note list under `Chronological history`
- each note's `meeting_date`
- each item's `item_type`
- item content in entered order

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students\[studentId].astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students\[studentId].astro)

Important nuance:

- the label says `Chronological history`, but the actual query order is newest-first
- the student branch explicitly describes reverse chronology

So the continuity tests should assert actual ordering behavior from the read model, not page copy.

### 3. `info` / `task` meaning is protected across three layers, not only in UI

The item semantics are reinforced in:

1. TypeScript domain contract
2. API payload normalization
3. database schema

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
  - `NoteItemType = "info" | "task"`

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts)
  - `isNoteItemType()` rejects anything outside `info | task`
  - `normalizeItems()` drops malformed items rather than passing them through

- [C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql)
  - `public.note_item_type` enum is `('info', 'task')`
  - `note_items_unique_position_per_note`
  - `note_items_task_completion_consistent`

This means the cheapest continuity regression checks should verify both:

- read-model output preserves `item_type`
- persisted rows still come back in stable item order

### 4. Seed data already provides a minimal continuity fixture

The checked-in seed creates:

- one professor
- one linked or fallback student
- one note for `current_date`
- two ordered items:
  - position `1` -> `info`
  - position `2` -> `task`

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\seed.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\seed.sql)

This is valuable because Phase 2 does not need to invent a fresh fixture model from scratch. A local integration test can either:

- exercise the helper against deterministic stubbed query responses, or
- treat the seed contract as the minimum expected data shape for higher-level verification

### 5. Hosted drift still matters, but this phase should not solve it with heavy automation

The previous rollout already documented that hosted verification remains explicit for:

- linked student routing
- unlinked student denial
- professor sentinel

Evidence:

- [C:\Users\olguno5421\Documents\GitHub\10xdev\README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md)
  - hosted smoke for dashboard role-flow checks

For continuity, the hosted drift risk is narrower:

- remote schema/RLS could diverge from local assumptions
- hosted seed/fixture state may not contain the same note ordering cases
- remote note writes may succeed through the admin-client adaptation while local tests only observe read-model behavior

So the Phase 2 tests should not try to become full hosted automation. The right move is:

- local integration for chronology and semantics
- one explicit hosted note that continuity checks do not eliminate hosted smoke

## Cheapest useful test layer

Recommended primary layer for this phase: integration.

Why:

- the risk lives in read-model composition and ordering, not in browser navigation
- the same helper output feeds both student and professor surfaces
- this layer can prove chronology and semantic preservation without depending on real login or browser state
- it is much cheaper than expanding Playwright into note-history rendering cases

Recommended subject under test:

- `getStudentHistory()`
- `getLinkedStudentHistoryForUser()`

Recommended assertions:

- notes come back newest-first by `meeting_date`, then `created_at`
- items inside a note come back lowest-to-highest by `position`
- `info` and `task` survive unchanged through the read model
- empty history returns a student with `notes: []`
- missing linked student returns `null`

## Risks to challenge in planning

### Risk `#4`

What the plan should prove:

- chronology is a stable read-model contract, not just a UI rendering accident
- `info` and `task` semantics remain legible even if rendering surfaces differ

What to challenge:

- the current heading `Chronological history` does not necessarily mean oldest-first behavior
- page snapshots alone are not enough to prove continuity correctness

Anti-pattern to avoid:

- brittle full-page snapshot tests for dashboard or thread pages

### Risk `#5`

What the plan should prove:

- local integration checks do not silently replace hosted smoke expectations

What to challenge:

- green local integration means hosted note-history behavior is fully verified

Anti-pattern to avoid:

- mocking away all Supabase behavior and then claiming hosted continuity is covered

## Recommended planning direction

Plan Phase 2 as a narrow integration rollout around the supervision read model.

Good sub-phase shape:

1. add the smallest runner/tooling needed for integration tests in this repo
2. cover chronology and item semantics at the `supervision.ts` boundary
3. capture one explicit cookbook pattern for continuity/read-model tests
4. keep a short hosted note in docs/test-plan so local integration green never implies full hosted readiness

## Files that raised these risks

- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students\[studentId].astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students\[studentId].astro)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql)
- [C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\seed.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\seed.sql)
