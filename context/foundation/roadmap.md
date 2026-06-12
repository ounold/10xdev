---
project: "Post-meeting notes"
source_prd: "context/foundation/prd-v2.md"
generated: 2026-06-09
status: completed
main_goal: "Safely close the active-to-archived student lifecycle without regressing active supervision flows"
north_star: "S-02"
top_blocker: "No remaining blocker inside this roadmap scope; archival lifecycle, archived-history review, and returning-student reset are implemented"
---

# Roadmap

## At a Glance

### Main goal

Safely close the active-to-archived student lifecycle without regressing active supervision flows. The first priority is making archival a trusted product transition, not a manual data workaround.

### North star

`S-02` is the north star slice. The north star means the smallest complete flow that proves archival works end to end: the professor can open archived students from the same roster surface, review historical thread state in read-only mode, and the archived student no longer has access.

### Top blocker

The main blocker is a consistent archival state and access contract across data, UI, and protected routes. Until that exists, the product cannot safely separate active students from historical ones.

### Baseline status

| ID   | Type     | Outcome                                                                | Status |
| ---- | -------- | ---------------------------------------------------------------------- | ------ |
| B-01 | baseline | Professor and student supervision flows for active records are working | done   |
| B-02 | baseline | Student account linking exists for active prepared records             | done   |
| B-03 | baseline | Archive lifecycle for students and threads now exists end to end       | done   |

## Baseline

- Frontend is present: professor and student dashboards already render roster, thread, note, and task flows.
- Backend and protected routes are present: server endpoints and middleware already enforce professor and student access for active records.
- Data and row-level security are present: `students`, `notes`, and `note_items` already exist with ownership rules.
- Student claim-access behavior is present for active rows only.
- The archival lifecycle capability is now present: professor archive action, professor-only archived history, and returning-student reset all exist in the product.

## Foundations

### F-01: Archival state and access contract

- Change ID: `student-archive-access-contract`
- Status: `done`
- Type: `foundation`
- Unlocks: `S-01`, `S-02`, `S-03`
- PRD refs: `US-01`, `US-02`, `US-03`

This foundation introduces the minimal cross-cutting contract required for all later slices: a durable archived state for student relationships, preserved historical thread visibility for the professor, and immediate student-access revocation against archived records.

Why it exists:

- the current data and access model assumes every student row is either active or manually altered outside the product
- archive behavior must be enforced consistently across roster reads, thread reads, and claim/link checks
- later slices become unsafe if archival is first implemented only in UI copy without a shared access rule

## Slices

### S-01: Professor archives an active student from the roster

- Change ID: `professor-student-archival`
- Status: `done`
- Depends on: `F-01`
- PRD refs: `US-01`

The professor can archive an active student from the roster, removing that student from the active list without deleting supervision history.

Why this slice matters:

- it creates the lifecycle transition the product currently lacks
- it gives the professor an explicit product action instead of a manual data workaround

Definition of done:

- only the professor can trigger archive
- the archived student disappears from the active roster
- active supervision flows continue to work for remaining non-archived students

### S-02: Professor reviews archived students and read-only thread history

- Change ID: `archived-student-history`
- Status: `done`
- Depends on: `F-01`, `S-01`
- PRD refs: `US-01`, `US-02`

The professor can open an archive section from the same roster surface and review archived student threads in a clearly read-only state.

Why this is the north star:

- it is the smallest complete validation milestone for archival because it proves both halves of the promise: active roster cleanup and preserved historical continuity
- it turns archive from a hidden state change into a usable professor-facing workflow

Definition of done:

- archived students appear in a separate archive section visible only to the professor
- archived thread history remains readable
- archived thread surfaces no active editing or completion actions

### S-03: Returning student links only to a fresh active record

- Change ID: `student-reregistration-reset`
- Status: `done`
- Depends on: `F-01`, `S-01`
- PRD refs: `US-03`

The same student email can later be reused for a new active student record, and the returning student can link only to that new record without regaining archived history access.

Why this slice matters:

- it closes the lifecycle loop so archive does not become a dead end operationally
- it protects historical boundaries while preserving a practical re-onboarding path

Definition of done:

- archived student rows no longer participate in claim-access matching
- a newly prepared active student row can be linked by the returning student
- archived history remains inaccessible to the returning student

## Streams

| Stream | Focus                       | Chain                  |
| ------ | --------------------------- | ---------------------- |
| A      | Archival lifecycle contract | `F-01 -> S-01 -> S-02` |
| B      | Re-registration safety      | `F-01 -> S-01 -> S-03` |

## Open Roadmap Questions

1. Should a future roadmap introduce professor-side restore/unarchive, or keep archival intentionally one-way?
2. Is archive-event observability worth its own slice, or should it stay parked until broader roster administration work starts?
3. Should hosted smoke for the archival chain become a standing release checklist item now that the schema and flows are stable?

## Parked

- Product-level restore or unarchive remains intentionally out of scope for this roadmap.
- Archive reason capture, merge flows, and broader roster administration stay parked.
- Additional observability for archive events can wait until the core lifecycle contract is stable.

## PRD Coverage

| PRD item | Covered by             |
| -------- | ---------------------- |
| US-01    | `F-01`, `S-01`, `S-02` |
| US-02    | `F-01`, `S-02`         |
| US-03    | `F-01`, `S-03`         |

## Backlog Handoff

| Roadmap ID | Change ID                         | Status | Why next                                                                                   |
| ---------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| F-01       | `student-archive-access-contract` | done   | Foundation landed and now backs every archival slice with the shared data/access contract. |
| S-01       | `professor-student-archival`      | done   | Professor can archive active students from the product surface.                            |
| S-02       | `archived-student-history`        | done   | The north-star archived roster and read-only history flow is available.                    |
| S-03       | `student-reregistration-reset`    | done   | Returning students can link only to fresh active rows without regaining archived history.  |

## Done

- `F-01` `student-archive-access-contract` - implemented as the shared lifecycle and access-control foundation for archived students.
- `S-01` `professor-student-archival` - implemented as the professor archive action for active students.
- `S-02` `archived-student-history` - implemented as the professor-only archived roster and read-only thread history flow.
- `S-03` `student-reregistration-reset` - implemented as the archived-to-fresh-active re-registration path for returning students.
