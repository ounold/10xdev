---
change_id: student-archive-access-contract
title: Student archive access contract
status: planned
created: 2026-06-09
updated: 2026-06-09
owner: codex
---

# Plan: Student archive access contract

## Current State Analysis

- The current student lifecycle has no archived state. A `students` row is effectively treated as active as long as it exists, and active access is inferred from `student_profile_id`, `email`, and professor ownership alone: [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql), [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts).
- Read access is centrally enforced through RLS helper functions that currently admit professor-owned rows or rows linked by `student_profile_id = auth.uid()`. There is no branch for historical-but-professor-visible records, so an archived student would still be readable unless the access contract changes in the database layer: [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql).
- App-level reads mirror the same assumption. Professor roster loading, professor thread history, and linked-student history all query the same active table shape without distinguishing lifecycle state: [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts).
- Student access gating also assumes a binary world: either a linked student can enter `/dashboard`, or an unlinked student lands on `/pending-access`. The middleware and profile-state helpers do not yet recognize "formerly linked, now archived" as a first-class state: [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts), [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/lib/pending-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/pending-access.ts).
- Student claimability is based on "signed-in email matches exactly one unlinked row." That means re-registration after archival will only be safe if archived rows are explicitly excluded from claimable matching and active-link checks: [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts), [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts), [src/pages/api/student/claim-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/student/claim-access.ts).
- Repo lessons already emphasize that changes touching hosted Supabase schema or RLS must be treated as migration-sensitive release work, and that account-linking browser verification should reuse repo-local fixtures where possible: [context/foundation/lessons.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/foundation/lessons.md).

## Key Decisions

| Area                      | Decision                                                                      | Why                                                                                                             | Source |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| Lifecycle model           | Add a student lifecycle status and optionally `archived_at`                   | Keeps archival explicit in the domain model and easier to propagate consistently than inferring from null links | User   |
| Active link handling      | Clear active `student_profile_id` on archive                                  | Guarantees immediate access revocation and simplifies access-state checks                                       | User   |
| Historical identity       | Preserve previous linked profile in a dedicated history field                 | Keeps an audit-friendly professor-visible trail without leaving an active link in place                         | User   |
| Contract scope            | Ship the full access contract in this foundation                              | Prevents later UI slices from building on unsafe or half-true lifecycle semantics                               | User   |
| Existing data             | Treat all current rows as active by default                                   | Minimizes rollout risk and avoids heuristic or manual recategorization during migration                         | User   |
| Student post-archive UX   | Archived users fall back to `pending-access` semantics                        | Reuses the existing safe blocked state instead of creating a new access surface early                           | User   |
| Professor read-model seam | Update helper contracts for active vs archived, but do not add archive UI yet | Gives later slices a clean seam while keeping this change a true foundation                                     | User   |
| Required proof            | Migration + integration coverage + manual smoke                               | Matches the security-sensitive nature of the change without forcing premature E2E around future UI              | User   |

## Scope

**In scope**

- Extend the `students` domain model with an explicit archival lifecycle contract
- Preserve backward-compatible defaults so existing records remain active after migration
- Introduce database and application-level read helpers that distinguish active versus archived students
- Rework RLS and access helper functions so archived students lose access immediately while professors retain historical read access
- Exclude archived rows from current active-link and claimability semantics
- Update middleware/profile-state/pending-access seams so archived former students land in a safe blocked state
- Add integration coverage for the new access contract and manual smoke guidance for active and archived cases

**Out of scope**

- Professor UI to trigger archive from the roster
- Professor archive section or archived-thread read-only presentation
- Student re-registration UX beyond contract readiness
- Product-level restore/unarchive flow
- Archive reason capture, audit log UI, or broader roster-admin redesign

## Architecture / Approach

Treat this change as a shared lifecycle seam, not a user-facing feature slice. The database becomes the source of truth by adding an explicit archived state to `students`, plus an optional timestamp and a dedicated historical-profile field that remembers who used to be linked after the active link is cleared. RLS helper functions then pivot from "professor-owned or linked student" to "professor-owned always, linked student only when the row is active." Application helpers mirror that rule: professor-facing list/history helpers gain explicit active-vs-archived filtering seams, linked-student lookup ignores archived rows, and claimability only considers active unlinked rows. Middleware and pending-access continue to reuse the current student-safe blocked path, but now the state comes from the new lifecycle contract instead of the absence of any matching record. This keeps later slices focused on professor UI and workflow, because the underlying safety and historical semantics are already true.

