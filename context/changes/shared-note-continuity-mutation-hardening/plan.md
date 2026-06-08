---
change_id: shared-note-continuity-mutation-hardening
title: Shared note continuity mutation hardening
status: planned
created: 2026-06-08
updated: 2026-06-08
owner: codex
---

# Plan: Shared note continuity mutation hardening

## Current State Analysis

- The current mutation suite targets only `src/lib/supervision.ts`, so `S-04` hardening should focus on the shared note update seam rather than the new Playwright proof: [stryker.config.mjs](C:\Users\olguno5421\Documents\GitHub\10xdev\stryker.config.mjs).
- The highest-value `S-04` survivors cluster around `updateStudentNote()` and its ordering helpers: foreign item rejection, no-append behavior, returned item sorting, and mutation-error propagation in the shared note update path: [src/lib/supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).
- Existing integration coverage already proves the happy path, immutable meeting-date guard, and one foreign-item rejection case, but it does not distinguish mixed valid/foreign edits, edit-only-without-append, or out-of-order reloaded items strongly enough to kill those mutants: [tests/integration/supervision-update-contract.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-update-contract.test.ts).
- The shared read model already treats ordering as a continuity invariant, so using intentionally unsorted stub data after update is consistent with the repo’s continuity contract: [tests/integration/supervision-read-model.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-read-model.test.ts).

## Key Decisions

| Area                  | Decision                                                                                     | Why                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Scope                 | Target only `S-04`-relevant mutation survivors in `updateStudentNote()` and helper ordering  | Keeps this change narrow and product-relevant                              |
| Test layer            | Use integration tests against the existing Supabase stub, not E2E                            | The survivors live in app-layer logic and persistence-shaped branches      |
| Priority order        | Kill mixed foreign-item guard, no-append branch, and returned ordering first                 | These are the highest-signal continuity invariants for shared note editing |
| Failure-path coverage | Add only the smallest useful persistence-error test if needed after the core invariant tests | Avoid overgrowing the change into generic error-formatting coverage        |

## Scope

**In scope**

- strengthen `tests/integration/supervision-update-contract.test.ts`
- add tests for mixed valid/foreign item rejection, edit-only-without-append, and post-update ordering
- rerun targeted integration and mutation verification for `src/lib/supervision.ts`

**Out of scope**

- new product behavior for shared note editing
- broader mutation cleanup for account linking, roster summaries, or generic error formatting
- new browser-level tests

## Architecture / Approach

Keep the production code unchanged unless a test reveals a real defect. Expand the existing update-contract integration suite so the Supabase stub drives `updateStudentNote()` through the branches currently surviving mutation: a mixed valid/invalid `existing_items` payload, a pure in-place edit with `new_items: []`, and a returned `latestItems` sequence that is intentionally out of order but must be normalized by the continuity helper.

## Phases

### Phase 1: Kill the highest-value S-04 mutation survivors

#### Goal

Make the shared note continuity integration suite strong enough to kill the current `S-04`-relevant mutation survivors.

#### Required changes

- **File:** [tests/integration/supervision-update-contract.test.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\supervision-update-contract.test.ts)
  - **Goal:** Add the smallest set of extra tests that directly target the surviving `updateStudentNote()` mutants.
  - **Contract:** Cover:
    - mixed valid + foreign `existing_items` rejection
    - edit-only updates with `new_items: []` and unchanged returned ids/positions
    - out-of-order reloaded note items still returned in position order

- **File:** [tests/integration/support/supabaseStub.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\tests\integration\support\supabaseStub.ts) only if required
  - **Goal:** Support the exact mutation-shape assertions needed by the new tests.
  - **Contract:** Extend the stub narrowly and only if the current shape cannot express the needed reordered or non-appending update behavior.

#### Success criteria

#### Automated verification:

- [x] Additional integration tests target the top S-04 mutation survivors directly
- [x] `vitest` stays green for the updated update-contract suite
- [x] Re-running mutation testing shows the targeted S-04 survivors reduced

#### Manual verification:

- [x] The new tests still read like continuity-contract proofs, not stub-implementation snapshots

## Progress

### Phase 1: Kill the highest-value S-04 mutation survivors

#### Automated Verification:

- [x] 1.1 Add integration coverage for mixed valid-plus-foreign shared-note updates
- [x] 1.2 Add integration coverage for edit-only updates without appended items
- [x] 1.3 Add integration coverage for returned item ordering after update reload
- [x] 1.4 Run targeted integration and mutation verification for the shared note update seam
- [x] 1.6 Add narrow third-pass coverage for note lookup failure, note-item reload failure, inaccessible note scope, and sparse append positioning
- [x] 1.7 Re-run mutation testing after the third pass and confirm the S-04 slice improves again (`52.85%` -> `54.92%`, `81` -> `79` survivors)

#### Manual Verification:

- [x] 1.5 Confirm the new tests reflect S-04 continuity invariants rather than generic helper behavior
