---
change_id: student-account-linking-flow
title: Student account linking flow
source_plan: context/changes/student-account-linking-flow/plan.md
generated: 2026-06-05
status: planned
---

# Plan Brief: Student account linking flow

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-account-linking-flow/plan.md)

## Starting Point

The app already has a working linked-student dashboard flow, but it still depends on manual database linkage through `students.student_profile_id`. Professors can already create student rows with optional email, `pending-access` already catches unlinked student accounts safely, and middleware/dashboard behavior becomes correct automatically once a real link exists.

## Key Decisions

| Area                 | Selected option                                             | Main rationale                                                           | Source          |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| Claim model          | Automatic claim by signed-in email against one unlinked row | Reuses existing `students.email` and current linked-student access model | User + Research |
| Duplicate matches    | Block claim and show conflict                               | Prevents linking the wrong student record                                | User            |
| UX surface           | Claim from `pending-access`                                 | Keeps auth generic and uses the existing safety gate                     | User            |
| Professor visibility | Lightweight roster linking status                           | Helps diagnose onboarding without opening full account management        | User            |
| Recovery             | Relink/unlink out of scope                                  | Keeps first slice narrow and low risk                                    | User            |

## Scope

**In scope:** student self-claim by signed-in email, dedicated claim route, actionable `pending-access`, lightweight professor-visible linking status, and updated verification docs.

**Out of scope:** relink/unlink tools, invite tokens, auth-flow redesign, and broader account management.

## Architecture / Approach

Keep Supabase Auth as identity and `students` as the professor-owned domain record. An unlinked student still lands on `pending-access`, but the page now asks the server whether the signed-in email maps to exactly one unlinked student row. If yes, the student can submit a dedicated claim action that validates the session, re-checks claimability, and links `student_profile_id` through the admin client. Once linked, existing middleware and dashboard logic already carry the user into the student branch. The professor roster gains a compact linking-status hint only.

## Phases at a Glance

| Phase               | What it delivers                                           | Key risk                              |
| ------------------- | ---------------------------------------------------------- | ------------------------------------- |
| 1. Claim contract   | Claimability rules, narrow route, integration coverage     | Wrong-row linking from ambiguous data |
| 2. Student claim UX | Actionable `pending-access` and redirect into `/dashboard` | Confusing blocked-state UX            |
| 3. Operator loop    | Professor roster status + updated docs/verification        | Scope creep into account management   |

**Prerequisites:** existing student rows should carry email when they are meant to be claimable; hosted Supabase must receive any new schema/RLS changes before release.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks and Assumptions

- Duplicate claimable emails are treated as invalid data and blocked rather than auto-resolved.
- The first slice assumes server-side admin-client linking is acceptable, instead of redesigning RLS immediately.
- Professor-visible status should stay informational only; adding relink controls would materially enlarge scope.

## Success Criteria Summary

- An unlinked signed-in student with one matching email can claim access and then reach the existing student dashboard.
- Ambiguous or missing matches stay blocked safely and clearly.
- Professors can tell whether a student is linked, claimable-by-email, or still missing an email anchor without opening a new management workflow.
