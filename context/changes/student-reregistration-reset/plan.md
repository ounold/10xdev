---
change_id: student-reregistration-reset
title: Student re-registration reset
created: 2026-06-11
updated: 2026-06-11
owner: codex
status: planned
linked_prd: context/foundation/prd-v2.md
linked_roadmap: context/foundation/roadmap.md
---

# Plan: Student re-registration reset

## Current State Analysis

- The archived lifecycle contract is already live in the read/write layer: active claim and linked-student reads explicitly filter on `lifecycle = "active"`, so archived rows are already excluded from both claimability and linked dashboard access: [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).
- The blocked-state UX for a previously archived student already exists. When no active match exists and the signed-in account still appears in `archived_student_profile_id`, `/pending-access` explains that a new active student record is required: [src/lib/pending-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/pending-access.ts).
- Professor-side student creation still treats every valid email as a normal roster insert. It does not yet detect "this email already exists in archived history" and therefore cannot provide the requested allow-with-warning guidance before or after creating the fresh active row: [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts), [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro).
- Integration coverage already proves important parts of the reset contract: archived rows do not count as claimable, archived rows do not count as linked access, and duplicate active rows still block claims safely: [tests/integration/student-account-linking-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/student-account-linking-contract.test.ts), [tests/integration/pending-access-view-model.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/pending-access-view-model.test.ts), [tests/integration/supervision-read-model.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/supervision-read-model.test.ts).
- Existing claim-flow E2E focuses on two states only: exactly one prepared active row and duplicate prepared active rows. It does not yet prove the "returning student after archive" path where an archived record with the same email coexists with a new active prepared record: [tests/e2e/student-claim-flow.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/student-claim-flow.spec.ts), [tests/e2e/support/studentClaimFixture.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/support/studentClaimFixture.ts).

## Key Decisions

| Area                                 | Decision                                                                              | Why                                                                                                               | Source |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| Professor re-preparation flow        | Reuse the normal `Add a student` flow with the same email                             | Keeps the MVP operationally simple and avoids inventing a special returning-student workflow                      | Plan   |
| Student claim UX after archive       | Keep the standard claim flow when exactly one new active row exists                   | The product should treat the new active row as the only claimable target, without extra branching for the student | Plan   |
| Professor duplicate-email behavior   | Allow creation of a new active row even when archived history already uses that email | Archived history must not block practical re-onboarding                                                           | Plan   |
| Professor warning behavior           | Show a non-blocking warning both before creation and after success                    | Professor gets clear lifecycle feedback while keeping the flow unblocked                                          | Plan   |
| Duplicate prepared rows after return | Keep the existing `ambiguous-match` block                                             | Safety still matters more than convenience once more than one active prepared row exists                          | Plan   |
| Test gate                            | Require targeted integration coverage plus local E2E                                  | This slice is mostly lifecycle/read-model behavior with one important browser-level returning-student proof       | Plan   |
| Docs cleanup                         | Do not fold roadmap/status reconciliation into this slice                             | Keeps lifecycle reset focused on behavior, not backlog housekeeping                                               | Plan   |

## Scope

**In scope**

- Allow professors to create a fresh active student row for an email that already exists only in archived history
- Surface a non-blocking archived-history warning around professor student creation
- Preserve the current claimability rule that only active prepared rows can be claimed
- Prove that a returning student with one archived row and one fresh active row can claim only the fresh active row
- Preserve the current duplicate-email block when more than one active prepared row exists

**Out of scope**

- New professor-only "returning student" creation surface
- Unarchive or restore flow
- Student-facing special messaging beyond the existing standard claim flow
- Roadmap/status artifact reconciliation
- Hosted smoke as a hard gate for this slice

## Architecture / Approach

