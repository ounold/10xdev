---
change_id: professor-note-history
title: Professor note history
updated: 2026-05-28
source_plan: context/changes/professor-note-history/plan.md
---

# Plan Brief: Professor note history

Full plan: [plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\plan.md)

## Starting Point

The repo already has the hard prerequisites for this slice: professor-only routing, Supabase SSR/admin client setup, supervision schema/RLS, and typed domain models for students, notes, and note items. What is still missing is the app-layer feature itself: there is no student-thread route, no note-history query layer, and no note-creation flow yet.

## Key Decisions

| Area          | Choice                                                        | Why                                                             |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Student entry | Thin dashboard selector + direct student-thread route         | Validates real history flow without absorbing full roster scope |
| Note creation | Inline on the student thread page                             | Keeps continuity visible while creating notes                   |
| Bullet entry  | Structured add/remove rows with explicit `info` / `task` type | Matches schema and preserves future task semantics              |
| Verification  | Seeded-data render plus fresh-create path                     | Confirms both history loading and real note creation            |
| Scope guard   | No student creation in this slice                             | Keeps `S-02` distinct from `S-01`                               |

## Scope

**In scope:**

- minimal professor entry into one student thread
- chronological note-history rendering for one student
- inline creation of a dated note with ordered bullet items
- small supervision data-access helper in `src/lib/`

**Out of scope:**

- full roster management
- student creation/editing
- student-facing views
- shared note editing
- task completion

## Architecture / Approach

Treat `S-02` as “student detail + note history + create note form.” The dashboard becomes a thin professor shell that links to one student's thread. A dedicated student-thread route loads the student's chronological notes and ordered items through a focused supervision data helper. Inline form submission creates one `notes` row plus ordered `note_items` rows through the existing authenticated Supabase/RLS model.

## Phases in Brief

| Phase            | Delivers                                                          | Key Risk                                  |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| 1. Thread entry  | Thin dashboard selector, student-thread route, supervision helper | Scope drift into full roster UI           |
| 2. Note workflow | History rendering plus inline note creation with structured items | Query/write logic scattering across pages |
| 3. Hardening     | Lint/build, docs touch-ups, close-out discipline                  | Dirty worktree causing unrelated edits    |

**Prerequisites:** existing F-01 schema/RLS and F-02 bootstrap remain the active foundation; seeded local data should be available for fast manual checks.
**Estimated effort:** ~2-3 implementation phases in one change.

## Open Risks and Assumptions

- The roadmap baseline prose is stale about missing foundations, so implementation should trust the actual repo state instead.
- The slice assumes at least one existing student record is available through seeded or pre-existing data.
- The student-entry surface must stay intentionally thin so `S-01` still has clear value.

## Success Criteria

- The professor can open one student thread from the protected app shell.
- The professor can view that student's notes in chronological order with ordered bullet items.
- The professor can create a fresh dated note inline and see it appear on the same thread without the work expanding into roster-management scope.
