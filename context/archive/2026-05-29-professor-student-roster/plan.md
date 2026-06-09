---
change_id: professor-student-roster
title: Professor student roster
status: implemented
created: 2026-05-29
updated: 2026-05-29
owner: codex
---

# Plan: Professor student roster

## Current State Analysis

- The roadmap still positions `S-01` as the roster slice that should follow the foundation work, while `S-03` remains blocked by student-linking and access questions: [roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md).
- `S-02` already turned the professor dashboard into a thin roster-like shell that lists supervised students and links into per-student threads: [dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro), [professor-note-history change](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\change.md).
- The `students` schema already supports professor-owned roster records with `full_name`, optional `email`, and optional `student_profile_id`: [20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql), [database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts).
- Hosted and local RLS appear to allow professor-owned student inserts through a normal authenticated session, but hosted verification showed the remote project can still reject that path with `42501`, so the slice now carries a guarded admin-client fallback similar to the note-write workaround in `S-02`: [20260526215500_enable_supervision_rls.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526215500_enable_supervision_rls.sql), [students.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\api\dashboard\students.ts).
- `src/lib/supervision.ts` centralizes both read-side supervision queries and the roster create helper, which keeps page and route code presentation-oriented: [supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).

## Key Decisions

| Area                   | Decision                                                                                                                                              | Why                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Creation surface       | Inline on the existing professor dashboard                                                                                                            | Extends the current roster shell instead of creating a disconnected flow              |
| Minimum student record | `full_name` required, `email` optional                                                                                                                | Fits the current schema and avoids blocking placeholder roster creation               |
| Editing                | Out of scope                                                                                                                                          | Keeps `S-01` focused on create-and-browse rather than management CRUD                 |
| Roster behavior        | Preserve current list and thread links, add stronger empty/create states                                                                              | Builds on `S-02` instead of replacing it                                              |
| Account linking        | Explicitly out of scope                                                                                                                               | Preserves the blocked boundary around `S-03`                                          |
| Data access shape      | Extend `src/lib/supervision.ts` with student-creation support                                                                                         | Keeps supervision queries and writes in one app-layer module                          |
| Trust model            | Try authenticated session writes first, then fall back to the admin client only after professor/session verification if hosted RLS rejects the insert | Preserves the intended model where possible while keeping the hosted slice functional |

## Scope

**In scope**

- Add professor-owned student creation from the dashboard
- Keep the dashboard as the canonical roster screen
- Preserve existing links from the roster into `/dashboard/students/[studentId]`
- Add app-layer validation for roster creation with the MVP field contract
- Improve empty and success/error states around the roster so the screen feels intentional
- Verify the hosted Supabase project accepts professor-owned student creation, including the documented hosted fallback behavior

**Out of scope**

- Editing or deleting existing students
- Student account linking or `student_profile_id` assignment
- Student-facing roster or thread access
- Search, filtering, or sorting controls beyond the current simple list
- Reworking note history or note creation behavior from `S-02`

## Architecture / Approach

Build `S-01` as an evolution of the current dashboard rather than a new roster subsystem. The dashboard stays the parent professor surface and gains a small creation form plus clearer empty-state messaging. Student creation goes through one controlled app-layer write path that first attempts the authenticated Supabase session client, then falls back to the admin client only after the route has already verified the professor session and hosted Supabase rejects the insert under remote RLS. The professor returns to the same dashboard, where the newly created student appears in the existing list and remains linkable into the note-history thread route from `S-02`. All supervision-domain reads and writes stay in `src/lib/supervision.ts` or adjacent focused helpers so Astro pages remain presentation-oriented.

## Phases

### Phase 1: Roster creation foundation and dashboard contract

#### Goal

Introduce the minimal data-access and route-layer foundation for professor-owned student creation without disturbing the existing `S-02` browse flow.

#### Required changes

- **File:** [src/lib/supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts)
  - **Goal:** Extend the supervision module with create-student support.
  - **Contract:** Add a focused helper for creating one professor-owned student record with the MVP field contract:
    - required `full_name`
    - optional `email`
    - no UI-level support for `student_profile_id`
  - Keep the write path on the authenticated session client and return a small result shape useful to the dashboard.

