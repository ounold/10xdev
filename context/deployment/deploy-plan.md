---
project: post-meeting-notes
created_at: 2026-05-22T00:00:00+02:00
deployment_target: Cloudflare Workers
source_of_truth:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
status: in_progress
---

# Cloudflare Integration and Deployment Plan

This plan translates the infrastructure decision into an executable Cloudflare rollout for the current Astro 6 + React + Supabase project. It is intentionally deployment-first, but it calls out the external-service boundaries that must be handled before production exposure.

## Current State Summary

- Runtime path already chosen in code: Astro server output with `@astrojs/cloudflare`
- Current Cloudflare config already present: `wrangler.jsonc`
- Active external integration today: Supabase auth
- Expected external integration later: OpenRouter
- Current app shape: server-rendered MVP, no persistent background workers, no required WebSockets

## Prerequisites — Wrangler CLI and Supabase Setup

### Cloudflare Account

- [x] Confirm a dedicated Cloudflare account exists for this project.
- [x] Confirm who owns the account and who has administrative access.
- [x] Decide whether this project will live in:
  - personal Cloudflare account
  - not a shared team account today
  - not a client-owned account today
- [x] Confirm the Workers product is enabled for that account.
- [x] Confirm the account can create and manage:
  - Workers
  - secrets
  - observability / logs
  - routes permissions appear available, but domain use is still undecided
- [ ] Decide whether a custom domain is already available for this project.
- [ ] If a custom domain is planned, confirm:
  - domain ownership
  - DNS access
  - whether the domain already uses Cloudflare as DNS provider
- [x] Decide whether the first release will run only on `workers.dev` or on a real domain/subdomain.
  Decision: deploy to `workers.dev` first for smoke testing, then attach a custom domain only after auth and runtime verification pass.
- [ ] Confirm billing posture:
  - free tier acceptable for MVP
  - paid tier available if required by usage, routing, or team policy
- [x] Decide who is allowed to perform irreversible production actions:
  - human approval required for publish to production
  - human approval required for rotate primary secrets
  - human approval required for change domains/routes
  - human approval required for remove environments
- [ ] Confirm whether CI/CD will use:
  - local interactive login only
  - API token / service token for GitHub Actions
  - GitHub-connected Cloudflare deploy integration

Support notes:
- A valid Cloudflare account is a prerequisite distinct from Wrangler installation; the CLI can be installed and still be useless if the account, permissions, or domain ownership are not ready.
- For production traffic, Cloudflare documentation recommends using a route or custom domain rather than relying permanently on `workers.dev`.

Edge cases:
- If the domain is owned by a university or organization, DNS or route changes may require a separate administrator and introduce lead time.
- If the account is personal but the app is organizational, future ownership transfer can become painful unless planned early.
- If CI deploys are added later, account-level API token scope must be minimal and documented separately from local developer access.
- If preview URLs are enabled, confirm whether they should remain public or be protected with Cloudflare Access.

Exit criteria:
- The project has a valid Cloudflare account context, known owners, known permissions, and a clear domain/routing path.

### Wrangler CLI

- [x] Confirm Node.js version meets current Astro + Cloudflare requirements.
  - Project baseline: Node 22 from `.nvmrc`
  - Astro 6 + Cloudflare guidance currently expects Node 22+ in the relevant build/runtime workflow
- [x] Ensure `npm` works in the actual terminal environment used for deployment.
- [x] Install Wrangler in one of the approved ways:
  - local invocation via `npx wrangler`
  - or global install if your workstation policy prefers that
- [x] Authenticate Wrangler with Cloudflare:
  - `npx wrangler login`
- [x] Verify access to the correct Cloudflare account before the first deploy.
- [x] Verify basic CLI health:
  - `npx wrangler whoami`
  - optional: `npx wrangler deploy --dry-run` if supported in your chosen workflow

Support notes:
- Current Cloudflare docs describe Wrangler as the source of truth for Worker configuration and recommend managing configuration through code rather than relying on ad hoc dashboard changes.
- This repo already has `wrangler.jsonc`, so deployment should use that file as the canonical runtime config.

Edge cases:
- If `npm` works only through `npm.cmd` or a shell-specific path, record the exact invocation in the runbook instead of assuming a generic `npm`.
- If multiple Cloudflare accounts exist, verify the target account before creating routes, secrets, or domains.
- If you later use CI-based deploys, the CI token path must be documented separately from local `wrangler login`.

Exit criteria:
- Wrangler is installed, authenticated, and can resolve the intended Cloudflare account.

