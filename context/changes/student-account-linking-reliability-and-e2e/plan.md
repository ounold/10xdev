---
change_id: student-account-linking-reliability-and-e2e
title: Student account linking reliability and e2e
status: planned
created: 2026-06-06
updated: 2026-06-06
owner: codex
---

# Plan: Student account linking reliability and e2e

## Current State Analysis

- The student claim flow is already in production code: `pending-access` asks the server for claimability and posts to a narrow claim route that links exactly one matching row, then redirects to `/dashboard?claimReady=1`: [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro), [src/pages/api/student/claim-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/student/claim-access.ts).
- The biggest reliability risk is no longer missing functionality, but bad source data. `students.email` can still exist in duplicate unlinked rows, so safety currently depends on app-layer blocking rather than database invariants: [context/changes/student-account-linking-flow/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-account-linking-flow/plan.md).
- A hosted Supabase mismatch already exposed one concrete failure mode: `.eq("student_profile_id", null)` caused a UUID syntax error remotely, and the fix was to use `.is(..., null)`. That makes contract-level regression coverage especially valuable here: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).
- Playwright is present and repo-local auth fixtures already exist under `.auth/`, but the current role smoke spec still depends on env-based login helpers instead of `storageState`, so the claim flow has no stable browser-level path yet: [tests/e2e/dashboard-role-flow.spec.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/dashboard-role-flow.spec.ts), [playwright.config.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/playwright.config.ts), [tests/e2e/support/env.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/e2e/support/env.ts).
- Previous project lessons now explicitly require checking repo-local Playwright auth fixtures before assuming E2E is blocked on missing credentials, so this follow-up should encode that rule into tests and docs rather than relying on memory: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area                  | Decision                                                                     | Why                                                                               | Source      |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------- |
| Duplicate protection  | Keep reliability in the app layer instead of adding a new DB uniqueness rule | Avoids risky migration work while still defending the unsafe state explicitly     | User choice |
| E2E auth model        | Use saved Playwright state plus explicit test-data preparation               | Matches repo reality and avoids flaky signup/login/rate-limit dependencies        | User choice |
| E2E scope             | Cover happy-path claim and duplicate-email blocking first                    | Protects the highest-value flow and the highest-risk ambiguity edge case          | User choice |
| Test fixture strategy | Add a dedicated helper or seed path for claim-ready and duplicate states     | Keeps E2E deterministic instead of mutating shared seed data ad hoc               | User choice |
| Spec layout           | Add a separate claim-flow spec instead of extending role-flow smoke tests    | Keeps responsibilities clear and reduces coupling with unrelated dashboard checks | User choice |
| Reliability follow-up | Add contract/integration coverage plus a light roster smoke after claim      | Verifies the app seam and the most important post-claim professor signal          | User choice |

## Scope

**In scope**

- Strengthen claim-flow app-layer regression coverage around null handling, duplicate matching, and post-claim state
- Add a dedicated Playwright spec for student claim flow using repo-local auth state and controlled data prep
- Add a minimal helper/setup path that can prepare one claim-ready student row and one duplicate-email blocked case
- Add a small smoke assertion that professor-facing roster status still reflects the expected linked/claimable outcome after claim
- Update change/docs guidance so future E2E work reuses saved Playwright states before asking for credentials

**Out of scope**

- New database uniqueness constraints or data-cleanup migrations for `students.email`
- Full auth UI coverage for signup/signin in Playwright
- Broad refactoring of all existing E2E specs onto `storageState`
- Professor tools for resolving duplicate rows
- Additional pending-access states beyond happy path and duplicate block in this slice

## Architecture / Approach

Treat this as a reliability-and-verification slice, not a new product feature. Keep the production claim flow mostly intact, but harden its contracts with targeted integration assertions around claimability and linking semantics, especially the unsafe duplicate and null-filtering boundaries that already caused remote surprises. For browser coverage, create a dedicated Playwright spec that starts from known auth state, uses a narrow prep helper to place test data into one of two deterministic states, and then verifies the real `pending-access -> claim -> dashboard` path plus the blocked duplicate branch. Keep roster validation lightweight: after a successful claim, assert the professor-visible status remains coherent rather than building a full professor management flow.

## Phases

### Phase 1: Harden claim contracts and fixture-prep seams

#### Goal

Make the claim flow safer to change by locking down its app-layer invariants and introducing deterministic E2E data prep.

#### Required changes

- **File:** [tests/integration/student-account-linking-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/student-account-linking-contract.test.ts) and related claim-flow integration suites
  - **Goal:** Extend the existing contract tests to cover the reliability edges most likely to regress.
  - **Contract:** Add focused cases for:
    - unlinked-row null filtering via `.is(..., null)` semantics
    - duplicate-match blocking without partial linking
    - post-claim state changing from claimable to linked/non-claimable
    - claim mutations updating only the intended row

- **File:** new or existing E2E support helper under `tests/e2e/support/`
  - **Goal:** Create a deterministic prep seam for claim-flow states.
  - **Contract:** Provide a small helper that can prepare:
    - exactly one claim-ready student row for a known student identity
    - a duplicate-email blocked state for the same or a dedicated identity
  - Keep it explicit and test-owned rather than mutating shared seed data inline inside specs.

- **File:** docs/reference material tied to the claim flow if needed
  - **Goal:** Capture the repo rule that saved Playwright auth state is the first browser-verification path here.
  - **Contract:** Make the fixture expectation discoverable from the local testing docs or change brief so future work does not fall back to missing-credential assumptions.

