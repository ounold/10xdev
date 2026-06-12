---
change_id: password-recovery-completion-flow
title: Password recovery completion flow
status: planned
created: 2026-06-09
updated: 2026-06-09
owner: codex
---

# Plan: Password recovery completion flow

## Current State Analysis

- The current reset flow stops after sending the email. The server route only calls `resetPasswordForEmail(email)` and always returns the user to sign-in with a success or error query string, but there is no recovery completion route in the app: [src/pages/api/auth/reset-password.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/reset-password.ts).
- The UI mirrors that limitation. The current reset page and form only collect an email address and never provide a "set new password" step after the user returns from the Supabase email link: [src/pages/auth/reset-password.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/reset-password.astro), [src/components/auth/ResetPasswordForm.tsx](C:/Users/olguno5421/Documents/GitHub/10xdev/src/components/auth/ResetPasswordForm.tsx).
- A code search shows no handling for `exchangeCodeForSession`, `updateUser`, `type=recovery`, `token_hash`, or recovery callback parsing, which means the app currently has no way to turn a valid recovery link into a session that can update the password.
- Sign-in itself is thin and delegates directly to Supabase password auth. That means repeated `Invalid login credentials` after attempted resets can be consistent with a broken recovery completion path rather than a UI-only issue: [src/pages/api/auth/signin.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/signin.ts).
- Auth infrastructure already exists on the server side through shared Supabase helpers, so this change should extend the current auth architecture rather than inventing a parallel mechanism: [src/lib/supabase.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib/supabase.ts).
- Recent work on access gating and account lifecycle relies on predictable post-auth behavior. A half-finished recovery flow would create noisy false negatives during student/professor manual verification, so this is a cross-cutting auth contract worth isolating as its own slice.

## Key Decisions

| Area                    | Decision                                                                                   | Why                                                                                                                 | Source |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------ |
| Recovery destination    | Dedicated `auth/update-password` page                                                      | Keeps the recovery state explicit and easier to validate than overloading sign-in                                   | User   |
| Session handling        | Complete the recovery session in-app from the Supabase return link before showing the form | Matches Supabase's intended flow and removes the current dead-end return                                            | User   |
| Post-success behavior   | Log the user in and redirect them to the correct destination automatically                 | Minimizes friction and proves the reset truly restored access                                                       | User   |
| Password policy         | Minimum viable rules: length plus confirmation match                                       | Fits the current product maturity while still preventing accidental bad submissions                                 | User   |
| Invalid/expired link UX | Show a recovery-specific error and a clear path to request a new email                     | More understandable than a generic sign-in failure                                                                  | User   |
| Verification scope      | Integration coverage plus manual smoke                                                     | Keeps the slice focused on contract correctness without forcing browser automation first                            | User   |
| Role handling           | One shared recovery mechanism for professor and student accounts                           | Password reset should be account-level, not role-specific                                                           | User   |
| Slice boundary          | Include related sign-in/reset contract debugging if needed to prove the flow end to end    | The observed `Invalid login credentials` issue overlaps the recovery contract and should not be left half-explained | User   |

## Scope

**In scope**

- Add a dedicated password-update destination for Supabase recovery links
- Parse and complete the recovery callback/session handoff inside the app
- Provide a secure in-app form for setting a new password with confirmation
- Redirect successfully recovered users into the correct post-login destination
- Show recovery-specific handling for invalid or expired links
- Add integration coverage for request, callback, and password-update contract seams
- Add manual smoke guidance for professor and student recovery verification

**Out of scope**

- Passwordless magic-link auth redesign
- Signup confirmation or invitation-flow redesign
- Broader auth-provider changes outside password recovery
- New role-specific recovery UX variants
- Full E2E suite as a required gate for this first completion slice

## Architecture / Approach

