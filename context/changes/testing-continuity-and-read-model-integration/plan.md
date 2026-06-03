---
change_id: testing-continuity-and-read-model-integration
title: Testing continuity and read model integration
status: planned
created: 2026-06-03
updated: 2026-06-03
owner: codex
---

# Plan: Testing continuity and read model integration

## Current State Analysis

- The continuity contract is centralized enough to test below the page layer. `getStudentHistory()` and `getLinkedStudentHistoryForUser()` compose student, note, and note-item reads into the shared history model used by both professor and student surfaces: [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).
- Chronology is a real data contract, not just a rendering preference. Notes are loaded by `meeting_date desc`, then `created_at desc`, while note items are loaded by `position asc`: [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).
- `info` / `task` semantics are preserved across the domain contract, API normalization, and SQL schema. The repo already treats that distinction as durable business meaning rather than loose presentation copy: [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts), [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students\[studentId]\notes.ts), [C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql).
- The repo still has no integration-test runner. Phase 1 of the broader rollout introduced Playwright only for browser risk, so this phase should add the thinnest possible integration tooling rather than folding continuity assertions into e2e: [C:\Users\olguno5421\Documents\GitHub\10xdev\package.json](C:\Users\olguno5421\Documents\GitHub\10xdev\package.json), [C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\test-plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\test-plan.md).

## Key Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Primary integration boundary | `src/lib/supervision.ts` read helpers | They are the shared continuity seam for student and professor history views |
| Provider realism | Stubbed Supabase client responses at query-shape level | Cheapest stable signal without needing full DB execution |
| Mandatory edge case | Same `meeting_date`, different `created_at` tie-break | Directly protects the actual chronology contract |
| Hosted drift handling | Keep hosted caveat explicit in cookbook/docs | Local integration green must not imply hosted history is fully verified |
| Cookbook output | Shared read-model integration pattern | Reusable for future continuity and history changes |

## Scope

**In scope**

- add the minimum dedicated integration runner/config needed for one meaningful supervision read-model test
- cover chronology ordering and `info` / `task` semantic preservation at the `supervision.ts` boundary
- verify the tie-break case where notes share a `meeting_date` but differ in `created_at`
- keep hosted drift explicit in local quality guidance once the integration baseline lands

**Out of scope**

- browser rendering tests for note-history pages
- full local Supabase-backed integration or hosted automation
- task completion editing semantics
- note-write route hardening beyond what is necessary to understand continuity contracts

## Architecture / Approach

Phase 1 should introduce a minimal integration test runner and use a stubbed Supabase client that preserves the same query shape the production helper expects. The tests should exercise `getStudentHistory()` and `getLinkedStudentHistoryForUser()` directly, proving that the returned `StudentWithHistory` model preserves newest-first note chronology, stable item ordering, and durable `info` / `task` semantics even when query results contain tie-break conditions. This keeps the tests close enough to the real read model to matter, but far enough from browser rendering to stay cheap and deterministic.

## Phases

### Phase 1: Establish minimal integration tooling and continuity baseline

#### Goal

Add the thinnest runner/config needed for one real read-model integration spec and prove the continuity contract at the shared supervision boundary.

#### Required changes

- **File:** minimal integration runner configuration plus package wiring
  - **Goal:** Introduce the smallest viable setup for repo-local integration tests.
  - **Contract:** Keep the setup intentionally narrow and focused on one integration target. Do not introduce a broad testing platform.

- **File:** new integration test file(s) for `src/lib/supervision.ts`
  - **Goal:** Prove chronology and semantic preservation in the shared read model.
  - **Contract:** Cover at least:
    - notes returned newest-first by `meeting_date`, then `created_at`
    - same-date tie-break ordering by `created_at`
    - items returned lowest-to-highest by `position`
    - `info` and `task` survive unchanged through the read model
    - linked-student lookup returns `null` when no matching record exists

- **File:** tiny test helpers/stubs as needed
  - **Goal:** Preserve realistic Supabase query shape without requiring a live database.
  - **Contract:** Helpers may stub chained query calls, but must not collapse the read model into plain hand-built output objects.

#### Success criteria

#### Automated verification:
- [ ] An integration test command exists and runs locally through the repo script surface
- [ ] At least one supervision read-model integration spec proves chronology and `info` / `task` continuity behavior
- [ ] The same-`meeting_date`, different-`created_at` edge case is covered explicitly

#### Manual verification:
- [ ] The chosen integration boundary feels cheaper and less brittle than browser rendering tests for the same risk
- [ ] The test setup still reflects Supabase-shaped reads rather than plain helper-unit snapshots

### Phase 2: Encode the shared read-model pattern into the cookbook

#### Goal

Make the continuity test layer reusable by documenting how to add new read-model integration checks in this repo.

#### Required changes

- **File:** [C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\test-plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\test-plan.md)
  - **Goal:** Replace the Phase 2 integration placeholders with a concrete continuity/read-model pattern.
  - **Contract:** Document:
    - where integration specs live
    - how the minimal runner is invoked
    - how to stub Supabase query shape without over-mocking continuity logic
    - why hosted smoke remains separate from local continuity integration

- **File:** README or another local verification guide only if the new runner needs local instructions beyond the cookbook
  - **Goal:** Keep the repo-operator path understandable if the integration command needs one extra local step.
  - **Contract:** Do not duplicate the whole cookbook; only add what is needed for reproducible local execution.

#### Success criteria

#### Automated verification:
- [ ] The cookbook no longer leaves the Phase 2 integration path as `TBD`
- [ ] The repo documents how to run the continuity integration check locally

#### Manual verification:
- [ ] A future change author could add another shared read-model integration test by following the cookbook
- [ ] The docs still make it clear that local integration does not replace hosted smoke for remote Supabase drift

## Risks and Mitigations

- **Risk:** The integration test becomes a hand-built snapshot of desired output and stops testing Supabase-shaped composition.
  - **Mitigation:** Stub query chains and realistic row payloads rather than bypassing the helper boundary.

- **Risk:** Browser rendering concerns creep into this phase and make the tests brittle.
  - **Mitigation:** Stay at `supervision.ts` and assert read-model behavior, not page markup.

- **Risk:** Local continuity green creates false confidence about hosted note-history behavior.
  - **Mitigation:** Keep hosted smoke explicit in the cookbook/documentation instead of implying full remote coverage.

## Progress

### Phase 1: Establish minimal integration tooling and continuity baseline

#### Automated Verification:
- [x] 1.1 Add the minimum integration test command/config needed for one real read-model spec
- [x] 1.2 Add a supervision read-model spec covering chronology, tie-break ordering, and `info` / `task` preservation
- [x] 1.3 Keep the runner and helpers intentionally narrow and proportional to the phase

#### Manual Verification:
- [x] 1.4 Confirm the integration boundary is cheaper and less brittle than page-level rendering tests for this risk
- [x] 1.5 Confirm the test setup still exercises Supabase-shaped reads rather than plain output snapshots

### Phase 2: Encode the shared read-model pattern into the cookbook

#### Automated Verification:
- [ ] 2.1 Replace the Phase 2 integration cookbook placeholders with a concrete shared read-model pattern
- [ ] 2.2 Document how to run the local continuity integration check

#### Manual Verification:
- [ ] 2.3 Confirm another change author could add a similar read-model integration test from the cookbook
- [ ] 2.4 Confirm the docs still separate local continuity green from hosted smoke expectations