## Phases

### Phase 1: Introduce archival lifecycle fields and database access rules

#### Goal

Make the database contract explicit: students can now be active or archived, archived rows preserve history for the professor, and archived students no longer qualify for student-side access.

#### Required changes

- **File:** [supabase/migrations/20260526213000_create_supervision_domain.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526213000_create_supervision_domain.sql) plus a new forward migration under [supabase/migrations/](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/)
  - **Goal:** Extend the supervision schema with explicit archival lifecycle fields.
  - **Contract:** Add:
    - a lifecycle field on `students` with at least `active` and `archived`
    - optional `archived_at`
    - a dedicated historical profile field that stores the previously linked student profile after archive
  - Existing rows must default to `active`, and the schema must keep active email reuse possible after archival.

- **File:** [supabase/migrations/20260526215500_enable_supervision_rls.sql](C:/Users/olguno5421/Documents/GitHub/10xdev/supabase/migrations/20260526215500_enable_supervision_rls.sql) plus any follow-up migration needed
  - **Goal:** Rework access helpers and policies around the new lifecycle rule.
  - **Contract:** Update the database-side access helpers so that:
    - professors retain access to both active and archived students they own
    - student-side access is granted only for active linked rows
    - notes and note items inherit that updated student-access contract
  - Preserve current professor-owned mutation rights while preventing archived rows from remaining student-readable through old links.

- **File:** integration tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove the database-facing lifecycle contract before UI work starts.
  - **Contract:** Cover at least:
    - archived rows are excluded from active student access checks
    - professor-owned reads still work for archived rows
    - default migration behavior leaves existing rows active

#### Success criteria

#### Automated verification:

- [ ] Schema supports explicit `active` vs `archived` lifecycle state on students
- [ ] Database access helpers no longer treat archived linked rows as student-readable
- [ ] Existing rows remain active after migration without manual data intervention

#### Manual verification:

- [ ] Local or hosted inspection confirms an archived student row keeps history metadata while no longer behaving like an active link
- [ ] Professor-owned historical rows remain queryable after the lifecycle change

### Phase 2: Update app read-model and claimability seams to honor archival

#### Goal

Make the application-layer helpers and access-state derivation match the new database contract, without yet introducing archive UI.

#### Required changes

- **File:** [src/lib/database.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/database.ts)
  - **Goal:** Extend TypeScript contracts to carry the archival lifecycle data.
  - **Contract:** Update student-facing types, roster summaries, and any claimability-related types so the codebase can distinguish:
    - active student records
    - archived historical records
    - active-link status vs historical-link status

- **File:** [src/lib/supervision.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supervision.ts)
  - **Goal:** Split active and archived semantics in the shared supervision helper layer.
  - **Contract:** Add or adapt helper boundaries so that:
    - professor roster reads can request active-only data now and archived data later
    - student-side history lookup ignores archived rows
    - claim-related lookups consider only active unlinked rows
  - This phase should prepare the seam for later archive UI, but should not yet add roster archive presentation.

- **File:** [src/lib/profile.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/profile.ts)
  - **Goal:** Make profile-state and claimability checks lifecycle-aware.
  - **Contract:** `isLinkedStudent`, current-link detection, and claimability derivation must ignore archived rows as active-access candidates while still allowing future active prepared rows with the same email to be claimable.

- **File:** [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/)
  - **Goal:** Prove helper-level lifecycle semantics at the app boundary.
  - **Contract:** Cover at least:
    - linked-student history lookup returns `null` for archived rows
    - claimability excludes archived rows from exact-match logic
    - professor helper seams can still represent archived history distinctly from active rows

#### Success criteria

#### Automated verification:

- [ ] App types and helper functions expose a real active-vs-archived seam
- [ ] Student-side history and active-link checks ignore archived rows
- [ ] Claimability treats archived rows as historical only, not as active prepared targets

#### Manual verification:

- [ ] A previously archived student account no longer appears as linked in the active access path
- [ ] A professor-owned archived record remains available for later UI work without being mixed into active-only queries

### Phase 3: Align middleware and pending-access semantics with archived former students

#### Goal

Reuse existing blocked-state UX safely so archived former students are denied dashboard access without introducing a new route or hidden regressions.

#### Required changes

