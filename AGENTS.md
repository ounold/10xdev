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
- On this Windows setup, if `astro build` or Wrangler fails with `EPERM` under `%APPDATA%`, set `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` to workspace-local temp directories before running build commands.
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- Professor bootstrap depends on `SUPABASE_SERVICE_ROLE_KEY` plus `BOOTSTRAP_PROFESSOR_EMAIL`; the first-professor claim is a dedicated server-side flow, not a middleware side effect.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 2, Lekcja 4

Przygotuj się na trudniejszy strumień implementacji z **łańcuchem planowania opartym na badaniach**:

```
badania wewnętrzne (/10x-research) + badania zewnętrzne (exa.ai, Context7) -> /10x-plan -> /10x-implement -> sukces
```

Lekcja koncentruje się na rozróżnianiu badań wewnętrznych od zewnętrznych oraz wykorzystywaniu dowodów do wspierania decyzji planistycznych.

### Router zadań - Od czego zacząć

| Umiejętność | Kiedy jej używać |
| --- | --- |
| **Badania wewnętrzne (fokus lekcji)** | |
| `/10x-research <change-id>` | Potrzebujesz dowodów z istniejącej bazy kodu — wzorców, konwencji, punktów integracji lub istniejących implementacji. Uruchamia równoległe sub-agenty w repozytorium i zapisuje ustrukturyzowane wyniki do `research.md`. |
| **Badania zewnętrzne (fokus lekcji)** | |
| exa.ai | Potrzebujesz natywnego dla AI wyszukiwania w sieci w celu porównania bibliotek, najlepszych praktyk lub kontekstu ekosystemu, na które baza kodu nie może odpowiedzieć. |
| Context7 (`resolve-library-id` → `get-library-docs`) | Potrzebujesz aktualnej dokumentacji na żywo dla konkretnej biblioteki lub frameworka. Najpierw rozwiązuje ID biblioteki, a następnie pobiera odpowiednie strony dokumentacji. |
| **Ramowanie koła zapasowego** | |
| `/10x-frame <change-id>` | Plan nie zbiega się, plan nie przynosi oczekiwanych rezultatów, lub uporczywe odchylenia ciągle psują implementację. Użyj jako wyjścia awaryjnego dla oddzielnego problemu (zademonstrowane na przykładzie Space Explorers), a nie jako rytuału przed badaniami. |
| **Planowanie i wykonanie** | |
| `/10x-plan <change-id>` / `/10x-implement <change-id> phase <n>` | Użyj tego samego łańcucha planowania i wykonania z Lekcji 2, teraz z dowodami z badań wstępnych zasilającymi plan. |

### Dyscyplina badawcza

- Badania wewnętrzne (`/10x-research`) odpowiadają na pytanie "co już robi nasza baza kodu?" — wzorce, schematy, konwencje, punkty integracji.
- Badania zewnętrzne (exa.ai, Context7) odpowiadają na pytanie "co powinniśmy zrobić?" — możliwości bibliotek, dokumentacja API, najlepsze praktyki ekosystemu.
- Połącz oba jako dowodowy wkład do `/10x-plan`. Plan bez dowodów badawczych w nietrywialnym strumieniu jest zgadywaniem.
- Dokumentacja przyjazna agentom (`llms.txt`, markdown-for-agents, `/md` endpoints) jest sygnałem jakości dla wyboru biblioteki — biblioteki, które publikują dokumentację czytelną dla agentów, integrują się szybciej.

### `/10x-frame` jako koło zapasowe

Trzy wyzwalacze do sięgnięcia po `/10x-frame`:
1. Plan nie zbiega się — badania ciągle otwierają więcej pytań zamiast zawężać się do kontraktu.
2. Plan nie przynosi rezultatów — implementacja wielokrotnie nie spełnia kryteriów sukcesu.
3. Uporczywe odchylenia — implementacja ciągle odbiega od planu w sposób sugerujący, że problem został źle sformułowany.

Zademonstrowane na przykładzie Space Explorers, a nie na ścieżce SRS. Jest to wyjście awaryjne, a nie obowiązkowy krok.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/research.md` - wynik badań wewnętrznych
- `context/changes/<change-id>/frame.md` - wynik ramowania, gdy jest potrzebny
- `context/changes/<change-id>/plan.md` - kontrakt implementacyjny oparty na dowodach
- `context/foundation/lessons.md` - powtarzające się zasady i pułapki

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