Treat `S-03` as a narrow completion slice on top of the already-live archival contract rather than a new access subsystem. The claim and access model should continue to regard only `lifecycle = "active"` rows as eligible for linking or dashboard access, which means the core behavior mostly stays as-is. The real product change is on the professor side: student creation should detect when the submitted email already exists only in archived rows, allow the new active insert, and expose a clear informational warning before and after creation so the professor understands they are preparing a fresh relationship instead of reviving old history. The proof layer then expands the current claim-flow tests to cover the returning-student path explicitly, ensuring that one archived row plus one active prepared row yields a normal claim, while duplicate active prepared rows still block the student.

## Phases

### Phase 1: Add professor-side archived-email re-preparation warnings

#### Goal

Allow fresh active student creation for an archived email while clearly warning the professor that the archived thread remains separate.

#### Required changes

- **File:** [src/pages/api/dashboard/students.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students.ts)
  - **Goal:** Detect whether the submitted email already exists only in archived rows before or during creation.
  - **Contract:** Professor creation must still succeed when archived-only rows match the email, but the redirect payload should carry enough information to render a non-blocking archived-history warning after success.

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts) or a nearby professor-roster helper
  - **Goal:** Expose the smallest reusable lookup for "does this email already exist in archived history?"
  - **Contract:** The helper must not change claimability or linking semantics; it should only support professor creation warnings.

- **File:** [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro)
  - **Goal:** Show the non-blocking archived-email warning around the `Add a student` flow.
  - **Contract:** The page should surface:
    - a pre-submit informational hint when the professor enters an email already known from archived history, if implemented client- or server-assisted
    - a post-success informational banner confirming that a fresh active record was created and archived history stays separate
  - The warning must not block creation and must not appear for unrelated emails.

- **Files:** targeted tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove the professor creation warning contract without changing active creation behavior.
  - **Contract:** Cover at least:
    - archived-only email matches still permit active creation
    - success feedback signals that archived history remains separate
    - duplicate active prepared-row safety remains unchanged

#### Success criteria

#### Automated verification:

- [ ] Professor student creation permits a new active row when the same email exists only in archived history
- [ ] Professor-facing success/warning feedback is emitted for archived-email re-preparation
- [ ] Active creation behavior for ordinary emails remains unchanged

#### Manual verification:

- [ ] A professor can add a new active student with an email that already exists in archived history
- [ ] The professor sees a non-blocking warning before and/or after creation explaining that archived history is still separate

### Phase 2: Prove returning-student claim flow against archived-plus-active data

#### Goal

Show that a returning student can claim only the new active row while archived history remains inaccessible.

#### Required changes

- **Files:** [tests/integration/student-account-linking-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/student-account-linking-contract.test.ts), [tests/integration/pending-access-view-model.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/pending-access-view-model.test.ts), and related support only if needed
  - **Goal:** Close any missing contract-level proof for the exact `US-03` lifecycle combination.
  - **Contract:** Cover at least:
    - one archived row plus one active prepared row yields `claimable`
    - after claim, the user is linked to the fresh active row only
    - one archived row plus two active prepared rows still yields `ambiguous-match`

- **Files:** [tests/e2e/student-claim-flow.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/student-claim-flow.spec.ts) and [tests/e2e/support/studentClaimFixture.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/support/studentClaimFixture.ts)
  - **Goal:** Extend the current browser proof to a real returning-student scenario.
  - **Contract:** Add fixture prep that can create:
    - one archived row plus one active prepared row for the same email
    - one archived row plus duplicate active prepared rows for the same email
  - The spec should prove:
    - the returning student reaches the normal claim flow and lands on `/dashboard?claimReady=1` for the fresh active row
    - duplicate fresh active rows still keep the student blocked on `/pending-access`

#### Success criteria

#### Automated verification:

- [ ] Integration tests prove archived-plus-active claimability behavior for returning students
- [ ] Local E2E proves the returning-student happy path from `/pending-access` into the fresh active dashboard
- [ ] Local E2E proves duplicate fresh active rows still keep the returning student blocked

#### Manual verification:

