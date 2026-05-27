---
change_id: product-data-model
title: Product data model, migrations, and row-level security
updated: 2026-05-26
source_plan: context/changes/product-data-model/plan.md
---

# Plan Brief: Product data model, migrations, and row-level security

See full plan: [context/changes/product-data-model/plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\product-data-model\plan.md)

## Goal

Create the first real supervision-domain data foundation in Supabase so the app can model professors, students, notes, and note items with enforceable access control, while leaving first-professor bootstrap flow to `F-02`.

## Starting Point

- The app already has working Supabase SSR auth and route protection, but no domain persistence beyond `auth.users`: [src/lib/supabase.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supabase.ts), [src/middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts).
- The current authenticated UI is only a placeholder dashboard, so this change does not need to preserve an existing supervision feature surface: [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro).
- The repo has Supabase local config but no migrations directory or domain SQL yet, and README still describes an auth-only setup: [supabase/config.toml](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\config.toml), [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md).

## Key Decisions

| Area | Decision | Why |
|---|---|---|
| Ownership | One professor owns each student | Simplest model that matches MVP and keeps RLS clear |
| Identity layer | App profile table with role field over `auth.users` | Gives SQL and app code a stable domain identity |
| Note model | `notes` + `note_items` | Supports dated notes, ordered bullets, and later completion |
| Item semantics | Explicit item type (`info` / `task`) | Avoids future inference/migration pain |
| Continuity | `created_by`, `updated_by`, `updated_at` | Matches PRD without full revision history |
| Completion | `completed_at`, `completed_by` | Preserves who/when with simple state |
| Ordering | Explicit `position` field | Stable rendering contract for bullet order |
| Security | Full domain RLS in F-01 | Makes security part of the foundation, not a later patch |
| Bootstrap boundary | Schema now, first-owner activation later in `F-02` | Preserves roadmap boundaries |
| Profile provisioning | Auto-create app profiles for authenticated users, but leave first-owner activation to `F-02` | Makes domain identity available without collapsing roadmap boundaries |

## Scope

**In scope**

- Domain tables for profiles, students, notes, and note items
- SQL constraints and enums/value constraints
- RLS policies for professor and student access
- Minimal local dev seed/helpers
- Typed app contracts for the new schema
- Doc updates for the new local setup reality

**Out of scope**

- Professor bootstrap UX/flow
- Student roster UI
- Note creation/editing UI
- Full revision history
- Rich demo dataset

## Architecture / Approach

Keep `auth.users` as the authentication source and add an app-level profile table for roles. F-01 should ensure profile rows are created automatically for authenticated users, while leaving first-professor ownership activation to `F-02`. Students belong to exactly one professor profile. Notes belong to one student. Note items belong to one note and carry explicit type, explicit order, and optional completion metadata. RLS should express the product rule directly: professors can access their owned supervision graph; students can access only their own assigned graph. The app then gets a single hand-maintained typed contract module in `src/lib/database.ts` for follow-up slices.

## Phases in Brief

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Domain schema | Core supervision tables and constraints | Over- or under-modeling the MVP domain |
| 2. Row-level security | Product-aligned professor/student access rules | Policies drifting into bootstrap assumptions |
| 3. Dev usability | Minimal seed/helpers and typed app contracts | Foundation stopping at SQL and leaving slices blocked |

**Prerequisites:** local Supabase workflow must run in this repo; implementation should be able to add `supabase/migrations/`, seed support, and `src/lib/` contract files.

**Estimated effort:** ~2-3 focused implementation sessions across 3 phases.

## Risks and Assumptions

- The first-professor claiming flow will be solved in `F-02`, not hidden inside this foundation.
- Full student-self access should be represented in RLS now, even if no student UI consumes it yet.
- Minimal dev seed means “enough to validate schema and policies”, not “prepare demo content”.

## Success Criteria

- The repository has a real supervision-domain schema with migrations, not just auth-only persistence.
- Access rules are enforceable in SQL for professor-owned and student-self views.
- The next slices can build on typed domain contracts and documented local workflow instead of rediscovering the schema.
