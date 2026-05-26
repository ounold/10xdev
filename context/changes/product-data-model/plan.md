---
change_id: product-data-model
title: Product data model, migrations, and row-level security
status: planned
created: 2026-05-26
updated: 2026-05-26
---

# Implementation Plan: Product data model, migrations, and row-level security

## Summary

Introduce the first supervision-domain data layer in Supabase so the app can model professors, students, dated notes, and ordered note items with enforceable access control. The change establishes the schema, row-level security, minimal development seed/helpers, and typed application contracts needed to unblock `S-01` and `S-02` without collapsing `F-01` into professor bootstrap or UI work.

## Current State Analysis

- The app already has server-side Supabase auth wiring, but only for generic authentication; there is no supervision-domain persistence yet in the app layer or database: [src/lib/supabase.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supabase.ts), [src/middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts).
- The current protected experience is a placeholder dashboard that only reads the authenticated user's email, so there is no existing product data model to preserve: [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro).
- Supabase local config exists and migrations are enabled, but the repository has no `supabase/migrations/` directory or domain SQL yet; README still documents a built-in-auth-only setup: [supabase/config.toml](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\config.toml), [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md).
- Server secrets are already modeled correctly through Astro env schema, so the data foundation should keep using server-side clients and avoid any client-side key exposure: [astro.config.mjs](C:\Users\olguno5421\Documents\GitHub\10xdev\astro.config.mjs).

## Key Decisions

| Area | Decision | Rationale |
|---|---|---|
| Ownership model | Single-professor ownership per student | Matches the MVP directly and keeps first-pass RLS legible. |
| User modeling | Separate app profile table with role field | Gives SQL and app code a stable domain identity layer over `auth.users`. |
| Note shape | `notes` plus `note_items` table | Supports dated notes, ordered bullets, and future per-item completion without JSON workarounds. |
| Item semantics | Explicit item type (`info` / `task`) | Avoids inference and cleanly prepares `S-05`. |
| Continuity fields | `created_by`, `updated_by`, `updated_at` | Satisfies current PRD continuity without a full revision log. |
| Completion fields | `completed_at`, `completed_by` | Preserves who/when on task completion with simple state. |
| Item ordering | Explicit `position` per note item | Gives the UI a stable ordering contract from day one. |
| Security | Full domain RLS in F-01 | Keeps security as part of the foundation instead of postponing it into slices. |
| Bootstrap boundary | Schema prepared now, first-owner activation in F-02 | Preserves the roadmap split between data foundation and ownership bootstrap. |
| Profile provisioning | Create profile rows automatically for authenticated users, but do not assign first-professor ownership yet | Keeps domain identity available for RLS and future slices without collapsing F-02 into F-01. |
| Scope of foundation | SQL + RLS + dev seed/helpers + typed app contracts | Leaves the next slices with a usable platform, not just raw migrations. |

## Scope

**In scope**

- Create domain schema for profiles, students, notes, and note items.
- Define enums or constrained fields for roles and item types.
- Add timestamp, authorship, and completion fields required by the PRD.
- Add RLS policies for professor-global access and student-self access.
- Add minimal local seed and/or helper path to validate the model during development.
- Add typed application contracts so follow-up work can query the new schema without re-inventing types.
- Update documentation where the repo currently claims there are no app tables or migrations.

**Out of scope**

- UI for student roster, note creation, or note editing.
- Real first-professor claiming/bootstrap flow.
- Rich revision history or audit log tables.
- Realtime collaboration/conflict handling.
- Full production sample dataset or demo content.

## Architecture / Approach

The change should add a thin domain layer on top of Supabase Auth. `auth.users` remains the identity source, while a new app-level profile table records the role (`professor` or `student`) for each user. F-01 should also ensure that a profile row is provisioned automatically for each authenticated user, but it must stop short of solving which account becomes the first professor owner; that ownership activation remains in `F-02`. Students are owned by exactly one professor profile. Notes belong to one student and carry authorship/last-edit metadata. Note items belong to one note, keep explicit `position`, explicit `item_type`, and optional completion fields. RLS policies enforce the product rule directly in SQL: professors can access records in their owned supervision graph, while students can access only their own assigned graph. The app layer then exposes a single hand-maintained TypeScript contract module for these tables so later routes and pages can build on a stable schema without introducing generation tooling in this foundation.

