---
project: post-meeting-notes
researched_at: 2026-05-22T00:00:00+02:00
recommended_platform: Cloudflare Workers
runner_up: Railway
context_type: mvp
tech_stack:
  language: js
  framework: Astro
  runtime: Cloudflare Workers
---

## Recommendation

**Deploy on Cloudflare Workers.**

This project already points in that direction technically: the stack decision names Cloudflare as the deployment target, the repo is configured with `@astrojs/cloudflare`, and Astro 6 has first-class Cloudflare adapter guidance. Given your interview answers, this is the best fit: no requirement for persistent background processes, external Supabase and OpenRouter are acceptable, and there is no need to optimize for a traditional long-running server model. Cloudflare wins on stack fit, CLI-first operations, agent-readable docs, and deployment automation.

## Platform Comparison

| Platform | CLI-first | Managed / Serverless | Agent-readable docs | Stable deploy API | MCP / First-class integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 / 5 |
| Railway | Pass | Partial | Partial | Pass | Partial | 3.5 / 5 |
| Render | Pass | Partial | Partial | Pass | Pass | 4 / 5 |
| Vercel | Pass | Pass | Pass | Pass | Partial | 4.5 / 5 |
| Netlify | Pass | Pass | Pass | Pass | Partial | 4.5 / 5 |
| Fly.io | Pass | Partial | Partial | Pass | Partial | 3.5 / 5 |

### Cloudflare Workers

Cloudflare is the strongest fit for this repo because it matches the current Astro 6 adapter path and the existing `wrangler.jsonc` runtime setup. It provides a strong CLI story through `wrangler`, a stable deployment path, official Astro framework guidance, markdown-first docs for agents, and multiple AI-facing documentation surfaces such as `llms.txt` / `llms-full.txt`. It is also well suited for an MVP that uses external Supabase auth/data and OpenRouter rather than platform-native database coupling.

### Railway

Railway is a compelling runner-up because it offers a straightforward CLI, simple resource-based pricing, and a friendly full-stack PaaS workflow. It would likely be easier than Cloudflare if the app later drifted toward a more conventional always-on server shape. It loses here mostly because it is not the current “native” direction of the codebase, so adopting it would add migration work rather than reduce it.

### Render

Render scores well operationally because it has a real CLI plus an official MCP server that explicitly supports Codex, Claude Code, and Cursor. It is a practical PaaS for deploys, logs, and managed services, but it is not as first-class a fit for this Astro 6 + Cloudflare-oriented repository. For this MVP, it is a viable fallback rather than the most natural primary choice.

### Vercel

Vercel remains strong on DX, docs, and deployment ergonomics, and it now has a documented MCP server in beta. However, it is less aligned with the current stack than Cloudflare. It also handles realtime through third-party providers rather than direct serverless function WebSocket support, which is acceptable for this app but still a sign that the platform fit is less direct.

### Netlify

Netlify has a solid CLI, AI context support including `llms.txt`, and a friendly deploy experience. For a generic frontend-heavy MVP it would be a serious contender. It ranks lower here because the current project foundation and framework adapter choices are more directly aligned with Cloudflare than Netlify.

### Fly.io

Fly.io is a strong CLI-first platform with good operational visibility and support for durable process models. That strength is not especially valuable for this MVP because you explicitly do not need persistent server processes. It would increase infrastructure surface area relative to a serverless-first deployment choice.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Cloudflare won because it matches the current repository setup, the selected Astro deployment target, and the MVP’s operational simplicity requirements. It gives you strong deploy automation, good agent-readable docs, and low friction for a server-rendered Astro app using external Supabase and OpenRouter.

#### 2. Railway

Railway placed second because it would be easy to operate and would tolerate future drift toward a more conventional backend model. It lost mainly because choosing it now would mean working against the stack’s existing Cloudflare-first path instead of leveraging it.

#### 3. Render

Render placed third because it has a better AI-operations story than many PaaS tools thanks to its MCP server, plus a decent CLI. It still trails Cloudflare and Railway because it is not the most natural fit for the existing adapter/runtime decisions already present in the repo.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. The project language in `tech-stack.md` says “Cloudflare Pages,” but Astro 6’s practical deployment path is now through the Cloudflare adapter and Worker runtime, which can confuse setup and ownership expectations.
2. The local/runtime split can create hidden bugs because some project behavior is exercised in Node-like tooling while production SSR runs on Cloudflare’s runtime model.
3. Cloudflare is excellent when your app fits its runtime assumptions, but it is less forgiving if the project later grows into a more traditional always-on backend shape.
4. Operational knowledge is spread across bindings, secrets, routes, Wrangler config, and account-level settings, which can raise cognitive load for a solo MVP if not documented carefully.
5. The project already surfaced environment-sensitive build behavior during verification, which is a warning that deploy tooling may be less straightforward in constrained or unusual environments.

