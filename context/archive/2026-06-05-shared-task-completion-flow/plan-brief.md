# Plan Brief: Shared task completion flow

Full plan: [plan.md](C:/Users/olguno5421/Documents/GitHub/10xdev/context/changes/shared-task-completion-flow/plan.md)

## Why This Change

`S-05` is the natural follow-on slice after shared note continuity. The data model and RLS already support task completion, but the app still has no typed completion contract, no route path, and no UI that can mark a durable `task` item complete. Without a deliberate slice now, completion risks being bolted onto the broad note-edit flow and weakening the clean seam built in `S-04`.

## Starting Point

- `note_items` already carry `completed_at` and `completed_by`
- SQL already enforces that only `task` items may be completed
- RLS already allows accessible item updates and constrains `completed_by`
- thread UIs already distinguish `task` from `info`
- current professor and student thread views explicitly avoid completion controls today

## Key Decisions

| Decision area        | Choice                                                  | Why                                                            | Source          |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------------- | --------------- |
| Completion authority | Professor and linked student can both toggle completion | Matches the shared-thread model already in place               | Plan            |
| Reversibility        | Any accessible actor can complete and undo              | Smallest practical workflow; schema and RLS already support it | Research + Plan |
| Mutation seam        | Dedicated item-level helper and route                   | Keeps workflow state separate from note-content editing        | Research + Plan |
| UI surface           | Controls live on rendered task items in thread view     | Avoids forcing note-edit mode for a small workflow action      | Plan            |
| Completion signal    | Visual completed state plus `Completed by X on Y`       | Makes status and continuity legible together                   | Plan            |

## Scope

**In scope:**

- one durable-task completion contract in the app layer
- professor and linked-student completion toggle paths
- completion rendering and metadata in both thread views
- focused integration coverage for contract behavior
- focused e2e coverage for one happy path and one denial path

**Out of scope:**

- new migrations or RLS rewrites
- completion for `info` items
- separate completed-task sections or reordered thread layout
- full completion history
- bulk task management
- merging completion into the broad note-edit payload

## Architecture / Approach

Add a narrow completion helper in `src/lib/supervision.ts` that mutates one durable `task` item by `note_item.id`, setting or clearing `completed_at` and `completed_by` while preserving `note_id`, `position`, and content. Expose that through thin professor and student route paths. Render completion controls directly on task items in existing thread cards, and show both a clear completed visual state and `Completed by ... on ...` metadata. Keep note editing and task completion as separate seams.

## Phases in Brief

| Phase                              | What it delivers                                                         | Key risk                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1. Completion contract             | Typed item-level completion input, focused helper, integration proof     | Completion logic drifts into the broad note-edit payload              |
| 2. Professor completion UI         | Professor route and thread controls for complete / undo                  | UI implies a larger task-management system than this slice delivers   |
| 3. Student completion + boundaries | Linked-student controls plus browser proof of happy path and denial path | Student completion leaks into foreign-task or professor-only surfaces |

**Prerequisites:** Shared note continuity remains intact, durable `note_item.id` values stay stable, and repo-local Playwright auth fixtures remain usable.
**Estimated effort:** ~2 implementation sessions across 3 phases.

## Open Risks and Assumptions

- Completion is assumed to remain binary, not multi-state.
- Completed tasks are assumed to stay in-place in thread order.
- Shared completion authority is assumed to be acceptable product behavior for MVP.

## Success Criteria

- A professor or linked student can complete and reopen an accessible `task` item without entering note-edit mode.
- Completed tasks clearly show both status and who/when metadata.
- The completion flow preserves role boundaries and stable item identity.
