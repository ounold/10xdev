---
change_id: student-read-history
title: Student read history
status: planned
created: 2026-05-29
updated: 2026-05-29
owner: codex
---

# Plan: Student read history

## Current State Analysis

- The roadmap still marks `S-03` as blocked, but the original blockers have narrowed now that `S-01` and `S-02` are complete: the remaining real question is the first safe student-facing entry model, not whether the history domain exists at all: [roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md).
- The data model already supports student identity mapping through `students.student_profile_id`, and RLS already uses that link in `can_access_student()`: [20260526213000_create_supervision_domain.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526213000_create_supervision_domain.sql), [20260526215500_enable_supervision_rls.sql](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\migrations\20260526215500_enable_supervision_rls.sql).
- Middleware already knows whether the current signed-in user is a linked student through `isLinkedStudent`, but it still routes every non-professor away from `/dashboard` into `pending-access`: [middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts), [profile.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\profile.ts).
- The current `pending-access` page is already role-aware enough to distinguish linked students in copy, which makes it a good transition point for tightening unlinked-student behavior without inventing a second temporary surface: [pending-access.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\pending-access.astro).
- The professor dashboard and supervision helpers already contain the note-history read path we need conceptually, but that path is professor-oriented and currently renders professor controls plus professor framing: [dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro), [supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts).

## Key Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Student linking | Out of scope for the UI; consume already-linked records only | Keeps `S-03` read-focused and avoids risky identity-management drift |
| Landing route | Reuse `/dashboard` with role-based rendering | Matches your chosen IA and avoids a separate top-level student route |
| Student scope | Read-only chronological history with clear `info` / `task` distinction | Fulfills the PRD promise without drifting into `S-05` |
| Unlinked behavior | Keep unlinked students on `pending-access` with clearer copy | Preserves the existing safety gate while improving clarity |
| Verification focus | One linked hosted student account | Validates the real boundary that matters most: link + routing + read-only access |
| Data access shape | Extend supervision helpers with a student-safe read path | Avoids duplicating note-history queries across role-specific pages |
| Dashboard architecture | One protected route, two role-specific render branches | Keeps routing simple while still separating professor and student UI contracts |

## Scope

**In scope**

- Allow linked student accounts to enter `/dashboard` instead of being forced to `pending-access`
- Render a student-specific, read-only dashboard branch for linked students
- Load only the signed-in student's own history through the existing domain model
- Show chronological note history with visible distinction between informational items and task items
- Keep unlinked students on `pending-access` with clearer explanation
- Verify hosted role-aware routing and student-only read access with one linked student account

**Out of scope**

- Student self-linking or self-claim flows
- Student profile linking UI for professors
- Student editing of notes or task completion
- Shared collaboration behaviors from `S-04` and `S-05`
- Roster or multi-student navigation for students

## Architecture / Approach

Build `S-03` as a role-aware extension of the existing protected `/dashboard` route. Middleware should continue to own the top-level access decision, but it should stop treating linked students as generic pending users. Instead, authenticated linked students should be allowed through to `/dashboard`, where the page renders a dedicated student-facing branch rather than the professor roster shell. That student branch should load exactly one student record tied to `student_profile_id = auth.uid()` and display read-only chronological note history, using the same underlying domain tables while keeping presentation and permissions separate from the professor flow. Unlinked students should remain on `pending-access`, with copy that makes the “linked vs not yet linked” state explicit.

## Phases

### Phase 1: Role-aware routing and student history read model

#### Goal

Open a safe path for linked students to reach the protected app surface without exposing professor content.

#### Required changes

- **File:** [src/middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts)
  - **Goal:** Differentiate linked students from generic pending users in protected-route handling.
  - **Contract:** `/dashboard` should allow:
    - professors through to the professor dashboard branch
    - linked students through to the student dashboard branch
    - unlinked/non-professor users to remain on `pending-access`

- **File:** [src/lib/supervision.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supervision.ts)
  - **Goal:** Add a student-safe read helper.
  - **Contract:** Expose a read path that loads the currently linked student's record and chronological note history without relying on professor ids or professor-oriented route params.

- **File:** [src/lib/database.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\database.ts)
  - **Goal:** Extend typed shapes only if the student read model needs narrower presentation contracts.
  - **Contract:** Avoid duplicating existing note/student row semantics; only add role-specific view-model types if they materially simplify the dashboard split.

- **File:** [src/pages/pending-access.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\pending-access.astro)
  - **Goal:** Make the unlinked-student state easier to understand while `S-03` only serves already-linked records.
  - **Contract:** Copy should clearly distinguish:
    - linked students who will now have access elsewhere
    - unlinked accounts still waiting for linkage

#### Success criteria

#### Automated verification:
- [ ] Middleware allows linked students through to the protected dashboard route without granting professor access.
- [ ] The supervision layer exposes a student-safe history read helper instead of reusing professor-only route assumptions.
- [ ] Unlinked students still resolve to `pending-access`.

#### Manual verification:
- [ ] A linked student account reaches `/dashboard`.
- [ ] An unlinked student account still lands on `pending-access`.

