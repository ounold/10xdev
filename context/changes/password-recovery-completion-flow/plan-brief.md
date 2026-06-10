---
change_id: password-recovery-completion-flow
title: Password recovery completion flow
source_plan: context/changes/password-recovery-completion-flow/plan.md
generated: 2026-06-09
status: planned
---

# Plan Brief: Password recovery completion flow

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/password-recovery-completion-flow/plan.md)

## Starting Point

The app can request a Supabase password reset email, but it cannot finish the recovery journey after the user clicks the link. Today the reset route sends the email, then the user eventually falls back onto sign-in because the app has no recovery callback handling, no password-update page, and no route that calls Supabase to set a new password in a valid recovery session.

## Key Decisions

| Area                  | Selected option                                                  | Main rationale                                               | Source |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| Recovery destination  | Dedicated `auth/update-password` page                            | Makes recovery explicit and easier to validate               | User   |
| Session completion    | Finish the recovery session in-app from the Supabase return link | Removes the current dead-end flow                            | User   |
| Post-success behavior | Keep the user signed in and redirect automatically               | Proves the reset restored real access                        | User   |
| Password policy       | Minimum length plus confirmation                                 | Sufficient first contract without over-designing policy      | User   |
| Failure UX            | Recovery-specific retry path                                     | Avoids disguising reset problems as generic sign-in failures | User   |
| Role handling         | One shared recovery mechanism for all users                      | Recovery is account-level, not role-specific                 | User   |
| Verification gate     | Integration plus manual smoke                                    | Focuses on auth contract correctness first                   | User   |

## Scope

**In scope:** recovery callback/session handling, dedicated update-password page, new-password submission route, post-success redirect, invalid-link handling, integration proof, and manual verification guidance.

**Out of scope:** auth-provider redesign, invitation/signup recovery redesign, role-specific recovery variants, and mandatory E2E as the first gate.

## Architecture / Approach

This slice closes the missing middle of the Supabase recovery flow. The app keeps the existing "request reset email" entry point, but adds a dedicated recovery destination that can interpret the return payload, establish a valid recovery session, and render a password-update form only when the user arrived through a valid reset link. The password update itself happens through a dedicated server route that preserves the authenticated session and sends the user back through the ordinary app access guards. Invalid or expired recovery links stay in a recovery-specific failure path with a clear retry action.

## Phases at a Glance

| Phase                  | What it delivers                             | Key risk                                                                      |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| 1. Recovery entry      | Callback/session completion route            | A valid link still cannot become an update-capable session                    |
| 2. Password update     | New-password form and successful redirect    | Reset looks complete but leaves the user unable to continue                   |
| 3. Flow reconciliation | Consistent auth messaging and smoke guidance | Future auth debugging keeps confusing reset failures with credential failures |

**Prerequisites:** Supabase recovery emails must point back to a route handled by this app in local and hosted config.
**Estimated effort:** ~2-3 implementation sessions across 3 phases.

## Open Risks and Assumptions

- The current `Invalid login credentials` symptom is assumed to overlap with the unfinished recovery flow, but the plan keeps enough room to reconcile surrounding sign-in behavior if the root cause is broader.
- Post-reset routing should rely on existing authenticated access logic rather than new role branches.
- Local and hosted auth URL configuration must both target app routes that can complete recovery.

## Success Criteria Summary

- A reset email link opens a working in-app password-update experience instead of a dead-end sign-in return.
- After choosing a new password, both professor and student accounts can continue through the normal authenticated app flow.
- Invalid or expired links fail with recovery-specific feedback and a clear retry path.