- **File:** [src/lib/database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
  - **Goal:** Extend typed contracts only if needed for roster form payload/result shapes.
  - **Contract:** Avoid duplicating existing `StudentRow` semantics; add only narrowly scoped helper types if the route/form boundary needs them.

- **File:** new API route or Astro server action under `src/pages/api/` if needed
  - **Goal:** Provide one controlled server-side entry point for student creation.
  - **Contract:** Require an authenticated professor session, validate the MVP payload, create one student owned by the current professor, and avoid expanding into edit/delete behavior.

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Define the roster screen contract that combines creation and browsing.
  - **Contract:** Preserve the existing student list and thread links while making room for a small creation surface and better empty-state guidance.

#### Success criteria

#### Automated verification:

- [x] The supervision layer exposes a focused create-student path rather than page-local insert logic. - 3880af4
- [x] The app has one controlled server-side write path for professor-owned student creation. - 3880af4
- [x] The dashboard remains the canonical roster screen instead of introducing a competing navigation surface. - 3880af4

#### Manual verification:

- [x] A professor can open the dashboard and understand it as the place to add and browse students. - 3880af4
- [x] The existing thread links from the roster remain intact after the creation foundation lands. - 3880af4

### Phase 2: Inline student creation UX and roster polish

#### Goal

Deliver the professor-facing MVP flow: add a student inline on the dashboard and immediately see that record appear in the roster.

#### Required changes

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Add the inline roster-creation UI.
  - **Contract:** The page should include:
    - a required `full_name` input
    - an optional `email` input
    - a clear submit action
    - local success and error feedback
  - Keep the roster view and thread links visible or immediately reachable after submit.

- **File:** new small form component under `src/components/` only if the page logic becomes too dense
  - **Goal:** Isolate interactive roster form behavior if needed.
  - **Contract:** Keep the component tightly scoped to this flow; do not create a broader student-management component system yet.

- **File:** the create-student write path from Phase 1
  - **Goal:** Return stable post-submit behavior.
  - **Contract:** On success, the dashboard should re-render with the new student visible in the list. On failure, the dashboard should show a usable error state without losing the overall roster context.

#### Success criteria

#### Automated verification:

- [x] The dashboard can submit a valid professor-owned student payload with `full_name` and optional `email`. - ab79189
- [x] Invalid payloads are rejected at the app layer without creating partial records. - ab79189
- [x] The roster list still links into the existing student thread route after the UI expansion. - ab79189

#### Manual verification:

- [x] A professor can create a student from the dashboard using only `full_name`. - ab79189
- [x] A professor can create a student from the dashboard with both `full_name` and `email`. - ab79189
- [x] After submit, the newly created student appears in the roster and remains linkable into the existing thread view. - ab79189

### Phase 3: Slice hardening, hosted verification, and close-out

#### Goal

Stabilize the roster slice, verify it against the hosted Supabase project, and complete the tracker/documentation close-out ritual.

#### Required changes

- **File:** [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md) only if manual roster-creation verification needs a meaningful update
  - **Goal:** Keep operator guidance aligned with how the professor roster is validated.
  - **Contract:** Document only material changes, especially if hosted verification has non-obvious expectations.

- **File:** `context/changes/professor-student-roster/change.md`
  - **Goal:** Keep the change artifact current through implementation and review.
  - **Contract:** Move status forward without skipping verification or review milestones.

- **Files:** close-out trackers after implementation completes
  - **Goal:** Apply the established sync rule for backlog mirrors.
  - **Contract:** Update:
    - `context/foundation/tasks-github.md`
    - GitHub issue mirror
    - Linear issue mirror
  - in that order.

#### Success criteria

#### Automated verification:

- [x] `npm run lint` passes. - Phase 3
- [x] `npm run build` passes. - Phase 3
- [x] Change artifacts remain sufficient for `/10x-impl-review`. - Phase 3

#### Manual verification:

- [x] The professor can create students successfully against the hosted Supabase project, not just local assumptions. - Phase 3
- [x] The roster slice still avoids editing, linking, and broader management behavior outside `S-01`. - Phase 3
- [x] Close-out does not leave GitHub or Linear behind the local change state. - GitHub #3 closed, Linear OUN-7 done

## Risks and Mitigations

- **Risk:** `S-01` duplicates or regresses `S-02` by treating the dashboard as disposable.
  - **Mitigation:** Treat the existing dashboard and thread links as fixed integration points and extend them rather than replacing them.

- **Risk:** Student creation accidentally absorbs `S-03` by exposing linking fields or identity-management behavior.
  - **Mitigation:** Keep `student_profile_id` entirely out of the UI and payload contract for this slice.

- **Risk:** Hosted Supabase behavior differs from local assumptions even though the RLS policy looks correct.
  - **Mitigation:** Explicitly verify student creation against the hosted project before calling the slice complete, and document the current guarded fallback.

- **Risk:** The roster UI expands into search/filter/edit affordances that do not materially advance the MVP.
  - **Mitigation:** Hold the scope to create-and-browse only; no editing, no search, no management controls unless a later change asks for them.

## Progress

### Phase 1: Roster creation foundation and dashboard contract

#### Automated Verification:

- [x] 1.1 The supervision layer exposes a focused create-student path for this slice - 3880af4
- [x] 1.2 The app has one controlled server-side write path for professor-owned student creation - 3880af4
- [x] 1.3 The dashboard remains the canonical roster screen after the foundation changes - 3880af4

#### Manual Verification:

- [x] 1.4 A professor can recognize the dashboard as the create-and-browse home for students - 3880af4
- [x] 1.5 Existing thread links still work after the creation foundation lands - 3880af4

### Phase 2: Inline student creation UX and roster polish

#### Automated Verification:

- [x] 2.1 The dashboard submits valid create-student payloads with the MVP field contract - ab79189
- [x] 2.2 Invalid roster submissions are rejected without creating partial records - ab79189
- [x] 2.3 The roster list continues to link into the existing thread route after the UI expansion - ab79189

#### Manual Verification:

- [x] 2.4 A professor can create a student using only `full_name` - ab79189
- [x] 2.5 A professor can create a student using `full_name` plus `email` - ab79189
- [x] 2.6 Newly created students appear in the roster and remain linkable into the existing thread view - ab79189

### Phase 3: Slice hardening, hosted verification, and close-out

#### Automated Verification:

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run build` passes
- [x] 3.3 Change artifacts and close-out trackers are ready for review

#### Manual Verification:

- [x] 3.4 Hosted Supabase accepts professor-owned student creation through the current shipped write path
- [x] 3.5 The delivered slice does not include editing, linking, or broader management behavior
- [x] 3.6 Local and remote backlog mirrors match the final change state