### Pre-Mortem — How This Could Fail

Six months after launch, the team regrets choosing Cloudflare because they assumed “works with Astro” meant “operationally obvious.” Early deployment felt smooth, so they skipped documenting exactly which pages were prerendered, which were SSR, and which runtime assumptions were safe. As new features arrived, a few dependencies behaved differently across local tooling and deployed runtime. The differences were subtle enough to avoid immediate detection but frequent enough to slow delivery. Because Supabase and OpenRouter lived outside Cloudflare, the team initially believed platform lock-in risk was low. In practice, however, deployment behavior, bindings, secrets, and environment conventions all became Cloudflare-specific operational knowledge. A later feature request pushed the app toward a more traditional server shape, and suddenly the original MVP-friendly choice became a design constraint. Debugging remained possible, but the team spent more time reasoning about the platform boundary than about product behavior. The failure was not a dramatic outage; it was a gradual erosion of speed caused by underestimating runtime differences and overestimating how generic the deployment model would remain as the app evolved.

### Unknown Unknowns

- Astro 6 + Cloudflare guidance has shifted recently, so older “Cloudflare Pages” tutorials may be partially outdated for the exact adapter/runtime path used by this repository.
- Mixed prerender + SSR behavior can hide runtime differences that do not appear in the simplest local test loop.
- Preview environments can accidentally talk to production bindings if environment separation is not made explicit.
- Cloudflare can support richer stateful patterns later, but that often introduces extra primitives such as Durable Objects and increases system complexity fast.
- Cost efficiency at MVP scale does not automatically mean minimum cognitive overhead; Cloudflare may stay cheap while still demanding more platform-specific knowledge than Railway.

## Operational Story

How the chosen platform actually operates day to day:

- **Preview deploys**: Cloudflare supports preview URLs for Workers, including versioned preview URLs and stable branch preview URLs; these should be protected if they expose real data or production-connected auth flows.
- **Secrets**: Runtime secrets should live in Cloudflare-managed secrets, set through `wrangler secret put` or version-specific secret commands. Supabase and OpenRouter keys should not live in source or checked-in files. Local-only development values can live in `.dev.vars`.
- **Rollback**: Rollback is version-based. In practice, you can deploy a previous Worker version or manage deployment traffic between versions. Code rollback is fast, but any database or auth-side changes remain your responsibility and do not roll back automatically.
- **Approval**: A human should approve production publish, primary secret rotation, DNS/domain changes, and any destructive data changes. An agent may safely handle read-only diagnostics, preview deploys, config inspection, and log review.
- **Logs**: The operational read path is `wrangler tail` for live runtime logs, plus Cloudflare dashboard observability if needed. This is suitable for read-only agent workflows during debugging.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Confusion between “Pages” wording and actual Worker runtime path | Devil's advocate | M | M | Normalize project language now: document Cloudflare Workers as the runtime in deployment docs and future setup instructions. |
| Preview deployment accidentally using production bindings or secrets | Unknown unknowns | M | H | Create explicit environment separation before real deployment, with distinct non-production bindings and secret values. |
| Runtime differences between local development and deployed Worker behavior | Devil's advocate / Pre-mortem | M | H | Keep deployment verification in CI and test critical SSR paths against the real Cloudflare runtime, not only local dev. |
| Future feature drift toward a more traditional backend shape | Pre-mortem | M | M | Re-evaluate the platform if background jobs, persistent processes, or non-edge-friendly libraries become important. |
| Platform-specific operational knowledge slows solo development | Pre-mortem / Unknown unknowns | M | M | Write a short deployment runbook early: build command, deploy command, secrets flow, preview flow, log commands, rollback path. |
| Over-reliance on Cloudflare-specific primitives if scope grows | Devil's advocate | L | M | Keep product logic separate from platform-specific bindings where possible and preserve migration room in app architecture. |

## Getting Started

1. Confirm the current adapter path and Worker runtime config remain the intended deployment target in [astro.config.mjs](/C:/Users/olguno5421/Documents/GitHub/10xdev/astro.config.mjs) and [wrangler.jsonc](/C:/Users/olguno5421/Documents/GitHub/10xdev/wrangler.jsonc).
2. Install Wrangler if needed and authenticate your Cloudflare account: `npm install -g wrangler` and `wrangler login`.
3. Add production secrets for Supabase and OpenRouter using Cloudflare-managed secrets rather than source-controlled files.
4. Run a production build locally and then deploy through Wrangler so the exact Worker output path is exercised before connecting a custom domain.
5. Set up preview deployments and a separate non-production environment before inviting real users, especially because the app uses external auth and data services.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
