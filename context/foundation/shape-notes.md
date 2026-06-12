---
project: "Post-meeting notes"
context_type: brownfield
created: 2026-06-09
updated: 2026-06-09
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: archival model
      decision: soft-delete student and thread, not hard delete
    - topic: archive visibility
      decision: archived students appear in a separate section of the professor roster
    - topic: archive permissions
      decision: only professor can archive and view archived threads
    - topic: student access after archive
      decision: archived student loses access immediately through UI and API
    - topic: archived thread behavior
      decision: old thread remains historical and read-only for the professor
    - topic: re-registration outcome
      decision: a returning student gets a new active record with no access to archived history
    - topic: email reuse
      decision: archived student email can be reused for a new active student record
    - topic: archive reversibility
      decision: archive is not reversible from the product
    - topic: reprovisioning path
      decision: professor manually creates the new student record
  frs_drafted: 5
  quality_check_status: accepted
---

## Current System

The current system already supports one professor workspace with a per-student roster, per-student supervision threads, shared professor/student note updates, task completion, and student account linking by email. The professor can work through active student threads, while linked students can access only their own current supervision history.

The gap is lifecycle management for finished or obsolete student relationships. Today there is no product-level way to retire a student and their thread without deleting data manually or leaving stale active records in the same roster, which makes the active workspace harder to manage and creates ambiguity around whether an old linked student should still have access.

What must be preserved:

- professor-only visibility across all supervised history
- student isolation and immediate access revocation when a relationship ends
- historical continuity of archived threads for professor review
- the current ability to create a fresh active student record later, including reuse of the same email

## Problem Statement & Motivation

The app needs a product-safe way for the professor to retire a student relationship and its thread without deleting historical supervision data. Right now, once a student has been linked and used in the product, there is no clear in-app lifecycle transition between “active student” and “historical student who should no longer access the workspace.”

This matters now because the current product has already reached the point where roster, shared editing, completion, and student linking all exist. Without archival, the professor workspace accumulates stale students in the active roster and the system has no explicit way to revoke an old linked student's access while preserving supervision history for later professor reference.

## User & Persona

### Primary persona

A single professor supervising multiple students who needs to keep the active roster clean while retaining historical threads for completed or inactive supervision relationships.

### Secondary persona

A former or returning student whose previous account relationship may end, but who may later need a fresh new student record without inheriting access to archived supervision history.

## Success Criteria

### Primary

- The professor can archive an active student and remove that student from the active roster without deleting historical supervision data.
- An archived student immediately loses access to the archived thread.
- The professor can still review archived thread history in a read-only form.

### Secondary

- The professor can distinguish active students from archived students clearly from the same roster surface.
- The same student email can be reused later for a fresh active student record.

### Guardrails

- Archiving must not expose archived history to the student after the archive action.
- Re-registering the same person later must not reconnect them to the archived thread automatically.
- Existing active-student, note, and task flows must continue working for non-archived records.

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
- **When** the professor opens the archive section
- **Then** they can review archived student threads without reactivating them

#### Acceptance Criteria

- Archived students are visible only to the professor
- Archived threads remain readable
- Archived threads do not expose active-editing workflow to the student

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
- [modified] Professor roster view gains a separate section for archived students
- [modified] Student linking/access rules gain an explicit post-archive revocation path
- [modified] Professor thread visibility gains a read-only archived-history branch
- [preserved] Active roster, note creation, shared note updates, task completion, and current student linking continue to work for non-archived students

## Constraints & Compatibility

- Backward compatibility with current active student, note, and note-item records must be preserved.
- Existing active links between `students.student_profile_id` and current student access must remain valid until archive happens.
- Archive must revoke student access both at route/UI level and server/API level.
- Archived history must stay readable to the professor without requiring destructive migration or history loss.
- Reusing the same email later must not require restoring or mutating the archived record back to active.

## Business Logic Changes

Archiving ends an active student-thread relationship without deleting its history, revokes that student's product access immediately, and keeps any later re-registration isolated to a newly created active student record.

Supporting notes:

- Archive is a lifecycle transition, not a content deletion action.
- Archived threads remain part of professor-visible history but stop participating in active student access flows.
- A later student return is modeled as a new active record, not as reactivation of the archived one.

## Access Control Changes

- Only professors can archive students.
- Only professors can view archived students and archived threads.
- Archived students lose access to their previous thread immediately after archive.
- Students who later sign in with the same email may link only to a new active student record prepared by the professor.

## Non-Goals

- No product-level restore/unarchive flow in this change, because archival is intentionally irreversible in the product.
- No automatic recreation or reprovisioning of archived students, because the professor should prepare any returning student record manually.
- No hard deletion of students, notes, or note items, because professor-visible historical continuity must be preserved.
- No broader roster-admin workflow such as merge, transfer, or archive reason management in this slice.

## Open Questions

1. **How should archived professor thread UI communicate read-only state most clearly?** - Needs product/UI decision during implementation planning. Block: no.
