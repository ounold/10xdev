---
change_id: archived-student-history
title: Archived student history
status: planned
created: 2026-06-10
updated: 2026-06-10
owner: codex
---

# Plan: Archived student history

## Current State Analysis

- The archival lifecycle contract is already live at the data and access level. `students` rows carry `lifecycle`, archived rows remain professor-readable, and student-side linked history ignores archived records entirely: [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts), [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts).
- `S-01` already introduced the professor archive action and a read-model seam for archived roster data. The helper layer exposes both `listProfessorStudents()` for active rows and `listArchivedProfessorStudents()` for archived rows, but the dashboard still renders only the active roster: [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts), [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro).
- The professor thread page can already load an archived student row through `getStudentHistory()`, because that helper does not filter by lifecycle. However, the page still renders active-only affordances: edit links, task-completion forms, note-create/update form, and the archive danger zone for active rows. There is no explicit archived branch or read-only messaging yet: [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro).
- Existing tests already prove the archival backend seam and the archive action route contract, but they do not yet verify archived roster rendering or the absence of mutating controls on an archived thread surface: [tests/integration/supervision-read-model.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/supervision-read-model.test.ts), [tests/integration/professor-student-archival-ui-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/professor-student-archival-ui-contract.test.ts).
- Repo lessons still matter here: hosted Supabase migrations must precede hosted release verification, and local proof should use the cheapest meaningful layer first before escalating to browser-heavy evidence: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area                        | Decision                                                                                            | Why                                                                                        | Source |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| Dashboard archive placement | Use a separate toggle/switch between active and archived roster sections                            | Keeps the same surface while making archive browsing explicit and uncluttered              | User   |
| Read-only communication     | Use a strong banner plus read-only badges on archived thread surfaces                               | Archived state should be unmistakable because active actions are intentionally removed     | User   |
| Direct URL behavior         | Allow direct entry into archived thread URLs in read-only mode                                      | Preserves continuity and makes historical links usable without redirect churn              | User   |
| Task treatment              | Show historical task state and completion metadata, but remove all toggles                          | Preserves continuity while preventing any archived mutation                                | User   |
| Note-edit treatment         | Fully hide create/edit forms and links on archived threads                                          | The safest and clearest read-only contract is absence of mutating controls                 | User   |
| Archived roster item shape  | Show name, email, note count, last meeting, and archived badge                                      | Gives comparable scanning value to active roster without implying active workflow          | User   |
| Test gate                   | Require `lint` + `build` + targeted integration/UI contract tests                                   | Matches the UI/read-model nature of this slice without requiring a new browser suite first | User   |
| Archive summary             | Do not add a separate archive count summary beyond what naturally appears in the roster switch/list | Keeps `S-02` focused on usable archive browsing rather than dashboard analytics            | User   |

## Scope

**In scope**

- Render archived students from the existing helper seam on the same professor dashboard surface
- Add a clear active/archive roster switch on `/dashboard`
- Allow professors to open archived student threads from the archived roster
- Render archived student threads in a clearly read-only state
- Remove note-create, note-edit, task-toggle, and archive-action controls from archived thread surfaces
- Add targeted integration or UI-contract proof for archived roster and archived thread read-only behavior

**Out of scope**

- Restore/unarchive flow
- Student-side re-registration and relinking
- Archive analytics or reporting beyond the roster itself
- New archived metadata fields or schema changes
- Browser E2E unless integration/UI-contract tests reveal a gap that local rendering checks cannot prove

## Architecture / Approach

Treat `S-02` as a read-only branching of existing professor flows rather than a new subsystem. The dashboard should load both active and archived professor students through the existing supervision helpers, then render a simple professor-only toggle between the two list states on the same page. Archived rows remain linkable to the existing thread route, but the thread page becomes lifecycle-aware: when `student.lifecycle === "archived"`, the page renders a strong read-only banner, keeps chronological note/task history visible, and removes every mutating affordance that belongs to active supervision. That means no edit links, no task-completion forms, no note form, and no archive danger zone. The result is the smallest full archival UX that proves preserved historical continuity without reopening any student or professor mutation path.

## Phases

### Phase 1: Add archived roster visibility on the professor dashboard

#### Goal

Expose archived students on the same dashboard surface as a separate professor-controlled roster state.

#### Required changes

- **File:** [src/pages/dashboard.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard.astro)
  - **Goal:** Load and render both active and archived professor rosters with an explicit switch.
  - **Contract:** The dashboard should:
    - continue showing active students by default
    - expose a clear toggle between active and archived student lists
    - render archived students using the archived helper seam
    - show name, email, note count, last meeting, and an archived badge for archived rows
  - The archived list remains professor-only and should not interfere with student dashboard rendering.

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts) only if a small helper refinement is needed
  - **Goal:** Keep the roster helper contract ergonomic for active/archive dashboard rendering.
  - **Contract:** Any change here should stay read-model-only; no new mutation semantics.

- **File:** tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove the archived roster contract as rendered or source-wired on the dashboard.
  - **Contract:** Cover at least:
    - dashboard source or UI contract contains the active/archive roster switch
    - archived roster rendering consumes the archived helper seam
    - archived roster items expose the expected archive badge and summary fields

#### Success criteria

#### Automated verification:

- [ ] Dashboard supports switching between active and archived roster states
- [ ] Archived students can be rendered from the existing helper seam without affecting active roster behavior
- [ ] Archived roster items expose clear archive status information

#### Manual verification:

