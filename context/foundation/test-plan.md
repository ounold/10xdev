# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1-§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-05

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost x signal.** The cheapest test that gives a real signal for the risk wins. Do not promote to e2e because e2e feels safer. Do not use multimodal review where deterministic checks already catch the regression.
2. **User concerns are first-class evidence.** Access separation and student-only visibility outrank cosmetic regressions because a role leak breaks the product promise directly.
3. **Risks are scenarios, not code locations.** This plan names failure scenarios and why they are likely. Exact code anchors belong to `/10x-research` inside each rollout phase.

Hot-spot scope used for likelihood weighting: `src/pages/dashboard.astro`, `src/middleware.ts`, `src/lib/supervision.ts`, `src/pages/pending-access.astro`, and the hosted Supabase auth/linking boundary.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by risk = impact x likelihood. The Source column cites the evidence that surfaced this risk, never a specific code anchor.

| #   | Risk (failure scenario)                                                                                                          | Impact | Likelihood | Source (evidence - not anchor)           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | An unlinked or wrong student account can reach another student's supervision history                                             | High   | High       | PRD `US-02`, `FR-003`, `FR-005`          | roadmap `S-03`                                             | interview Q1=`access and role separation`                                                       |
| 2   | A linked student is blocked from their own history because auth, linking, and dashboard routing drift apart                      | High   | High       | PRD `US-02`                              | roadmap `S-03`                                             | hot-spot dirs `src/pages/` and `src/lib/` via churn on `dashboard`, `middleware`, `supervision` |
| 3   | Professor flows regress while student-safe routing is added to the shared `/dashboard` surface                                   | High   | Medium     | PRD `US-01`, `US-05`                     | roadmap stream `A` and `B` convergence on shared dashboard | hot-spot scope `src/pages/dashboard.astro`                                                      |
| 4   | Chronological continuity becomes misleading because note ordering or item semantics drift in shared read models                  | High   | Medium     | PRD `FR-004`, `FR-005`, `FR-008`         | roadmap `S-02`, `S-03`                                     | archive `2026-05-26-product-data-model/plan.md`                                                 |
| 5   | Hosted Supabase behavior diverges from local assumptions, so auth or linking works in development but fails in real verification | High   | Medium     | roadmap notes for `S-01`, `S-02`, `S-03` | interview Q5=`deprioritize cosmetics, not hosted safety`   | hosted verification notes in README                                                             |
| 6   | Shared-note updates in `S-04` overwrite or blur prior agreement history because continuity rules are under-specified             | High   | Medium     | PRD `US-04`, `FR-006`, `FR-008`          | roadmap `S-04` blocked by continuity model                 |

### Risk Response Guidance

| Risk | What would prove protection                                                                     | Must challenge                                                 | Context `/10x-research` must ground                                              | Likely cheapest layer     | Anti-pattern to avoid                                     |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------- |
| #1   | Unlinked and cross-student access attempts end on a safe denial path                            | Authentication alone equals authorization                      | route guard, linked-student lookup, ownership boundary                           | integration + e2e         | happy-path-only auth tests                                |
| #2   | A correctly linked student reaches only their own read-only dashboard consistently              | Hosted linkage state will always mirror local expectations     | auth session, profile state, student linkage source, redirect logic              | e2e                       | over-mocking Supabase/session behavior                    |
| #3   | Professor roster and note flows still work after student branch changes                         | One shared route can evolve safely without regression pressure | role switch, dashboard branch boundaries, existing professor launch points       | e2e + focused integration | duplicating the current implementation structure in tests |
| #4   | The same student history stays chronological and `info`/`task` meaning remains legible          | Rendering a list is enough to prove continuity                 | ordering guarantees, date formatting, item typing, empty/non-empty history cases | integration               | brittle snapshots of full pages                           |
| #5   | Hosted smoke checks catch mismatches between remote auth/data reality and local assumptions     | Local green checks imply hosted readiness                      | real hosted auth, linked/unlinked fixtures, remote verification path             | smoke/e2e                 | testing only against fake local data                      |
| #6   | Future shared edits can be tested against a continuity rule instead of naive overwrite behavior | "Last write wins" is acceptable for supervision notes          | persisted note model, edit visibility rule, current roadmap blockers             | integration               | writing tests before the continuity contract exists       |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder via `/10x-new`.