### Supabase Setup

- [x] Decide whether local development uses:
  - local Supabase via Docker
  - hosted Supabase only
  - both
  Decision: use hosted Supabase for the deployment path. Local Docker-backed Supabase remains optional support infrastructure rather than a release prerequisite.
- [~] For local Supabase development, use the supported CLI path:
  - `npx supabase init`
  - `npx supabase start`
  - `npx supabase stop`
  Current finding: the local HTTP surface is reachable on `127.0.0.1:54321`, but CLI/container inspection from this shell still fails because Docker daemon access is denied or not fully exposed to the current terminal context.
- [x] Do not assume global npm installation for Supabase CLI.
  - Current Supabase docs explicitly support running the CLI via `npx`
- [ ] Create and maintain local config files:
  - `.env`
  - `.dev.vars`
- [ ] Copy the required auth values into local runtime config:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
- [x] For hosted Supabase, confirm the project exists and record:
  - project URL recorded
  - anon/publishable key recorded
  - dashboard owner/admin access still to be explicitly documented
- [ ] Configure Supabase Auth URL settings before production rollout:
  - `SITE_URL`
  - additional redirect URLs for preview/staging if applicable
- [ ] Decide whether email confirmation is enabled in production and whether custom SMTP is needed now or later.

Support notes:
- In this repo, Supabase values are consumed through `astro:env/server`, which is the correct server-only boundary.
- Supabase redirect URL configuration is not optional for production-grade auth flows; it is a prerequisite, not a post-deploy cleanup task.

Edge cases:
- Password reset, email confirmation, and future OAuth flows often fail first because `SITE_URL` or additional redirect URLs still point to localhost.
- Preview URLs must be added deliberately if preview deploys are allowed to exercise auth.
- If local Supabase is skipped entirely, document that the team’s test baseline is hosted Supabase so troubleshooting assumptions stay aligned.
- Docker Desktop being installed is not enough by itself; the daemon must be running and accessible from the current shell context. On Windows, an “Access is denied” or named pipe error against `//./pipe/docker_engine` means local Supabase is not yet manageable from that terminal even if some local endpoints are already responding.
- A locally reachable Supabase endpoint does not imply local auth flows are fully usable. Redirect URLs, SMTP/mail capture, and CLI health still need separate verification.

Exit criteria:
- Supabase local and/or hosted setup path is chosen, documented, and all required auth URLs are identified before deployment work begins.

## Phase 0 — Decision Freeze and Scope Alignment

- [x] Confirm that `Cloudflare Workers` is the production target, not legacy Cloudflare Pages terminology.
- [x] Confirm the first production hostname strategy:
  - `workers.dev` for smoke testing first
  - custom domain only after successful smoke test and auth verification
- [x] Confirm whether OpenRouter is part of the first deploy or only a later feature.
  Decision: treat OpenRouter as a later feature, not part of the first deploy.
- [x] Confirm whether production launch requires only professor access first, or professor + student access on day one.
  Decision: plan for professor + student access on day one unless product scope is later reduced intentionally.

Exit criteria:
- We have a single deployment target name in docs and team language.
- We know whether the first release must include custom domain, email auth, and OpenRouter.

## Phase 1 — Cloudflare Project Hardening

- [~] Review and normalize `wrangler.jsonc`:
  - [x] worker name normalized from starter identity to `post-meeting-notes`
  - [x] compatibility date present
  - [x] observability enabled
  - [x] assets binding remains configured for Astro output
  - [x] canonical Worker `post-meeting-notes` created and Supabase runtime secrets provisioned there
  - [ ] optional cleanup follow-up: decide whether to delete the old starter-named Worker `10x-astro-starter`
- [x] Introduce named environments in `wrangler.jsonc` if we want staged deploys:
  Decision: defer named `staging` / `production` environments until after the first successful `workers.dev` smoke test. Keep a single environment for the first deployment wave.
- [x] Decide whether deploys will be:
  - manual via `wrangler deploy` for the first controlled smoke-test deployment
  - automatic deploy on push to `master` after manual validation
  - no branch-preview rollout in the first wave
- [ ] Prefer a custom domain or Workers route for production rather than relying permanently on `workers.dev`.

Support notes:
- Cloudflare recommends production traffic on a route or custom domain rather than only `workers.dev`.
- Recent Cloudflare docs support environment-specific settings and secrets in Wrangler environments.

