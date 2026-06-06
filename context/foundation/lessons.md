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

## Verify Windows hook payloads and compatibility before debugging Codex hook logic

- **Context**: Repo `PostToolUse` hooks on Windows when `apply_patch` payloads can contain absolute paths and the local runtime may use an older PowerShell/.NET surface.
- **Problem**: A hook can be dispatched successfully but still exit before quality gates if its parser assumes relative paths or relies on unsupported APIs such as `ConvertFrom-Json -Depth` or `System.IO.Path::GetRelativePath`, which makes the failure look like a Codex dispatch problem instead of a compatibility bug in the hook itself.
- **Rule**: When debugging Codex hooks on Windows, confirm three things separately before changing higher-level logic: that the hook is actually dispatched, what exact payload shape it receives, and that its path/parser logic works with absolute Windows paths and the local PowerShell/.NET version. Do not use Windows hook code that depends on newer PowerShell/.NET APIs without checking compatibility in the actual runtime first.
- **Applies to**: implement, impl-review

## Check repo-local Playwright auth fixtures before asking for E2E credentials

- **Context**: Manual or browser-level E2E verification in this repository, especially for professor/student dashboard flows.
- **Problem**: It is easy to infer that E2E is blocked because `E2E_PROFESSOR_*` or other login credentials are missing from `.env`, even when the repo already contains reusable Playwright `storageState` fixtures under `.auth/`.
- **Rule**: Before declaring browser-level verification blocked on missing credentials in this repo, inspect `.auth/` and the existing Playwright specs for saved `storageState` usage. Treat repo-local auth fixtures as the first verification path, then fall back to fresh credentials only if no suitable saved state exists.
- **Applies to**: research, implement, impl-review

## Store claim-flow E2E identity in repo-local auth metadata before falling back to env

- **Context**: Browser-level verification of the student claim flow, where the spec needs both an authenticated student session and the email anchor used by fixture prep.
- **Problem**: A saved `storageState` alone is not enough for claim-flow setup if the spec cannot also rediscover which email should be reset and rebuilt in `students`; without that metadata, the test falls back to env vars too early and looks blocked again.
- **Rule**: When capturing or refreshing a repo-local Playwright state for the claim-flow student, also store a small companion meta file with the email anchor and teach the spec to read it before requiring `E2E_CLAIM_STUDENT_*` or `E2E_UNLINKED_STUDENT_*`. Treat `storageState + meta` as the complete repo-native fixture for this slice.
- **Applies to**: research, implement, impl-review
