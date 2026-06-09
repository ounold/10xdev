---
project: "Post-meeting notes"
context_type: greenfield
created: 2026-05-18
updated: 2026-05-18
checkpoint:
  current_phase: 6
  phases_completed: [1, 2, 3, 4, 5]
  gray_areas_resolved:
    - topic: pain category
      decision: coordination overhead
    - topic: mvp focus
      decision: professor first
    - topic: default note owner
      decision: professor writes the arrangements
    - topic: primary persona
      decision: a single professor supervising several students
    - topic: authentication
      decision: no strong preference yet; standard per-person login is enough
    - topic: note editing
      decision: professor and assigned student can both edit
    - topic: task completion
      decision: either side can mark a task completed
    - topic: mvp scope
      decision: meeting notes, tasks, and per-student history
    - topic: time horizon
      decision: both short-term and long-term continuity matter from the start
    - topic: student value
      decision: clarity on next steps
    - topic: scale
      decision: up to a few dozen students for v1
    - topic: hardest requirement
      decision: keep each student's supervision thread coherent over time
    - topic: non-goal
      decision: notifications and reminders are out of scope for MVP
    - topic: core rule
      decision: notes should be brief, preferably bullet points, with per-point completion
    - topic: note item model
      decision: mixed model; some bullets are informational and some are tasks
    - topic: edit history
      decision: keep evolving history visible
    - topic: post-meeting editing value
      decision: preserve understanding, correct mistakes, and add progress updates equally
    - topic: student edits visibility
      decision: professor should see the updated state clearly
    - topic: out of scope
      decision: notifications/reminders, calendar integration, file/document storage, department-wide multi-professor support, and email integration
    - topic: product type
      decision: web app
    - topic: target users
      decision: small; professor plus current students
    - topic: timeline
      decision: 3 weeks for first usable MVP
    - topic: work mode
      decision: mix of after-hours and normal work
  frs_drafted: 0
  quality_check_status: pending
---

## Vision & Problem Statement

A university professor supervising multiple master's and doctoral students needs a reliable way to capture and revisit weekly or biweekly arrangements. Today these arrangements are scattered across email and handwritten notes, which leads to forgotten tasks, lost continuity between meetings, and students being unsure what to do next.

The product's core value is not just note storage, but a persistent shared supervision history for each student. Each meeting should produce a durable, structured record that preserves arrangements and progress over time.

## User & Persona

### Primary persona

A single university professor supervising several students in parallel, needing a professor-first workflow that keeps each student's thread coherent over time.

### Secondary persona

A master's or doctoral student who needs clear visibility into agreed next steps, task status, and prior meeting context relevant only to them.

## Access Control

The professor has full access to all student notes. Each student logs in individually and can access only the notes associated with them. Both the professor and the assigned student can edit a note, and either side can mark a task item as completed.

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

## MVP Shape

- Shared meeting notes per student
- Bullet-point note structure
- Mixed note items: informational bullets and actionable bullets
- Per-point completion tracking
- Per-student history across short-term and long-term supervision

## Business Logic

Each meeting note belongs to exactly one student, remains part of that student's visible chronological supervision history, and contains brief bullet-point items where some entries are actionable and may be marked completed over time.

## Non-Goals

- Notifications and reminders are out of scope for MVP.
- Calendar integration is out of scope for MVP.
- File and document storage are out of scope for MVP.
- Department-wide multi-professor support is out of scope for MVP.
- Email integration is out of scope for MVP.

## Product Frame

- Product type: web app
- Initial scale: small, centered on one professor and current students, with comfort up to a few dozen students
- First usable MVP target: about 3 weeks
- Work mode: mix of after-hours and normal work
