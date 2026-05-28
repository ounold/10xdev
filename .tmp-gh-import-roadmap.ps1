$repo = "ounold/10xdev"
$tmpDir = Join-Path $PSScriptRoot ".tmp-gh-issues"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$issues = @(
  @{
    title = "[F-01] Product data model, migrations, and row-level security"
    labels = @("type:foundation", "status:ready", "stream:core-professor-flow", "blocker")
    milestone = "M1 Foundation"
    body = @"
## Summary
Define the durable product data shape for students, notes, note items, authorship, last-edited state, and row-level security.

## Type
Foundation

## Status at import
ready

## Why this matters
The current codebase has auth but no domain persistence. Access separation is a product guardrail, not a later hardening task, and continuity over time depends on explicit ownership and edit semantics.

## Depends on
- None

## Blocks / Unlocks
- Unlocks: S-01, S-02, S-03, S-04, S-05

## PRD references
- FR-001
- FR-002
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008

## Definition of done
- [ ] Product tables exist for students, notes, and note items
- [ ] Ownership and authorship rules are encoded in the data model
- [ ] Row-level security separates professor access from student access
- [ ] The model supports visible continuity and later edits safely

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[F-02] Professor role bootstrap and first-owner setup"
    labels = @("type:foundation", "status:proposed", "stream:core-professor-flow")
    milestone = "M1 Foundation"
    body = @"
## Summary
Define how the first professor account becomes the workspace owner and how student accounts get linked to the correct professor-owned records.

## Type
Foundation

## Status at import
proposed

## Why this matters
The current auth scaffold treats users generically, but the product needs one professor with global visibility and many students with narrow visibility.

## Depends on
- F-01

## Blocks / Unlocks
- Unlocks: S-01, S-02, S-03

## PRD references
- US-01
- US-05
- FR-003
- FR-004

## Definition of done
- [ ] The professor ownership model is explicit
- [ ] Student accounts can be linked to the correct supervision records
- [ ] Generic auth is converted into product-specific ownership rules

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[S-01] Professor can create and browse a student roster"
    labels = @("type:slice", "status:proposed", "stream:core-professor-flow")
    milestone = "M2 Professor Core Flow"
    body = @"
## Summary
Allow the professor to create student records and browse a per-student list that becomes the entry point into each supervision thread.

## Type
Slice

## Status at import
proposed

## Why this matters
This creates the real product container for every later note and replaces the starter dashboard with the first professor-facing domain view.

## Depends on
- F-01
- F-02

## Blocks / Unlocks
- Supports: S-02

## PRD references
- US-05
- FR-004

## Definition of done
- [ ] The professor can create a student record
- [ ] The professor can browse all supervised students
- [ ] Each student has a dedicated detail or history entry point

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[S-02] Professor can create a post-meeting note and revisit one student's history"
    labels = @("type:slice", "status:ready", "stream:core-professor-flow", "north-star")
    milestone = "M2 Professor Core Flow"
    body = @"
## Summary
Allow the professor to open one student, create a dated post-meeting note with short bullet items, and later reopen that same student thread to see the note in chronological context.

## Type
Slice

## Status at import
ready

## Why this matters
This is the smallest complete validation milestone for the product promise. It validates continuity, not just storage.

## Depends on
- F-01
- F-02

## Blocks / Unlocks
- Unlocks: S-03, S-04, S-05

## PRD references
- US-01
- US-05
- FR-001
- FR-002
- FR-004
- FR-008

## Definition of done
- [ ] A note belongs to exactly one student
- [ ] A note supports brief bullet-point content
- [ ] Notes appear in chronological order for that student
- [ ] The professor can understand current state by revisiting that thread later

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[S-03] Student can sign in and read only their own supervision history"
    labels = @("type:slice", "status:blocked", "stream:student-visibility")
    milestone = "M3 Student Access"
    body = @"
## Summary
Allow the student to authenticate and view only their own notes and current supervision context.

## Type
Slice

## Status at import
blocked

## Why this matters
The app already has generic auth, but not domain-specific identity mapping. The exact rule tying a student account to one supervision thread must be encoded in data and policy first.

## Depends on
- F-01
- F-02
- S-02

## Blocked by
- student-to-record linking and access policy details

## PRD references
- US-02
- FR-003
- FR-005

## Definition of done
- [ ] A student can access only their own note history
- [ ] History is chronological
- [ ] Current versus completed items can be distinguished in the student view

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[S-04] Professor and student can update a shared note without losing continuity"
    labels = @("type:slice", "status:blocked", "stream:shared-follow-up")
    milestone = "M4 Shared Collaboration"
    body = @"
## Summary
Allow the professor and the assigned student to update an existing note while preserving the thread of what was previously agreed.

## Type
Slice

## Status at import
blocked

## Why this matters
The PRD requires continuity preservation, which is more than a simple overwrite. The product must make post-meeting edits understandable, not merely possible.

## Depends on
- F-01
- S-02
- S-03

## Blocked by
- explicit continuity model for edits and visible last-edited state

## PRD references
- US-04
- FR-006
- FR-008

## Definition of done
- [ ] Both sides can edit the same note
- [ ] The updated state is visible to the professor
- [ ] Continuity remains legible when the note is revisited later

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
  @{
    title = "[S-05] Professor and student can mark task-like note items complete"
    labels = @("type:slice", "status:blocked", "stream:shared-follow-up")
    milestone = "M4 Shared Collaboration"
    body = @"
## Summary
Allow task-like note items to be completed individually, with that state remaining visible in the shared history.

## Type
Slice

## Status at import
blocked

## Why this matters
Completion depends on note-item identity, not just note text. The product must distinguish informational bullets from actionable bullets.

## Depends on
- F-01
- S-02
- S-03

## Blocked by
- note-item shape and shared update semantics

## PRD references
- US-03
- FR-007

## Definition of done
- [ ] Task-like items can be completed one by one
- [ ] Both the professor and the assigned student can update completion state
- [ ] Completion remains visible later in the same thread

## Notes
- Imported from context/foundation/roadmap.md
"@
  }
)

foreach ($issue in $issues) {
  $safeName = ($issue.title -replace '[^A-Za-z0-9\-\[\]]', '-')
  $bodyFile = Join-Path $tmpDir ($safeName + ".md")
  Set-Content -LiteralPath $bodyFile -Value $issue.body -Encoding UTF8

  $args = @(
    "issue", "create",
    "--repo", $repo,
    "--title", $issue.title,
    "--body-file", $bodyFile,
    "--milestone", $issue.milestone
  )

  foreach ($label in $issue.labels) {
    $args += @("--label", $label)
  }

  & "C:\Program Files\GitHub CLI\gh.exe" @args
}

Remove-Item -Recurse -Force $tmpDir