- **File:** [src/middleware.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/middleware.ts)
  - **Goal:** Keep route protection behavior stable while the definition of "linked student" changes.
  - **Contract:** Middleware should continue to:
    - admit only professors and active linked students into `/dashboard`
    - send archived former students to `/pending-access`
    - avoid performing lifecycle side effects in routing logic

- **File:** [src/lib/pending-access.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/pending-access.ts)
  - **Goal:** Make blocked-state messaging compatible with archival semantics.
  - **Contract:** The view-model should be able to represent that:
    - the signed-in account exists
    - it currently has no active student assignment
    - claimability may remain blocked until a professor prepares a new active record
  - Keep this as an extension of the existing safe blocked state, not a brand-new route model.

- **File:** [src/pages/pending-access.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/pending-access.astro) and claim-access route seams if needed
  - **Goal:** Keep pending-access behavior understandable after archival.
  - **Contract:** Copy and feedback should not imply a system error when a previously linked student loses access because the old record is archived.

- **Files:** manual verification guidance in [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) or change-scoped notes if implementation-specific
  - **Goal:** Document the minimum smoke path for active vs archived behavior.
  - **Contract:** Include:
    - active student still reaches dashboard
    - archived former student lands on pending-access
    - archived row does not get reclaimed automatically until a new active row exists

#### Success criteria

#### Automated verification:

- [ ] Middleware admits only professors and active linked students after the lifecycle change
- [ ] Pending-access semantics remain consistent when the signed-in user was formerly linked but now has no active student assignment
- [ ] Integration coverage proves archived former students do not regain dashboard access through old data

#### Manual verification:

- [ ] An active linked student still reaches the student dashboard without regressions
- [ ] An archived former student is redirected to pending-access instead of accessing old thread history
- [ ] Reaching pending-access after archival reads as an expected access state, not a broken-flow error

## Risks and Mitigations

- **Risk:** Lifecycle logic is enforced only in TypeScript and not in RLS, leaving hidden access regressions possible.
  - **Mitigation:** Put the authoritative archived-vs-active rule into database helpers and make app helpers follow that contract.

- **Risk:** Clearing `student_profile_id` breaks historical traceability.
  - **Mitigation:** Preserve the previous linked profile in a dedicated historical field that is not used for active access checks.

- **Risk:** Existing seeded or hosted data is misclassified during rollout.
  - **Mitigation:** Default all current records to `active` and avoid heuristic archival inference in migration logic.

- **Risk:** Re-registration later accidentally rebinds to the archived row instead of a new active one.
  - **Mitigation:** Exclude archived rows from all active claimability and active-link checks in the foundation itself.

- **Risk:** Middleware and pending-access copy still assume "never linked yet" and confuse archived former students.
  - **Mitigation:** Update blocked-state semantics as part of this foundation, even before archive UI exists.

## Progress

### Phase 1: Introduce archival lifecycle fields and database access rules

#### Automated Verification:

- [x] 1.1 Add student lifecycle fields, optional archive timestamp, and historical-profile storage through a forward migration
- [x] 1.2 Update database access helpers and RLS policies so archived rows are professor-readable but not student-readable
- [x] 1.3 Add integration coverage for lifecycle defaults and archived access rules

#### Manual Verification:

- [ ] 1.4 Verify an archived row preserves historical metadata while no longer qualifying as an active student link
- [ ] 1.5 Verify professor-owned historical rows remain queryable after migration

### Phase 2: Update app read-model and claimability seams to honor archival

#### Automated Verification:

- [x] 2.1 Extend TS contracts and supervision/profile helpers with active-vs-archived lifecycle semantics
- [x] 2.2 Exclude archived rows from linked-student history and claimability logic
- [x] 2.3 Add integration coverage for helper-level archival behavior

#### Manual Verification:

- [ ] 2.4 Confirm an archived former student no longer appears as actively linked in app state
- [ ] 2.5 Confirm professor helper seams can still surface archived history distinctly from active-only reads

### Phase 3: Align middleware and pending-access semantics with archived former students

#### Automated Verification:

- [x] 3.1 Keep `/dashboard` protected by active-link semantics only
- [x] 3.2 Keep pending-access and claim-access flows consistent for archived former students
- [x] 3.3 Run targeted integration checks plus required repo gates for the changed contract

#### Manual Verification:

- [ ] 3.4 Confirm active linked students still reach dashboard normally
- [ ] 3.5 Confirm archived former students land on pending-access and cannot reach old thread history