- [ ] A professor can switch from the active roster to the archived roster on `/dashboard`
- [ ] Archived students appear in the archived roster and active students remain in the active roster

### Phase 2: Make archived student threads clearly read-only

#### Goal

Turn archived thread URLs into a strong professor-only historical view with no mutating actions.

#### Required changes

- **File:** [src/pages/dashboard/students/[studentId].astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/dashboard/students/[studentId].astro)
  - **Goal:** Branch the professor thread UI by lifecycle.
  - **Contract:** When `student.lifecycle === "archived"`:
    - render a prominent read-only banner
    - keep chronological note history and historical task completion metadata visible
    - remove note edit links
    - remove the note create/edit form entirely
    - remove task completion/reopen buttons
    - remove the archive danger zone
  - When the student is active, current behavior should remain unchanged.

- **File:** any professor note/task API route only if a defensive lifecycle guard is needed
  - **Goal:** Prevent archived-thread mutations from remaining reachable through direct POST even if UI hides controls.
  - **Contract:** If current helpers or routes would still allow archived writes by direct request, add a small guard that rejects archived thread mutations clearly.

- **Files:** integration or UI-contract tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove the absence of mutating archived controls and the presence of read-only communication.
  - **Contract:** Cover at least:
    - archived thread source contains the read-only banner
    - archived thread source omits edit/form/task-toggle actions in the archived branch
    - direct archived thread URLs remain accessible to professors

#### Success criteria

#### Automated verification:

- [ ] Archived thread pages render a clear read-only state
- [ ] Archived thread pages preserve history visibility while removing mutating controls
- [ ] Active thread behavior remains unchanged for non-archived students

#### Manual verification:

- [ ] A professor can open an archived student thread directly from the archive roster
- [ ] Archived history is readable and visibly read-only
- [ ] No note-edit, note-create, task-toggle, or archive controls remain on the archived thread

### Phase 3: Close proof and verification guidance for the north-star slice

#### Goal

Capture the minimum manual smoke and repo gates needed to treat archived history as a usable professor-facing feature.

#### Required changes

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) or change-scoped notes if that stays cleaner
  - **Goal:** Document the manual smoke path for the archived history view.
  - **Contract:** Include:
    - archive a linked active student first
    - switch to the archived roster on `/dashboard`
    - open the archived thread
    - confirm read-only history visibility and absence of mutating controls
    - confirm active students still use the active thread path normally

- **Files:** change artifact updates in [context/changes/archived-student-history/](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/archived-student-history/)
  - **Goal:** Keep scope and proof aligned with `S-02` rather than drifting into `S-03`.

#### Success criteria

#### Automated verification:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Targeted integration/UI-contract tests prove archived roster and archived thread behavior

#### Manual verification:

- [ ] Local professor smoke proves archived roster access plus archived thread read-only behavior
- [ ] Hosted archive-history smoke is explicitly deferred until the next deploy-worthy batch after remote Supabase schema is confirmed

## Risks and Mitigations

- **Risk:** Archived thread UI hides controls visually but direct POST routes still mutate archived history.
  - **Mitigation:** Verify helper/route behavior explicitly and add defensive archived lifecycle guards where needed.

- **Risk:** Dashboard archive browsing becomes visually ambiguous with the active roster.
  - **Mitigation:** Use a real active/archive switch plus archived badges rather than relying only on ordering or copy.

- **Risk:** Archived thread read-only state is too subtle and professors mistake it for a broken active thread.
  - **Mitigation:** Use a strong banner plus read-only badges while preserving the same history layout for continuity.

- **Risk:** `S-02` drifts into restore, analytics, or re-registration work.
  - **Mitigation:** Keep the slice limited to archive visibility and read-only history; leave lifecycle reopening to `S-03` or later parked work.

- **Risk:** Hosted release verification fails even with local green checks because the remote Supabase project does not match the local archive schema.
  - **Mitigation:** Reuse the repo lesson and require remote migration confirmation before hosted smoke is treated as release evidence.

## Progress

### Phase 1: Add archived roster visibility on the professor dashboard

#### Automated Verification:

- [x] 1.1 Add the active/archive roster switch and archived roster rendering on the dashboard
- [x] 1.2 Keep archived roster data wired through the existing archived helper seam
- [x] 1.3 Add targeted integration/UI-contract coverage for archived roster rendering

#### Manual Verification:

- [x] 1.4 Confirm a professor can switch between active and archived roster states
- [x] 1.5 Confirm archived students appear only in the archived roster state

### Phase 2: Make archived student threads clearly read-only

#### Automated Verification:

- [x] 2.1 Add archived-thread read-only rendering on the professor thread page
- [x] 2.2 Remove archived-thread mutating controls and add defensive lifecycle guards if needed
- [x] 2.3 Add targeted integration/UI-contract coverage for archived thread read-only behavior

#### Manual Verification:

- [x] 2.4 Confirm a professor can open an archived thread directly from the archived roster
- [x] 2.5 Confirm archived threads keep history visible but expose no mutating actions

### Phase 3: Close proof and verification guidance for the north-star slice

#### Automated Verification:

- [x] 3.1 Run `npm run lint`
- [x] 3.2 Run `npm run build`
- [x] 3.3 Run targeted integration/UI-contract tests for archived student history

#### Manual Verification:

- [x] 3.4 Record the local archived-history smoke path for professors
- [x] 3.5 Leave hosted archive-history smoke explicitly deferred until remote Supabase schema is confirmed for release