#### Success criteria

#### Automated verification:

- [ ] Integration tests fail if claim queries regress from `.is(..., null)` semantics or allow ambiguous linking
- [ ] A deterministic helper can prepare claim-ready and duplicate test states without manual DB edits

#### Manual verification:

- [ ] A teammate can identify the supported prep path for claim E2E without rediscovering auth-state rules manually

### Phase 2: Add dedicated claim-flow Playwright coverage

#### Goal

Exercise the real browser claim journey with repo-native fixtures, covering both safe linking and safe blocking.

#### Required changes

- **File:** new dedicated spec under `tests/e2e/`
  - **Goal:** Add claim-flow E2E without overloading the existing dashboard role smoke.
  - **Contract:** Cover exactly:
    - a happy-path student claim from `pending-access` to `/dashboard?claimReady=1`
    - a duplicate-email case that stays on `pending-access` with the blocked-state message
  - Use accessible locators only (`getByRole`, `getByText`, `getByLabel`) and no `waitForTimeout()`.

- **File:** Playwright support/auth configuration as needed
  - **Goal:** Wire the spec to saved auth state and the new prep helper cleanly.
  - **Contract:** The new spec should prefer repo-local `storageState` for the student session and only fall back to env-driven login if the repo truly lacks a suitable state for that scenario.

- **File:** optional narrow page copy or selectors only if E2E reveals ambiguous UI anchors
  - **Goal:** Keep the UI testable through accessibility-first locators.
  - **Contract:** Any production UI tweak should improve clarity, not add test-only hooks unless accessibility signals are genuinely insufficient.

#### Success criteria

#### Automated verification:

- [ ] A dedicated Playwright spec passes for happy-path claim and duplicate blocking
- [ ] The spec relies on deterministic prep plus repo-local auth state instead of full signup/login flows

#### Manual verification:

- [ ] A human can rerun the same claim-flow browser checks locally without editing Supabase rows by hand between scenarios

### Phase 3: Verify post-claim roster coherence and document the E2E path

#### Goal

Close the loop so both operators and future contributors can trust the claim flow and know how to verify it.

#### Required changes

- **File:** light roster smoke coverage in integration or E2E, depending on best fit
  - **Goal:** Confirm claim results remain visible in the professor-facing student list.
  - **Contract:** Add one narrow assertion that a successful claim still yields the expected professor-visible status, without expanding into broad professor workflow coverage.

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md), [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md), or adjacent test docs as needed
  - **Goal:** Record the stable verification route for this repo.
  - **Contract:** Document:
    - where saved auth state lives
    - how claim-flow prep is expected to run
    - that claim-flow E2E should start from repo fixtures before requesting fresh credentials

#### Success criteria

#### Automated verification:

- [ ] Post-claim roster smoke remains green alongside the new claim-flow coverage
- [ ] Documentation points future contributors to the saved-state-plus-prep workflow
- [ ] Required repo gates for the touched area pass

#### Manual verification:

- [ ] A contributor can follow the documented route to run claim-flow verification with less rediscovery than the previous cycle

## Risks and Mitigations

- **Risk:** E2E prep silently mutates shared hosted or seeded data and makes later tests flaky.
  - **Mitigation:** Keep prep explicit, narrow, and owned by the claim-flow spec instead of relying on incidental seed state.

- **Risk:** Saved auth state drifts or becomes invalid, making the new browser spec brittle.
  - **Mitigation:** Keep the state contract documented and isolate the spec so re-recording one student fixture does not ripple through all role tests.

- **Risk:** Reliability work grows into schema redesign.
  - **Mitigation:** Hold the line on app-layer guards only; database constraints stay explicitly out of scope.

- **Risk:** The browser spec passes while the professor-facing aftermath is still inconsistent.
  - **Mitigation:** Add one lightweight post-claim roster smoke rather than treating the claim redirect as the only success signal.

## Progress

### Phase 1: Harden claim contracts and fixture-prep seams

#### Automated Verification:

- [x] 1.1 Extend claim-flow integration coverage for null filtering, duplicate blocking, and post-claim state changes — 105b89e
- [x] 1.2 Add a deterministic E2E prep helper for claim-ready and duplicate states — 105b89e

#### Manual Verification:

- [x] 1.3 Confirm the fixture-prep path is understandable without manual DB rediscovery — 105b89e

### Phase 2: Add dedicated claim-flow Playwright coverage

#### Automated Verification:

- [x] 2.1 Add a separate claim-flow Playwright spec using repo-local auth state — 2502a08
- [x] 2.2 Cover happy-path claim redirect to `/dashboard?claimReady=1` — 2502a08
- [x] 2.3 Cover duplicate-email blocking on `pending-access` — 2502a08

#### Manual Verification:

- [x] 2.4 Rerun the same browser checks locally without hand-editing claim rows between cases — 2502a08

### Phase 3: Verify post-claim roster coherence and document the E2E path

#### Automated Verification:

- [x] 3.1 Add a light smoke for professor-visible roster state after claim
- [x] 3.2 Update repo docs/lessons to point future contributors at saved-state-plus-prep verification
- [x] 3.3 Run the required repo verification for the touched area

#### Manual Verification:

- [x] 3.4 Follow the documented claim-flow verification path end to end as a sanity check