| #   | Phase name                            | Goal (one line)                                                              | Risks covered  | Test types             | Status           | Change folder                                                    |
| --- | ------------------------------------- | ---------------------------------------------------------------------------- | -------------- | ---------------------- | ---------------- | ---------------------------------------------------------------- |
| 1   | Access safety and critical flows      | Defend linked/unlinked student access and preserve the professor path        | #1, #2, #3, #5 | e2e + smoke            | phase 1 complete | `context/changes/testing-access-safety-and-critical-flows/`      |
| 2   | Continuity and read-model integration | Catch chronology and item-semantics regressions at the cheapest app boundary | #4, #5         | integration            | planned          | `context/changes/testing-continuity-and-read-model-integration/` |
| 3   | Shared-note continuity contract       | Establish the first regression net for the upcoming shared-edit slice        | #6             | integration + contract | planned          | `context/changes/shared-note-continuity-contract/`               |

## 4. Stack

The classic test base for this project. Recommendations are grounded in local manifests/configs plus the tools exposed in this session.

| Layer              | Tool                                                  | Version   | Notes                                                                               |
| ------------------ | ----------------------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| unit + integration | Vitest                                                | `^4.1.8`  | Minimal repo-local integration runner added in rollout Phase 2                      |
| API mocking        | local Supabase-shaped stubs                           | n/a       | Use only at query-shape level; avoid bypassing read-model composition               |
| e2e                | Playwright                                            | `^1.60.0` | Current highest-signal browser path is shared `/dashboard` role-flow verification   |
| accessibility      | none yet                                              | -         | Not a first-wave priority for this rollout                                          |
| AI-native          | Browser MCP / multimodal review - checked: 2026-06-01 | n/a       | Use selectively for high-risk route verification; do not use for routine assertions |

**Stack grounding tools (current session):**

- Docs: none - no dedicated docs MCP used; grounded from repo manifests and config; checked: 2026-06-01
- Search: Exa.ai available but not needed for this repo-specific strategy pass; checked: 2026-06-01
- Runtime/browser: in-app browser available - useful for hosted and localhost auth/path verification; checked: 2026-06-01
- Provider/platform: GitHub and Linear available; Supabase is verified through repo runtime and hosted manual checks rather than a dedicated MCP; checked: 2026-06-01

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.

| Gate                                 | Where                    | Required?                 | Catches                                                               |
| ------------------------------------ | ------------------------ | ------------------------- | --------------------------------------------------------------------- |
| lint + build                         | local + CI               | required                  | syntactic, type, and build drift                                      |
| critical-path e2e                    | local before merge       | required after §3 Phase 1 | broken linked/unlinked student access and professor route regressions |
| continuity-focused integration tests | local + CI               | required after §3 Phase 2 | chronology and read-model regressions                                 |
| hosted auth smoke                    | pre-merge or pre-release | required after §3 Phase 1 | remote Supabase mismatches for linked/unlinked users                  |
| post-edit hook review                | local agent loop         | optional after §3 Phase 2 | accidental route-guard or dashboard drift during edits                |
| multimodal visual review             | selective                | optional                  | high-level layout regressions on critical auth/dashboard screens      |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once the relevant rollout phase ships; before that, the sub-section reads "TBD - see §3 Phase <N>."

### 6.1 Adding a unit test

TBD - see §3 Phase 2.

### 6.2 Adding an integration test

Use integration tests when the risk lives in read-model composition, ordering, or provider-shaped boundary behavior, but does not require browser navigation or real hosted auth.

Current convention:

- put integration specs under `tests/integration/`
- keep small support doubles under `tests/integration/support/`
- wire the runner through `package.json`
- use `vitest.config.ts` for repo-local integration setup

Run sequence:

1. Run `npm run test:integration`.
2. If the command fails inside Codex on Windows with config-loading or esbuild filesystem errors, rerun it from a normal PowerShell session outside Codex.

What to stub:

- preserve the shape of Supabase-style chained reads such as `.from()`, `.select()`, `.eq()`, `.in()`, `.order()`, and `.maybeSingle()`
- return realistic row payloads, including ordering fields like `meeting_date`, `created_at`, and `position`
- avoid bypassing the read-model helper by constructing the final expected output directly

What to assert:

- ordering contracts that matter to users
- semantic fields that must survive unchanged through the read model
- empty or missing-record cases that affect route or view behavior later

When integration is the right layer:

- the same helper output feeds multiple UI surfaces
- browser rendering would be more brittle than the underlying continuity contract
- the failure mode is composition drift, not click-flow drift

Current shipped example:

- `tests/integration/supervision-read-model.test.ts`

Hosted caveat:

- local integration green does not replace hosted smoke when the feature depends on remote Supabase link state, RLS behavior, or data-shape drift
- keep hosted verification explicit in README and rollout notes

### 6.3 Adding an e2e test

Use Playwright only when the risk really depends on browser redirects, cookies, or role-specific route branches. In this repo, that usually means auth and shared `/dashboard` behavior rather than isolated helper logic.

