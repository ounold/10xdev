---
change_id: testing-access-safety-and-critical-flows
title: Testing access safety and critical flows
status: planned
created: 2026-06-01
updated: 2026-06-01
owner: codex
---

# Plan: Testing access safety and critical flows

## Current State Analysis

- The project now has real professor and student product slices, but CI still enforces only `lint` and `build`, so there is no automated protection around role-based routing, hosted auth behavior, or shared-dashboard regressions: [C:\Users\olguno5421\Documents\GitHub\10xdev\.github\workflows\ci.yml](C:\Users\olguno5421\Documents\GitHub\10xdev\.github\workflows\ci.yml).
- The highest-risk auth behavior is concentrated in the shared `/dashboard` route and middleware. Middleware admits only professors and linked students, while `/pending-access` acts as the denial surface for unlinked users: [C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts), [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\pending-access.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\pending-access.astro).
- Student visibility is driven by real identity mapping, not URL parameters. The student dashboard branch resolves the supervised record through `student_profile_id = auth.uid()`, which means the first useful tests must exercise true session state and linking assumptions: [C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro), [C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).
- README already documents that hosted Supabase setup is part of the product contract for this slice: linked and unlinked student verification depends on real hosted accounts, and student linking itself is still out of scope in the UI: [C:\Users\olguno5421\Documents\GitHub\10xdev\README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md).
- There is no existing test runner or suite in `package.json`, so this phase should not turn into broad platform setup. The first durable safety net must stay focused on one meaningful critical-path spec plus an explicit hosted smoke path: [C:\Users\olguno5421\Documents\GitHub\10xdev\package.json](C:\Users\olguno5421\Documents\GitHub\10xdev\package.json).

## Key Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Primary automation surface | Real browser e2e against localhost | The highest-risk behavior depends on redirects, cookies, and route branches rather than isolated helper logic |
| Hosted verification | Keep linked/unlinked hosted smoke explicit and documented | Hosted Supabase mismatch is already a known risk and should remain visible in the rollout |
| Tooling depth | Minimal test-runner setup only if required for one meaningful spec | Prevents Phase 1 from turning into generic infrastructure work |
| Professor regression sentinel | Preserve roster visibility plus thread-entry link | This is the cheapest shared-dashboard regression signal for professor flows |
| Cookbook output | Teach how to add a dashboard role-flow e2e/smoke check | Makes the phase reusable for future auth/access changes |

## Scope

**In scope**

- Introduce the minimum persistent browser-based test tooling needed to express one critical-path dashboard role-flow spec.
- Add browser coverage for the access-denial and access-admission path around `/dashboard`.
- Verify that the shared `/dashboard` surface still preserves the professor roster/thread entry sentinel.
- Document the hosted linked/unlinked smoke path for this phase in the local quality artifacts.
- Update `context/foundation/test-plan.md` cookbook entries relevant to Phase 1 once the implementation lands.

**Out of scope**

- Broad integration-test infrastructure for all server helpers.
- Visual regression coverage beyond what may be needed for a narrow critical-path assertion.
- Full automation of hosted Supabase fixture creation or linkage.
- Coverage for shared-note editing or task completion flows.
- Reworking existing auth architecture or hosted RLS behavior.

## Architecture / Approach

Phase 1 should add the smallest viable browser-based safety net around the shared `/dashboard` seam. The implementation should prefer one dedicated e2e runner only if it is necessary to land a stable spec; otherwise, avoid unnecessary platform sprawl. The first automated spec should prove the most expensive-to-miss path: unauthenticated users are redirected to sign-in, unlinked students are denied into `/pending-access`, linked students reach only the read-only dashboard branch, and professor sessions still retain the roster/thread launch experience. Hosted smoke remains a separate, explicit verification layer because local automation cannot substitute for real Supabase link state in this repo’s current model.

## Phases

### Phase 1: Establish minimal browser test tooling and critical-path spec

#### Goal

Create the thinnest durable automation layer that can express one meaningful access-safety spec without turning the change into generic test-platform work.

#### Required changes

- **File:** test-runner configuration and package wiring only if needed by the chosen tooling
  - **Goal:** Add the minimum dependency/configuration needed to run a browser-level spec locally.
  - **Contract:** Keep the setup intentionally narrow, documented, and aligned with the repo’s existing `npm` workflow. Do not introduce a large multi-runner matrix.

