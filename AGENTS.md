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

- Use the @/\* path alias from @tsconfig.json for imports into src/
- Prefer Astro components for static structure and React `.tsx` components only for interactive UI.
- Follow the existing naming pattern: `PascalCase` for components, lowercase route filenames in `src/pages/`, and small utility modules in `src/lib/`.
- ESLint is strict about unused variables and React hooks; check @eslint.config.js before adding exceptions.

## Testing and CI

- CI currently enforces only `npm run lint` + `npm run build` in @.github/workflows/ci.yml.
- Before handing work off, always run `npm run lint` and `npm run build`, then add the risk-appropriate layer:
  - `npm run test:e2e` for browser/auth/role-flow changes
  - `npm run test:integration` for read-model/ordering/contract changes
  - hosted smoke when local checks cannot prove remote Supabase auth/link/RLS reality
- Treat `npm run test:mutation` as hardening for test strength, not as a default gate for every change and not as ordinary coverage reporting.
- This repo also uses local quality hooks:
  - `Husky` pre-commit in @.husky/pre-commit is the current reliable local gate.
  - Codex `PostToolUse` hooks may be configured through `C:\Users\olguno5421\.codex\config.toml` for fast local feedback after edits, but treat them as opt-in/local-runtime behavior rather than a substitute for Husky, CI, or required manual verification.
  - If a Codex hook changes or does not fire, check `/hooks` trust/review status before assuming the configuration is broken.
- On this Windows setup, if `astro build` or Wrangler fails with `EPERM` under `%APPDATA%`, set `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` to workspace-local temp directories before running build commands.
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- Professor bootstrap depends on `SUPABASE_SERVICE_ROLE_KEY` plus `BOOTSTRAP_PROFESSOR_EMAIL`; the first-professor claim is a dedicated server-side flow, not a middleware side effect.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.

<!-- BEGIN @przeprogramowani/10x-cli -->

```yaml
name: 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)
description: Translate the provided AI coding assistant content from English to Polish.
license: CC BY-NC-ND 4.0
metadata:
  difficulty: intermediate
  role: translator
  source: https://github.com/aiedu-courses/10xdevs-ai-toolkit/blob/main/module3/lesson4_e2e_tests.md
```

## 10xDevs AI Toolkit - Moduł 3, Lekcja 4 (Testy E2E)

**Do testów E2E użyj umiejętności `/10x-e2e`.** Jest to jedyne źródło prawdy
dla przepływu pracy — ryzyko → test początkowy + reguły → generuj → przeglądaj pod kątem pięciu
antywzorców → ponowne zapytanie → weryfikuj. `references/` tej umiejętności
zawierają pełne reguły, antywzorce, wzorzec początkowy i szablon promptu.

Kilka twardych reguł, które obowiązują jeszcze przed wywołaniem umiejętności:

- **Lokalizatory:** Najpierw `getByRole` / `getByLabel` / `getByText`; `getByTestId`
  tylko wtedy, gdy atrybuty dostępności są niejednoznaczne. Nigdy selektory CSS, XPath
  ani struktura DOM.
- **Nigdy `page.waitForTimeout()`.** Czekaj na stan: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Niezależność testów + czyszczenie.** Każdy test działa samodzielnie — własna konfiguracja,
  akcja, asercja i czyszczenie; unikalne identyfikatory (sufiks znacznika czasu), aby równoległe uruchomienia
  i ponowne uruchomienia nie kolidowały.

Dwie granice, które należy jasno rozróżnić:

- **DOM (migawka) jest domyślny.** Wizja (`--caps=vision`) jest uzupełnieniem dla
  ryzyk wizualnych (układ, z-index, animacja); dla regresji pikseli preferuj
  narzędzia deterministyczne (`toMatchSnapshot`, Argos, Lost Pixel). Wybór/koszt modelu VLM
  jest tematem debugowania (Lekcja 5), a nie testowania.
- **Healer pomaga w selektorach, szkodzi w logice.** Zmieniony selektor → healer
  odnajduje go ponownie (trasa przez przegląd PR). Zmienione zachowanie biznesowe → healer
  maskuje błąd; przypadek naprawy nieudanego testu to Lekcja 5.

<!-- END @przeprogramowani/10x-cli -->
