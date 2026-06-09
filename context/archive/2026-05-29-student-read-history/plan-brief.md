# Student read history - brief

- Reuse `/dashboard`, but render a dedicated student-facing history view when the signed-in user is a linked student.
- Keep student linking out of scope for the UI; `S-03` consumes already-linked records only.
- Keep unlinked students on `pending-access` with clearer student-oriented copy.
- Deliver read-only chronological note history with visible distinction between informational items and task items.
- Verify the slice against one linked student account on hosted Supabase.
