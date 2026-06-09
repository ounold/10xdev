# Plan Brief: Professor task completion proof

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/professor-task-completion-proof/plan.md)

## Why this exists

`S-05` is implemented, but its automated evidence is asymmetric: the repo proves the shared completion contract and the linked-student browser path, yet still lacks the matching browser proof that a professor can toggle an existing task directly in the shipped thread UI and see the promised continuity metadata.

## Starting point

- Professor completion route and UI already exist in `src/pages/api/dashboard/students/.../completion.ts` and `src/pages/dashboard/students/[studentId].astro`.
- Existing tests already cover app-layer completion semantics plus linked-student happy/denial flows.
- Repo-local professor Playwright state already exists in `.auth/user.json`, so this follow-up should stay fixture-first rather than credential-first.

## Key decisions

| Area       | Choice                                   | Why                                         |
| ---------- | ---------------------------------------- | ------------------------------------------- |
| Boundary   | Browser-level professor UI happy path    | This is the missing shipped seam            |
| Target     | Reuse an existing professor-visible task | Keeps the proof narrow and realistic        |
| Assertions | State change + success signal + metadata | Matches the original `S-05` promise         |
| Scope      | Happy path only                          | Student denial is already covered elsewhere |

## Scope

**In scope:** one professor-side Playwright proof, minimal helper support for target lookup, README touch only if guidance would otherwise stay stale.

**Out of scope:** new product behavior, student scenarios, professor denial/edge-case coverage, env-pinned ids.

## Approach

Add one dedicated Playwright spec that signs in with the saved professor `storageState`, opens an accessible student thread, locates an existing `task` item, toggles completion, asserts `Mark done/Reopen task`, success feedback, and `Completed by ... on ...`, then restores the starting completion state before exit.

## Phase summary

| Phase              | Outcome                                                         | Key risk                                                                 |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Professor proof | Browser-level evidence closes the missing `S-05` professor seam | Test drifts into task-creation/setup work instead of proving the UI seam |

**Prerequisites:** repo-local professor auth state remains available; at least one professor-visible task can be resolved from existing thread data.
**Estimated effort:** small, single-phase follow-up.

## Success signal

- The repo has one stable professor-side E2E completion proof.
- `S-05` coverage becomes role-complete at browser level without broadening fixture setup.
- The spec stays rerunnable because it restores its original completion state.
