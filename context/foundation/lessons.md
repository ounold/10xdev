# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at the start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Sync backlog artifacts after closing a change

- **Context**: Any change that reaches implemented/closed state and also has mirrored tracking in `context/foundation/tasks-github.md`, GitHub Issues, and Linear.
- **Problem**: The repo artifact snapshot, GitHub backlog, and Linear mirror drift apart after implementation if they are not updated in a fixed order, which makes the next planning step ambiguous.
- **Rule**: After closing implementation of a change, first update `context/foundation/tasks-github.md`, then update the corresponding GitHub Issues, and only after that mirror the same status changes into Linear. Treat this as part of change close-out, not optional documentation cleanup.
- **Applies to**: plan, plan-review, implement, impl-review

## Migrate remote Supabase before Cloudflare release

- **Context**: Any change that introduces or modifies hosted Supabase schema, RLS, or seed assumptions and is intended to run on the deployed Cloudflare Worker.
- **Problem**: Cloudflare code can be deployed successfully while the hosted Supabase project still lacks the required tables, policies, or functions, which creates a hidden production mismatch between live code and live database.
- **Rule**: Before treating a release as deployed, push remote Supabase migrations first, then verify the target project state, and only after that proceed with the Cloudflare deployment or release confirmation. Do not assume Worker deploys apply database schema automatically.
- **Applies to**: plan, plan-review, implement, impl-review

## Run Astro dev outside Codex when sandbox blocks filesystem reads

- **Context**: Local Windows development for this repository when `astro dev` or `npm run dev` is started from the Codex environment.
- **Problem**: The Codex runtime can block directory reads above the workspace boundary, which makes Astro/Vite report misleading missing-module errors even though `node_modules` is intact.
- **Rule**: If local dev fails in Codex with `Access is denied` or `Cannot read directory "../../.."`, re-run `npm run dev` from a normal PowerShell session outside Codex before diagnosing the app itself. Treat Codex-local dev server failures here as environment-suspect first, not repo-suspect.
- **Applies to**: implement, impl-review

## Use the Codex app binary when the `codex` wrapper is blocked on Windows

- **Context**: Local Windows setup where MCP administration commands such as `codex mcp add ...` are needed from a shell.
- **Problem**: The generic `codex` command can fail with `Access is denied` even though the installed Codex app binary itself is present and usable, which makes MCP setup look broken when the real issue is the wrapper path.
- **Rule**: If `codex ...` fails with a Windows access error, retry the same command through the installed app binary under `C:\Users\olguno5421\AppData\Local\OpenAI\Codex\bin\...\codex.exe`. Prefer the direct binary path for local MCP administration on this machine before assuming the MCP server or command syntax is wrong.
- **Applies to**: research, implement

## Prefer Node fetch for remote Supabase checks on this Windows setup

- **Context**: Read-only inspection of the remote Supabase project configured by this repository, especially when checking whether hosted data exists before manual verification.
- **Problem**: PowerShell `Invoke-RestMethod` can fail against the Supabase REST API on this machine with transport-level receive errors even when the project URL and service-role key are valid, which makes remote-data checks look flaky or broken.
- **Rule**: For safe remote Supabase checks here, load `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the repo `.env` file and prefer a small read-only Node `fetch()` script against `/rest/v1` over `Invoke-RestMethod`. Treat the Node path as the default inspection method before suspecting the remote project itself.
- **Applies to**: research, implement, impl-review
