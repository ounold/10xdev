---
change_id: testing-access-safety-and-critical-flows
title: Testing access safety and critical flows
status: archived
created: 2026-06-01
updated: 2026-06-09
archived_at: 2026-06-09T10:45:00Z
---

## Notes

- Rollout Phase 1 from `context/foundation/test-plan.md`.
- Focuses on the highest-risk path first: linked and unlinked student access, shared `/dashboard` routing safety, and regression protection for existing professor flows.
- Planned test layers for this phase: critical-path e2e plus hosted smoke verification.
- Research grounded the real access, routing, and hosted-verification boundaries before the rollout plan was written.
- Phase 1 now includes a minimal Playwright setup, one shared-dashboard critical-path spec, and support helpers for role-based sign-in.
- The automated spec intentionally relies on an already-running localhost dev server because this Windows/Codex environment does not reliably support Playwright-managed Astro startup inside the sandbox.
- Phase 2 documents the localhost precondition, the env-gated account checks, and the required hosted smoke trio: linked student, unlinked student, and professor sentinel.