## Phases

## Phase 1: Establish the domain schema

### Goal

Create the durable supervision-domain tables and constraints in Supabase so the repository has a real product data model instead of auth-only persistence.

### Required changes

- **`supabase/migrations/<timestamp>_create_supervision_domain.sql`**
  - **Purpose:** Introduce the first migration containing the supervision-domain schema.
  - **Contract:** Define app-level tables for user profiles, students, notes, and note items; include primary keys, foreign keys, not-null constraints, timestamps, role semantics, explicit note-item type, explicit `position`, and completion metadata (`completed_at`, `completed_by`) for task items.

- **`supabase/migrations/<timestamp>_create_supervision_domain.sql`** and, if needed, companion SQL helpers/triggers
  - **Purpose:** Ensure authenticated users can participate in the domain model before `F-02` solves first-owner activation.
  - **Contract:** Provision a profile row automatically for each authenticated user created in Supabase Auth, but do not encode “first professor becomes workspace owner” logic here; the migration should only guarantee profile existence and role-capable schema.

- **`supabase/migrations/<timestamp>_create_supervision_domain.sql`**
  - **Purpose:** Encode invariants in SQL so downstream slices inherit safe behavior by default.
  - **Contract:** Enforce single-professor ownership for each student, one-student-per-note, one-note-per-note-item, stable ordering within a note, and field-level constraints that prevent impossible states such as task completion metadata on missing items or invalid role/item type values.

- **`README.md`**
  - **Purpose:** Align onboarding docs with the new reality that the project now owns domain tables and migrations.
  - **Contract:** Remove or revise statements that claim the app uses only `auth.users`; describe that local Supabase now includes supervision-domain migrations and minimal seed/supporting helpers.

### Success criteria

#### Automated verification:
- [ ] A Supabase migration exists under `supabase/migrations/` and parses cleanly.
- [ ] Schema objects for profiles, students, notes, and note items are created by the migration.

#### Manual verification:
- [ ] The table design clearly supports `F-02`, `S-01`, and `S-02` without needing structural rewrites.
- [ ] The schema documentation in README no longer contradicts the repository state.

## Phase 2: Add row-level security and access helpers

### Goal

Make the schema safe and product-aligned by encoding professor/student access rules directly in SQL before any slice starts querying the domain tables.

### Required changes

- **`supabase/migrations/<timestamp>_enable_supervision_rls.sql`** or follow-up statements in the domain migration
  - **Purpose:** Turn product access rules into enforceable row-level security.
  - **Contract:** Enable RLS on all domain tables and define policies so professors can access the records in their supervision graph, while students can access only their own records and related notes/note items. Policies must be compatible with the future bootstrap flow from `F-02` instead of hard-coding local-only assumptions.

- **`supabase/migrations/<timestamp>_enable_supervision_rls.sql`** or database helper definitions
  - **Purpose:** Keep policies readable and maintainable.
  - **Contract:** If policy complexity warrants it, add narrowly-scoped SQL helper functions or views for “current app profile”, “student owned by professor”, or “student assigned to authenticated user” checks; helpers must remain deterministic and safe for RLS use.

- **`context/changes/product-data-model/change.md`**
  - **Purpose:** Keep the change metadata in sync with planning state.
  - **Contract:** Update `status` and `updated` only when implementation begins through `/10x-implement`; this plan assumes no manual mutation now.

### Success criteria

#### Automated verification:
- [ ] RLS is enabled on every new domain table.
- [ ] Policies exist for professor access and student-self access across the supervision graph.

#### Manual verification:
- [ ] A reader can explain from the SQL why a professor sees all owned students while a student sees only their own thread.
- [ ] The policies do not depend on the first-professor bootstrap flow already being implemented.

## Phase 3: Add development seed/helpers and typed app contracts

### Goal

Make the new schema usable by subsequent slices without turning F-01 into full application work.

### Required changes

- **`supabase/seed.sql` and/or additional seed helper files referenced from `supabase/config.toml`**
  - **Purpose:** Provide the minimum local development path to validate the schema and RLS.
  - **Contract:** Add minimal dev seed data or helper SQL that can create one professor-owned supervision graph and one student-linked graph without pretending to solve the full first-owner flow; keep the dataset intentionally small.

