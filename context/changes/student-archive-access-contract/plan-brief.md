---
change_id: student-archive-access-contract
title: Student archive access contract
source_plan: context/changes/student-archive-access-contract/plan.md
generated: 2026-06-09
status: planned
---

# Plan Brief: Student archive access contract

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-archive-access-contract/plan.md)

## Starting Point

The app already supports active professor/student supervision, task completion, and student account linking, but it has no notion of an archived student lifecycle. Today a row is effectively active as long as it exists, because access control, helper lookups, and claimability all depend on `student_profile_id`, professor ownership, and email matching alone.

## Key Decisions

| Area                 | Selected option                                            | Main rationale                                                        | Source |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| Lifecycle model      | Explicit student status plus optional `archived_at`        | Makes archival domain-visible and easier to enforce consistently      | User   |
| Active link handling | Clear `student_profile_id` on archive                      | Ensures immediate access revocation                                   | User   |
| Historical identity  | Preserve previous linked profile separately                | Keeps a historical trail without leaving an active access path        | User   |
| Contract scope       | Full access contract in the foundation                     | Later slices need safe truth, not UI-only semantics                   | User   |
| Existing data        | Default all current rows to active                         | Lowest rollout risk                                                   | User   |
| Blocked-state UX     | Reuse `pending-access` for archived former students        | Extends the current safe blocked path instead of creating a new route | User   |
| Professor seam       | Prepare active/archive helper split, but no archive UI yet | Keeps this change foundational rather than feature-heavy              | User   |

## Scope

**In scope:** schema lifecycle fields, RLS/access helper updates, app helper lifecycle awareness, claimability exclusion for archived rows, middleware and pending-access alignment, integration proof, and manual smoke guidance.

**Out of scope:** professor archive button, archive roster UI, archived-thread presentation, re-registration UI, restore/unarchive flow, and archive reason management.

## Architecture / Approach

The database becomes the source of truth for archival. `students` gains an explicit active-vs-archived lifecycle plus optional archive timestamp and a dedicated historical-profile field. RLS then grants professors access to owned active and archived rows, while student access works only for active linked rows. Application helpers follow that same rule: linked-student lookup ignores archived rows, claimability treats archived rows as historical only, and middleware/pending-access reuse the existing blocked-state route for former students who no longer have an active assignment.

## Phases at a Glance

| Phase                  | What it delivers                                                     | Key risk                                                                            |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1. DB contract         | Lifecycle fields, historical-link storage, RLS updates               | Hidden access regressions if archive is not enforced at the source of truth         |
| 2. App seam            | Active/archive-aware helper and claimability logic                   | Mixing archived records back into active reads by accident                          |
| 3. Access UX alignment | Middleware and pending-access semantics for archived former students | Copy or redirects still implying a broken flow instead of an expected blocked state |

**Prerequisites:** hosted Supabase migrations must be applied before release verification; any manual smoke should verify both active and archived user states.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks and Assumptions

- The historical profile trace is needed for safety/audit value, but must never participate in active access checks.
- Existing rows are assumed to remain active after migration; no automatic archival inference is planned.
- Re-registration support depends on archived rows being excluded from claimability now, even though the future UI for that path ships later.

## Success Criteria Summary

- Archived students immediately lose dashboard and thread access through both data and app-level checks.
- Professor-owned historical rows remain readable and ready for later archive UI slices.
- Active students and current claim flows continue to work without regressions after the lifecycle contract lands.
