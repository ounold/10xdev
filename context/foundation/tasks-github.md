# GitHub Task Management

This document captures the current GitHub-based task management setup for this repository.

## Purpose

GitHub Issues are the execution backlog for the project. They are derived from the product roadmap in [context/foundation/roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md) and organized with labels and milestones.

## Source of Truth

- Product roadmap: [context/foundation/roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md)
- Product requirements: [context/foundation/prd.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\prd.md)
- Repository: [ounold/10xdev](https://github.com/ounold/10xdev)

The roadmap defines:
- foundation work items (`F-*`)
- vertical slices (`S-*`)
- dependencies
- stream grouping
- readiness/blocker state

## Current Roadmap Shape

Project: `Post-meeting notes`

Main goal:
- validate the core professor workflow first

North star slice:
- `S-02`

Top blocker:
- data model and access rules for professor/student/note/note-item ownership

Current roadmap items:
- `F-01` foundation, closed on GitHub after implementation
- `F-02` foundation, implemented locally; GitHub issue status still needs reconciliation
- `S-01` slice, proposed
- `S-02` slice, implemented locally; remote issue state still needs reconciliation
- `S-03` slice, blocked
- `S-04` slice, blocked
- `S-05` slice, blocked

Streams:
- core professor flow: `F-01 -> F-02 -> S-01 -> S-02`
- student visibility: `F-01 -> F-02 -> S-02 -> S-03`
- shared follow-up: `F-01 -> S-02 -> S-04 -> S-05`

## Label Taxonomy

The repository uses these labels:

- `type:foundation`
- `type:slice`
- `status:ready`
- `status:proposed`
- `status:blocked`
- `stream:core-professor-flow`
- `stream:student-visibility`
- `stream:shared-follow-up`
- `north-star`
- `blocker`

Intended meaning:
- `type:*` separates enabling work from user-visible slices
- `status:*` describes backlog readiness
- `stream:*` groups issues by implementation track
- `north-star` marks the most important validation slice
- `blocker` marks work that unblocks multiple downstream items

## Milestones

Current GitHub milestones:

- `M1 Foundation`
- `M2 Professor Core Flow`
- `M3 Student Access`
- `M4 Shared Collaboration`

Current open issue counts:

- `M1 Foundation`: `1` documented open issue pending reconciliation
- `M2 Professor Core Flow`: `2` documented open issues before S-02 reconciliation
- `M3 Student Access`: `1`
- `M4 Shared Collaboration`: `2`

## Current Issue Backlog

Current GitHub issue state:

- `#1` `[F-01] Product data model, migrations, and row-level security`
  State: `closed`
  Labels at close: `type:foundation`, `status:ready`, `stream:core-professor-flow`, `blocker`
- `#2` `[F-02] Professor role bootstrap and first-owner setup`
  State: `implemented locally; issue closure/update still pending on GitHub`
  Labels: `type:foundation`, `status:ready`, `stream:core-professor-flow`
- `#3` `[S-01] Professor can create and browse a student roster`
  State: `open`
  Labels: `type:slice`, `status:proposed`, `stream:core-professor-flow`
- `#4` `[S-02] Professor can create a post-meeting note and revisit one student's history`
  State: `implemented locally; remote close-out still pending on GitHub and Linear`
  Labels: `type:slice`, `status:ready`, `stream:core-professor-flow`, `north-star`
- `#5` `[S-03] Student can sign in and read only their own supervision history`
  State: `open`
  Labels: `type:slice`, `status:blocked`, `stream:student-visibility`
- `#6` `[S-04] Professor and student can update a shared note without losing continuity`
  State: `open`
  Labels: `type:slice`, `status:blocked`, `stream:shared-follow-up`
- `#7` `[S-05] Professor and student can mark task-like note items complete`
  State: `open`
  Labels: `type:slice`, `status:blocked`, `stream:shared-follow-up`

## Roadmap to GitHub Mapping

- `F-01` -> `#1`
- `F-02` -> `#2`
- `S-01` -> `#3`
- `S-02` -> `#4`
- `S-03` -> `#5`
- `S-04` -> `#6`
- `S-05` -> `#7`

## Automation Scripts

The repo currently contains helper scripts for setting up and importing the GitHub backlog:

- [.tmp-gh-create-roadmap-labels.ps1](C:\Users\olguno5421\Documents\GitHub\10xdev\.tmp-gh-create-roadmap-labels.ps1)
- [.tmp-gh-create-roadmap-milestones.ps1](C:\Users\olguno5421\Documents\GitHub\10xdev\.tmp-gh-create-roadmap-milestones.ps1)
- [.tmp-gh-import-roadmap.ps1](C:\Users\olguno5421\Documents\GitHub\10xdev\.tmp-gh-import-roadmap.ps1)

What they do:

- `create-roadmap-labels`: creates or updates the label taxonomy
- `create-roadmap-milestones`: creates the four roadmap milestones
- `import-roadmap`: creates the initial issue backlog from the roadmap

## Operating Model

The current task-management flow is:

1. Define product scope in [context/foundation/prd.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\prd.md).
2. Convert PRD into implementation sequencing in [context/foundation/roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md).
3. Materialize roadmap items as GitHub Issues.
4. Use labels to track type, readiness, stream, and strategic importance.
5. Use milestones to group issues by delivery phase.

## Current Open Questions from the Roadmap

These are still open at the roadmap level and may affect backlog refinement:

- how to designate the first professor account
- what continuity should mean for note edits in implementation detail
- what the student onboarding path should be
- whether task-like bullets and informational bullets need explicit distinction in the data model

## Reconciliation Note

`F-02` (`professor-bootstrap`) has a local implementation record in [context/changes/professor-bootstrap/change.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-bootstrap\change.md) with `status: implemented`. This document now reflects that local state. If GitHub remains the execution backlog, issue `#2` should be closed or updated to match.

`S-02` (`professor-note-history`) now has a local implementation record in [context/changes/professor-note-history/change.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\change.md) with Phase 1 and Phase 2 complete and Phase 3 close-out in progress. Once the change is fully closed, issue `#4` and the corresponding Linear item should be updated to match.

## Parked Work

These items are intentionally parked and not part of the active MVP backlog:

- password reset completion flow
- app-level error tracking
- custom domain rollout