Treat password recovery as a missing completion contract around Supabase auth rather than as an isolated form tweak. The first step remains the existing email submission route, but the app must then accept the Supabase recovery return, establish or exchange the recovery session safely on the server boundary, and render a dedicated `auth/update-password` page only when the recovery state is valid. That page submits a new password plus confirmation to a dedicated server route that updates the authenticated user through Supabase, preserves the session, and redirects the user into the same access-guarded app flow used after ordinary sign-in. Error handling should stay recovery-specific: invalid or expired links should not masquerade as generic sign-in failures. This keeps the auth contract explicit, reusable across professor and student accounts, and testable at the seam where today's flow is missing.

## Phases

### Phase 1: Add the recovery callback and password-update contract

#### Goal

Create the missing in-app recovery completion path so a valid reset link can become a real password-update session.

#### Required changes

- **Files:** auth routes/pages under [src/pages/auth/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth) and [src/pages/api/auth/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth)
  - **Goal:** Introduce a dedicated recovery destination and callback handling.
  - **Contract:** The app must:
    - accept the Supabase recovery return on a dedicated route
    - establish the recovery session from the callback payload/link parameters
    - redirect invalid or expired recovery entries into a recovery-aware error state rather than a generic sign-in dead end

- **Files:** shared Supabase/auth helpers under [src/lib/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/lib)
  - **Goal:** Centralize any recovery-session parsing or auth helper logic instead of scattering it across pages.
  - **Contract:** Recovery handling should reuse existing auth client setup and keep secret-bearing logic server-side.

- **Files:** integration tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration)
  - **Goal:** Prove the recovery-entry contract before the UI form is layered on top.
  - **Contract:** Cover at least:
    - valid recovery callback/session setup reaches the password-update destination
    - invalid or expired recovery state produces the intended recovery-specific failure path

#### Success criteria

#### Automated verification:

- [ ] The app has a dedicated recovery completion route instead of returning users to a dead-end sign-in page
- [ ] Recovery callback handling can establish a valid in-app recovery session
- [ ] Invalid or expired recovery links are handled explicitly

#### Manual verification:

- [ ] Opening a valid reset link lands on the new password step instead of ordinary sign-in
- [ ] Opening an invalid or stale recovery link shows a recovery-specific retry path

### Phase 2: Add the new-password submission flow and redirect semantics

#### Goal

Let the recovering user safely set a new password and continue into the application as an authenticated account.

#### Required changes

- **Files:** UI components/pages under [src/components/auth/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/components/auth) and [src/pages/auth/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth)
  - **Goal:** Add a dedicated password-update form.
  - **Contract:** The form must:
    - collect a new password and confirmation
    - enforce minimum password length and matching confirmation
    - surface field and submission errors clearly

- **Files:** auth API routes under [src/pages/api/auth/](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth)
  - **Goal:** Persist the new password through the authenticated recovery session.
  - **Contract:** On success the route should:
    - update the user password via Supabase
    - preserve or refresh the active session as needed
    - redirect the user into the correct post-login destination instead of back to sign-in

- **Files:** integration tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration)
  - **Goal:** Prove the password-update contract end to end at the app seam.
  - **Contract:** Cover at least:
    - mismatched confirmation is rejected locally or server-side with clear feedback
    - valid password update succeeds and yields the expected redirect target

#### Success criteria

#### Automated verification:

- [ ] Recovering users can submit a new password through a dedicated in-app form
- [ ] Successful password update redirects into the authenticated app flow
- [ ] Confirmation mismatch and invalid submissions fail clearly

#### Manual verification:

- [ ] A professor account can reset the password, set a new one, and continue into the app
- [ ] A student account can reset the password, set a new one, and continue into the appropriate guarded destination

### Phase 3: Reconcile reset-password and sign-in guidance around the completed flow

#### Goal

Align the surrounding auth UX and verification guidance so recovery, sign-in, and retry states no longer conflict or mislead manual testing.

#### Required changes

