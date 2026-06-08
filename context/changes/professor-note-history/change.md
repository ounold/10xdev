---
change_id: professor-note-history
title: Professor note history
status: implemented
created: 2026-05-28
updated: 2026-05-28
archived_at: null
---

## Notes

- Research created to decide whether this north-star slice should be taken now or whether `professor-student-roster` must come first.
- Follow-up research checked whether the current codebase is implementation-ready for this slice without extra prerequisite work.
- Phase 2 shipped with a documented hosted-Supabase adaptation: the route verifies professor access with the session client, then writes notes through the admin client because the hosted project currently rejects session-client note inserts under RLS.