- **File:** new browser test file(s) under a conventional test directory
  - **Goal:** Prove the first critical-path role-flow behavior.
  - **Contract:** Cover at least:
    - unauthenticated request to `/dashboard` redirects to sign-in
    - unlinked student ends on `/pending-access`
    - linked student reaches the read-only dashboard branch
    - professor still sees roster/thread launch behavior

- **File:** any tiny support helpers or fixtures needed for local browser execution
  - **Goal:** Keep the spec readable and repeatable.
  - **Contract:** Helpers may support login/navigation, but must not mock away the real route logic under test.

#### Success criteria

#### Automated verification:
- [ ] A browser-level test command exists and runs locally through the repo’s script surface.
- [ ] At least one critical-path spec covers linked/unlinked/professor role behavior around `/dashboard`.
- [ ] The new automation remains intentionally narrow and does not add unrelated test infrastructure.

#### Manual verification:
- [ ] The spec meaningfully exercises the real access seam rather than only helper logic.
- [ ] The chosen tooling/setup still feels proportional to a first test rollout phase.

### Phase 2: Encode hosted smoke guidance and professor sentinel expectations

#### Goal

Make the first rollout operationally usable by preserving the hosted verification path and the professor regression sentinel in repo documentation.

#### Required changes

- **File:** [C:\Users\olguno5421\Documents\GitHub\10xdev\README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md) or another local verification guide if the flow belongs elsewhere
  - **Goal:** Keep the linked/unlinked hosted smoke path explicit next to the new automated layer.
  - **Contract:** Document:
    - the linked student hosted check
    - the unlinked student hosted check
    - the professor roster/thread sentinel check
  - without pretending hosted fixture prep is fully automated yet.

- **File:** `context/foundation/test-plan.md`
  - **Goal:** Start filling the Phase 1 cookbook instead of leaving it as `TBD`.
  - **Contract:** Add the first concrete pattern for:
    - adding a dashboard role-flow e2e/smoke check
    - running the critical-path spec locally
    - understanding when hosted smoke is still required

#### Success criteria

#### Automated verification:
- [ ] The repo contains the local command and location conventions for the new critical-path e2e spec.
- [ ] The test-plan cookbook is no longer `TBD` for the Phase 1 dashboard role-flow path.

#### Manual verification:
- [ ] A reader can reproduce the linked/unlinked/professor verification story from local docs plus the spec.
- [ ] Hosted smoke still remains explicit rather than being hidden behind local green checks.

## Risks and Mitigations

- **Risk:** Phase 1 expands into full test-platform design before it proves any product-critical behavior.
  - **Mitigation:** Limit tooling to what is required for one meaningful browser-level spec.

- **Risk:** Automated tests overfit to current implementation details in `dashboard.astro`.
  - **Mitigation:** Assert user-visible route and branch behavior, not internal helper structure or incidental markup.

- **Risk:** Local e2e results create false confidence while hosted Supabase linkage still drifts.
  - **Mitigation:** Keep hosted linked/unlinked smoke as an explicit success gate in the same phase.

- **Risk:** Professor flow coverage is too broad for this access-focused phase.
  - **Mitigation:** Use one sentinel only: roster visibility plus thread-entry launch remains intact.

## Progress

### Phase 1: Establish minimal browser test tooling and critical-path spec

#### Automated Verification:
- [x] 1.1 Add the minimum browser test command/config needed for one critical-path spec
- [x] 1.2 Add a spec covering unauthenticated, unlinked student, linked student, and professor sentinel behavior around `/dashboard`
- [x] 1.3 Keep the new automation intentionally narrow and proportional to the phase

#### Manual Verification:
- [x] 1.4 Confirm the spec exercises the real access seam rather than helper-only behavior
- [x] 1.5 Confirm the chosen tooling/setup stays proportional to a first rollout phase

### Phase 2: Encode hosted smoke guidance and professor sentinel expectations

#### Automated Verification:
- [x] 2.1 Record the local command and location convention for the new critical-path spec
- [x] 2.2 Update the Phase 1 cookbook path in `context/foundation/test-plan.md`

#### Manual Verification:
- [x] 2.3 Confirm the linked/unlinked/professor verification path is reproducible from repo docs and the new spec
- [x] 2.4 Confirm hosted smoke remains an explicit gate rather than an implied one
