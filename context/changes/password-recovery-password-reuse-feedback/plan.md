---
change_id: password-recovery-password-reuse-feedback
title: Password recovery password reuse feedback
status: planned
created: 2026-06-11
updated: 2026-06-11
owner: codex
linked_change: context/changes/password-recovery-completion-flow/plan.md
---

# Plan: Password recovery password reuse feedback

## Current State Analysis

- The completed recovery flow now reaches a dedicated password-update route and submits the new password through [src/pages/api/auth/update-password.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/update-password.ts).
- The current server route validates only minimum length and confirmation match before delegating to `supabase.auth.updateUser({ password })`. Any provider-side rejection is redirected back as the raw `error.message`: [src/pages/api/auth/update-password.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/update-password.ts).
- Manual hosted smoke uncovered a real contract detail that was not included in the original plan assumptions: Supabase rejects resetting the password to the same value as the current one.
- The current update-password page already has a recovery-specific error surface, so this gap is not architectural. It is a product-feedback gap: the user sees a provider error rather than a clear app-level instruction: [src/pages/auth/update-password.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/update-password.astro).
- Existing integration coverage for password recovery currently proves mismatch, success, and invalid-link behavior, but does not yet lock the “new password must differ from old password” provider contract: [tests/integration/password-recovery-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/password-recovery-contract.test.ts).

## Key Decisions

| Area                | Decision                                                                          | Why                                                                                | Source        |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| Scope size          | Small follow-up slice                                                             | The flow already works; only provider-error handling and proof are missing         | User          |
| Error ownership     | Translate the provider error into product copy                                    | Users should get a clear instruction, not a raw backend message                    | User          |
| Validation boundary | Keep this as server-side contract handling, not local password-history validation | The source of truth remains Supabase/Auth                                          | Plan          |
| Proof               | Add integration coverage plus README/manual note                                  | The issue was discovered in hosted smoke and should be documented as real behavior | User          |
| UX behavior         | Keep the user on `/auth/update-password` with clear retry guidance                | Matches the existing recovery-specific error path                                  | Existing flow |

## Scope

**In scope**

- Detect the provider-side “same password as before” rejection during recovery completion
- Map that rejection to clear app-level recovery guidance
- Add integration coverage for the mapped error contract
- Document the behavior in manual recovery guidance

**Out of scope**

- Changing Supabase password policy itself
- Client-side password-history checks
- Reworking the broader recovery flow
- Reopening the already completed password-recovery slice beyond this narrow feedback fix

## Architecture / Approach

Treat this as a thin contract adapter on top of the already completed recovery flow. The password-update route remains the only place where provider-side recovery-update failures are interpreted. Instead of redirecting raw Supabase text back to the page, the route should normalize the known “same password” failure into stable product copy that tells the user to choose a different password. Integration coverage then locks that mapping so future auth changes do not regress back to raw provider messaging. README/manual smoke guidance should also acknowledge that hosted recovery may reject reuse of the current password, because this is now a verified part of the real system behavior.

## Phases

### Phase 1: Normalize the provider password-reuse error

#### Goal

Turn the hosted “same password” rejection into clear recovery-specific guidance.

#### Required changes

- **File:** [src/pages/api/auth/update-password.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/api/auth/update-password.ts)
  - **Goal:** Map the known provider-side password-reuse rejection to stable product copy.
  - **Contract:** When Supabase rejects the password update because the new password matches the old one, the route should redirect with a clear app-owned message such as “Choose a password different from the current one.”

- **File:** [src/pages/auth/update-password.astro](C:/Users/olguno5421/Documents/GitHub/10xdev/src/pages/auth/update-password.astro) only if copy framing needs a small reinforcement
  - **Goal:** Keep retry guidance explicit and recovery-specific.
  - **Contract:** The page should make it obvious that the user can retry from the same recovery flow with a different password.

- **File:** [tests/integration/password-recovery-contract.test.ts](C:/Users/olguno5421/Documents/GitHub/10xdev/tests/integration/password-recovery-contract.test.ts)
  - **Goal:** Lock the new mapped-error contract.
  - **Contract:** Cover at least:
    - provider-side password-reuse rejection becomes stable app-owned copy
    - generic unknown update failures still surface through the existing recovery error path

#### Success criteria

#### Automated verification:

- [x] Password-reuse rejection is translated into clear app-owned recovery guidance
- [x] Integration coverage proves the mapped error contract
- [x] Unknown provider failures still use the fallback recovery error path

#### Manual verification:

- [x] During hosted reset flow, reusing the current password shows the intended product message
- [x] Retrying with a different password still succeeds through the same flow

### Phase 2: Align hosted smoke guidance with the discovered contract

#### Goal

Record the real-world hosted recovery behavior so future smoke runs do not treat it as a surprise.

#### Required changes

- **File:** [README.md](C:/Users/olguno5421/Documents/GitHub/10xdev/README.md)
  - **Goal:** Update hosted/manual recovery guidance with the observed password-reuse constraint.
  - **Contract:** The reset-password smoke notes should mention that reusing the current password may be rejected and that the expected retry is to choose a different password.

- **Files:** change artifacts under [context/changes/password-recovery-password-reuse-feedback/](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/password-recovery-password-reuse-feedback/)
  - **Goal:** Keep the mini-slice evidence aligned with the actual discovered behavior.

#### Success criteria

#### Automated verification:

- [x] Documentation reflects the discovered password-reuse constraint

#### Manual verification:

- [x] Hosted smoke notes now match the actual observed recovery behavior

## Risks and Mitigations

- **Risk:** Matching the provider error by raw text is brittle.
  - **Mitigation:** Keep the matcher narrow and fallback cleanly to the generic recovery error path for unknown responses.

- **Risk:** We overfit to one hosted message and hide useful provider detail for unrelated failures.
  - **Mitigation:** Translate only the known password-reuse case; preserve existing fallback behavior for everything else.

- **Risk:** The discovered behavior remains undocumented and gets re-triaged repeatedly.
  - **Mitigation:** Capture it in README smoke guidance as part of this mini-slice.

## Progress

### Phase 1: Normalize the provider password-reuse error

#### Automated Verification:

- [x] 1.1 Map the known password-reuse rejection in the update-password route
- [x] 1.2 Add integration coverage for mapped password-reuse vs generic failure behavior
- [x] 1.3 Verify the existing fallback recovery error path still works for unknown provider failures

#### Manual Verification:

- [ ] 1.4 Confirm hosted recovery shows the intended “choose a different password” message when the old password is reused
- [ ] 1.5 Confirm retrying with a different password still succeeds

### Phase 2: Align hosted smoke guidance with the discovered contract

#### Automated Verification:

- [x] 2.1 Update README hosted recovery guidance with the password-reuse constraint

#### Manual Verification:

- [x] 2.2 Confirm the hosted smoke notes now match the observed provider behavior
