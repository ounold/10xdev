# Plan Brief: Shared note cross-role visibility E2E

Full plan: [C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\shared-note-cross-role-visibility-e2e\plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\shared-note-cross-role-visibility-e2e\plan.md)

## Starting Point

`S-04` is implemented, and the repo already proves student-side editing plus student-side access guards. The missing evidence is narrower: after a linked student edits a shared note, do we have browser-level proof that the professor sees that updated state in the same thread?

## Key Decisions

| Area          | Choice                                                             | Why                                                    |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Test shape    | One dedicated Playwright spec                                      | Keeps the risk focused and readable                    |
| Auth path     | Reuse repo-local professor + linked-student `storageState`         | Follows repo lessons and avoids fresh credential setup |
| Cleanup       | Restore the original note text in the same spec                    | Prevents fixture drift                                 |
| Success proof | Assert both updated content and `Last edited by` in professor view | Matches the missing `S-04` continuity signal           |

## Scope

**In scope:** add one cross-role spec, reuse existing auth fixtures, document it in `README.md`.

**Out of scope:** product changes, task completion, deletion semantics, roadmap reconciliation.

## Approach

The spec opens one linked-student context and one professor context. The student edits one accessible note, the professor opens that same student thread and verifies the changed text plus continuity metadata, and the student restores the original text before exit.

## Phases

| Phase               | Outcome                         | Key risk                                           |
| ------------------- | ------------------------------- | -------------------------------------------------- |
| 1. Cross-role proof | One green spec plus README note | Shared seeded note drifts if cleanup is incomplete |

**Prerequisites:** repo-local `.auth/user.json` and `.auth/linked-student-olgierd.json` remain available; linked-student metadata exposes `ownStudentId`.
**Estimated effort:** one small implementation/testing pass.

## Success Summary

- The repo gains a browser-level proof that a student edit is visible to the professor in the shared thread.
- The spec stays repo-native by using saved auth state instead of new credentials.
- Shared-note continuity coverage for `S-04` becomes complete enough to reconcile as done.