Edge cases:
- If branch preview URLs are enabled, they should not point to production Supabase settings unless intentionally isolated.
- If `workers.dev` preview URLs are enabled, restrict them with Cloudflare Access if they expose real auth flows.

Exit criteria:
- Cloudflare worker identity, environments, and route strategy are documented.

## Phase 2 — Secret and Configuration Model

- [ ] Define the config split clearly:
  - local-only secrets: `.dev.vars`
  - Cloudflare runtime secrets: Wrangler / dashboard secrets
  - GitHub Actions build secrets: GitHub repo secrets
- [ ] Provision current required secrets:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
- [ ] Reserve the future server-only secret slot for:
  - `OPENROUTER_API_KEY`
- [ ] Keep all external keys server-side only; do not expose any of them as public client env vars.
- [ ] Decide whether non-secret env vars will live in `wrangler.jsonc` or in dashboard config.

Support notes:
- Cloudflare treats secrets as runtime environment variables.
- This repo already uses `astro:env/server`, which is the correct pattern for server-only values.

Edge cases:
- `SUPABASE_KEY` here is the anon/public key but should still be treated as runtime configuration, not inlined casually into client code.
- OpenRouter must never be exposed to the browser. If AI features are added later, requests must proxy through server endpoints only.
- Avoid mixing dashboard-only secrets and code-managed non-secret vars without documentation, or drift becomes hard to debug.

Exit criteria:
- A single table exists documenting each secret, where it is stored, and which environment owns it.

## Phase 3 — Supabase Production Readiness

- [ ] Create or confirm the production Supabase project.
- [ ] Set Supabase Auth URL configuration:
  - production site URL
  - additional redirect URLs for preview / staging if needed
- [ ] Verify sign-up, sign-in, sign-out, and password reset behavior against the deployed hostname.
- [ ] Decide whether email confirmation is on or off in production.
- [ ] Confirm email templates and redirect behavior for production hostnames.

Support notes:
- Supabase redirect behavior is often the first production auth failure point.
- Official Supabase guidance is explicit that `SITE_URL` and redirect URL configuration must match actual deployed hostnames.

Edge cases:
- Preview deploys can break auth if preview domains are not whitelisted in Supabase redirect settings.
- Password reset and email confirmation links may default to the wrong environment if `SITE_URL` is still local or stale.
- If both staging and production are used, keep separate allowed redirect URLs and verify each explicitly.

Exit criteria:
- Supabase auth flows are verified on the real deployment hostname.

## Phase 4 — Application Adjustments Before First Deploy

- [ ] Add a deployment-facing app URL concept if needed for auth emails and callback consistency.
- [ ] Review the reset-password flow for production callback behavior and whether a dedicated post-reset path is needed.
- [ ] Review middleware-protected routes under deployed auth cookies.
- [ ] Confirm `README.md`, `AGENTS.md`, and deployment docs use “Workers” consistently.
- [ ] Add any missing operational runbook notes:
  - deploy command
  - tail logs command
  - secret rotation path
  - rollback path

Support notes:
- The current reset-password page requests a reset email but there is not yet a full update-password callback flow in the repo. That is acceptable only if it is intentionally deferred.

Edge cases:
- If Supabase sends users back to a default URL after reset, the UX may look broken even though the email was delivered correctly.
- Cookie behavior can differ subtly between local and deployed domains; verify auth persistence after redirects.

Exit criteria:
- All auth-critical user journeys are known and documented before exposure to real users.

## Phase 5 — CI/CD and Verification Pipeline

- [x] Update CI branch naming if needed:
  - decision: standardize CI/deploy automation on `main`
  - follow-up implementation: update workflow triggers and any future deploy automation to use `main`
- [ ] Keep build verification in GitHub Actions with:
  - `npm ci`
  - `npx astro sync`
  - `npm run lint`
  - `npm run build`
- [ ] Add deploy automation only after CI is stable.
- [ ] Decide whether deploys happen:
  - from GitHub integration
  - from GitHub Actions using Wrangler
  - manually for MVP launch
- [ ] Ensure GitHub secrets exist for build-time validation.

Support notes:
- This repo has already shown that local sandbox restrictions can differ from real build behavior, so CI must be treated as a primary verification source.

Edge cases:
- Branch mismatch between `master` and `main` can silently prevent expected CI or deployment triggers.
- If deploy previews are GitHub-driven and Supabase production secrets are reused, accidental auth testing against production becomes likely.

Exit criteria:
- CI passes on the intended default branch and the deploy trigger model is explicit.

