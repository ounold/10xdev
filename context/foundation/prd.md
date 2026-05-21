---
project: "Post-meeting notes"
version: 1
status: draft
created: 2026-05-18
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

A university professor supervising multiple master's and doctoral students needs a reliable way to capture and revisit weekly or biweekly arrangements. Today these arrangements are scattered across email and handwritten notes, which leads to forgotten tasks, lost continuity between meetings, and students being unsure what to do next.

The product's core value is not just note storage, but a persistent shared supervision history for each student. Each meeting should produce a durable, structured record that preserves arrangements and progress over time.

## User & Persona

### Primary persona

A single university professor supervising several students in parallel, needing a professor-first workflow that keeps each student's thread coherent over time.

### Secondary persona

A master's or doctoral student who needs clear visibility into agreed next steps, task status, and prior meeting context relevant only to them.

## Success Criteria

### Primary

- The professor can maintain a coherent per-student supervision history across meetings.
- Students can always see the latest agreed next steps for their own work.

### Secondary

- Meeting notes stay brief and easy to update.
- Students can add clarifications or progress updates between meetings.

### Guardrails

- Access separation between students must remain correct.
- Later edits must not erase continuity of what was previously agreed.

## User Stories

### US-01: Professor creates a note after a meeting

- **Given** a professor has finished a meeting with a specific student
- **When** the professor creates a new post-meeting note for that student
- **Then** they can record the agreed arrangements as short bullet points tied to that student's history

#### Acceptance Criteria
- A note is associated with exactly one student
- The note supports short bullet-point entries rather than requiring long-form text
- The created note appears in that student's chronological supervision history

### US-02: Student reviews their own note history

- **Given** a student is logged in
- **When** they open their own supervision notes
- **Then** they can review past arrangements, current task status, and prior meeting context related only to them

#### Acceptance Criteria
- A student can access only their own notes
- Notes are presented in chronological order
- The student can distinguish current items from previously completed ones

### US-03: Professor or student marks a task-like bullet as completed

- **Given** a note contains a bullet point representing a follow-up task or commitment
- **When** the professor or the assigned student marks that item as completed
- **Then** the completion state becomes visible in the shared note history

#### Acceptance Criteria
- Task-like items can be marked completed individually
- Both the professor and the assigned student can update completion state
- Completion status remains visible when the note is revisited later

### US-04: Student updates an existing note

- **Given** a student is viewing one of their own existing notes
- **When** they add clarification or progress information after the meeting
- **Then** the shared record is updated while preserving continuity of what was previously agreed

#### Acceptance Criteria
- A student can edit only notes associated with them
- Student edits become part of the shared record without creating a separate approval queue
- The updated state is clearly visible to the professor

### US-05: Professor reviews one student's supervision thread

- **Given** a professor supervises multiple students
- **When** the professor opens the note history for one selected student
- **Then** they can understand continuity across meetings and see what was agreed, updated, or completed over time

#### Acceptance Criteria
- The professor can access the full note history for any supervised student
- The history shows continuity across multiple meetings for one student
- The professor can understand the current state without searching through email or paper notes

## Functional Requirements

- FR-001: Professor can create a post-meeting note for exactly one student and assign it a meeting date. Priority: must-have
- FR-002: Professor can record note content as short bullet-point items. Priority: must-have
- FR-003: Student can sign in and access only notes associated with that student account. Priority: must-have
- FR-004: Professor can view the chronological note history for any supervised student. Priority: must-have
- FR-005: Student can view their own chronological note history. Priority: must-have
- FR-006: Professor and assigned student can edit a shared note after it is created. Priority: must-have
- FR-007: Professor and assigned student can mark individual task-like note items as completed. Priority: must-have
- FR-008: The system preserves visible continuity of note updates over time for each student. Priority: must-have

## Non-Functional Requirements

- The system must preserve access separation so that each student can access only their own notes.
- The system must preserve a visible history of note evolution so later edits do not erase prior continuity.
- Each note must show its last edited time so shared updates remain visible without requiring a full revision log.
- The product must remain usable for one professor supervising up to a few dozen students.

## Business Logic

Each meeting note belongs to exactly one student, remains part of that student's visible chronological supervision history, and contains brief bullet-point items where some entries are actionable and may be marked completed over time.

The note structure is intentionally lightweight: a note is primarily a set of short bullet points rather than a long narrative record. Some bullet points are informational and some represent follow-up tasks or commitments that can change status over time.

The user's core interaction with the product is revisiting a student's history, understanding what was agreed, seeing what changed since the last meeting, and updating the current state without losing the thread of prior arrangements.

## Access Control

The professor has full access to all student notes. Each student logs in individually using magic link authentication and can access only the notes associated with them. Both the professor and the assigned student can edit a note, and either side can mark a task item as completed.

## Non-Goals

- Notifications and reminders are out of scope for the MVP so the first release can focus on continuity and note clarity.
- Calendar integration is out of scope for the MVP because supervision scheduling is not the first product problem being solved.
- File and document storage are out of scope for the MVP because thesis or paper artifact management is a separate workflow.
- Department-wide multi-professor support is out of scope for the MVP because the first version is optimized for a single professor.
- Email integration is out of scope for the MVP because the product should not depend on synchronizing arrangements from inboxes in v1.

## Open Questions

1. **No open MVP-defining questions at this stage.** - The current PRD is sufficient to proceed to the next step. Future questions may emerge during tech-stack selection or implementation planning.
