---
project: "Post-meeting notes"
source_prd: "context/foundation/prd.md"
generated: 2026-05-25
status: draft
main_goal: "Validate the core professor workflow first"
north_star: "S-02"
top_blocker: "Data model and access rules for professor, student, note, and note-item ownership"
---

# Roadmap

## At a Glance

### Main goal

Validate the core professor workflow first: the professor must be able to create and revisit a coherent per-student supervision thread before the roadmap expands into broader student-side collaboration.

### North star

`S-02` is the north star slice. The north star means the smallest complete flow that proves the product works for its main promise: a professor can create a student note, reopen that student history later, and still understand continuity.

### Top blocker

The main blocker is the data model and access rules for professor, student, note, and note-item ownership. Until that is defined and enforced, every real product slice is either unsafe or fake.

### Baseline status

| ID | Type | Outcome | Status |
|---|---|---|---|
| F-01 | foundation | Product data model, migrations, and row-level security for students, notes, and note items | ready |
| F-02 | foundation | Professor role bootstrap and seeded first-owner path | proposed |
| S-01 | slice | Professor can create and browse a student roster | proposed |
| S-02 | slice | Professor can create a post-meeting note and revisit one student's history | ready |
| S-03 | slice | Student can sign in and read only their own supervision history | blocked |
| S-04 | slice | Professor and student can update a shared note without losing continuity | blocked |
| S-05 | slice | Professor and student can mark task-like note items complete | blocked |

## Baseline

- Frontend is present: Astro pages, layouts, styling, and auth UI are already wired.
- Authentication is present: Supabase SSR auth, route protection, and sign-in/sign-up/sign-out flows exist.
- Deployment is present: Cloudflare Worker deployment, Wrangler config, and CI already work.
- Backend domain logic is not present yet: there are no student, note, or note-item APIs.
- Product data layer is not present yet: there are no app tables, migrations, or row-level security policies for the supervision domain.
- Observability is only partial: platform observability exists, but product-level diagnostics are still minimal.

## Foundations

### F-01: Product data model, migrations, and row-level security

- Change ID: `product-data-model`
- Status: `ready`
- Type: `foundation`
- Unlocks: `S-01`, `S-02`, `S-03`, `S-04`, `S-05`
- PRD refs: `FR-001`, `FR-002`, `FR-004`, `FR-005`, `FR-006`, `FR-007`, `FR-008`

This foundation defines the durable shape of the app: students, notes, note items, authorship, last-edited state, and access rules that separate professor access from student access.

Why it exists:
- the current codebase has auth but no domain persistence
- access separation is a product guardrail, not a later hardening task
- continuity over time depends on explicit ownership and edit semantics

### F-02: Professor role bootstrap and first-owner setup

- Change ID: `professor-bootstrap`
- Status: `proposed`
- Type: `foundation`
- Unlocks: `S-01`, `S-02`, `S-03`
- PRD refs: `US-01`, `US-05`, `FR-003`, `FR-004`

This foundation defines how the first professor account becomes the owner of the workspace and how student accounts get linked to the correct professor-owned records.

Why it exists:
- the current auth scaffold treats users generically
- the product needs one professor with global visibility and many students with narrow visibility

## Slices

### S-01: Professor can create and browse a student roster

- Change ID: `professor-student-roster`
- Status: `proposed`
- Depends on: `F-01`, `F-02`
- PRD refs: `US-05`, `FR-004`

The professor can create student records and see a per-student list that becomes the entry point into each supervision thread.

Why this slice matters:
- it creates the real product container for every later note
- it replaces the starter dashboard with the first professor-facing domain view

Definition of done:
- the professor can create a student record
- the professor can browse all supervised students
- each student has a dedicated detail/history entry point

### S-02: Professor can create a post-meeting note and revisit one student's history

- Change ID: `professor-note-history`
- Status: `ready`
- Depends on: `F-01`, `F-02`
- PRD refs: `US-01`, `US-05`, `FR-001`, `FR-002`, `FR-004`, `FR-008`

The professor can open one student, create a dated post-meeting note with short bullet items, and later reopen that same student thread to see the note in chronological context.

Why this is the north star:
- it is the smallest complete validation milestone, meaning the smallest complete user-visible flow that proves the central product promise
- it validates continuity, not just storage

Definition of done:
- a note belongs to exactly one student
- a note supports brief bullet-point content
- notes appear in chronological order for that student
- the professor can understand current state by revisiting that thread later

