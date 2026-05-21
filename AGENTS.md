# Repository Guidelines

This repository is an Astro 6 server-rendered web app with React 19 islands, Supabase auth, Tailwind 4, and Cloudflare deployment. Use this file as the quick-start contract for coding agents; defer deeper product context to @context/foundation/prd.md and stack rationale to @context/foundation/tech-stack.md.

## Hard Rules

- Preserve everything under `context/`; bootstrap and workflow artifacts there are project records, not scaffold noise.
- Keep auth and server secrets server-side only. Read `SUPABASE_URL` and `SUPABASE_KEY` through the existing server-side setup in @src/lib/supabase.ts and the env schema in @astro.config.mjs.
- Do not introduce Next.js-only patterns such as `"use client"`. This project uses Astro pages/layouts plus React islands where interactivity is needed.
- Reuse `cn()` from @src/lib/utils.ts for conditional class names instead of hand-merging Tailwind strings.

## Project Layout

- App code lives in @src with pages in `src/pages/`, layouts in `src/layouts/`, shared helpers in `src/lib/`, and interactive auth/UI components in `src/components/`.
- Auth routes and pages already exist in @src/pages/api/auth and @src/pages/auth; route protection is centralized in @src/middleware.ts.
- Static assets live in `public/`; Cloudflare runtime config lives in @wrangler.jsonc; Supabase local project files live in `supabase/`.

## Build, Test, and Dev Commands

- `npm run dev` — start the local Astro/Cloudflare dev server.
- `npm run build` — production build; this is part of the CI gate.
- `npm run preview` — preview the production build locally.
- `npm run lint` — required ESLint pass with type-aware rules.
- `npm run lint:fix` — apply safe lint autofixes.
- `npm run format` — run Prettier across the repo.

## Coding Conventions

- Use the @/* path alias from @tsconfig.json for imports into src/
- Prefer Astro components for static structure and React `.tsx` components only for interactive UI.
- Follow the existing naming pattern: `PascalCase` for components, lowercase route filenames in `src/pages/`, and small utility modules in `src/lib/`.
- ESLint is strict about unused variables and React hooks; check @eslint.config.js before adding exceptions.

## Testing and CI

- There is no dedicated test runner yet; the current gate is lint + build in @.github/workflows/ci.yml.
- Before handing work off, run `npm run lint` and `npm run build`.
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.