## Phase 6 — Staging / Preview Strategy

- [ ] Decide between:
  - one staging environment
  - per-branch previews
  - both
- [ ] If previews are enabled, define preview safety rules:
  - no production OpenRouter key
  - either isolated Supabase project or restricted test-only auth access
  - Cloudflare Access on preview if sensitive
- [ ] Verify preview deploy URLs, auth redirects, and secret scoping.

Support notes:
- Cloudflare supports preview URLs and branch previews, but preview auth behavior must be planned with Supabase.

Edge cases:
- Preview domains not added to Supabase redirect allowlists will produce broken sign-in / password reset flows.
- Reusing production data sources in previews can leak test actions into live data.

Exit criteria:
- Preview behavior is safe by default and cannot accidentally impersonate production.

## Phase 7 — Production Deploy

- [ ] Run final preflight:
  - lint clean enough for release policy
  - production build passes
  - secrets present
  - correct target environment selected
- [~] Deploy to Cloudflare Workers.
  First manual deploy was attempted. Build/upload succeeded, session KV namespace was provisioned automatically, but final publish to `workers.dev` is blocked until a Cloudflare `workers.dev` subdomain is registered for the account.
- [ ] Attach the production route or custom domain.
- [ ] Verify live production smoke tests:
  - home page
  - sign up
  - sign in
  - sign out
  - password reset request
  - protected route redirect behavior
- [ ] Confirm logs and observability are readable immediately after release.

Support notes:
- For higher-confidence rollouts later, Cloudflare versioned deployments can support explicit version upload and controlled deployment.

Edge cases:
- DNS / custom domain cutover can succeed before Supabase redirect settings are updated, causing “works for pages, fails for auth” launch issues.
- If email confirmation is enabled, test the full email round-trip before calling the release complete.

Exit criteria:
- Production URL works end-to-end for the supported auth flows.

## Phase 8 — Post-Deploy Operations

- [ ] Document rollback procedure:
  - redeploy last known good version
  - confirm Supabase-side changes do not require separate remediation
- [ ] Document log inspection:
  - `wrangler tail`
  - dashboard observability fallback
- [ ] Document secret rotation process for:
  - Supabase key changes
  - future OpenRouter key rotation
- [ ] Add a lightweight incident checklist for auth outages and redirect misconfiguration.

Support notes:
- Cloudflare version/deployment tooling is strong, but database/auth-side effects do not roll back automatically with code.

Edge cases:
- A code rollback does not undo Supabase URL config mistakes or email template misconfiguration.
- OpenRouter incidents later will usually need both key rotation and request-level logging on server routes.

Exit criteria:
- Day-2 operations are documented well enough that a deploy issue does not become a research project.

## External Integration Checklist

### Supabase

- [x] Production project selected
- [ ] Site URL set to production hostname
- [ ] Preview / staging URLs allowlisted if applicable
- [ ] Email confirmation policy decided
- [ ] Password reset flow verified on deployed hostname

### Supabase Local Support Path

- [x] Local Supabase HTTP endpoint observed as reachable on `http://127.0.0.1:54321`
- [ ] Docker daemon access from the active terminal verified
- [ ] `npx supabase status` returns healthy container state
- [ ] Local auth/storage behavior verified intentionally rather than inferred from endpoint reachability alone

### OpenRouter

- [ ] Confirm whether included in MVP launch
- [ ] Store key only as Cloudflare secret
- [ ] Route all requests through server-side endpoints
- [ ] Add rate-limit / error-handling plan before public rollout
- [ ] Use separate non-production key if previews or staging can call the API

## Recommended Execution Order

- [ ] 1. Normalize Cloudflare runtime naming and env strategy
- [~] 2. Fix branch / CI trigger assumptions
- [ ] 3. Provision secrets and Supabase production URL config
- [ ] 4. Patch any missing auth callback / reset-password production behavior
- [ ] 5. Stand up staging or previews safely
- [ ] 6. Run first production deploy to `workers.dev`
- [ ] 7. Validate auth flows end-to-end
- [ ] 8. Attach custom domain and repeat auth verification
- [ ] 9. Enable ongoing deploy workflow

## Decisions Needed Before Execution

- [ ] Should we keep manual deploys first, or wire GitHub-based deploy automation immediately?
- [ ] Do we want a separate staging Supabase project, or only production plus protected previews?
- [ ] Is OpenRouter in scope for the first public deploy?
- [ ] Should custom domain setup happen before or after first successful `workers.dev` validation?
