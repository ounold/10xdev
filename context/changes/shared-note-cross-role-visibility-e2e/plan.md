---
change_id: shared-note-cross-role-visibility-e2e
title: Shared note cross-role visibility E2E
status: planned
created: 2026-06-08
updated: 2026-06-08
owner: codex
---

# Plan: Shared note cross-role visibility E2E

## Current State Analysis

- `S-04` is already implemented and closed locally, but the current browser coverage stops at the student-side edit proof and student-side access guards: [context/changes/shared-note-continuity-contract/plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\shared-note-continuity-contract\plan.md), [tests/e2e/linked-student-note-edit.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\linked-student-note-edit.spec.ts), [tests/e2e/linked-student-foreign-note-post.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\linked-student-foreign-note-post.spec.ts).
- The professor and linked-student surfaces already render the same note-level continuity metadata (`Last edited by ... on ...`) from the shared read model, so the missing risk is not implementation absence but missing browser-level proof across roles: [src/pages/dashboard/students/[studentId].astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard\students[studentId].astro), [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro).
- The repo already carries reusable Playwright auth states for both roles, plus linked-student metadata that can resolve the owned student id without fresh credentials: [tests/e2e/support/linkedStudentFixture.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\support\linkedStudentFixture.ts), [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md).
- Existing foreign-thread and foreign-note specs already show the accepted cross-role testing pattern in this repo: one student state, one professor state, and cleanup when the spec mutates durable note data: [tests/e2e/linked-student-foreign-task-completion.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\linked-student-foreign-task-completion.spec.ts), [tests/e2e/linked-student-note-append.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\linked-student-note-append.spec.ts).

## Key Decisions

| Area              | Decision                                                                                                 | Why                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Test boundary     | Add one dedicated Playwright spec for the cross-role continuity proof                                    | The risk lives across auth, routing, write path, and professor re-read, so browser coverage is the right tool |
| Auth setup        | Reuse repo-local linked-student and professor `storageState` fixtures by default                         | Matches repo lessons and avoids reintroducing credential friction                                             |
| Mutation strategy | Edit one existing linked-student note, then restore the original text in the same run                    | Keeps the proof realistic while leaving the shared thread stable after the spec                               |
| Assertions        | Require both professor-visible content change and professor-visible `Last edited by` continuity metadata | That is the concrete product proof missing from current S-04 evidence                                         |

## Scope

**In scope**

- add a focused E2E spec for student edit -> professor sees updated shared note
- reuse existing auth fixtures and linked-student metadata
- keep the spec self-cleaning by restoring the edited note content
- document the new coverage briefly in `README.md`

**Out of scope**

- new product behavior for note editing
- task completion, deletion, or conflict-resolution scenarios
- broader roadmap reconciliation for `S-04`

## Architecture / Approach

Run two isolated browser contexts in one spec: a linked-student context edits one accessible note through the shipped student route, then a professor context opens the same student thread and confirms the updated content plus note-level continuity metadata. Restore the original text through the same student flow before the spec ends so the shared fixture remains reusable.

## Phases

### Phase 1: Add the missing cross-role continuity proof

#### Goal

Prove at browser level that a linked-student edit becomes visible to the professor in the same shared thread.

#### Required changes

- **File:** [tests/e2e/shared-note-cross-role-visibility.spec.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\e2e\shared-note-cross-role-visibility.spec.ts)
  - **Goal:** Add one dedicated spec for the missing S-04 cross-role proof.
  - **Contract:** Reuse linked-student and professor `storageState`, derive the student id from linked-student fixture metadata, edit an existing note as the student, assert the professor sees the changed text and continuity metadata, then restore the original text before exit.

- **File:** [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md)
  - **Goal:** Keep the documented shared-note continuity E2E pack accurate.
  - **Contract:** Mention the new spec and what specific S-04 risk it protects.

#### Success criteria

#### Automated verification:

- [x] A dedicated spec proves student edit -> professor visibility for one shared note
- [x] The spec uses repo-local auth fixtures and does not require fresh credentials when those fixtures exist
- [x] The spec restores the edited note content before finishing

#### Manual verification:

- [x] The browser-level proof clearly closes the remaining S-04 evidence gap rather than duplicating an existing student-only test

## Risks and Mitigations

- **Risk:** The spec mutates a shared seeded note and leaves drift behind.
  - **Mitigation:** Capture original content first and restore it in `finally`.

- **Risk:** The professor assertion accidentally targets a different student thread.
  - **Mitigation:** Resolve the owned student id from linked-student fixture metadata and navigate the professor directly to that thread.

## Progress

### Phase 1: Add the missing cross-role continuity proof

#### Automated Verification:

- [x] 1.1 Add a dedicated cross-role Playwright spec for the shared-note continuity proof
- [x] 1.2 Update README coverage notes for the new S-04 browser check
- [x] 1.3 Run the targeted spec green with repo-local auth fixtures

#### Manual Verification:

- [x] 1.4 Confirm the new spec closes the professor-visible continuity gap for S-04