- **Files:** existing auth entry points such as [src/pages/auth/signin.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/signin.astro), [src/pages/auth/reset-password.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/reset-password.astro), and related components/routes
  - **Goal:** Make surrounding auth copy and redirects consistent with the new recovery contract.
  - **Contract:** Sign-in and reset pages should:
    - stop implying that the reset flow ends at the sign-in form
    - offer the correct retry path after recovery failure
    - keep success/error messages specific enough to distinguish recovery issues from ordinary credential failures

- **Files:** documentation/manual verification guidance such as [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md) or change-scoped notes
  - **Goal:** Capture the working reset-password smoke path for local and hosted environments.
  - **Contract:** Document:
    - how to request a reset
    - what URL/route should open from the email
    - how to verify successful completion for professor and student accounts

- **Files:** integration tests under [tests/integration/](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration)
  - **Goal:** Lock the outer contract so future auth changes do not regress back into the dead-end behavior.
  - **Contract:** Cover at least:
    - reset request still produces the right outbound behavior after the new flow lands
    - recovery-specific failure messages remain distinct from generic invalid-credential errors where the app controls the response

#### Success criteria

#### Automated verification:

- [ ] Reset-password, update-password, and sign-in surfaces are consistent with the completed recovery flow
- [ ] Recovery-specific errors remain distinct from generic credential failures
- [ ] Documentation reflects the actual local and hosted reset flow

#### Manual verification:

- [ ] Local manual smoke confirms the full recovery flow from reset request to successful sign-in continuation
- [ ] Hosted manual smoke uses the same route expectations and no longer returns users to a dead-end sign-in page after reset

## Risks and Mitigations

- **Risk:** The app accepts recovery links but fails to establish a session securely, leading to a fake "update password" page that cannot save.
  - **Mitigation:** Make recovery session establishment an explicit Phase 1 contract with focused integration proof before building the form.

- **Risk:** Invalid or expired links are still shown as generic sign-in failures, making auth debugging harder.
  - **Mitigation:** Keep recovery-specific error handling and copy as part of the plan, not polish deferred to later.

- **Risk:** Post-success redirects diverge for professor and student accounts and accidentally bypass existing access guards.
  - **Mitigation:** Reuse the current authenticated routing logic rather than inventing role-specific redirect rules.

- **Risk:** The current `Invalid login credentials` issue has another root cause and recovery work only partially masks it.
  - **Mitigation:** Keep sign-in/reset contract reconciliation in scope so we verify the flow end to end rather than stopping at one new page.

## Progress

### Phase 1: Add the recovery callback and password-update contract

#### Automated Verification:

- [x] 1.1 Add a dedicated recovery destination and callback/session handling path
- [x] 1.2 Centralize any recovery-session helper logic in shared auth utilities
- [x] 1.3 Add integration coverage for valid and invalid recovery entry

#### Manual Verification:

- [x] 1.4 Confirm a valid reset link opens the password-update flow
- [x] 1.5 Confirm invalid or expired recovery links show a recovery-specific retry path

### Phase 2: Add the new-password submission flow and redirect semantics

#### Automated Verification:

- [x] 2.1 Add the new-password form with confirmation and minimum validation
- [x] 2.2 Add a dedicated server route that updates the password through the recovery session
- [x] 2.3 Add integration coverage for success, mismatch, and redirect behavior

#### Manual Verification:

- [x] 2.4 Verify a professor account can complete recovery and continue into the app
- [x] 2.5 Verify a student account can complete recovery and continue into the appropriate guarded destination

### Phase 3: Reconcile reset-password and sign-in guidance around the completed flow

#### Automated Verification:

- [x] 3.1 Align auth entry points and messages with the completed recovery flow
- [x] 3.2 Add regression coverage for recovery-specific failures versus generic sign-in failures
- [x] 3.3 Update manual smoke guidance for local and hosted recovery verification

#### Manual Verification:

- [x] 3.4 Confirm local reset-password smoke works end to end without a dead-end return to sign-in
- [ ] 3.5 Confirm hosted reset-password smoke follows the same route expectations
