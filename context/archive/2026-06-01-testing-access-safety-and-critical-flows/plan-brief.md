---
change_id: testing-access-safety-and-critical-flows
title: Testing access safety and critical flows
source_plan: context/changes/testing-access-safety-and-critical-flows/plan.md
generated: 2026-06-01
status: ready
---

# Plan Brief

Full plan: [C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\testing-access-safety-and-critical-flows\plan.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\testing-access-safety-and-critical-flows\plan.md)

## Intent

Land the first durable browser-level safety net around the shared `/dashboard` access seam without turning this rollout into broad test-platform work.

## Scope

- minimal browser test tooling only if it is required for one meaningful spec
- one critical-path role-flow spec around `/dashboard`
- hosted smoke guidance for linked student, unlinked student, and professor sentinel behavior
- first cookbook entry in `context/foundation/test-plan.md` for dashboard role-flow checks

## Guardrails

- do not overbuild the runner/toolchain
- do not replace hosted smoke with local-only confidence
- use professor roster visibility plus thread entry as the regression sentinel, not the full professor feature set