- [ ] A returning student with one archived row and one fresh active row can claim only the new active record
- [ ] A returning student with duplicate fresh active rows stays blocked until the professor resolves the conflict

### Phase 3: Close verification guidance for the lifecycle loop

#### Goal

Capture the minimum local verification path for professor re-preparation and returning-student claim reset.

#### Required changes

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) or change-scoped verification notes if cleaner
  - **Goal:** Document the local smoke path for the re-registration reset slice.
  - **Contract:** Include:
    - archive a linked student first
    - create a fresh active student row with the same email
    - confirm professor warning feedback
    - sign in as the returning student and claim the new active row
    - confirm archived history still remains inaccessible
    - confirm duplicate fresh active rows still block claim

- **Files:** change artifact updates in [context/changes/student-reregistration-reset/](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-reregistration-reset/)
  - **Goal:** Keep proof aligned with the implemented lifecycle-reset scope.

#### Success criteria

#### Automated verification:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Targeted integration plus local E2E proof pass for returning-student reset

#### Manual verification:

- [ ] Local smoke proves professor re-preparation and returning-student claim reset
- [ ] Hosted smoke remains optional follow-up rather than a hard gate for this slice

## Risks and Mitigations

- **Risk:** The code already partially implements `S-03`, so the slice drifts into redundant refactors instead of closing the real product gap.
  - **Mitigation:** Keep the plan focused on missing professor feedback and explicit archived-plus-active proof only.

- **Risk:** Adding archived-email warnings accidentally blocks valid student creation.
  - **Mitigation:** Treat warnings as informational only and keep creation success semantics unchanged.

- **Risk:** Returning-student fixture prep mutates the wrong professor workspace in E2E.
  - **Mitigation:** Reuse the existing fixture discipline around explicit professor profile ids and repo-local auth metadata.

- **Risk:** Duplicate active prepared rows become easier to create, but the claim flow no longer blocks safely.
  - **Mitigation:** Preserve and retest the existing `ambiguous-match` branch in both integration and E2E layers.

- **Risk:** Hosted Supabase differs from local lifecycle assumptions.
  - **Mitigation:** Keep hosted verification outside the hard gate and rely on the existing lesson: remote migrations must be confirmed before release evidence.

## Progress

### Phase 1: Add professor-side archived-email re-preparation warnings

#### Automated Verification:

- [x] 1.1 Permit professor creation of a fresh active row when the same email exists only in archived history — 9b04692
- [x] 1.2 Emit professor-facing archived-history warning feedback for the reused email — 9b04692
- [x] 1.3 Add targeted integration coverage for archived-email re-preparation behavior — 9b04692

#### Manual Verification:

- [x] 1.4 Confirm a professor can add a new active student with an archived email — 9b04692
- [x] 1.5 Confirm the professor sees the non-blocking archived-history warning — 9b04692

### Phase 2: Prove returning-student claim flow against archived-plus-active data

#### Automated Verification:

- [x] 2.1 Add integration coverage for archived-plus-active returning-student claimability — 70841ff
- [x] 2.2 Extend claim-flow fixture prep for archived-plus-active returning-student states — 70841ff
- [x] 2.3 Add local E2E proof for returning-student happy and duplicate-blocked claim flows — 70841ff

#### Manual Verification:

- [x] 2.4 Confirm a returning student can claim only the fresh active row — 70841ff
- [x] 2.5 Confirm duplicate fresh active rows still keep the returning student blocked — 70841ff

### Phase 3: Close verification guidance for the lifecycle loop

#### Automated Verification:

- [x] 3.1 Run `npm run lint` — a37a763
- [x] 3.2 Run `npm run build` — a37a763
- [x] 3.3 Run targeted integration and local E2E proof for the slice — a37a763

#### Manual Verification:

- [x] 3.4 Record the local smoke path for professor re-preparation plus returning-student claim reset — a37a763
- [x] 3.5 Leave hosted smoke as a follow-up, not a hard gate — a37a763