### S-03: Student can sign in and read only their own supervision history

- Change ID: `student-read-history`
- Status: `blocked`
- Depends on: `F-01`, `F-02`, `S-02`
- Blocked by: student-to-record linking and access policy details
- PRD refs: `US-02`, `FR-003`, `FR-005`

The student can authenticate and view only their own notes and current supervision context.

Why it is blocked:
- the app already has generic auth, but not domain-specific identity mapping
- the exact rule tying a student account to one supervision thread must be encoded in data and policy first

Definition of done:
- a student can access only their own note history
- history is chronological
- current versus completed items can be distinguished in the student view

### S-04: Professor and student can update a shared note without losing continuity

- Change ID: `shared-note-updates`
- Status: `blocked`
- Depends on: `F-01`, `S-02`, `S-03`
- Blocked by: explicit continuity model for edits and visible last-edited state
- PRD refs: `US-04`, `FR-006`, `FR-008`

The professor and the assigned student can both update an existing note, and the shared record still preserves the thread of what was previously agreed.

Why it is blocked:
- the PRD requires continuity preservation, which is more than a simple overwrite
- the product must make post-meeting edits understandable, not merely possible

Definition of done:
- both sides can edit the same note
- the updated state is visible to the professor
- continuity remains legible when the note is revisited later

### S-05: Professor and student can mark task-like note items complete

- Change ID: `note-item-completion`
- Status: `blocked`
- Depends on: `F-01`, `S-02`, `S-03`
- Blocked by: note-item shape and shared update semantics
- PRD refs: `US-03`, `FR-007`

Task-like note items can be completed individually, and that state remains visible in the shared history.

Why it is blocked:
- completion depends on note-item identity, not just note text
- the product must distinguish informational bullets from actionable bullets

Definition of done:
- task-like items can be completed one by one
- both the professor and the assigned student can update completion state
- completion remains visible later in the same thread

## Streams

| Stream | Focus | Chain |
|---|---|---|
| A | Core professor flow | `F-01 -> F-02 -> S-01 -> S-02` |
| B | Student visibility | `F-01 -> F-02 -> S-02 -> S-03` |
| C | Shared follow-up workflow | `F-01 -> S-02 -> S-04 -> S-05` |

## Open Roadmap Questions

1. How should the first professor account be designated: seeded manually, claimed through a bootstrap flow, or assigned through metadata outside the app?
2. What is the minimum continuity model for note edits in MVP: simple last-edited state, append-only update log, or visible per-item edit trail?
3. What is the minimum student onboarding path: professor-created student records only, or student self-sign-up plus linking?
4. Does the MVP need explicit distinction in the UI between informational bullets and task bullets at note-creation time, or can that be inferred later?

## Parked

- Password reset completion flow is still incomplete in the current auth scaffold; it should be fixed before broader user rollout, but it is not on the core product path to validate the professor workflow.
- App-level error tracking can wait until after the first real domain slices unless auth or data debugging becomes painful.
- Custom domain rollout stays parked until the workers.dev smoke path remains stable through the first product slices.

## PRD Coverage

| PRD item | Covered by |
|---|---|
| FR-001 | `S-02` |
| FR-002 | `S-02` |
| FR-003 | `S-03` |
| FR-004 | `S-01`, `S-02` |
| FR-005 | `S-03` |
| FR-006 | `S-04` |
| FR-007 | `S-05` |
| FR-008 | `F-01`, `S-02`, `S-04` |

## Backlog Handoff

| Roadmap ID | Change ID | Status | Why next |
|---|---|---|---|
| F-01 | `product-data-model` | ready | This is the highest-leverage enabling layer and the main blocker for every real domain slice. |
| F-02 | `professor-bootstrap` | proposed | This converts generic auth into the professor/student ownership model required by the PRD. |
| S-01 | `professor-student-roster` | proposed | This creates the first real professor-facing navigation surface for the product. |
| S-02 | `professor-note-history` | ready | This is the smallest complete validation milestone for the product promise. |
| S-03 | `student-read-history` | blocked | This should follow once identity mapping and access rules are encoded safely. |
| S-04 | `shared-note-updates` | blocked | This depends on a clear continuity model instead of naïve overwrite editing. |
| S-05 | `note-item-completion` | blocked | This should ship only after note-item identity and shared editing semantics exist. |

## Done

- None yet.
