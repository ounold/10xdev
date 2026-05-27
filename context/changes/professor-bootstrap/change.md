---
change_id: professor-bootstrap
title: Professor bootstrap
status: implemented
created: 2026-05-27
updated: 2026-05-27
archived_at: null
---

## Notes

- Local manual verification exposed one missing runtime prerequisite for bootstrap: `SUPABASE_SERVICE_ROLE_KEY` must be present alongside `BOOTSTRAP_PROFESSOR_EMAIL`, otherwise allowlisted professor login reaches the bootstrap path and fails before role claim.
- Manual verification confirmed the intended two-account flow locally: the allowlisted professor account lands on the professor shell with `role: professor`, and a separate non-allowlisted account lands on `pending-access`.
