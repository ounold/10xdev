---
change_id: professor-bootstrap
title: Professor bootstrap
status: planned
created: 2026-05-27
updated: 2026-05-27
source_plan: context/changes/professor-bootstrap/plan.md
---

# Plan Brief: Professor bootstrap

Full plan: [plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-bootstrap\plan.md)

## Starting Point

The app already has Supabase auth and the supervision schema, but it still treats users generically after login. `profiles.role` exists and RLS depends on it, yet no app flow can safely establish the first professor or route authenticated non-professor users into a clear pending state.

## Key Decisions

| Area | Choice | Why |
| --- | --- | --- |
| First professor | Allowlist by email | Safest MVP ownership claim |
| Config source | Server-side env | Smallest viable contract |
| Claim moment | Auto-claim on first app entry | Fastest real bootstrap flow |
| Claim execution | Dedicated server endpoint | Explicit and debuggable security boundary |
| Professor uniqueness | One active professor, later replacement is manual | Matches MVP and avoids multi-owner drift |
| Non-professor UX | Pending-access page | Safe and understandable fallback |

## Scope

**In scope:**
- Bootstrap professor email config
- Server-side first-professor claim flow
- Role-aware request state and protected routing
- Pending-access page for authenticated but unlinked users
- Docs for setup and two-account verification

**Out of scope:**
- Student roster UI
- Note-history UI
- Multi-professor support
- In-app owner transfer

## Architecture / Approach

Use Supabase Auth for identity and add a thin app-level bootstrap layer above `profiles`. After auth, the server loads the current profile and decides whether the user is already a professor, can claim professor once via the allowlist, is already a linked student, or must land on a pending-access page. Role mutation happens only in a dedicated server-side bootstrap action reached by redirect from the first protected app entry; middleware stays responsible for loading state and routing, not hidden writes.

## Phases in Brief

| Phase | Delivers | Key Risk |
| --- | --- | --- |
| 1. Bootstrap claim | Env contract plus first-professor promotion path | Accidentally over-broad claim logic |
| 2. Guarded routing | Role-aware app entry and pending-access state | Redirect loops or ambiguous logged-in UX |
| 3. Docs and verification | Two-account validation and setup guidance | Environment drift across local and hosted setups |

**Prerequisites:** `F-01` schema/RLS foundation is already deployed where this change will run.
**Estimated effort:** ~2-3 implementation phases in one change.

## Risks and Assumptions

- The MVP assumes exactly one professor owner at a time.
- Future owner transfer can stay manual outside the app for now.
- `S-01` and `S-02` will build on the routing shells added here rather than replacing another ownership model.
