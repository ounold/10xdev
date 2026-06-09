# Plan Brief: Student account linking reliability and e2e

Full plan: [context/changes/student-account-linking-reliability-and-e2e/plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-account-linking-reliability-and-e2e/plan.md)

## Starting Point

The product claim flow already works in app code, but its safety still depends on app-layer duplicate blocking and correct null-query semantics. Repo-local Playwright auth states exist in `.auth/`, yet claim-flow browser coverage is still missing and current role smoke tests lean on env-login helpers instead of saved state.

## Key Decisions

| Area                  | Choice                              | Why                                                          | Source |
| --------------------- | ----------------------------------- | ------------------------------------------------------------ | ------ |
| Duplicate handling    | App guard only                      | Avoid migration risk while preserving safe blocking behavior | User   |
| Browser auth          | Saved `storageState` + prep helper  | Stable E2E without signup/login flake or rate limits         | User   |
| First E2E scope       | Happy path + duplicate block        | Covers the core outcome and the highest-risk edge case       | User   |
| Test prep             | Dedicated helper                    | Keeps scenario state deterministic and test-owned            | User   |
| Spec structure        | Separate claim-flow spec            | Reduces coupling with dashboard role smoke                   | User   |
| Reliability follow-up | Claim contract + light roster smoke | Verifies both the app seam and the visible aftermath         | User   |

## Scope

**In scope:** stronger claim-flow contract tests, deterministic Playwright prep, a dedicated claim-flow E2E spec, a light post-claim roster smoke, and docs that point to saved auth state first.

**Out of scope:** DB uniqueness constraints, full auth UI coverage, broad E2E refactors, professor duplicate-resolution tools, and extra pending-access states beyond happy path plus duplicate block.

## Architecture / Approach

Keep the feature as-is and harden confidence around it. Reliability work stays at the app/test layer: lock down duplicate and null-filter behavior in integration tests, then drive a dedicated browser spec from saved auth state plus explicit scenario prep. After a successful claim, add one narrow check that professor-visible roster state still matches expectations.

## Phases At a Glance

| Phase               | Deliverable                                                 | Key risk                                           |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| 1. Contracts + Prep | Stronger claim tests and deterministic E2E state prep       | Fixture setup may drift from real data assumptions |
| 2. Claim E2E        | Separate Playwright spec for happy path and duplicate block | Saved auth state may be missing or stale           |
| 3. Roster + Docs    | Post-claim smoke and clearer verification guidance          | Docs may lag behind the actual test path           |

**Prerequisites:** existing `student-account-linking-flow` remains the source feature; repo-local `.auth/` state is available or can be refreshed intentionally; claim prep can safely target a test-owned student identity.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks and Assumptions

- Saved Playwright state is good enough for at least one student identity used by claim E2E.
- We can prepare duplicate and claim-ready states through a narrow helper without needing schema changes.
- The right follow-up is confidence-building, not a data-model redesign.

## Success Criteria

- Automated: claim-flow integration tests catch duplicate/null regressions, the dedicated Playwright spec passes for happy path and duplicate blocking, and the post-claim roster smoke stays green.
- Manual: a contributor can rerun the documented claim-flow verification path with less rediscovery and without manual `student_profile_id` edits between scenarios.