Current convention:

- put browser specs under `tests/e2e/`
- keep small helpers under `tests/e2e/support/`
- wire the command through `package.json`
- point Playwright at the existing local app on `http://127.0.0.1:4321`

Run sequence:

1. Start the app first with `npm run dev`.
2. In a second shell, run `npm run test:e2e`.
3. If needed, use `npm run test:e2e:headed` for visible browser debugging.

Important repo-specific rule:

- do not rely on Playwright-managed app startup in this Windows/Codex environment
- the current setup intentionally assumes the local server is already running
- if the server is missing, `ERR_CONNECTION_REFUSED` is an environment/setup problem, not automatically a product regression

What to assert:

- prefer route outcomes, visible headings, and role-specific guardrails
- avoid mirroring implementation details from Astro branches or helper internals
- use env-gated account checks when the test needs real hosted-like identities

Current shipped example:

- `tests/e2e/dashboard-role-flow.spec.ts`

### 6.4 Adding a test for a new dashboard role-flow

Start from the existing shared-dashboard risk seam rather than from page structure.

Recipe:

1. Identify the user-visible branch you are protecting.
   - examples: unauthenticated redirect, unlinked student denial, linked student read-only access, professor roster sentinel
2. Ask whether the risk depends on real session state.
   - if yes, prefer Playwright over unit tests
3. Reuse `tests/e2e/support/auth.ts` for sign-in and `tests/e2e/support/env.ts` for optional role credentials
4. Assert one branch outcome that would matter to a user
   - URL destination
   - branch-specific heading
   - absence of forbidden controls
5. Keep hosted smoke explicit whenever the branch depends on real Supabase linkage or remote auth state

Minimum local dashboard role-flow contract today:

- unauthenticated `/dashboard` redirects to `/auth/signin`
- unlinked student can be checked through `E2E_UNLINKED_STUDENT_*`
- linked student can be checked through `E2E_LINKED_STUDENT_*`
- professor sentinel can be checked through `E2E_PROFESSOR_*`

When local green is not enough:

- any branch that depends on `students.student_profile_id -> profiles.id`
- any check where hosted RLS, remote auth fixtures, or manual account linking may drift from local assumptions

In those cases, pair the local Playwright spec with the hosted smoke checklist from `README.md`.

### 6.5 Adding a test for shared note continuity

Use Playwright here only for the parts of shared-note continuity that truly depend on authenticated routing, saved session state, and student-versus-professor visibility boundaries. Keep note-shape and ordering semantics in integration tests; spend browser budget on the shared edit seam itself.

Current convention:

- prefer the repo-local linked-student fixture under `.auth/linked-student-olgierd.json`
- read cross-student ids from `.auth/linked-student-olgierd.meta.json`
- if a write-path denial needs a real foreign note id, derive it from the saved professor fixture in `.auth/user.json` instead of asking for fresh credentials
- keep every spec self-cleaning: if it appends content, restore the original note state before finishing

What to assert:

- linked student can edit only their own shared note history
- appended items land at the tail of the thread and stay visible after save
- student edit mode keeps professor-only surfaces hidden
- direct POST attempts against another student's note id are denied even when the linked student has a valid authenticated session

Suggested cheapest layers by risk:

- browser/e2e for `GET` / `POST` access boundaries and continuity UI
- integration for durable item identity, append ordering, and note metadata contracts

Current shipped examples:

- `tests/e2e/linked-student-note-edit.spec.ts`
- `tests/e2e/linked-student-note-append.spec.ts`
- `tests/e2e/linked-student-foreign-thread.spec.ts`
- `tests/e2e/linked-student-foreign-note-post.spec.ts`

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout.

- **Cosmetic styling and theme polish** - not part of the first rollout because the current highest-risk failures are access and continuity, not presentation. Re-evaluate if visual churn starts causing real regressions. (Source: interview Q3.)
- **Broad visual regression across every screen** - too expensive for the current stage; reserve visual checks for critical auth/dashboard flows only if classic assertions miss meaningful defects. Re-evaluate if UI density increases. (Source: interview Q3.)
- **Infrastructure/deploy mechanics beyond hosted smoke** - this rollout focuses on product-risk behavior, not full platform test automation. Re-evaluate if release issues start coming from Worker or deploy plumbing. (Source: interview Q3.)

## 8. Freshness Ledger

- Strategy (§1-§5) last reviewed: 2026-06-03
- Stack versions last verified: 2026-06-03
- AI-native tool references last verified: 2026-06-01

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes,
- §7 negative-space no longer matches what the team believes.
