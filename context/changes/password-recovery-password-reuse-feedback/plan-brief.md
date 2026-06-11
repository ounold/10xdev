# Plan Brief: Password Recovery Password Reuse Feedback

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/password-recovery-password-reuse-feedback/plan.md)

## Starting Point

The recovery flow itself is already implemented, but hosted manual smoke exposed one missing contract detail: Supabase rejects setting the same password again during recovery, and the app currently reflects that as raw provider text.

## Scope

In scope:

- translate the known password-reuse rejection into clear app-owned copy
- add integration proof for that mapping
- document the hosted behavior in recovery smoke guidance

Out of scope:

- changing Supabase policy
- broader auth redesign
- client-side password-history checks

## Proposed Flow

1. Detect the known provider-side password-reuse rejection in the update-password route.
2. Redirect back to `/auth/update-password` with stable product guidance telling the user to choose a different password.
3. Keep all unknown provider failures on the existing generic recovery error path.
4. Update README hosted smoke notes so future recovery testing expects this behavior.

## Success Criteria

- Reusing the current password during recovery no longer looks like an unexplained backend failure.
- Integration tests prove the mapped error behavior.
- Hosted smoke guidance explicitly mentions the retry expectation.
