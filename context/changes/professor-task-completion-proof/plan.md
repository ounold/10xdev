---
change_id: professor-task-completion-proof
title: Professor task completion proof
status: implementing
created: 2026-06-08
updated: 2026-06-08
owner: codex
---

# Plan: Professor task completion proof

## Current State Analysis

- `S-05` already shipped the shared completion contract, professor/student completion routes, and task-state UI in both thread branches, so this change should add evidence rather than new product behavior: [context/changes/shared-task-completion-flow/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-task-completion-flow/plan.md), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts), [src/pages/api/dashboard/students/[studentId]/notes/[noteId]/items/[itemId]/completion.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/dashboard/students/[studentId]/notes/[noteId]/items/[itemId]/completion.ts), [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro).
- Existing automated coverage already proves the app-layer completion contract plus the linked-student happy path and foreign-task denial path, but there is no browser-level professor happy-path proof to back the phase-2 claims in `S-05`: [tests/integration/task-completion-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/task-completion-contract.test.ts), [tests/e2e/linked-student-task-completion.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/linked-student-task-completion.spec.ts), [tests/e2e/linked-student-foreign-task-completion.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/linked-student-foreign-task-completion.spec.ts).
- The repo already has the right fixture ingredients for a professor-side browser proof: a saved professor `storageState` in `.auth/user.json`, linked-student metadata for resolving owned vs foreign students, and recent specs that locate existing durable note/thread targets instead of hard-coding credentials or ids: [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md), [tests/e2e/support/linkedStudentFixture.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/support/linkedStudentFixture.ts), [tests/e2e/linked-student-foreign-task-completion.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/linked-student-foreign-task-completion.spec.ts).
- Team lessons explicitly prefer repo-local Playwright auth fixtures before asking for fresh credentials, so the proof should stay fixture-first and repo-native: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area             | Decision                                                                            | Why                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Test boundary    | Add one browser-level professor happy-path spec                                     | The missing gap is the shipped professor interaction seam, not app-layer logic                    |
| Target selection | Resolve an existing professor-visible task first; create nothing new by default     | Keeps the proof narrow and avoids broadening setup into note creation coverage                    |
| Assertions       | Require button-state change, success signal, and `Completed by ... on ...` metadata | Matches the phase-2 `S-05` contract instead of proving only half of it                            |
| Scope guard      | Keep this change happy-path only                                                    | The student denial path already exists, so adding professor edge cases here would duplicate value |

## Scope

**In scope**

- add one professor-side Playwright happy-path spec for task completion
- reuse repo-local professor auth state and existing thread/task data where possible
- add only the smallest helper logic needed to resolve an existing professor-visible task target
- update docs only if the current E2E coverage summary would otherwise stay misleading

**Out of scope**

- new completion product behavior
- student-side completion coverage
- professor denial-path or edge-case completion tests
- fixture creation flows that mutate durable notes/tasks unless no existing professor-visible task can be resolved

## Architecture / Approach

Mirror the existing linked-student task-completion E2E style, but drive the professor thread branch instead of the student dashboard branch. Use the saved professor `storageState`, navigate into one accessible student thread, locate an existing `task` item with a completion control, toggle it, assert both the control-state transition and `Completed by ... on ...` metadata, then restore the original completion state before exit so the shared fixture remains reusable. If target resolution truly needs shared helper code, keep it narrowly scoped to professor-visible task lookup rather than introducing a general E2E data-prep layer.

## Phases

### Phase 1: Add the missing professor-side completion proof

#### Goal

Prove at browser level that a professor can toggle completion on an existing shared task and immediately see the promised continuity signal in the thread.

#### Required changes

- **File:** new focused spec under `tests/e2e/`, such as `professor-task-completion.spec.ts`
  - **Goal:** Add one dedicated professor happy-path browser proof for the missing `S-05` evidence gap.
  - **Contract:** The spec should:
    - reuse repo-local professor `storageState`
    - resolve an existing professor-visible student thread and an existing `task` item within it
    - toggle completion in the rendered professor thread UI
    - assert the success signal, button-state transition (`Mark done` / `Reopen task`), and `Completed by ... on ...` metadata
    - restore the starting completion state before finishing
  - Keep the proof happy-path only.

- **File:** shared e2e helper(s) under `tests/e2e/support/` only if required
  - **Goal:** Support stable lookup of one existing professor-visible task target.
  - **Contract:** Extend helpers only for the exact fixture-resolution need this spec has. Prefer reusing existing auth/meta conventions over adding new env-pinned ids.

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) only if needed
  - **Goal:** Keep the documented task-completion E2E pack accurate if the new professor spec changes the recommended local run or coverage summary.
  - **Contract:** Mention the new spec only if it materially changes the current testing guidance.

#### Success criteria

#### Automated verification:

- [ ] One Playwright spec proves professor-side task completion through the shipped thread UI
- [ ] The professor proof asserts success state, control-state transition, and `Completed by ... on ...` metadata
- [ ] The spec restores the original completion state before exit so reruns remain stable

#### Manual verification:

- [ ] The new proof closes the missing professor-side `S-05` evidence gap without duplicating the linked-student scenarios
- [ ] The chosen target-resolution strategy remains repo-native and does not reintroduce credential-heavy setup

## Risks and Mitigations

- **Risk:** The spec widens into task creation or note-edit coverage instead of proving the missing professor seam.
  - **Mitigation:** Prefer resolving an existing task target and treat fallback creation as out of scope for this change.

- **Risk:** The proof becomes brittle because it hard-codes ids or requires fresh credentials.
  - **Mitigation:** Reuse `.auth/user.json` and existing fixture conventions first, per repository lessons.

- **Risk:** The test mutates a shared task and leaves drift behind.
  - **Mitigation:** Capture the starting completion state and always restore it in cleanup.

## Progress

### Phase 1: Add the missing professor-side completion proof

#### Automated Verification:

- [x] 1.1 Add a professor-side Playwright happy-path spec for shared task completion
- [x] 1.2 Reuse repo-local professor auth state and resolve an existing professor-visible task target
- [x] 1.3 Verify the spec asserts state transition, success signal, metadata, and cleanup

#### Manual Verification:

- [x] 1.4 Confirm the proof closes the professor gap in `S-05` rather than duplicating student scenarios by exercising the professor thread branch, while linked-student happy and denial paths remain covered in their own specs
- [x] 1.5 Confirm the setup stays repo-native by preferring `.auth/user.json` and falling back only to existing repo env (`BOOTSTRAP_PROFESSOR_EMAIL`, optional `E2E_FIXTURE_PASSWORD`) instead of introducing new fixed ids
