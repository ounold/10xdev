# Plan Brief: Student Re-registration Reset

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/student-reregistration-reset/plan.md)

## Starting Point

The archive lifecycle is already active in code: active claim and linked-student access already ignore archived rows, and `/pending-access` already tells a former student that a new active record is required. The missing product gap is narrower: professor creation does not yet warn when reusing an archived email, and the returning-student path is not yet fully proven in integration plus browser tests.

## Key Decisions

| Decision                     | Choice                       | Why                                                                   |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Professor re-onboarding flow | Reuse normal `Add a student` | Keeps MVP simple and avoids a second creation surface                 |
| Student return UX            | Standard claim flow          | One active prepared row should behave like any normal claim           |
| Archived email reuse         | Allow with warning           | Professor should be informed, not blocked                             |
| Duplicate fresh rows         | Keep `ambiguous-match`       | Safety still beats convenience on duplicate active matches            |
| Test gate                    | Integration + local E2E      | This slice is mostly contract behavior plus one critical browser flow |

## Scope

**In scope:** allow new active creation for archived emails, add professor warnings, prove returning-student archived-plus-active claim flow, preserve duplicate blocking.

**Out of scope:** unarchive flow, new special professor creation UI, student-facing special return copy, roadmap cleanup.

## Architecture / Approach

Keep the access contract mostly unchanged: only active rows remain claimable and visible to linked students. Add a small professor-side archived-email detection seam around student creation so the same email can be reused safely with informational warnings. Then expand the current claim-flow integration and E2E fixtures to prove one archived row plus one fresh active row links correctly, while duplicate fresh active rows remain blocked.

## Phases at a Glance

| Phase                      | Outcome                                                           | Key risk                                                                   |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1. Professor warnings      | Archived-email re-preparation is allowed and clearly explained    | Warning accidentally becomes a blocker or changes normal creation behavior |
| 2. Returning-student proof | Archived-plus-active claim reset is proven in integration and E2E | Claim logic looks correct in code but is not actually covered end to end   |
| 3. Verification close-out  | Local smoke path and gates are documented                         | Slice looks done in code but lacks reusable verification guidance          |

**Prerequisites:** existing archive lifecycle migration and current claim-flow fixtures remain available.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks and Assumptions

- The main logic may already be mostly implemented, so the slice must resist scope drift into unnecessary rewrites.
- E2E fixture prep must stay tied to the intended professor workspace and reuse repo-local auth patterns safely.
- Hosted verification is intentionally deferred unless release needs demand it later.

## Success Criteria

- A professor can create a new active student row for an email that exists in archived history and gets a clear non-blocking warning.
- A returning student with one archived row and one fresh active row can claim only the fresh active record.
- A returning student with duplicate fresh active rows remains blocked until the professor resolves the conflict.
