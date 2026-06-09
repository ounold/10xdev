---
change_id: professor-bootstrap
title: Professor bootstrap
status: archived
created: 2026-05-27
updated: 2026-06-09
archived_at: 2026-06-09T10:00:00Z
---

## Notes

- Local manual verification exposed one missing runtime prerequisite for bootstrap: `SUPABASE_SERVICE_ROLE_KEY` must be present alongside `BOOTSTRAP_PROFESSOR_EMAIL`, otherwise allowlisted professor login reaches the bootstrap path and fails before role claim.
- Manual verification confirmed the intended two-account flow locally: the allowlisted professor account lands on the professor shell with `role: professor`, and a separate non-allowlisted account lands on `pending-access`.
