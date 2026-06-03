---
change_id: testing-continuity-and-read-model-integration
title: Testing continuity and read model integration
status: in_progress
created: 2026-06-03
updated: 2026-06-03
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- Phase 1 now includes a minimal Vitest setup for shared read-model integration tests.
- The first continuity spec protects newest-first note ordering, same-date `created_at` tie-break behavior, item `position` ordering, and `info` / `task` semantic preservation in `src/lib/supervision.ts`.
- In this Windows/Codex environment, `npm run test:integration` required running outside the sandbox because Vitest/esbuild hit filesystem access limits while loading config.
