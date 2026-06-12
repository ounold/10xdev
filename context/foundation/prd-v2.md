---
project: "Post-meeting notes"
version: 2
status: draft
created: 2026-06-09
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: "# TODO: delivery_weeks - see Open Questions"
  hard_deadline: null
  after_hours_only: "# TODO: after_hours_only - see Open Questions"
---

## Current System Overview

Post-meeting notes is a web application for professor-led supervision threads, where one professor manages a roster of students and shared post-meeting notes per student.

The current system is a server-rendered web app with React islands and server-side route protection, backed by Supabase authentication and database access. It runs as a single product surface with professor and student roles, per-student threads, shared note editing, task completion, and account-linking flows.

The current user base is one professor workspace with a small supervised cohort. Today the core functionality includes active student roster management, chronological supervision history, shared professor/student note updates, task completion state, and student access linking by email.

## Problem Statement & Motivation

The product currently has no safe in-app way to retire a student relationship once supervision ends or becomes obsolete. The professor must either leave stale students in the active roster or manipulate data manually, while the previously linked student may still remain conceptually tied to an old thread.

This change is needed now because the product already supports end-to-end supervision collaboration and account linking, so the missing lifecycle transition has become a real operational gap rather than a future edge case. The current workaround is to keep inactive records visible or modify data outside the product, which increases roster noise, weakens lifecycle clarity, and risks incorrect lingering access assumptions.

## User & Persona

### Primary persona

A university professor supervising multiple students who needs to keep the active roster focused on current relationships while preserving historical supervision threads for later reference.

### Secondary persona

A former or returning student whose prior relationship has ended and who may later need a fresh account-to-student linkage without inheriting access to archived history.

## Success Criteria

### Primary

- The professor can archive an active student and remove that student from the active roster without deleting supervision history.
- An archived student immediately loses access to the archived thread across both UI and API paths.
- The professor can review archived thread history in a read-only form.

### Secondary

- The professor can distinguish active and archived students clearly from one roster surface.
- The same student email can be reused later for a newly prepared active student record.

### Guardrails

- Existing active-student note and task flows must continue to work for non-archived students.
- Archiving must not reconnect a later returning student to the old archived thread.
- Archived history must remain visible only to the professor.

## User Stories

### US-01: Professor archives a student relationship

- **Given** a professor has an active student with an existing supervision thread
- **When** the professor archives that student from the roster
- **Then** the student leaves the active roster, the old thread becomes historical, and the archived student can no longer access it

#### Acceptance Criteria

- Only the professor can trigger archive
- The archived student no longer appears in the active roster
- Existing notes and task history are preserved for professor read-only review

### US-02: Professor reviews archived supervision history

- **Given** a professor has archived one or more students
- **When** the professor opens the archive section on the roster
- **Then** they can review archived student threads without reactivating them

#### Acceptance Criteria

- Archived students are visible only to the professor
- Archived threads remain readable
- Archived threads do not expose active editing or student access paths

### US-03: Returning student gets a fresh active record

- **Given** a previously archived student returns later with the same email
- **When** the professor creates a new active student record and the student signs in again
- **Then** the student can link only to the new active record and not to the archived thread

#### Acceptance Criteria

- The archived email can be reused
- The professor creates the replacement record manually
- The new login path does not regain archived history access

## Scope of Change

- [modified] Student lifecycle gains an archive transition from active roster state to archived roster state
- [modified] Professor roster view gains a separate archive section on the same surface
- [modified] Student linking and access rules gain an explicit post-archive revocation path
- [modified] Professor thread visibility gains a read-only archived-history branch
- [preserved] Active roster, shared note updates, task completion, and current linking behavior continue to work for non-archived students
- [removed] Any implicit assumption that an ended student relationship remains part of the active roster indefinitely

## Constraints & Compatibility

- Backward compatibility with current active student, note, and note-item records must be preserved.
- Existing active route and API behavior must remain unchanged for non-archived students.
- Archive must revoke student access at both UI and server/API levels.
- Archived history must remain readable to the professor without destructive data loss.
- Reusing the same email later must not require restoring the archived student back to active state.
- Any persistence changes must preserve current linking data until the archive transition is executed.

## Business Logic Changes

The current rule is that a linked student record remains part of the active supervision space until manually altered outside the product. This change introduces an explicit lifecycle transition: archiving ends the active student-thread relationship without deleting its history, revokes that student's access immediately, and keeps the old thread as professor-only historical record.

A later return is modeled as a new active student record prepared by the professor, not as reactivation of the archived one. That keeps archived history immutable in product terms while allowing the same email identity to participate again through a separate active relationship.

## Access Control Changes

- Only professors can archive students.
- Only professors can view archived students and archived threads.
- Archived students lose access to their previous thread immediately after archive.
- Students who later sign in with the same email may link only to a newly prepared active student record.

## Non-Goals

- No product-level restore or unarchive flow, because archival is intentionally irreversible in the product.
- No hard deletion of students, notes, or note items, because historical supervision continuity must be preserved.
- No automatic recreation or reprovisioning of returning students, because the professor should prepare new active records manually.
- No archive-reason taxonomy, merge flow, or broader roster administration redesign in this slice.

## Open Questions

1. **What is the target delivery window for this brownfield change?** - Owner: user. Block: no.
2. **Is this change being delivered in after-hours mode only?** - Owner: user. Block: no.
3. **How should archived professor thread UI communicate read-only state most clearly?** - Needs product/UI decision during implementation planning. Block: no.