- **`src/lib/database.ts`**
  - **Purpose:** Give the app a stable TypeScript contract for the new tables before feature slices start consuming them.
  - **Contract:** Export the hand-maintained TypeScript representations of the new domain tables and enum/value shapes used by upcoming slices. This file is the single app-facing contract module for F-01 and must be importable via the `@/*` alias.

- **`README.md` and, if needed, `AGENTS.md`**
  - **Purpose:** Document any new local workflow expectations.
  - **Contract:** If local validation now depends on running migrations or seeds, document the minimal commands and expectations without duplicating broad Supabase docs unnecessarily.

### Success criteria

#### Automated verification:
- [ ] Local setup includes a deterministic way to apply migrations and load minimal development seed data.
- [ ] A typed app-level module exists for the new domain contracts and can be imported from `src/`.

#### Manual verification:
- [ ] The next slice can start from typed domain objects instead of reverse-engineering raw SQL.
- [ ] The local dev seed is intentionally minimal and does not sprawl into demo-fixture maintenance.

## Testing Strategy

### Automated

- Run the relevant Supabase local workflow to apply migrations and seed data.
- Run `npm run lint`.
- Run `npm run build`.

### Manual

- Inspect the resulting schema in local Supabase Studio.
- Validate the intended access graph conceptually against PRD and roadmap decisions.
- Smoke-check that repository docs accurately describe the post-change setup.

## Risks and Mitigations

- **Risk:** RLS logic becomes too coupled to a bootstrap mechanism not yet implemented.
  - **Mitigation:** Keep profile/ownership schema ready for bootstrap, but avoid policies that require F-02-specific seeding semantics to function.

- **Risk:** Over-designing for future co-supervisor support complicates MVP security.
  - **Mitigation:** Stick to single-professor ownership in the schema and capture future extensibility only as a later migration path, not current structure.

- **Risk:** Using weak note-item semantics now forces painful follow-up migrations.
  - **Mitigation:** Commit to explicit `item_type`, explicit `position`, and explicit completion metadata in F-01.

- **Risk:** The app layer drifts from the database contract immediately after migration land.
  - **Mitigation:** Add typed contracts in the same change instead of leaving type shape to future slices.

## References

- [context/changes/product-data-model/change.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\product-data-model\change.md)
- [context/foundation/roadmap.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\roadmap.md)
- [context/foundation/prd.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\foundation\prd.md)
- [src/lib/supabase.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\lib\supabase.ts)
- [src/middleware.ts](C:\Users\olguno5421\Documents\GitHub\10xdev\src\middleware.ts)
- [src/pages/dashboard.astro](C:\Users\olguno5421\Documents\GitHub\10xdev\src\pages\dashboard.astro)
- [README.md](C:\Users\olguno5421\Documents\GitHub\10xdev\README.md)
- [supabase/config.toml](C:\Users\olguno5421\Documents\GitHub\10xdev\supabase\config.toml)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Establish the domain schema

#### Automated

- [x] 1.1 Create a Supabase migration under `supabase/migrations/` that defines the supervision-domain schema — 981c3d5
- [x] 1.2 Ensure the migration creates schema objects for profiles, students, notes, and note items — 981c3d5

#### Manual

- [x] 1.3 Verify the schema shape cleanly supports F-02, S-01, and S-02 without structural rewrites — 981c3d5
- [x] 1.4 Confirm the schema documentation in README no longer contradicts the repository state — 981c3d5

### Phase 2: Add row-level security and access helpers

#### Automated

- [x] 2.1 Enable RLS on all new domain tables
- [x] 2.2 Add policies for professor access and student-self access across the supervision graph

#### Manual

- [x] 2.3 Review the SQL and confirm it clearly explains why professors see owned records and students see only their own thread
- [x] 2.4 Confirm the policy model does not depend on the first-professor bootstrap flow already being implemented

### Phase 3: Add development seed/helpers and typed app contracts

#### Automated

- [ ] 3.1 Provide a deterministic local setup path to apply migrations and load minimal development seed data
- [ ] 3.2 Add an importable typed app-level module for the new domain contracts

#### Manual

- [ ] 3.3 Confirm the next slice can start from typed domain objects instead of reverse-engineering raw SQL
- [ ] 3.4 Confirm the local dev seed is intentionally minimal and does not sprawl into demo-fixture maintenance