### Phase 2: Student-facing dashboard branch and read-only history UI

#### Goal

Deliver the first student-facing experience: read only your own supervision history in a clear, role-appropriate view.

#### Required changes

- **File:** [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
  - **Goal:** Split professor and student rendering inside the shared route.
  - **Contract:** The page should:
    - preserve the existing professor roster branch unchanged in behavior
    - render a dedicated student branch when the current user is a linked student
    - avoid mixing professor-only controls into the student UI

- **File:** new student-facing presentation component(s) under `src/components/` only if the dashboard becomes too dense
  - **Goal:** Keep the shared route readable while giving the student UI its own structure.
  - **Contract:** Components should remain read-only and narrowly scoped to the student history presentation.

- **File:** role-aware supervision helpers from Phase 1
  - **Goal:** Feed the student dashboard with chronological note history and item-type distinctions.
  - **Contract:** History should make both continuity and item semantics legible, but must not expose edit/complete actions yet.

#### Success criteria

#### Automated verification:
- [ ] `/dashboard` has a student-facing render branch separate from the professor roster shell.
- [ ] The student view renders chronological history from app-layer data, not hard-coded placeholders.
- [ ] The student UI distinguishes `info` vs `task` items without exposing write controls.

#### Manual verification:
- [ ] A linked student can sign in and see only their own supervision history.
- [ ] The student view is read-only and does not expose professor creation or editing controls.
- [ ] The history is understandable as one continuous supervision thread over time.

### Phase 3: Hosted verification, documentation, and close-out

#### Goal

Verify the student slice against hosted auth/linking reality and complete the close-out trail cleanly.

#### Required changes

- **File:** [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md) if the hosted verification path needs to be documented
  - **Goal:** Capture the real manual verification expectations for linked student access.
  - **Contract:** Document only the slice-specific hosted verification path and any important setup caveats.

- **File:** `context/changes/student-read-history/change.md`
  - **Goal:** Keep the change artifact current through implementation and review.
  - **Contract:** Record progress, hosted caveats, and close-out state cleanly.

- **Files:** close-out trackers after implementation completes
  - **Goal:** Apply the established sync rule for backlog mirrors.
  - **Contract:** Update:
    - `context/foundation/tasks-github.md`
    - GitHub issue mirror
    - Linear issue mirror
  - in that order.

#### Success criteria

#### Automated verification:
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Change artifacts remain sufficient for `/10x-impl-review`.

#### Manual verification:
- [ ] One linked student account on hosted Supabase can sign in and see only its own history through `/dashboard`.
- [ ] Unlinked student accounts still land on `pending-access`.
- [ ] Close-out leaves local docs, GitHub, and Linear aligned.

## Risks and Mitigations

- **Risk:** Reusing `/dashboard` blurs professor and student IA badly enough to create regressions or mixed-role leakage.
  - **Mitigation:** Treat the page as a thin role switch that delegates to clearly separated render branches.

- **Risk:** `S-03` silently absorbs linking/onboarding work because linked accounts are required for verification.
  - **Mitigation:** Keep linking out of scope in the UI and rely on pre-linked hosted test accounts for this slice.

- **Risk:** Student history presentation accidentally exposes write affordances from professor-oriented components.
  - **Mitigation:** Use dedicated read-only student rendering rather than reusing the professor thread controls wholesale.

- **Risk:** Hosted auth and `student_profile_id` linkage behave differently than expected.
  - **Mitigation:** Make hosted verification with one real linked student account an explicit gate, not an afterthought.

## Progress

### Phase 1: Role-aware routing and student history read model

#### Automated Verification:
- [ ] 1.1 Middleware allows linked students through to `/dashboard` without granting professor access
- [ ] 1.2 The supervision layer exposes a student-safe history read helper
- [ ] 1.3 Unlinked students still resolve to `pending-access`

#### Manual Verification:
- [ ] 1.4 A linked student account reaches `/dashboard`
- [ ] 1.5 An unlinked student account still lands on `pending-access`

### Phase 2: Student-facing dashboard branch and read-only history UI

#### Automated Verification:
- [ ] 2.1 `/dashboard` has a student-facing render branch separate from the professor shell
- [ ] 2.2 The student view renders chronological history from app-layer data
- [ ] 2.3 The student UI distinguishes `info` and `task` items without exposing write controls

#### Manual Verification:
- [ ] 2.4 A linked student can sign in and see only their own supervision history
- [ ] 2.5 The student view is read-only and does not expose professor controls
- [ ] 2.6 The history remains understandable as one continuous supervision thread

### Phase 3: Hosted verification, documentation, and close-out

#### Automated Verification:
- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run build` passes
- [ ] 3.3 Change artifacts and close-out trackers are ready for review

#### Manual Verification:
- [ ] 3.4 One linked student account on hosted Supabase can sign in and see only its own history through `/dashboard`
- [ ] 3.5 Unlinked student accounts still land on `pending-access`
- [ ] 3.6 Local and remote backlog mirrors match the final change state
