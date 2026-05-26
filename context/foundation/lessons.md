# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at the start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Sync backlog artifacts after closing a change

- **Context**: Any change that reaches implemented/closed state and also has mirrored tracking in `context/foundation/tasks-github.md`, GitHub Issues, and Linear.
- **Problem**: The repo artifact snapshot, GitHub backlog, and Linear mirror drift apart after implementation if they are not updated in a fixed order, which makes the next planning step ambiguous.
- **Rule**: After closing implementation of a change, first update `context/foundation/tasks-github.md`, then update the corresponding GitHub Issues, and only after that mirror the same status changes into Linear. Treat this as part of change close-out, not optional documentation cleanup.
- **Applies to**: plan, plan-review, implement, impl-review
